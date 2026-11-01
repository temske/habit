import {
  addDays,
  addMonths,
  daysOfMonth,
  intensity,
  isFuture,
  monthOf,
  paintAction,
  tapResult,
  type Day,
  type EntryValue,
  type Habit,
  type HabitId,
  type Month,
} from "@habit/core";
import { useEntries, useMonth } from "@habit/data";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useReducedMotion } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useAct } from "@/components/act";
import { DaySquare } from "@/components/day-square";
import { dayOfMonth, describeEntry, formatDayLong } from "@/components/format";
import { haptic } from "@/components/haptics";
import { useVariant } from "@/components/lab";
import { entryRef, useCloseSheet, useOpenSheet, useSheetSearch } from "@/components/sheet-search";
import { MonthPicker } from "@/features/habit-page/month-picker";
import { formatMonth, monthWeeks } from "@/features/habit-page/months";
import { MonthsOfYear, useMonthZoom } from "@/features/habit-page/month-zoom";
import { useMonthPager } from "@/features/habit-page/use-month-pager";
import { LONG_PRESS_MS } from "@/features/list/day-cells";

/** A check Day held this long starts a paint; a faster move is a swipe between Months. */
export const PAINT_HOLD_MS = 200;
/** On touch, a press shows after this delay, so a swipe or a scroll that starts on a Day does not dip it. */
const TOUCH_PRESS_DELAY_MS = 60;
/** A press that moves farther than this is not a tap. */
const SLOP_PX = 8;
/**
 * A swipe faster than this on average, in pixels per millisecond, is a flick: it turns the page
 * however short it is (STANDARDS of the review-animations skill: about 0.11).
 */
const FLICK_PX_PER_MS = 0.11;
/** A flick must still be a deliberate move, not a slip at the end of a tap. */
const FLICK_MIN_PX = 16;
/** A trackpad swipe whose events stop for this long has lifted without momentum. */
const WHEEL_LIFT_MS = 80;
/** Wheel events closer than this belong to one trackpad swipe (with its momentum). */
const WHEEL_QUIET_MS = 250;
/** A step this much larger than the last one is a new swipe, not the momentum of the old one. */
const WHEEL_FRESH_PX = 4;
/** The speed of a mouse wheel's notch, in pixels per second: a quick swipe. */
const NOTCH_SPEED = 1000;

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

type Gesture =
  | { type: "idle" }
  | {
      type: "press";
      pointerId: number;
      pointerType: string;
      /** The Day under the finger, or null (a blank cell, or the pages were moving). */
      day: Day | null;
      x: number;
      y: number;
      /** The hold that turns this press into a paint or opens the input. */
      timer: number | undefined;
      pressTimer: number | undefined;
    }
  | {
      type: "swipe";
      pointerId: number;
      x: number;
      /** When the swipe started, for its average speed. */
      t: number;
      samples: { t: number; x: number }[];
    }
  | { type: "paint"; pointerId: number; mode: "set" | "clear"; days: Day[] }
  /** The long press opened the input: the rest of this press does nothing. */
  | { type: "held"; pointerId: number };

interface Paint {
  mode: "set" | "clear";
  days: Day[];
}

/** The pressed Day, and what holding it does: the press shrinks for the whole hold. */
interface Pressed {
  day: Day;
  hold: "paint" | "input" | null;
  /** On touch the press shows late (TOUCH_PRESS_DELAY_MS), so the hold has less time to run. */
  late: boolean;
}

export interface MonthCalendarProps {
  habit: Habit;
  today: Day;
  /** The Month on screen. The parent owns it, so the grid can move it too. */
  month: Month;
  onMonthChange: (month: Month) => void;
}

/**
 * The calendar of a habit: one Month per page. A swipe moves between Months (the current Month
 * first, older Months with a swipe to the right, no future Months), and so does a trackpad swipe.
 * The calendar is as tall as the weeks of its Month. Under the Days, near the thumb: the name of
 * the Month, which opens the picker, Today, and the arrows; Page Up and Page Down page too.
 *
 * Input, as in the list (docs/v1.md, "Input"):
 * - check: a tap toggles the Day; a hold of PAINT_HOLD_MS, then a drag, paints the Days (the first
 *   Day sets the state, every Day under the finger gets it) and shows one Undo toast. With a
 *   mouse, a drag paints at once: a mouse does not swipe.
 * - number: a tap adds the Step; a long press (or a right click) opens the input.
 * - choice, scale, text: a tap opens the input.
 * - future Days are locked.
 */
