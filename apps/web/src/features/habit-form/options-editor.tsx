import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HabitColor, Option, OptionId } from "@habit/core";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/dist/csr/DotsSixVertical";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { SmileyIcon } from "@phosphor-icons/react/dist/csr/Smiley";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TouchEventHandler,
} from "react";
import { flushSync } from "react-dom";

import { DaySquare } from "@/components/day-square";
import { haptic } from "@/components/haptics";
import { useVariant } from "@/components/lab";
import { easeOut, springs } from "@/components/motion";
import { habitColorStyle } from "@/components/palette";
import { cn } from "@/lib/utils";

import { FieldMessage, fieldClass, SectionLabel } from "./controls";
import { OPTION_LIMITS, offered, retired, scaleIntensity } from "./draft";
import { EASE_OUT, FADE_IN, FADE_OUT, rowPresence } from "./presence";
import { REMOVE_WIDTH, useSwipeToRemove } from "./swipe-to-remove";

/** On touch, a press on an Option's emoji this long lifts the row for a move, as in the list. */
const LIFT_DELAY_MS = 300;

export interface OptionsEditorProps {
  kind: "choice" | "scale";
  color: HabitColor;
  options: Option[];
  onLabel: (id: OptionId, label: string) => void;
  /** Opens the emoji picker for the Option. */
  onPickEmoji: (id: OptionId) => void;
  /** The Option whose emoji picker is unfolded under its row, if any. */
  emojiOpenFor?: OptionId | null;
  /** The picker that unfolds under an Option's row (an InlinePicker, open or closed). */
  renderEmojiPicker?: (id: OptionId) => ReactNode;
  /** Called on blur of a label, so an edit form can save at once. */
  onBlurField?: () => void;
  onAdd: () => OptionId;
  onRemove: (id: OptionId) => void;
  onRestore: (id: OptionId) => void;
  onMove: (from: number, to: number) => void;
  message: string | undefined;
}

/**
 * The Options of a choice or a scale: a label and an optional emoji each, added, renamed, removed
 * and moved (drag the handle, or press the up and down arrow keys on it). A tap on the emoji opens
 * the emoji picker. A scale draws the fill that each Option gives a day, so its order reads at a
 * glance. Retired Options (removed, but used by old Entries) wait under the list, and can come
 * back.
 *
 * The lab tries gestures instead of the buttons on touch: hold the emoji to lift the row, swipe
 * the row left to remove it. A mouse keeps the buttons.
 */
