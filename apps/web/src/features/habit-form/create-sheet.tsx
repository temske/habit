import {
  createHabit,
  lastOrder,
  validateHabitDraft,
  type HabitIcon as HabitIconValue,
  type OptionId,
} from "@habit/core";
import { useHabits, useHabitState } from "@habit/data";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";

import { useAct } from "@/components/act";
import { haptic } from "@/components/haptics";
import { ResponsiveSheet } from "@/components/sheet";
import { useIsWide } from "@/components/use-media-query";

import { ColorSwatches, FORM_SHEET_CLASS, FormColumns, StepButton } from "./controls";
import {
  addOption,
  DEFAULT_ICON,
  draftOf,
  issueMessages,
  moveOffered,
  newForm,
  nextColor,
  removeOption,
  restoreOption,
  savedOptions,
  updateOption,
  withKind,
  type FormState,
} from "./draft";
import { DirectionField, IconTile, KindField, KINDS, NameFields, NumberFields } from "./fields";
import { IconPicker, OptionEmojiPicker } from "./icon-picker";
import { suggestIcon } from "./icon-search";
import { OptionsEditor } from "./options-editor";
import { stepVariants, Steps } from "./steps";

const NO_STORED_OPTIONS: ReadonlySet<OptionId> = new Set();

const ICON_TILE = 'button[aria-label="Change icon"]';

/**
 * The create sheet (`?new=true`). One step: the icon and the name, the description, the color, the
 * Direction and the Kind, and under them the fields of a number, a choice or a scale habit (in two
 * columns where the window has room: see FormColumns). The icon picker and the emoji picker of an
 * Option are steps of their own, and come back to the form. "Add habit" creates the habit after
 * the last one and closes the sheet.
 */