export function MonthCalendar({ habit, today, month, onMonthChange }: MonthCalendarProps) {
  const newest = monthOf(today);
  // The years to pick from: back to the habit's start, and at least the two before this one.
  const oldestYear = Math.min(
    new Date(habit.createdAt).getFullYear(),
    Number(newest.slice(0, 4)) - 2,
  );
  const entries = useEntries();
  const act = useAct();
  const openSheet = useOpenSheet();
  const closeSheet = useCloseSheet();
  // The Day whose value the input sheet edits: it stays visible above the sheet's scrim.
  const { entry: editing, monthPicker } = useSheetSearch();
  const pickerAnchor = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion() === true;
  const pager = useMonthPager({ month, newest, onMonthChange, reduceMotion });
  // Two ways to another Month, to compare in the lab: the calendar that zooms out to the months of
  // its year (the default), and the picker in a sheet.
  const picker = useVariant("month-picker", {
    label: "Month picker",
    options: ["Zoom out", "Sheet"],
  });
  const zoom = useMonthZoom({
    month,
    newest,
    oldestYear,
    reduceMotion,
    jump: pager.jump,
    triggerRef: pickerAnchor,
  });
  const atMonths = zoom.level === "months";
  const gesture = useRef<Gesture>({ type: "idle" });
  const [pressed, setPressed] = useState<Pressed | null>(null);
  const [paint, setPaint] = useState<Paint | null>(null);
  const [focusDay, setFocusDay] = useState<Day | null>(null);
  const pendingFocus = useRef<Day | null>(null);

  const latest = useRef({ entries, habit, today });
  latest.current = { entries, habit, today };

  const tap = useCallback(
    (day: Day) => {
      const { entries, habit, today } = latest.current;
      const result = tapResult(habit, day, entries(habit.id, day), today);
      if (result.type === "action") act(result.action);
      else if (result.type === "openInput") openSheet({ entry: entryRef(habit.id, day) });
    },
    [act, openSheet],
  );

  const openInput = useCallback(
    (day: Day) => openSheet({ entry: entryRef(latest.current.habit.id, day) }),
    [openSheet],
  );

  const commitPaint = useCallback(
    (days: Day[], mode: "set" | "clear") => {
      if (days.length === 1) {
        // A hold without a drag: the same as a tap, without a toast.
        tap(days[0]!);
        return;
      }
      const { entries, habit, today } = latest.current;
      const action = paintAction(habit, days, mode, today, entries);
      const count = action.type === "batch" ? action.actions.length : 1;
      if (count === 0) return;
      const noun = count === 1 ? "day" : "days";
      act(action, {
        undo: mode === "set" ? `Painted ${count} ${noun}` : `Cleared ${count} ${noun}`,
      });
    },
    [act, tap],
  );

  const page = useCallback(
    (direction: -1 | 1) => {
      const destination = addMonths(month, direction);
      if (destination <= newest) pager.goTo(destination);
    },
    [month, newest, pager],
  );

  // ── Pointer gestures ──────────────────────────────────────────────────────────────────────────

  const clearTimers = () => {
    const current = gesture.current;
    if (current.type !== "press") return;
    window.clearTimeout(current.timer);
    window.clearTimeout(current.pressTimer);
  };

  const startPaint = (pointerId: number, days: Day[]) => {
    clearTimers();
    const { entries, habit } = latest.current;
    const mode = entries(habit.id, days[0]!) === undefined ? "set" : "clear";
    gesture.current = { type: "paint", pointerId, mode, days };
    setPressed(null);
    setPaint({ mode, days });
    haptic("lift");
  };

  const endPress = () => {
    clearTimers();
    gesture.current = { type: "idle" };
    setPressed(null);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gesture.current.type !== "idle") return;
    const moving = pager.grab();
    const day = moving ? null : enabledDayAt(event.target);
    const { pointerId, pointerType } = event;
    let timer: number | undefined;
    let hold: Pressed["hold"] = null;
    if (day !== null && habit.kind === "check" && pointerType !== "mouse") {
      hold = "paint";
      timer = window.setTimeout(() => startPaint(pointerId, [day]), PAINT_HOLD_MS);
    } else if (day !== null && habit.kind === "number") {
      hold = "input";
      timer = window.setTimeout(() => {
        clearTimers();
        gesture.current = { type: "held", pointerId };
        setPressed(null);
        haptic("lift");
        openInput(day);
      }, LONG_PRESS_MS);
    }
    event.currentTarget.setPointerCapture?.(pointerId);
    const late = pointerType === "touch";
    const show = () => setPressed(day === null ? null : { day, hold, late });
    gesture.current = {
      type: "press",
      pointerId,
      pointerType,
      day,
      x: event.clientX,
      y: event.clientY,
      timer,
      pressTimer: late ? window.setTimeout(show, TOUCH_PRESS_DELAY_MS) : undefined,
    };
    if (!late) show();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (current.type === "idle" || current.pointerId !== event.pointerId) return;

    if (current.type === "press") {
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (current.pointerType === "mouse") {
        const over = enabledDayAtPoint(event.clientX, event.clientY);
        if (over === current.day) return;
        if (habit.kind === "check" && current.day !== null && over !== null) {
          startPaint(event.pointerId, [current.day, over]);
        } else if (Math.hypot(dx, dy) > SLOP_PX) {
          endPress();
          pager.release(0);
        }
        return;
      }
      if (Math.abs(dx) > SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
        clearTimers();
        gesture.current = {
          type: "swipe",
          pointerId: event.pointerId,
          x: event.clientX,
          t: event.timeStamp,
          samples: [{ t: event.timeStamp, x: event.clientX }],
        };
        setPressed(null);
        return;
      }
      // A vertical move is the browser's scroll: it cancels the pointer.
      if (Math.hypot(dx, dy) > SLOP_PX) endPress();
      return;
    }

    if (current.type === "swipe") {
      pager.drag(event.clientX - current.x);
      current.samples.push({ t: event.timeStamp, x: event.clientX });
      if (current.samples.length > 8) current.samples.shift();
      return;
    }

    if (current.type === "paint") {
      const over = enabledDayAtPoint(event.clientX, event.clientY);
      if (over === null || current.days.includes(over)) return;
      const days = [...current.days, over];
      gesture.current = { ...current, days };
      setPaint({ mode: current.mode, days });
      haptic();
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (current.type === "idle" || current.pointerId !== event.pointerId) return;
    endPress();
    switch (current.type) {
      case "press":
        if (current.day === null) {
          pager.release(0);
        } else {
          haptic();
          tap(current.day);
        }
        return;
      case "swipe": {
        // The lift is the last sample: a finger that stopped before it lifted has no speed.
        current.samples.push({ t: event.timeStamp, x: event.clientX });
        pager.release(velocityOf(current.samples), flickOf(current, event));
        return;
      }
      case "paint":
        setPaint(null);
        commitPaint(current.days, current.mode);
        return;
      case "held":
        return;
    }
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (current.type === "idle" || current.pointerId !== event.pointerId) return;
    endPress();
    setPaint(null);
    if (current.type === "press" || current.type === "swipe") pager.release(0);
  };

  // While a paint or a swipe runs, the page must not scroll: `touch-action` is fixed when the
  // finger lands, so a paint that starts after the hold stops the scroll here. React's touch
  // listeners are passive, so this one is native.
  useEffect(() => {
    const viewport = pager.viewportRef.current;
    if (viewport === null) return;
    const onTouchMove = (event: TouchEvent) => {
      const type = gesture.current.type;
      if ((type === "paint" || type === "swipe") && event.cancelable) event.preventDefault();
    };
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => viewport.removeEventListener("touchmove", onTouchMove);
  }, [pager.viewportRef]);

  // A horizontal trackpad swipe moves the pages with the fingers, as a swipe on a phone does, and
  // settles when they lift. The trackpad then keeps sending events with shrinking steps (its
  // momentum): those are ignored until it is quiet, or until a new swipe starts. None of them may
  // reach the browser, which would go back in the history.
  const pagerRef = useRef(pager);
  pagerRef.current = pager;
  useEffect(() => {
    const viewport = pagerRef.current.viewportRef.current;
    if (viewport === null) return;
    let phase: "idle" | "swipe" | "coast" = "idle";
    let start = 0;
    let dx = 0;
    let steps: number[] = [];
    let samples: { t: number; x: number }[] = [];
    let lastStep = 0;
    let quietUntil = 0;
    let timer: number | undefined;

    const settle = (t: number) => {
      window.clearTimeout(timer);
      phase = "coast";
      // A wheel with notches (a mouse) sends an event or two for a move: each move turns a page,
      // as a quick swipe would.
      if (steps.length <= 2) {
        const direction = Math.sign(dx) as -1 | 0 | 1;
        pagerRef.current.release(direction * NOTCH_SPEED, direction);
        return;
      }
      pagerRef.current.release(
        velocityOf(samples),
        flickOf({ x: 0, t: start }, { clientX: dx, timeStamp: t }),
      );
    };

    const onWheel = (event: WheelEvent) => {
      if (phase !== "swipe" && Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
        phase = "idle";
        return;
      }
      event.preventDefault();
      const now = event.timeStamp;
      const step = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaX * 16 : event.deltaX;
      if (phase === "coast") {
        const fresh = now > quietUntil || Math.abs(step) > Math.abs(lastStep) + WHEEL_FRESH_PX;
        lastStep = step;
        quietUntil = now + WHEEL_QUIET_MS;
        if (!fresh) return;
        phase = "idle";
      }
      if (phase === "idle") {
        pagerRef.current.grab();
        phase = "swipe";
        start = now;
        dx = 0;
        steps = [];
        samples = [];
      }
      dx -= step;
      steps.push(step);
      samples.push({ t: now, x: dx });
      if (samples.length > 8) samples.shift();
      pagerRef.current.drag(dx);
      lastStep = step;
      quietUntil = now + WHEEL_QUIET_MS;
      window.clearTimeout(timer);
      if (isMomentum(steps)) settle(now);
      else timer = window.setTimeout(() => settle(performance.now()), WHEEL_LIFT_MS);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      window.clearTimeout(timer);
    };
  }, []);

  // The height of the calendar follows the slide between two Months with different counts of weeks,
  // so it moves with the finger and settles with the same spring.
  const slotsRef = useRef(pager.slots);
  slotsRef.current = pager.slots;
  useLayoutEffect(() => {
    const viewport = pager.viewportRef.current;
    if (viewport === null) return;
    // Written only when it changes: between two Months with as many weeks, never.
    let rows = "";
    const update = (x: number) => {
      const from = monthWeeks(pager.shown).length;
      const neighbour = slotsRef.current.find((page) => page.slot === (x < 0 ? 1 : -1));
      const to = neighbour === undefined ? from : monthWeeks(neighbour.month).length;
      const progress = Math.min(Math.abs(x) / (viewport.clientWidth || 1), 1);
      const next = String(from + (to - from) * progress);
      if (next === rows) return;
      rows = next;
      viewport.style.setProperty("--rows", next);
    };
    update(pager.x.get());
    return pager.x.on("change", update);
  }, [pager.shown, pager.x, pager.viewportRef]);

  // ── Keyboard ──────────────────────────────────────────────────────────────────────────────────

  // One Day of the shown Month takes the Tab stop; the arrows move it (a roving tab index).
  const shownMonth = pager.shown;
  const tabDay = useMemo(() => {
    if (focusDay !== null && monthOf(focusDay) === shownMonth) return focusDay;
    if (monthOf(today) === shownMonth) return today;
    return `${shownMonth}-01` as Day;
  }, [focusDay, shownMonth, today]);

  useLayoutEffect(() => {
    const day = pendingFocus.current;
    if (day === null || monthOf(day) !== shownMonth) return;
    pendingFocus.current = null;
    pager.trackRef.current
      ?.querySelector<HTMLElement>(`[data-slot="0"] [data-day="${day}"]`)
      ?.focus({ preventScroll: true });
  }, [shownMonth, pager.trackRef]);

  const focusOn = (next: Day) => {
    setFocusDay(next);
    if (monthOf(next) === shownMonth) {
      pager.trackRef.current
        ?.querySelector<HTMLElement>(`[data-slot="0"] [data-day="${next}"]`)
        ?.focus({ preventScroll: true });
    } else {
      pendingFocus.current = next;
      pager.goTo(monthOf(next));
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const day = dayOfElement(event.target);
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const direction = event.key === "PageUp" ? -1 : 1;
      if (day === null) {
        page(direction);
        return;
      }
      // The same date in the other Month, or its last Day, but never after today.
      const destination = addMonths(monthOf(day), direction);
      if (destination > newest) return;
      const days = daysOfMonth(destination);
      const sameDate = days[Math.min(Number(day.slice(8)), days.length) - 1]!;
      focusOn(isFuture(sameDate, today) ? today : sameDate);
      return;
    }
    const step = ARROW_STEPS[event.key];
    if (step === undefined || day === null) return;
    event.preventDefault();
    const next = addDays(day, step);
    if (!isFuture(next, today)) focusOn(next);
  };

  const label = atMonths ? String(zoom.year) : formatMonth(month);
  const zooming = zoom.phase !== null;
  const showsMonths = atMonths || zoom.phase === "in";

  return (
    <section
      className="hp-cal"
      aria-labelledby="hp-cal-title"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !atMonths || zooming) return;
        event.preventDefault();
        zoom.zoomBack();
      }}
    >
      <h2 id="hp-cal-title" className="sr-only" aria-live="polite">
        {label}
      </h2>
      <div
        ref={zoom.stageRef}
        className="hp-cal-stage"
        data-level={zoom.level}
        data-zoom={zoom.phase ?? undefined}
        inert={zooming}
      >
        <div ref={zoom.daysRef} className="hp-cal-days" inert={atMonths}>
          <div className="hp-cal-weekdays" aria-hidden>
            {WEEKDAYS.map((letter, index) => (
              <span key={index}>{letter}</span>
            ))}
          </div>
          <div
            ref={pager.viewportRef}
            className="hp-cal-viewport"
            data-own-swipe=""
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onKeyDown={onKeyDown}
            onClick={(event) => {
              // Pointer taps are handled on pointerup; a click with no pointer (`detail` 0) is
              // Enter or Space on the focused Day.
              if (event.detail !== 0) return;
              const day = enabledDayAt(event.target);
              if (day !== null) tap(day);
            }}
            onContextMenu={(event) => {
              const day = dayOfElement(event.target);
              if (day === null) return;
              event.preventDefault();
              if (gesture.current.type === "held" || habit.kind !== "number") return;
              if (enabledDayAt(event.target) === null) return;
              endPress();
              openInput(day);
            }}
          >
            <div ref={pager.trackRef} className="hp-cal-track">
              {pager.slots.map(({ month: pageMonth, slot }) => (
                <MonthPage
                  key={pageMonth}
                  habit={habit}
                  month={pageMonth}
                  slot={slot}
                  today={today}
                  entries={entries}
                  pressed={slot === 0 ? pressed : null}
                  paint={slot === 0 ? paint : null}
                  tabDay={slot === 0 ? tabDay : null}
                  editing={slot === 0 ? editing : undefined}
                />
              ))}
            </div>
          </div>
        </div>
        {showsMonths ? (
          <div
            ref={zoom.monthsRef}
            className="hp-months"
            data-own-swipe=""
            role="group"
            aria-label={String(zoom.year)}
            {...zoom.monthsGestures}
          >
            <MonthsOfYear
              habit={habit}
              today={today}
              year={zoom.year}
              month={month}
              newest={newest}
              entries={entries}
              onPick={zoom.zoomIn}
            />
          </div>
        ) : null}
      </div>
      <div className="hp-cal-controls">
        <button
          ref={pickerAnchor}
          type="button"
          className="hp-cal-month"
          aria-label={
            picker === "Sheet"
              ? `${label}, choose a month`
              : atMonths
                ? `${label}, back to ${formatMonth(zoom.backTo)}`
                : `${label}, show the months of the year`
          }
          aria-haspopup={picker === "Sheet" ? "dialog" : undefined}
          aria-expanded={picker === "Sheet" ? undefined : atMonths}
          onClick={() => {
            if (picker === "Sheet") openSheet({ monthPicker: true });
            else if (atMonths) zoom.zoomBack();
            else zoom.zoomOut();
          }}
        >
          <span className="hp-cal-month-text">
            <span data-current="">{label}</span>
            {zoom.previousLabel === null ? null : (
              <span data-previous="" aria-hidden>
                {zoom.previousLabel}
              </span>
            )}
          </span>
          <CaretDownIcon weight="bold" aria-hidden />
        </button>
        {month === newest || atMonths ? null : (
          <button type="button" className="hp-cal-today" onClick={() => pager.goTo(newest)}>
            Today
          </button>
        )}
        <button
          type="button"
          className="hp-cal-arrow"
          aria-label={atMonths ? "Previous year" : "Previous month"}
          disabled={atMonths && zoom.year <= zoom.oldestYear}
          onClick={() => (atMonths ? zoom.stepYear(-1) : page(-1))}
        >
          <CaretLeftIcon weight="bold" />
        </button>
        <button
          type="button"
          className="hp-cal-arrow"
          aria-label={atMonths ? "Next year" : "Next month"}
          disabled={atMonths ? zoom.year >= zoom.newestYear : month >= newest}
          onClick={() => (atMonths ? zoom.stepYear(1) : page(1))}
        >
          <CaretRightIcon weight="bold" />
        </button>
      </div>
      {picker === "Sheet" ? (
        <MonthPicker
          open={monthPicker === true}
          month={month}
          newest={newest}
          oldestYear={oldestYear}
          anchor={pickerAnchor.current}
          onPick={(destination) => {
            pager.goTo(destination);
            closeSheet();
          }}
          onClose={closeSheet}
        />
      ) : null}
    </section>
  );
}