export function OptionsEditor(props: OptionsEditorProps) {
  const { kind, color, options, onAdd, onMove, message } = props;
  const limits = OPTION_LIMITS[kind];
  const shown = offered(options);
  const gone = retired(options);
  const labelId = useId();
  const messageId = useId();
  const hintId = useId();
  const reduceMotion = useReducedMotion() === true;
  const labels = useRef(new Map<OptionId, HTMLInputElement>());
  const handles = useRef(new Map<OptionId, HTMLButtonElement>());
  const [focusHandle, setFocusHandle] = useState<OptionId | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const touch = useVariant("option-row-touch", {
    label: "Option rows on touch",
    options: ["Buttons", "Gestures", "Gestures, with a hint"],
  });
  const gestures = touch !== "Buttons";
  // The fills of a scale rise when the rows are already there (a switch from a choice, a new
  // row), not when the editor first appears.
  const [settled, setSettled] = useState(false);
  useEffect(() => setSettled(true), []);

  // A keyboard move re-inserts the row, which takes the focus off its handle: give it back.
  useLayoutEffect(() => {
    if (focusHandle === null) return;
    handles.current.get(focusHandle)?.focus();
    setFocusHandle(null);
  }, [focusHandle]);

  // The handle lifts at once, under a mouse or a finger; the emoji lifts after a hold on touch.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: LIFT_DELAY_MS, tolerance: 8 } }),
  );

  const add = () => {
    // Render the new row now, inside the tap, so that iOS opens the keyboard for its label.
    let id: OptionId | undefined;
    flushSync(() => {
      id = onAdd();
    });
    if (id !== undefined) labels.current.get(id)?.focus();
  };

  const move = (id: OptionId, by: -1 | 1) => {
    const from = shown.findIndex((option) => option.id === id);
    const to = from + by;
    if (from < 0 || to < 0 || to >= shown.length) return;
    onMove(from, to);
    setFocusHandle(id);
    const option = shown[from]!;
    setAnnouncement(
      `${option.label.trim() || "Option"} moved to position ${to + 1} of ${shown.length}.`,
    );
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over === null || active.id === over.id) return;
    const from = shown.findIndex((option) => option.id === active.id);
    const to = shown.findIndex((option) => option.id === over.id);
    if (from >= 0 && to >= 0) onMove(from, to);
  };

  return (
    <div>
      <SectionLabel id={labelId}>
        <RollingText
          text={kind === "scale" ? "Options, from the lightest to the fullest" : "Options"}
          reduceMotion={reduceMotion}
        />
      </SectionLabel>
      {touch === "Gestures, with a hint" ? (
        <p className="-mt-1 mb-2 hidden text-[0.875rem] leading-5 text-ink-3 pointer-coarse:block">
          To move an option, hold its emoji. To remove it, swipe it left.
        </p>
      ) : null}
      <p id={hintId} className="sr-only">
        Drag a handle, or press the up and down arrow keys on it, to move an option.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={() => haptic("lift")}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={shown.map((option) => option.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            role="list"
            aria-labelledby={labelId}
            aria-describedby={message === undefined ? undefined : messageId}
            className="relative flex flex-col"
          >
            <AnimatePresence initial={false}>
              {shown.map((option, index) => (
                <OptionRow
                  key={option.id}
                  {...props}
                  option={option}
                  index={index}
                  count={shown.length}
                  canRemove={shown.length > limits.min}
                  intensity={kind === "scale" ? scaleIntensity(options, option.id) : undefined}
                  hintId={hintId}
                  rise={settled}
                  gestures={gestures}
                  reduceMotion={reduceMotion}
                  labelRef={(element) => {
                    if (element === null) labels.current.delete(option.id);
                    else labels.current.set(option.id, element);
                  }}
                  handleRef={(element) => {
                    if (element === null) handles.current.delete(option.id);
                    else handles.current.set(option.id, element);
                  }}
                  onArrow={(by) => move(option.id, by)}
                  onEnter={() => {
                    const next = shown[index + 1];
                    if (next !== undefined) labels.current.get(next.id)?.focus();
                    else if (shown.length < limits.max) add();
                  }}
                  color={color}
                />
              ))}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <FieldMessage id={messageId} message={message} />
      {shown.length < limits.max ? (
        <button
          type="button"
          onClick={add}
          className="flex h-11 w-full items-center gap-2 rounded-full px-4 text-[1rem] font-medium text-ink-2 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.98]"
        >
          <PlusIcon weight="bold" aria-hidden className="size-4" />
          Add option
        </button>
      ) : (
        <p className="px-1 text-[0.875rem] leading-5 text-ink-3">
          {kind === "scale" ? "A scale has 5 options at most." : "12 options at most."}
        </p>
      )}
      <AnimatePresence initial={false}>
        {gone.length === 0 ? null : (
          <motion.div key="retired" {...rowPresence(reduceMotion)}>
            <RetiredOptions
              options={gone}
              canRestore={shown.length < limits.max}
              onRestore={props.onRestore}
              reduceMotion={reduceMotion}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionRow({
  option,
  index,
  count,
  canRemove,
  intensity,
  color,
  hintId,
  rise,
  gestures,
  reduceMotion,
  labelRef,
  handleRef,
  onArrow,
  onEnter,
  onLabel,
  onPickEmoji,
  emojiOpenFor,
  renderEmojiPicker,
  onBlurField,
  onRemove,
}: OptionsEditorProps & {
  option: Option;
  index: number;
  count: number;
  canRemove: boolean;
  intensity: number | undefined;
  hintId: string;
  rise: boolean;
  gestures: boolean;
  reduceMotion: boolean;
  labelRef: (element: HTMLInputElement | null) => void;
  handleRef: (element: HTMLButtonElement | null) => void;
  onArrow: (by: -1 | 1) => void;
  onEnter: () => void;
}) {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } =
    useSortable({
      id: option.id,
      // The neighbours make room with the app's ease-out; under reduced motion they move at once.
      transition: reduceMotion ? null : { duration: 200, easing: easeOut },
    });
  const { onTouchStart: liftOnHold, ...handleListeners } = listeners ?? {};
  const name = option.label.trim() || `option ${index + 1}`;
  const dragging = useRef(false);
  dragging.current = isDragging;
  // A hold on the emoji that lifted the row must not open the picker when the finger lets go.
  const lifted = useRef(false);
  const swipe = useSwipeToRemove({
    enabled: gestures && canRemove,
    blocked: () => dragging.current,
    onRemove: () => onRemove(option.id),
    reduceMotion,
  });
  const { close } = swipe;
  // Clipped only while it is off its place: the focus rings of the buttons reach past the row.
  const overflow = useTransform(swipe.x, (value) => (value === 0 ? "visible" : "hidden"));

  useEffect(() => {
    if (!isDragging) return;
    lifted.current = true;
    close();
  }, [isDragging, close]);

  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onArrow(event.key === "ArrowUp" ? -1 : 1);
    }
  };

  return (
    <motion.li {...rowPresence(reduceMotion)}>
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        className={cn("relative pb-2", isDragging && "z-10")}
      >
        <motion.div ref={swipe.container} style={{ overflow }} className="relative rounded-full">
          {gestures && canRemove ? (
            <SwipeAction x={swipe.x} onRemove={() => onRemove(option.id)} />
          ) : null}
          <motion.div
            style={{ x: swipe.x }}
            {...swipe.handlers}
            className={cn(
              "relative flex items-center gap-2 rounded-full bg-surface transition-[box-shadow] duration-150",
              gestures && "touch-pan-y",
              isDragging && "shadow-[var(--elevation)]",
            )}
          >
            <div
              onTouchStart={gestures ? (liftOnHold as TouchEventHandler | undefined) : undefined}
              onContextMenu={gestures ? (event) => event.preventDefault() : undefined}
              className="flex flex-none items-center select-none [-webkit-touch-callout:none]"
            >
              <AnimatePresence initial={false}>
                {intensity === undefined ? null : (
                  <ScaleLevel
                    key="level"
                    color={color}
                    intensity={intensity}
                    index={index}
                    rise={rise}
                    reduceMotion={reduceMotion}
                  />
                )}
              </AnimatePresence>
              <EmojiButton
                optionId={option.id}
                emoji={option.emoji}
                expanded={emojiOpenFor === undefined ? undefined : emojiOpenFor === option.id}
                color={color}
                label={name}
                onPointerDown={() => {
                  lifted.current = false;
                }}
                onClick={() => {
                  if (lifted.current) lifted.current = false;
                  else onPickEmoji(option.id);
                }}
              />
            </div>
            <input
              ref={labelRef}
              value={option.label}
              onChange={(event) => onLabel(option.id, event.target.value)}
              onBlur={onBlurField}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onEnter();
                }
              }}
              aria-label={`Option ${index + 1} of ${count}`}
              placeholder={`Option ${index + 1}`}
              autoComplete="off"
              autoCapitalize="sentences"
              enterKeyHint="next"
              className={cn(fieldClass, "flex-1")}
            />
            <button
              type="button"
              onClick={() => onRemove(option.id)}
              disabled={!canRemove}
              aria-label={`Remove ${name}`}
              className={cn(
                "grid size-11 flex-none place-items-center rounded-full text-ink-3 transition-[color,scale,opacity] duration-150 ease-out hover:text-ink active:scale-[0.95] disabled:opacity-30 disabled:active:scale-100",
                gestures && "pointer-coarse:sr-only",
              )}
            >
              <XIcon weight="bold" aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              ref={(element) => {
                setActivatorNodeRef(element);
                handleRef(element);
              }}
              {...handleListeners}
              onKeyDown={onHandleKey}
              aria-label={`Move ${name}`}
              aria-describedby={hintId}
              data-base-ui-swipe-ignore=""
              className={cn(
                "-ml-1 grid h-11 w-8 flex-none cursor-grab touch-none place-items-center text-ink-3 active:cursor-grabbing",
                gestures && "pointer-coarse:sr-only",
              )}
            >
              <DotsSixVerticalIcon weight="bold" aria-hidden className="size-[1.125rem]" />
            </button>
          </motion.div>
        </motion.div>
        {renderEmojiPicker?.(option.id)}
      </div>
    </motion.li>
  );
}

