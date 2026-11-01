import {
  intensity,
  isFuture,
  type Day,
  type EntryValue,
  type Habit,
  type HabitId,
} from "@habit/core";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { DaySquare } from "@/components/day-square";
import { describeEntry, formatDayLong } from "@/components/format";
import { haptic } from "@/components/haptics";
import { entryRef, useSheetSearch } from "@/components/sheet-search";

/** How long a press on a number square lasts before it opens the input. */
export const LONG_PRESS_MS = 450;
/** On touch, the pressed look waits this long: a scroll cancels the pointer within it. */
const TOUCH_PRESS_DELAY_MS = 60;
/** A press that moves farther than this is not a tap (it is a scroll, or a slip). */
const SLOP_PX = 10;

export interface DayCellsProps {
  habit: Habit;
  days: Day[];
  today: Day;
  entries: (habitId: HabitId, day: Day) => EntryValue | undefined;
  /** A tap on a Day (or Enter on its button): the screen performs `tapResult`. */
  onTap: (day: Day) => void;
  /** A long press on a number square, or a right click: the input of the exact value. */
  onOpenInput: (day: Day) => void;
  /** A drag across the squares of a check habit: one batch of Days in one state. */
  onPaint: (days: Day[], mode: "set" | "clear") => void;
}

type Gesture =
  | { type: "idle" }
  | {
      type: "press";
      pointerId: number;
      day: Day;
      x: number;
      y: number;
      columns: Column[];
      timer: number | undefined;
      /** On touch, the press shows after a moment, so a scroll that starts here does not dip. */
      pressTimer: number | undefined;
    }
  | { type: "paint"; pointerId: number; mode: "set" | "clear"; days: Day[]; columns: Column[] }
  /** The long press opened the input: the rest of this press does nothing. */
  | { type: "held"; pointerId: number };

interface Column {
  day: Day;
  left: number;
  right: number;
}

/**
 * The squares of one habit in the list, with their gestures:
 * - a tap applies `tapResult` (toggle a check, add the Step of a number, open the input);
 * - on a check habit, a press and a drag along the row paints the Days: the first square sets the
 *   state, every square under the finger gets it, and one batch is performed on release;
 * - on a number habit, a long press (or a right click) opens the exact value.
 * A vertical drag stays a scroll: the squares allow `pan-y`, and the browser's cancel ends the
 * gesture without a change.
 */
