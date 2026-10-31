import {
  intensity,
  isFuture,
  monthOf,
  type Day,
  type EntryValue,
  type Habit,
  type HabitId,
  type Month,
} from "@habit/core";
import { useMonth } from "@habit/data";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import { DaySquare } from "@/components/day-square";
import { durations, morphTiming } from "@/components/motion";
import { formatMonth, formatMonthShort, monthWeeks } from "@/features/habit-page/months";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** A swipe this long, or a flick, flips the year. */
const SWIPE_PX = 48;
const FLICK_MIN_PX = 16;
const FLICK_PX_PER_MS = 0.11;
/** A trackpad swipe this long flips the year once; its momentum after that does nothing. */
const WHEEL_PX = 60;
const WHEEL_QUIET_MS = 250;

/** A box in the coordinates of the stage. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a zoom measures before the layout changes, to start from there. */
type Before =
  | { direction: "out"; height: number; layer: Box; grid: Box | null }
  | { direction: "in"; height: number; target: Month; mini: Box };

export interface MonthZoom {
  /** The Days of a Month, or the months of a year in their place. */
  level: "days" | "months";
  /** The year on show at the months level. */
  year: number;
  oldestYear: number;
  newestYear: number;
  /** A zoom that is still moving: the calendar takes no input until it ends. */
  phase: "out" | "in" | null;
  /** The label before the zoom, while it crossfades into the new one. */
  previousLabel: string | null;
  stageRef: RefObject<HTMLDivElement | null>;
  daysRef: RefObject<HTMLDivElement | null>;
  monthsRef: RefObject<HTMLDivElement | null>;
  zoomOut: () => void;
  zoomIn: (month: Month) => void;
  /**
   * Where the label leads back at the months level: the open Month if the year on show has it,
   * else the same month of that year, but never past this one.
   */
  backTo: Month;
  zoomBack: () => void;
  stepYear: (direction: -1 | 1) => void;
  /** The gestures of the months level: a swipe flips the year. */
  monthsGestures: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: () => void;
    onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
  };
}

/**
 * The calendar zooms out in place, from the Days of its Month to the months of its year, and back
 * into a month. On the way out the Days shrink onto the open Month's small calendar and fade into
 * it, and the other months come in around it, the nearest first; the way in is the same in
 * reverse. All of it runs on the morph spring, and the height of the calendar follows. Under
 * reduced motion the two levels crossfade.
 */
