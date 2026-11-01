import {
  validateHabitDraft,
  type Habit,
  type HabitIcon as HabitIconValue,
  type HabitId,
  type HabitPatch,
  type Option,
  type OptionId,
} from "@habit/core";
import { useHabitState } from "@habit/data";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAct } from "@/components/act";
import { haptic } from "@/components/haptics";
import { ResponsiveSheet } from "@/components/sheet";
import { useIsWide } from "@/components/use-media-query";
import { cn } from "@/lib/utils";

import {
  ColorSwatches,
  FORM_SHEET_CLASS,
  FormColumns,
  SheetButton,
  StickyFooter,
} from "./controls";
import {
  addOption,
  cleanOptions,
  draftOf,
  formOf,
  issueMessages,
  moveOffered,
  parseDecimal,
  removeOption,
  restoreOption,
  savedOptions,
  updateOption,
  usedOptionIds,
  type FormState,
  type IssueField,
} from "./draft";
import {
  DirectionField,
  IconTile,
  KIND_ICONS,
  KIND_LABELS,
  NameFields,
  NumberFields,
} from "./fields";
import { OptionsEditor } from "./options-editor";
import {
  FloatingPicker,
  InlinePicker,
  PickerFor,
  STACKED_UNDER_CLASS,
  triggerSelector,
  usePicker,
  zoomVariants,
  type PickerFormProps,
} from "./picker-place";
import { Steps } from "./steps";
import { useDebouncedCommits } from "./use-debounced-commits";

/**
 * The edit sheet (`?edit=<habitId>`). No save button: each change applies at once as an
 * `updateHabit` Action, and typing applies after a short pause (and on blur, and on close). A
 * value that is not valid (an empty name, a step of 0) shows its message and is not saved; the
 * habit keeps its last valid value. The Kind cannot change. Delete is at the end, without a
 * confirmation: the toast offers Undo.
 */