const ARROW_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

interface MonthPageProps {
  habit: Habit;
  month: Month;
  slot: -1 | 0 | 1;
  today: Day;
  entries: (habitId: HabitId, day: Day) => EntryValue | undefined;
  pressed: Pressed | null;
  paint: Paint | null;
  tabDay: Day | null;
  /** The `?entry` of the input sheet, if one is open. */
  editing: string | undefined;
}

/**
 * One Month: weeks are rows, Monday first. A Month older than the live window loads while its page
 * exists; until then its Days take no input.
 */
const MonthPage = memo(function MonthPage({
  habit,
  month,
  slot,
  today,
  entries,
  pressed,
  paint,
  tabDay,
  editing,
}: MonthPageProps) {
  const loading = useMonth(month) === "loading";
  const weeks = useMemo(() => monthWeeks(month), [month]);
  const offscreen = slot !== 0;
  return (
    <div
      className="hp-month"
      data-slot={slot}
      data-loading={loading ? "" : undefined}
      role="group"
      aria-label={formatMonth(month)}
      aria-busy={loading || undefined}
      aria-hidden={offscreen || undefined}
      inert={offscreen}
      style={offscreen ? { transform: `translateX(${slot * 100}%)` } : undefined}
    >
      {weeks
        .flat()
        .map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} className="hp-day-blank" />
          ) : (
            <CalendarDay
              key={day}
              habit={habit}
              day={day}
              today={today}
              value={entries(habit.id, day)}
              loading={loading}
              pressed={pressed?.day === day ? (pressed.hold ?? "tap") : null}
              pressedLate={pressed?.day === day && pressed.late}
              painted={paint !== null && paint.days.includes(day) ? paint.mode : null}
              tabbable={tabDay === day}
              editing={editing === entryRef(habit.id, day)}
            />
          ),
        )}
    </div>
  );
});