export function useMonthZoom({
  month,
  newest,
  oldestYear: firstYear,
  reduceMotion,
  jump,
  triggerRef,
}: {
  month: Month;
  newest: Month;
  oldestYear: number;
  reduceMotion: boolean;
  /** Shows a Month in the calendar at once. */
  jump: (month: Month) => void;
  /** The label under the calendar: its text crossfades, and the focus may come back to it. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}): MonthZoom {
  const stageRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<HTMLDivElement>(null);
  const monthsRef = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<"days" | "months">("days");
  const [year, setYear] = useState(() => yearOf(month));
  const [phase, setPhase] = useState<"out" | "in" | null>(null);
  const [previousLabel, setPreviousLabel] = useState<string | null>(null);
  const before = useRef<Before | null>(null);
  /** The Day that had the focus when the calendar zoomed out. */
  const focusedDay = useRef<Day | null>(null);
  /** Where the focus goes once a zoom has ended: the stage takes no focus while it moves. */
  const focusAfter = useRef<"months" | "days" | null>(null);
  const flip = useRef<-1 | 0 | 1>(0);

  const newestYear = yearOf(newest);
  const oldestYear = Math.min(firstYear, yearOf(month));

  const zoomOut = () => {
    const stage = stageRef.current;
    const days = daysRef.current;
    if (phase !== null || level !== "days" || stage === null || days === null) return;
    const active = document.activeElement;
    focusedDay.current =
      active instanceof HTMLElement && days.contains(active)
        ? ((active.dataset.day as Day | undefined) ?? null)
        : null;
    before.current = {
      direction: "out",
      height: stage.offsetHeight,
      layer: boxOf(stage, days),
      grid: daysGrid(stage, days),
    };
    setPreviousLabel(formatMonth(month));
    setYear(yearOf(month));
    setLevel("months");
    setPhase("out");
  };

  const zoomIn = (target: Month) => {
    const stage = stageRef.current;
    const cell = monthsRef.current?.querySelector<HTMLElement>(`[data-month="${target}"]`) ?? null;
    const mini = cell?.querySelector<HTMLElement>(".hp-months-mini") ?? null;
    if (phase !== null || level !== "months" || target > newest) return;
    if (stage === null || cell === null || mini === null) return;
    before.current = {
      direction: "in",
      height: stage.offsetHeight,
      target,
      mini: boxOf(stage, mini),
    };
    setPreviousLabel(String(year));
    jump(target);
    setLevel("days");
    setPhase("in");
  };

  const same = `${year}-${month.slice(5, 7)}` as Month;
  const backTo = yearOf(month) === year ? month : same > newest ? newest : same;
  const zoomBack = () => zoomIn(backTo);

  const stepYear = (direction: -1 | 1) => {
    const next = year + direction;
    if (phase !== null || level !== "months" || next < oldestYear || next > newestYear) return;
    flip.current = direction;
    setYear(next);
  };

  // The grid of the page can move the calendar while the months show: the year follows it.
  useEffect(() => {
    if (level === "months" && phase === null) setYear(yearOf(month));
    // Only a new Month from outside: a flip of the year keeps the Month.
  }, [month]);

  useLayoutEffect(() => {
    if (phase === null) {
      moveFocus(focusAfter.current);
      focusAfter.current = null;
      return;
    }
    const snapshot = before.current;
    const stage = stageRef.current;
    const days = daysRef.current;
    const months = monthsRef.current;
    if (snapshot === null || stage === null || days === null || months === null) return;
    const target = snapshot.direction === "out" ? month : snapshot.target;
    const cell = months.querySelector<HTMLElement>(`[data-month="${target}"]`);
    const motion =
      reduceMotion || cell === null
        ? crossfade(snapshot.direction, days, months)
        : snapshot.direction === "out"
          ? zoomOutMotion(snapshot, stage, days, months, cell)
          : zoomInMotion(snapshot, stage, days, months, cell);
    const label = labelMotion(triggerRef.current, reduceMotion);
    let live = true;
    void motion.finished.then(() => {
      if (!live) return;
      before.current = null;
      focusAfter.current = snapshot.direction === "out" ? "months" : "days";
      // The motions stop in the commit that ends the zoom (this effect's cleanup), so the layers
      // never show a frame between their last keyframe and their resting place.
      setPhase(null);
      setPreviousLabel(null);
    });
    return () => {
      live = false;
      motion.cancel();
      label.cancel();
    };

    function moveFocus(where: "months" | "days" | null) {
      if (where === "months") {
        monthsRef.current
          ?.querySelector<HTMLElement>("[aria-current]")
          ?.focus({ preventScroll: true });
        return;
      }
      if (where !== "days") return;
      const day = focusedDay.current;
      focusedDay.current = null;
      const back =
        day !== null && monthOf(day) === month
          ? daysRef.current?.querySelector<HTMLElement>(`[data-slot="0"] [data-day="${day}"]`)
          : null;
      (back ?? triggerRef.current)?.focus({ preventScroll: true });
    }
    // Each zoom runs once, when its layout is in place.
  }, [phase]);

  // A flip of the year: the new months come in from the side they lie on.
  useLayoutEffect(() => {
    const direction = flip.current;
    flip.current = 0;
    const months = monthsRef.current;
    if (direction === 0 || months === null) return;
    const animation = reduceMotion
      ? months.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: durations.fade,
          easing: EASE_OUT,
        })
      : months.animate(
          [{ opacity: 0, transform: `translateX(${direction * 1.5}rem)` }, { opacity: 1 }],
          morphTiming,
        );
    return () => animation.cancel();
  }, [year, reduceMotion]);

  // A horizontal trackpad swipe flips the year once; none of its events may reach the browser,
  // which would go back in the history.
  const stepRef = useRef(stepYear);
  stepRef.current = stepYear;
  useEffect(() => {
    const months = monthsRef.current;
    if (level !== "months" || months === null) return;
    let sum = 0;
    let quietUntil = 0;
    let spent = false;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (event.timeStamp > quietUntil) {
        sum = 0;
        spent = false;
      }
      quietUntil = event.timeStamp + WHEEL_QUIET_MS;
      if (spent) return;
      sum += event.deltaX;
      if (Math.abs(sum) < WHEEL_PX) return;
      spent = true;
      stepRef.current(sum > 0 ? 1 : -1);
    };
    months.addEventListener("wheel", onWheel, { passive: false });
    return () => months.removeEventListener("wheel", onWheel);
  }, [level]);

  // A swipe to the right shows the older year, as in the calendar; a tap still picks a month.
  const press = useRef<{ id: number; x: number; y: number; t: number } | null>(null);
  const swiped = useRef(false);
  const monthsGestures: MonthZoom["monthsGestures"] = {
    onPointerDown: (event) => {
      if (event.pointerType === "mouse") return;
      press.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        t: event.timeStamp,
      };
      swiped.current = false;
    },
    onPointerUp: (event) => {
      const start = press.current;
      press.current = null;
      if (start === null || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      const elapsed = event.timeStamp - start.t;
      const flick =
        Math.abs(dx) >= FLICK_MIN_PX && elapsed > 0 && Math.abs(dx) / elapsed > FLICK_PX_PER_MS;
      if (Math.abs(dx) < SWIPE_PX && !flick) return;
      swiped.current = true;
      stepYear(dx > 0 ? -1 : 1);
    },
    onPointerCancel: () => {
      press.current = null;
    },
    onClickCapture: (event) => {
      if (!swiped.current) return;
      swiped.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  return {
    level,
    year,
    oldestYear,
    newestYear,
    phase,
    previousLabel,
    stageRef,
    daysRef,
    monthsRef,
    zoomOut,
    zoomIn,
    backTo,
    zoomBack,
    stepYear,
    monthsGestures,
  };
}

interface Motion {
  finished: Promise<unknown>;
  cancel: () => void;
}

function together(animations: Animation[], main: Animation): Motion {
  return {
    finished: main.finished,
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}

function zoomOutMotion(
  before: Extract<Before, { direction: "out" }>,
  stage: HTMLElement,
  days: HTMLElement,
  months: HTMLElement,
  cell: HTMLElement,
): Motion {
  const { duration } = morphTiming;
  const mini = cell.querySelector<HTMLElement>(".hp-months-mini");
  const height = stage.animate(
    [{ height: `${before.height}px` }, { height: `${stage.offsetHeight}px` }],
    morphTiming,
  );
  const animations: Animation[] = [height];
  const inside = cell.querySelector(".hp-months-in");
  if (inside !== null) {
    animations.push(
      inside.animate([{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }], {
        duration,
        fill: "backwards",
      }),
    );
  }
  if (before.grid !== null && mini !== null) {
    animations.push(
      days.animate(
        [{ transform: "none" }, { transform: onto(before.layer, before.grid, boxOf(stage, mini)) }],
        { ...morphTiming, fill: "forwards" },
      ),
    );
  }
  animations.push(
    days.animate(
      [{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0, offset: 0.7 }, { opacity: 0 }],
      { duration, fill: "forwards" },
    ),
  );
  const weekdays = days.querySelector(".hp-cal-weekdays");
  if (weekdays !== null) {
    animations.push(
      weekdays.animate([{ opacity: 1 }, { opacity: 0, offset: 0.25 }, { opacity: 0 }], {
        duration,
      }),
    );
  }
  const cells = [...months.querySelectorAll<HTMLElement>(".hp-months-cell")];
  const at = cells.indexOf(cell);
  cells.forEach((other, index) => {
    if (other === cell) return;
    const distance = Math.hypot((index % 3) - (at % 3), Math.floor(index / 3) - Math.floor(at / 3));
    animations.push(
      other.animate(
        [
          { opacity: 0, transform: "scale(0.9)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: duration * 0.6,
          delay: duration * (0.18 + distance * 0.045),
          easing: EASE_OUT,
          fill: "backwards",
        },
      ),
    );
  });
  return together(animations, height);
}

function zoomInMotion(
  before: Extract<Before, { direction: "in" }>,
  stage: HTMLElement,
  days: HTMLElement,
  months: HTMLElement,
  cell: HTMLElement,
): Motion {
  const { duration } = morphTiming;
  const layer = boxOf(stage, days);
  const grid = daysGrid(stage, days);
  const height = stage.animate(
    [{ height: `${before.height}px` }, { height: `${stage.offsetHeight}px` }],
    morphTiming,
  );
  const animations: Animation[] = [height];
  const inside = cell.querySelector(".hp-months-in");
  if (inside !== null) {
    animations.push(
      inside.animate([{ opacity: 1 }, { opacity: 0, offset: 0.3 }, { opacity: 0 }], {
        duration,
        fill: "forwards",
      }),
    );
  }
  months.querySelectorAll<HTMLElement>(".hp-months-cell").forEach((other) => {
    if (other === cell) return;
    animations.push(
      other.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(0.94)" }], {
        duration: duration * 0.35,
        easing: EASE_OUT,
        fill: "forwards",
      }),
    );
  });
  if (grid !== null) {
    animations.push(
      days.animate(
        [{ transform: onto(layer, grid, before.mini) }, { transform: "none" }],
        morphTiming,
      ),
    );
  }
  animations.push(
    days.animate(
      [{ opacity: 0 }, { opacity: 0, offset: 0.15 }, { opacity: 1, offset: 0.55 }, { opacity: 1 }],
      { duration },
    ),
  );
  const weekdays = days.querySelector(".hp-cal-weekdays");
  if (weekdays !== null) {
    animations.push(
      weekdays.animate([{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1 }], { duration }),
    );
  }
  return together(animations, height);
}

/** The old label fades out quickly, and the new one fades in after it. */
function labelMotion(trigger: HTMLElement | null, reduceMotion: boolean): Motion {
  const previous = trigger?.querySelector("[data-previous]") ?? null;
  const current = trigger?.querySelector("[data-current]") ?? null;
  if (previous === null || current === null) {
    return { finished: Promise.resolve(), cancel: () => {} };
  }
  const { duration } = reduceMotion ? { duration: durations.fade * 2 } : morphTiming;
  const animations = [
    previous.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: duration * 0.15,
      fill: "forwards",
    }),
    current.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: duration * 0.25,
      delay: duration * 0.15,
      fill: "backwards",
    }),
  ];
  return together(animations, animations[1]!);
}