export function CreateHabitSheet({
  open,
  onClose,
  onExitComplete,
}: {
  open: boolean;
  onClose: () => void;
  onExitComplete: () => void;
}) {
  const { habits } = useHabits();
  const state = useHabitState();
  const act = useAct();
  const wide = useIsWide();
  const reduceMotion = useReducedMotion() === true;
  const [firstRun] = useState(() => habits.length === 0);
  const [form, setForm] = useState<FormState>(() => newForm(nextColor(habits)));
  const [iconPicked, setIconPicked] = useState(false);
  // The tile's tint rises once, when the sheet opens, not each time the form comes back.
  const [leftForm, setLeftForm] = useState(false);
  const [step, setStep] = useState<"form" | "icon" | "emoji">("form");
  // The side the last Kind lies on from the one before it: its fields come in from that side.
  const [kindDirection, setKindDirection] = useState<1 | -1>(1);
  const [emojiFor, setEmojiFor] = useState<OptionId | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState({ target: false, step: false });
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const draft = draftOf({ ...form, options: savedOptions(form.options, NO_STORED_OPTIONS) });
  const issues = validateHabitDraft(draft);
  const messages = issueMessages(issues, form);
  const nameIssue = issues.find((issue) => issue.field === "name");
  const labelTooLong = issues.some((issue) => issue.code === "labelTooLong");
  const kindFieldsKey =
    form.kind === "number"
      ? "number"
      : form.kind === "choice" || form.kind === "scale"
        ? "options"
        : undefined;

  const create = () => {
    if (issues.length > 0) {
      setAttempted(true);
      if (nameIssue !== undefined) nameRef.current?.focus();
      return;
    }
    const habit = createHabit(draft, { now: Date.now(), lastOrder: lastOrder(state) });
    act({ type: "createHabit", habit });
    haptic();
    onClose();
  };

  const onEnter = () => {
    // By the key: the fields of the Kind before stay in the DOM while they fade out.
    const field =
      kindFieldsKey === undefined
        ? null
        : formRef.current?.querySelector<HTMLInputElement>(
            `[data-kind-fields="${kindFieldsKey}"] input`,
          );
    if (nameIssue === undefined && field != null) field.focus();
    else create();
  };

  const onName = (name: string) =>
    setForm((current) => ({
      ...current,
      name,
      icon: iconPicked ? current.icon : (suggestIcon(name) ?? DEFAULT_ICON),
    }));

  const onPick = (icon: HabitIconValue) => {
    setForm((current) => ({ ...current, icon }));
    setIconPicked(true);
    setStep("form");
  };

  const onPickEmoji = (emoji: string | undefined) => {
    if (emojiFor !== null) {
      setForm((current) => ({
        ...current,
        options: updateOption(current.options, emojiFor, { emoji }),
      }));
    }
    setStep("form");
  };

  const kindFields =
    form.kind === "number" ? (
      <NumberFields
        form={form}
        onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onBlur={(field) => {
          if (field !== "unit") setTouched((current) => ({ ...current, [field]: true }));
        }}
        messages={{
          target: touched.target || attempted ? messages.target : undefined,
          step: touched.step || attempted ? messages.step : undefined,
        }}
      />
    ) : form.kind === "choice" || form.kind === "scale" ? (
      <OptionsEditor
        kind={form.kind}
        color={form.color}
        options={form.options}
        onLabel={(id, label) =>
          setForm((current) => ({
            ...current,
            options: updateOption(current.options, id, { label }),
          }))
        }
        onPickEmoji={(id) => {
          setLeftForm(true);
          setEmojiFor(id);
          setStep("emoji");
        }}
        onAdd={() => {
          const options = addOption(form.options);
          setForm((current) => ({ ...current, options }));
          return options[options.length - 1]!.id;
        }}
        onRemove={(id) =>
          setForm((current) => ({
            ...current,
            options: removeOption(current.options, id, { used: false, now: Date.now() }),
          }))
        }
        onRestore={(id) =>
          setForm((current) => ({
            ...current,
            options: restoreOption(current.options, id),
          }))
        }
        onMove={(from, to) =>
          setForm((current) => ({
            ...current,
            options: moveOffered(current.options, from, to),
          }))
        }
        message={attempted || labelTooLong ? messages.options : undefined}
      />
    ) : null;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      onExitComplete={onExitComplete}
      title={
        step === "icon"
          ? "Icon"
          : step === "emoji"
            ? "Emoji"
            : firstRun
              ? "Your first habit"
              : "New habit"
      }
      className={FORM_SHEET_CLASS}
      {...(wide ? { initialFocus: nameRef } : {})}
      footer={
        step === "form" ? (
          <StepButton label="Add habit" variant="primary" direction={-1} onClick={create} />
        ) : (
          <StepButton label="Back" variant="quiet" direction={1} onClick={() => setStep("form")} />
        )
      }
    >
      <Steps
        step={step}
        direction={step === "form" ? -1 : 1}
        focus={
          step !== "form"
            ? undefined
            : emojiFor === null
              ? ICON_TILE
              : `button[data-option-emoji="${emojiFor}"]`
        }
      >
        {step === "form" ? (
          <div ref={formRef}>
            <FormColumns
              looks={
                <>
                  <NameFields
                    icon={
                      <IconTile
                        icon={form.icon}
                        color={form.color}
                        onClick={() => {
                          setLeftForm(true);
                          setEmojiFor(null);
                          setStep("icon");
                        }}
                        fillOnMount={!leftForm}
                      />
                    }
                    name={form.name}
                    description={form.description}
                    onName={onName}
                    onDescription={(description) =>
                      setForm((current) => ({ ...current, description }))
                    }
                    onEnter={onEnter}
                    message={attempted || nameIssue?.code === "tooLong" ? messages.name : undefined}
                    nameRef={nameRef}
                  />
                  <ColorSwatches
                    value={form.color}
                    onChange={(color) => setForm((current) => ({ ...current, color }))}
                  />
                </>
              }
              tracking={
                <>
                  <DirectionField
                    value={form.direction}
                    onChange={(value) => setForm((current) => ({ ...current, direction: value }))}
                  />
                  <KindField
                    value={form.kind}
                    onChange={(kind) => {
                      setKindDirection(KINDS.indexOf(kind) > KINDS.indexOf(form.kind) ? 1 : -1);
                      setForm((current) => withKind(current, kind));
                    }}
                  />
                  {/* A swipe, as between the steps: the new fields come in from the side of their
                      Kind and the old ones leave to the other side. */}
                  <AnimatePresence initial={false} mode="popLayout" custom={kindDirection}>
                    {kindFields === null ? null : (
                      <motion.div
                        key={kindFieldsKey}
                        data-kind-fields={kindFieldsKey}
                        custom={kindDirection}
                        variants={stepVariants(reduceMotion)}
                        initial="enter"
                        animate="center"
                        exit="exit"
                      >
                        {kindFields}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              }
            />
          </div>
        ) : (
          // The picker runs down to the footer, so its grid is cut at the top edge of the button:
          // this takes back the body's bottom padding.
          <div className="-mb-5">
            {step === "emoji" ? (
              <OptionEmojiPicker
                emoji={form.options.find((option) => option.id === emojiFor)?.emoji}
                color={form.color}
                onPick={onPickEmoji}
                autoFocus={wide}
              />
            ) : (
              <IconPicker value={form.icon} color={form.color} onPick={onPick} autoFocus={wide} />
            )}
          </div>
        )}
      </Steps>
    </ResponsiveSheet>
  );
}