export function EditHabitSheet({
  habit,
  open,
  onClose,
  onExitComplete,
  onDeleted,
}: {
  /** The stored habit, live: it changes as the edits apply. */
  habit: Habit;
  open: boolean;
  onClose: () => void;
  onExitComplete: () => void;
  /** After the delete: close the sheet, and leave the page of the habit. */
  onDeleted: () => void;
}) {
  const state = useHabitState();
  const act = useAct();
  const wide = useIsWide();
  const commits = useDebouncedCommits();
  const [form, setForm] = useState<FormState>(() => formOf(habit));
  const reduceMotion = useReducedMotion() === true;
  const rootRef = useRef<HTMLDivElement>(null);
  const picker = usePicker(rootRef);
  // The picker is a step of the sheet only in the lab's "Step" place.
  const step = picker.place === "Step" && picker.target !== null ? picker.target.type : "main";
  // The button that opened the last picker, for the focus and the zoom on the way back.
  const [lastTarget, setLastTarget] = useState(picker.target);
  if (picker.target !== null && picker.target !== lastTarget) setLastTarget(picker.target);
  const id: HabitId = habit.id;

  // The Options that are saved: a new row stays out until it has a label.
  const storedOptionIds = useMemo(
    () =>
      new Set<OptionId>(
        habit.kind === "choice" || habit.kind === "scale" ? habit.options.map((o) => o.id) : [],
      ),
    [habit],
  );
  const issuesOf = (next: FormState) =>
    validateHabitDraft(draftOf({ ...next, options: savedOptions(next.options, storedOptionIds) }));
  const hasIssue = (next: FormState, field: IssueField) =>
    issuesOf(next).some((issue) => issue.field === field);
  const messages = issueMessages(issuesOf(form), form);

  // A close by the back gesture or the URL does not call onClose: save what waits all the same.
  useEffect(() => {
    if (!open) commits.flush();
  }, [open, commits]);

  /** Performs the patch, unless it leaves each field as the stored habit has it. */
  const update = (patch: HabitPatch) => {
    const stored = new Map<string, unknown>(Object.entries(habit));
    const changes = Object.entries(patch).some(
      ([key, value]) => JSON.stringify(stored.get(key) ?? null) !== JSON.stringify(value ?? null),
    );
    if (changes) act({ type: "updateHabit", id, patch });
  };

  const change = (patch: Partial<FormState>): FormState => {
    const next = { ...form, ...patch };
    setForm(next);
    return next;
  };

  /** Saves a text field after the pause, or drops the waiting save while the field is not valid. */
  const typed = (key: string, valid: boolean, patch: () => HabitPatch) => {
    if (valid) commits.schedule(key, () => update(patch()));
    else commits.cancel(key);
  };

  /** On blur: trim the text in the field too, and save now. */
  const settle = (key: "name" | "description" | "unit") => {
    const value = form[key];
    if (value.trim() !== value) change({ [key]: value.trim() });
    commits.flush(key);
  };

  const changeOptions = (options: Option[], when: "now" | "typing") => {
    const next = change({ options });
    if (hasIssue(next, "options")) {
      commits.cancel("options");
      return;
    }
    const save = () => update({ options: cleanOptions(savedOptions(options, storedOptionIds)) });
    if (when === "typing") {
      commits.schedule("options", save);
    } else {
      commits.cancel("options");
      save();
    }
  };

  const pickerForm: PickerFormProps = {
    icon: form.icon,
    color: form.color,
    options: form.options,
    autoFocus: wide,
    onPickIcon: (icon: HabitIconValue) => {
      change({ icon });
      update({ icon });
      picker.close();
    },
    onPickEmoji: (optionId, emoji) => {
      changeOptions(updateOption(form.options, optionId, { emoji }), "now");
      picker.close();
    },
  };

  const onDelete = () => {
    commits.flush();
    act({ type: "deleteHabit", id }, { undo: `Deleted “${habit.name}”` });
    haptic();
    onDeleted();
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) return;
        commits.flush();
        onClose();
      }}
      onExitComplete={onExitComplete}
      title={step === "icon" ? "Icon" : step === "emoji" ? "Emoji" : "Edit habit"}
      className={cn(FORM_SHEET_CLASS, picker.place === "Stacked sheet" && STACKED_UNDER_CLASS)}
    >
      <div ref={rootRef}>
        <Steps
          step={step}
          direction={step === "main" ? -1 : 1}
          focus={step !== "main" || lastTarget === null ? undefined : triggerSelector(lastTarget)}
          variants={
            picker.place === "Step"
              ? zoomVariants(reduceMotion, lastTarget?.type === "emoji" ? "0% 50%" : "0% 0%")
              : undefined
          }
        >
          {/* A picker runs down to Back, so its grid is cut at the top edge of the button. */}
          {step !== "main" ? (
            <div className="flex flex-col">
              {picker.target === null ? null : (
                <PickerFor target={picker.target} size="step" form={pickerForm} />
              )}
              <StickyFooter>
                <SheetButton variant="quiet" onClick={picker.close} className="w-full">
                  Back
                </SheetButton>
              </StickyFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <FormColumns
                looks={
                  <>
                    <NameFields
                      icon={
                        <IconTile
                          icon={form.icon}
                          color={form.color}
                          onClick={() => picker.open({ type: "icon" })}
                          expanded={
                            picker.place === "Inline"
                              ? picker.unfolded({ type: "icon" })
                              : undefined
                          }
                        />
                      }
                      picker={
                        picker.place === "Inline" ? (
                          <InlinePicker
                            open={picker.unfolded({ type: "icon" })}
                            onClose={picker.close}
                          >
                            <PickerFor target={{ type: "icon" }} size="inline" form={pickerForm} />
                          </InlinePicker>
                        ) : undefined
                      }
                      name={form.name}
                      description={form.description}
                      onName={(name) => {
                        const next = change({ name });
                        typed("name", !hasIssue(next, "name"), () => ({ name: name.trim() }));
                      }}
                      onDescription={(description) => {
                        change({ description });
                        typed("description", true, () => ({ description: description.trim() }));
                      }}
                      onBlurName={() => settle("name")}
                      onBlurDescription={() => settle("description")}
                      message={messages.name}
                    />
                    <ColorSwatches
                      value={form.color}
                      onChange={(color) => {
                        change({ color });
                        update({ color });
                      }}
                    />
                  </>
                }
                tracking={
                  <>
                    <DirectionField
                      value={form.direction}
                      onChange={(value) => {
                        change({ direction: value });
                        update({ direction: value });
                      }}
                    />
                    <div className="flex flex-col gap-4">
                      <div className="flex h-6 items-center gap-2 text-ink-2">
                        <span aria-hidden className="grid text-ink-3 [&>svg]:size-[1.125rem]">
                          {KIND_ICONS[form.kind]}
                        </span>
                        <span className="font-medium">{KIND_LABELS[form.kind]}</span>
                        <span className="ml-auto text-[0.875rem] text-ink-3">Set when created</span>
                      </div>
                      {form.kind === "number" ? (
                        <NumberFields
                          form={form}
                          onChange={(patch) => {
                            const next = change(patch);
                            if (patch.unit !== undefined) {
                              const unit = patch.unit.trim();
                              typed("unit", true, () => ({ unit: unit === "" ? null : unit }));
                            }
                            if (patch.target !== undefined) {
                              const target = parseDecimal(patch.target);
                              typed("target", !hasIssue(next, "target"), () => ({
                                target: target ?? null,
                              }));
                            }
                            if (patch.step !== undefined) {
                              const value = parseDecimal(patch.step);
                              typed("step", !hasIssue(next, "step"), () => ({ step: value! }));
                            }
                          }}
                          onBlur={(field) =>
                            field === "unit" ? settle("unit") : commits.flush(field)
                          }
                          messages={{ target: messages.target, step: messages.step }}
                        />
                      ) : form.kind === "choice" || form.kind === "scale" ? (
                        <OptionsEditor
                          kind={form.kind}
                          color={form.color}
                          options={form.options}
                          onLabel={(optionId, label) =>
                            changeOptions(updateOption(form.options, optionId, { label }), "typing")
                          }
                          onPickEmoji={(optionId) => {
                            commits.flush("options");
                            picker.open({ type: "emoji", id: optionId });
                          }}
                          {...(picker.place === "Inline"
                            ? {
                                emojiOpenFor:
                                  picker.target?.type === "emoji" ? picker.target.id : null,
                                renderEmojiPicker: (optionId: OptionId) => (
                                  <InlinePicker
                                    open={picker.unfolded({ type: "emoji", id: optionId })}
                                    onClose={picker.close}
                                  >
                                    <PickerFor
                                      target={{ type: "emoji", id: optionId }}
                                      size="inline"
                                      form={pickerForm}
                                    />
                                  </InlinePicker>
                                ),
                              }
                            : {})}
                          onBlurField={() => commits.flush("options")}
                          onAdd={() => {
                            const options = addOption(form.options);
                            changeOptions(options, "now");
                            return options[options.length - 1]!.id;
                          }}
                          onRemove={(optionId) => {
                            const used = usedOptionIds(state, id).has(optionId);
                            changeOptions(
                              removeOption(form.options, optionId, { used, now: Date.now() }),
                              "now",
                            );
                          }}
                          onRestore={(optionId) =>
                            changeOptions(restoreOption(form.options, optionId), "now")
                          }
                          onMove={(from, to) =>
                            changeOptions(moveOffered(form.options, from, to), "now")
                          }
                          message={messages.options}
                        />
                      ) : null}
                    </div>
                  </>
                }
              />
              <div className="pt-2">
                <SheetButton variant="destructive" onClick={onDelete} className="w-full">
                  <TrashIcon weight="bold" aria-hidden />
                  Delete habit
                </SheetButton>
              </div>
            </div>
          )}
        </Steps>
      </div>
      <FloatingPicker
        picker={picker}
        render={(target, size) => <PickerFor target={target} size={size} form={pickerForm} />}
      />
    </ResponsiveSheet>
  );
}