/** Under reduced motion the two levels crossfade in place. */
function crossfade(direction: "out" | "in", days: HTMLElement, months: HTMLElement): Motion {
  const timing = { duration: durations.fade, easing: EASE_OUT, fill: "forwards" as const };
  const [leaving, coming] = direction === "out" ? [days, months] : [months, days];
  const animations = [
    leaving.animate([{ opacity: 1 }, { opacity: 0 }], timing),
    coming.animate([{ opacity: 0 }, { opacity: 1 }], timing),
  ];
  return together(animations, animations[1]!);
}

function boxOf(stage: Element, node: Element): Box {
  const origin = stage.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
}

/**
 * The squares of the shown page, from the left edge of its first column's square to the right
 * edge of its last column's, and from the top of its first row's: the part that lands on the
 * small calendar. Each square sits in the middle of its cell.
 */
function daysGrid(stage: Element, days: Element): Box | null {
  const page = days.querySelector<HTMLElement>('[data-slot="0"]');
  const square = page?.querySelector<HTMLElement>(".hp-day-box") ?? null;
  const cell = square?.closest<HTMLElement>(".hp-day") ?? null;
  if (page === null || square === null || cell === null) return null;
  const box = boxOf(stage, page);
  const style = getComputedStyle(page);
  const left = Number.parseFloat(style.paddingLeft) || 0;
  const right = Number.parseFloat(style.paddingRight) || 0;
  const inner = square.getBoundingClientRect();
  const outer = cell.getBoundingClientRect();
  const inset = (outer.width - inner.width) / 2;
  const top = inner.top - outer.top;
  return {
    x: box.x + left + inset,
    y: box.y + top,
    w: box.w - left - right - 2 * inset,
    h: box.h - top,
  };
}