function CalendarDay({
  habit,
  day,
  today,
  value,
  loading,
  pressed,
  pressedLate,
  painted,
  tabbable,
  editing,
}: {
  habit: Habit;
  day: Day;
  today: Day;
  value: EntryValue | undefined;
  loading: boolean;
  pressed: "tap" | "paint" | "input" | null;
  pressedLate: boolean;
  painted: "set" | "clear" | null;
  tabbable: boolean;
  editing: boolean;
}) {
  const future = isFuture(day, today);
  const level = painted === null ? intensity(habit, value) : painted === "set" ? 1 : 0;
  const mark = painted === null ? optionMark(habit, value) : undefined;
  return (
    <button
      type="button"
      className="hp-day"
      data-day={day}
      data-today={day === today ? "" : undefined}
      data-future={future ? "" : undefined}
      data-pressed={pressed ?? undefined}
      data-late={pressedLate ? "" : undefined}
      tabIndex={tabbable ? 0 : -1}
      aria-label={`${formatDayLong(day)}: ${loading ? "loading" : describeEntry(habit, value)}`}
      aria-current={day === today ? "date" : undefined}
      aria-pressed={habit.kind === "check" && !loading ? value !== undefined : undefined}
      aria-haspopup={
        habit.kind === "choice" || habit.kind === "scale" || habit.kind === "text"
          ? "dialog"
          : undefined
      }
      disabled={future || loading}
    >
      <span className="hp-day-press">
        {/* The notch's mask would cut a ring drawn on the square: the ring of the Day under edit
            is on this box. */}
        <span
          className="hp-day-box"
          data-entry={entryRef(habit.id, day)}
          data-editing={editing ? "" : undefined}
        >
          {future ? null : (
            <DaySquare
              // Loaded data is not a value that rose: the square mounts at its value, without a
              // pulse.
              key={loading ? "loading" : "ready"}
              color={habit.color}
              intensity={loading ? 0 : level}
              recorded={!loading && (painted === null ? value !== undefined : painted === "set")}
              size="var(--cal-square)"
              look="fill"
              label={mark}
            />
          )}
          <span className="hp-day-date" aria-hidden>
            {dayOfMonth(day)}
          </span>
        </span>
      </span>
    </button>
  );
}