/**
 * The fill that an Option of a scale gives a day, before its emoji. When a choice turns into a
 * scale, the squares open their room one row after the other and their fills rise to their levels,
 * so the switch shows what a scale adds; back to a choice, they fold away. Under reduced motion,
 * a fade.
 */
function ScaleLevel({
  color,
  intensity,
  index,
  rise,
  reduceMotion,
}: {
  color: HabitColor;
  intensity: number;
  index: number;
  rise: boolean;
  reduceMotion: boolean;
}) {
  const delay = rise && !reduceMotion ? index * 0.04 : 0;
  const [shown, setShown] = useState(rise ? 0 : intensity);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(intensity), delay * 1000 + 60);
    return () => window.clearTimeout(timer);
  }, [intensity, delay]);
  return (
    <motion.span
      className="flex flex-none overflow-hidden"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
      animate={{
        opacity: 1,
        width: "auto",
        transition: reduceMotion
          ? FADE_IN
          : {
              width: { ...springs.morph, delay },
              opacity: { duration: 0.2, ease: EASE_OUT, delay },
            },
      }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: FADE_OUT }
          : { opacity: 0, width: 0, transition: { width: springs.morph, opacity: FADE_OUT } }
      }
    >
      <span className="flex pr-2 pl-1">
        <DaySquare color={color} intensity={shown} size="1.25rem" />
      </span>
    </motion.span>
  );
}