/**
 * The transform of the Days layer (scaled from its top left) that lays its grid onto a target
 * box: the open Month's small calendar.
 */
function onto(layer: Box, grid: Box, target: Box): string {
  const scale = grid.w > 0 ? target.w / grid.w : 1;
  const x = target.x - layer.x - scale * (grid.x - layer.x);
  const y = target.y - layer.y - scale * (grid.y - layer.y);
  return `translate(${x}px, ${y}px) scale(${scale})`;
}

function yearOf(month: Month): number {
  return Number(month.slice(0, 4));
}

export interface MonthsOfYearProps {
  habit: Habit;
  today: Day;
  year: number;
  /** The Month of the calendar: its cell is the target of the zoom. */
  month: Month;
  newest: Month;
  entries: (habitId: HabitId, day: Day) => EntryValue | undefined;
  onPick: (month: Month) => void;
}

/**
 * The months of a year, three to a row, each a button with its short name over a small calendar
 * of flat squares (the year grid's look), Monday first and six weeks high. A month after this one
 * has no squares and takes no tap.
 */
export function MonthsOfYear({
  habit,
  today,
  year,
  month,
  newest,
  entries,
  onPick,
}: MonthsOfYearProps) {
  const months = Array.from(
    { length: 12 },
    (_, index) => `${year}-${String(index + 1).padStart(2, "0")}` as Month,
  );
  return months.map((candidate) => {
    const later = candidate > newest;
    return (
      <button
        key={candidate}
        type="button"
        className="hp-months-cell"
        data-month={candidate}
        aria-label={formatMonth(candidate)}
        aria-current={candidate === month ? "true" : undefined}
        disabled={later}
        onClick={() => onPick(candidate)}
      >
        <span className="hp-months-bg" />
        <span className="hp-months-in">
          <span className="hp-months-name" aria-hidden>
            {formatMonthShort(candidate)}
          </span>
          {later ? (
            <span className="hp-months-mini" />
          ) : (
            <MiniMonth habit={habit} month={candidate} today={today} entries={entries} />
          )}
        </span>
      </button>
    );
  });
}

const MiniMonth = memo(function MiniMonth({
  habit,
  month,
  today,
  entries,
}: {
  habit: Habit;
  month: Month;
  today: Day;
  entries: (habitId: HabitId, day: Day) => EntryValue | undefined;
}) {
  // An older Month loads while it shows; until then its squares are empty.
  useMonth(month);
  return (
    <span className="hp-months-mini" aria-hidden>
      {monthWeeks(month)
        .flat()
        .map((day, index) => {
          if (day === null || isFuture(day, today)) return <span key={day ?? `blank-${index}`} />;
          const value = entries(habit.id, day);
          return (
            <DaySquare
              key={day}
              color={habit.color}
              intensity={intensity(habit, value)}
              recorded={value !== undefined}
              size="var(--mini-cell)"
              look="flat"
              animated={false}
            />
          );
        })}
    </span>
  );
});