/** The emoji (or the first letter) of a choice, shown in its square. */
function optionMark(habit: Habit, value: EntryValue | undefined): string | undefined {
  if (habit.kind !== "choice" || value?.kind !== "choice") return undefined;
  const option = habit.options.find((candidate) => candidate.id === value.optionId);
  if (option === undefined) return undefined;
  return option.emoji ?? Array.from(option.label.trim())[0]?.toUpperCase();
}

function dayOfElement(target: EventTarget | null): Day | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLElement>("[data-day]");
  return (cell?.dataset.day as Day | undefined) ?? null;
}

/** The Day of a button on the shown page that takes input, or null. */
function enabledDayAt(target: EventTarget | null): Day | null {
  if (!(target instanceof Element)) return null;
  const cell = target.closest<HTMLButtonElement>("button[data-day]");
  if (cell === null || cell.disabled) return null;
  if (cell.closest("[data-slot]")?.getAttribute("data-slot") !== "0") return null;
  return cell.dataset.day as Day;
}

function enabledDayAtPoint(x: number, y: number): Day | null {
  return enabledDayAt(document.elementFromPoint?.(x, y) ?? null);
}

/** The direction of a flick: a short swipe that was fast on average. */
function flickOf(
  swipe: { x: number; t: number },
  event: { clientX: number; timeStamp: number },
): -1 | 0 | 1 {
  const distance = event.clientX - swipe.x;
  const elapsed = event.timeStamp - swipe.t;
  if (Math.abs(distance) < FLICK_MIN_PX || elapsed <= 0) return 0;
  return Math.abs(distance) / elapsed > FLICK_PX_PER_MS ? (Math.sign(distance) as -1 | 1) : 0;
}

/** The momentum of a trackpad after a lift: steps that shrink, event after event, one way. */
function isMomentum(steps: number[]): boolean {
  if (steps.length < 6) return false;
  const tail = steps.slice(-4);
  return tail.every(
    (step, index) =>
      index === 0 ||
      (Math.sign(step) === Math.sign(tail[0]!) && Math.abs(step) < Math.abs(tail[index - 1]!)),
  );
}

/** The finger's speed over the last 100 ms, in pixels per second. */
function velocityOf(samples: { t: number; x: number }[]): number {
  const last = samples[samples.length - 1];
  if (last === undefined) return 0;
  const first = samples.find((sample) => last.t - sample.t <= 100) ?? last;
  const elapsed = last.t - first.t;
  return elapsed > 0 ? ((last.x - first.x) / elapsed) * 1000 : 0;
}