export function DayCells({
  habit,
  days,
  today,
  entries,
  onTap,
  onOpenInput,
  onPaint,
}: DayCellsProps) {
  const gesture = useRef<Gesture>({ type: "idle" });
  // The pressed Day, and whether its press showed late (on touch), so the hold has less time left.
  const [pressed, setPressed] = useState<{ day: Day; late: boolean } | null>(null);
  // The Day whose value the input sheet edits: it stays visible above the sheet's scrim.
  const { entry: editing } = useSheetSearch();
  const [paint, setPaint] = useState<{ mode: "set" | "clear"; days: Day[] } | null>(null);

  const reset = () => {
    const current = gesture.current;
    if (current.type === "press") {
      window.clearTimeout(current.timer);
      window.clearTimeout(current.pressTimer);
    }
    gesture.current = { type: "idle" };
    setPressed(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const day = dayOf(event.target);
    if (day === null || isFuture(day, today)) return;
    reset();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const columns = measureColumns(event.currentTarget);
    const timer =
      habit.kind === "number"
        ? window.setTimeout(() => {
            gesture.current = { type: "held", pointerId: event.pointerId };
            setPressed(null);
            haptic("lift");
            onOpenInput(day);
          }, LONG_PRESS_MS)
        : undefined;
    gesture.current = {
      type: "press",
      pointerId: event.pointerId,
      day,
      x: event.clientX,
      y: event.clientY,
      columns,
      timer,
      pressTimer:
        event.pointerType === "touch"
          ? window.setTimeout(() => setPressed({ day, late: true }), TOUCH_PRESS_DELAY_MS)
          : undefined,
    };
    if (event.pointerType !== "touch") setPressed({ day, late: false });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (current.type === "press" && current.pointerId === event.pointerId) {
      const over = columnAt(current.columns, event.clientX);
      if (
        habit.kind === "check" &&
        over !== null &&
        over !== current.day &&
        !isFuture(over, today)
      ) {
        window.clearTimeout(current.timer);
        window.clearTimeout(current.pressTimer);
        const mode = entries(habit.id, current.day) === undefined ? "set" : "clear";
        const painted = [current.day, over];
        gesture.current = {
          type: "paint",
          pointerId: event.pointerId,
          mode,
          days: painted,
          columns: current.columns,
        };
        setPressed(null);
        setPaint({ mode, days: painted });
        haptic();
        return;
      }
      // On a check habit, a move along the row may still become a paint. Elsewhere, a press that
      // slips is neither a tap nor a long press.
      if (habit.kind === "check") return;
      const moved = Math.hypot(event.clientX - current.x, event.clientY - current.y);
      if (moved > SLOP_PX) reset();
      return;
    }
    if (current.type === "paint" && current.pointerId === event.pointerId) {
      const over = columnAt(current.columns, event.clientX);
      if (over === null || current.days.includes(over) || isFuture(over, today)) return;
      const painted = [...current.days, over];
      gesture.current = { ...current, days: painted };
      setPaint({ mode: current.mode, days: painted });
      haptic();
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (current.type === "idle" || current.pointerId !== event.pointerId) return;
    reset();
    if (current.type === "press") {
      haptic();
      onTap(current.day);
    } else if (current.type === "paint") {
      setPaint(null);
      onPaint(current.days, current.mode);
    }
  };

  const onPointerCancel = () => {
    reset();
    setPaint(null);
  };

  return (
    <div
      className="day-cells"
      data-kind={habit.kind}
      role="group"
      aria-label={habit.name}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={(event) => {
        // Pointer taps are handled on pointerup; a click with no pointer (`detail` 0) is Enter or
        // Space on the focused square.
        if (event.detail !== 0) return;
        const day = dayOf(event.target);
        if (day !== null) onTap(day);
      }}
      onContextMenu={(event) => {
        const day = dayOf(event.target);
        if (day === null) return;
        event.preventDefault();
        if (habit.kind !== "number" || gesture.current.type === "held" || isFuture(day, today))
          return;
        reset();
        onOpenInput(day);
      }}
    >
      {days.map((day) => {
        const value = entries(habit.id, day);
        const painting = paint !== null && paint.days.includes(day);
        const shownIntensity = painting ? (paint.mode === "set" ? 1 : 0) : intensity(habit, value);
        return (
          <button
            key={day}
            type="button"
            className="day-cell"
            data-day={day}
            data-pressed={pressed?.day === day ? "" : undefined}
            data-late={pressed?.day === day && pressed.late ? "" : undefined}
            aria-label={`${formatDayLong(day)}: ${describeEntry(habit, value)}`}
            aria-pressed={habit.kind === "check" ? value !== undefined : undefined}
            aria-haspopup={habit.kind === "check" || habit.kind === "number" ? undefined : "dialog"}
            disabled={isFuture(day, today)}
          >
            <span className="day-cell-press">
              <DaySquare
                color={habit.color}
                intensity={shownIntensity}
                recorded={painting ? paint.mode === "set" : value !== undefined}
                data-entry={entryRef(habit.id, day)}
                data-editing={editing === entryRef(habit.id, day) ? "" : undefined}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function dayOf(target: EventTarget): Day | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLElement>("[data-day]");
  return (cell?.dataset.day as Day | undefined) ?? null;
}

function measureColumns(container: HTMLElement): Column[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-day]"), (cell) => {
    const rect = cell.getBoundingClientRect();
    return { day: cell.dataset.day as Day, left: rect.left, right: rect.right };
  });
}

/** The Day of the column under `x`; past the ends, the first or the last column. */
function columnAt(columns: Column[], x: number): Day | null {
  if (columns.length === 0) return null;
  for (const column of columns) {
    if (x >= column.left && x < column.right) return column.day;
  }
  return x < columns[0]!.left ? columns[0]!.day : columns[columns.length - 1]!.day;
}
