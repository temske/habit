import {
  intensity,
  type Day,
  type EntryValue,
  type Habit,
  type HabitId,
  type Month,
} from "@habit/core";
import { useReducedMotion } from "motion/react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { DaySquare } from "@/components/day-square";
import { formatMonth, formatMonthShort, yearGrid } from "@/features/habit-page/months";

/** A Month gets its short name over the grid only when it has this many columns. */
const LABEL_MIN_COLUMNS = 3;

export interface YearGridProps {
  habit: Habit;
  today: Day;
  entries: (habitId: HabitId, day: Day) => EntryValue | undefined;
  /** The Month that the calendar shows. */
  month: Month;
  onSelectMonth: (month: Month) => void;
}

/**
 * The last 12 months as a GitHub-like grid: a column for each week, Monday at the top, small
 * squares in the habit color, the stronger the fuller the Day. The squares keep their size, so a
 * phone shows the last months and scrolls sideways to the older ones; it opens at today. It takes
 * no input, but each Month over its columns is a button that moves the calendar to that Month, and
 * the Month of the calendar scrolls into view. The Months are one Tab stop: the arrows move between
 * them.
 */
export function YearGrid({ habit, today, entries, month, onSelectMonth }: YearGridProps) {
  const grid = useMemo(() => yearGrid(today), [today]);
  const [focused, setFocused] = useState<Month | null>(null);
  const scroller = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() === true;
  const opened = useRef(false);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (element === null) return;
    if (!opened.current) {
      opened.current = true;
      element.scrollLeft = element.scrollWidth;
      return;
    }
    const button = element.querySelector<HTMLElement>(`[data-month="${month}"]`);
    if (button !== null) reveal(element, button, reduceMotion ? "instant" : "smooth");
  }, [month, reduceMotion]);

  const months = grid.months.map((region) => region.month);
  const tabStop =
    [focused, month].find((candidate) => candidate !== null && months.includes(candidate)) ??
    months.at(-1);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = months.indexOf((event.target as HTMLElement).dataset.month as Month);
    if (index < 0) return;
    const next =
      event.key === "ArrowLeft"
        ? index - 1
        : event.key === "ArrowRight"
          ? index + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? months.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    const destination = months[Math.min(Math.max(next, 0), months.length - 1)]!;
    setFocused(destination);
    const button = event.currentTarget.querySelector<HTMLElement>(`[data-month="${destination}"]`);
    button?.focus({ preventScroll: true });
    if (button !== null && scroller.current !== null) reveal(scroller.current, button, "instant");
  };

  return (
    <section ref={scroller} className="hp-year" aria-label="The last 12 months" data-own-swipe="">
      <div className="hp-year-inner" onKeyDown={onKeyDown}>
        <div className="hp-year-grid" aria-hidden>
          {grid.columns.map((column) =>
            column.map((day, row) => {
              if (day === null) return <span key={`${column[0]}-${row}`} />;
              const value = entries(habit.id, day);
              // DaySquare is memoized: a change of one Day renders one square, not 364. A grid
              // this large does not animate: a new Target would pulse every square at once.
              return (
                <DaySquare
                  key={day}
                  color={habit.color}
                  intensity={intensity(habit, value)}
                  recorded={value !== undefined}
                  size="var(--cell)"
                  look="flat"
                  animated={false}
                />
              );
            }),
          )}
        </div>
        {grid.months.map((region) => (
          <button
            key={region.month}
            type="button"
            className="hp-year-month"
            data-month={region.month}
            tabIndex={region.month === tabStop ? 0 : -1}
            style={{ "--start": region.start, "--span": region.span } as CSSProperties}
            aria-label={formatMonth(region.month)}
            aria-current={region.month === month ? "true" : undefined}
            onClick={() => onSelectMonth(region.month)}
          >
            {region.span >= LABEL_MIN_COLUMNS ? (
              <span className="hp-year-month-label" aria-hidden>
                {formatMonthShort(region.month)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Scrolls the grid sideways, as little as it takes, until a Month is in view with some air. */
function reveal(scroller: HTMLElement, button: HTMLElement, behavior: ScrollBehavior) {
  const view = scroller.getBoundingClientRect();
  const box = button.getBoundingClientRect();
  const air = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
  const delta =
    box.left < view.left + air
      ? box.left - view.left - air
      : box.right > view.right - air
        ? box.right - view.right + air
        : 0;
  if (delta !== 0) scroller.scrollBy({ left: delta, behavior });
}