/** A label that rolls to its new text, as the footer button does: the old one leaves upward. */
function RollingText({ text, reduceMotion }: { text: string; reduceMotion: boolean }) {
  return (
    <span className="relative block overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={text}
          className="block"
          initial={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, transform: "translateY(0.5rem)", filter: "blur(2px)" }
          }
          animate={{
            opacity: 1,
            transform: "translateY(0rem)",
            filter: "blur(0px)",
            transition: reduceMotion
              ? FADE_IN
              : {
                  transform: springs.morph,
                  opacity: { duration: 0.22, ease: EASE_OUT },
                  filter: { duration: 0.22, ease: EASE_OUT },
                },
          }}
          exit={
            reduceMotion
              ? { opacity: 0, transition: FADE_OUT }
              : {
                  opacity: 0,
                  transform: "translateY(-0.5rem)",
                  filter: "blur(2px)",
                  transition: { duration: 0.14, ease: EASE_OUT },
                }
          }
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * The emoji of an Option, on the field fill: a tap opens the emoji picker. Empty, it shows a quiet
 * smiley.
 */
function EmojiButton({
  optionId,
  emoji,
  expanded,
  color,
  label,
  onPointerDown,
  onClick,
}: {
  optionId: OptionId;
  emoji: string | undefined;
  /** Its picker is unfolded under the row: a ring in the habit color. */
  expanded: boolean | undefined;
  color: HabitColor;
  label: string;
  onPointerDown: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-option-emoji={optionId}
      onPointerDown={onPointerDown}
      onClick={onClick}
      aria-label={emoji === undefined ? `Emoji for ${label}` : `Emoji for ${label}: ${emoji}`}
      aria-expanded={expanded}
      style={habitColorStyle(color)}
      className="grid size-12 flex-none place-items-center rounded-full bg-field text-[1.0625rem] outline-none transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.95] focus-visible:shadow-[inset_0_0_0_0.09375rem_var(--ink-4)] aria-expanded:shadow-[0_0_0_0.25rem_color-mix(in_oklab,var(--c)_50%,transparent)]"
    >
      {emoji ?? <SmileyIcon aria-hidden className="size-5 text-ink-3" />}
    </button>
  );
}

/**
 * What a swipe uncovers under the row: Remove, on the tint of "Delete habit". Past its width the
 * button keeps to the row's edge. Screen readers use the remove button of the row instead.
 */
function SwipeAction({ x, onRemove }: { x: MotionValue<number>; onRemove: () => void }) {
  const opacity = useTransform(x, (value) => (value < -0.5 ? 1 : 0));
  const shift = useTransform(x, (value) => Math.min(0, value + REMOVE_WIDTH));
  return (
    <motion.div
      aria-hidden
      style={{ opacity }}
      className="absolute inset-0 flex justify-end rounded-full bg-[color-mix(in_oklab,var(--destructive)_12%,var(--surface))]"
    >
      <motion.button
        type="button"
        tabIndex={-1}
        onClick={onRemove}
        style={{ x: shift, width: REMOVE_WIDTH }}
        className="flex h-full flex-none flex-col items-center justify-center gap-0.5 text-[0.75rem] font-medium text-[color-mix(in_oklab,var(--destructive)_70%,var(--ink))]"
      >
        <TrashIcon weight="bold" aria-hidden className="size-[1.125rem]" />
        Remove
      </motion.button>
    </motion.div>
  );
}

function RetiredOptions({
  options,
  canRestore,
  onRestore,
  reduceMotion,
}: {
  options: Option[];
  canRestore: boolean;
  onRestore: (id: OptionId) => void;
  reduceMotion: boolean;
}) {
  const labelId = useId();
  return (
    <div className="pt-4">
      <SectionLabel id={labelId}>Retired</SectionLabel>
      <p className="-mt-1 mb-2 text-[0.875rem] leading-5 text-ink-3">
        Past days keep these. New days don't offer them.
      </p>
      <ul role="list" aria-labelledby={labelId} className="flex flex-col">
        <AnimatePresence initial={false}>
          {options.map((option) => (
            <motion.li key={option.id} {...rowPresence(reduceMotion)}>
              <div className="flex h-11 items-center gap-3 px-1">
                <span className="w-6 flex-none text-center text-[1.0625rem]" aria-hidden>
                  {option.emoji ?? ""}
                </span>
                <span className="min-w-0 flex-1 truncate text-[1rem] text-ink-3 line-through decoration-ink-4/60">
                  {option.label}
                </span>
                <button
                  type="button"
                  onClick={() => onRestore(option.id)}
                  disabled={!canRestore}
                  aria-label={`Restore ${option.label}`}
                  className="flex h-9 flex-none items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-[0.9375rem] font-medium text-ink-2 transition-[color,scale,opacity] duration-150 ease-out hover:text-ink active:scale-[0.96] disabled:opacity-40 disabled:active:scale-100"
                >
                  <ArrowCounterClockwiseIcon weight="bold" aria-hidden />
                  Restore
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
