import { monthOf, type Habit, type HabitId, type Month } from "@habit/core";
import { useEntries, useHabit, useHabits } from "@habit/data";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";

import { DaySquare } from "@/components/day-square";
import { HabitIcon } from "@/components/habit-icon";
import { habitColorStyle } from "@/components/palette";
import { useOpenSheet } from "@/components/sheet-search";
import { MonthCalendar } from "@/features/habit-page/month-calendar";
import { useEditedDayInView } from "@/features/habit-page/use-edited-day-in-view";
import { YearGrid } from "@/features/habit-page/year-grid";
import { useToday } from "@/features/list/use-today";
import { beforeScreenChange, screenTransition } from "@/features/screens/screen-transition";

import "@/features/habit-page/habit-page.css";

/**
 * The page of a habit (`/habits/$habitId`): the icon and the name, a grid of the last 12 months,
 * and a calendar with one Month per page, with Back and Edit in the dock at the bottom. A tap on a
 * Month in the grid moves the calendar there.
 */
export function HabitPage({ habitId }: { habitId: HabitId }) {
  const habit = useHabit(habitId);
  const { source } = useHabits();

  if (source === "none") return <PageSkeleton />;
  if (habit === undefined || habit.deletedAt !== undefined) return <MissingHabit />;
  return <HabitDetail habit={habit} />;
}

function HabitDetail({ habit }: { habit: Habit }) {
  const today = useToday();
  const entries = useEntries();
  const openSheet = useOpenSheet();
  const [month, setMonth] = useState<Month>(() => monthOf(today));
  const page = useRef<HTMLElement>(null);
  useEditedDayInView(page, habit.id);

  return (
    <main ref={page} className="habit-page" style={habitColorStyle(habit.color)}>
      <header className="hp-identity">
        <HabitIcon icon={habit.icon} color={habit.color} size="var(--hp-icon)" />
        {/* A name or a description in a right-to-left script reads in its own direction. */}
        <h1 className="hp-name" dir="auto">
          {habit.name}
        </h1>
      </header>
      {habit.description.trim() === "" ? null : (
        <p className="hp-description" dir="auto">
          {habit.description}
        </p>
      )}
      <YearGrid
        habit={habit}
        today={today}
        entries={entries}
        month={month}
        onSelectMonth={setMonth}
      />
      <MonthCalendar habit={habit} today={today} month={month} onMonthChange={setMonth} />
      <PageActions>
        <button
          type="button"
          className="dock-button hp-edit"
          onClick={() => openSheet({ edit: habit.id })}
        >
          <PencilSimpleIcon weight="bold" aria-hidden />
          Edit
        </button>
      </PageActions>
    </main>
  );
}

/**
 * The page's dock: one pill over its bottom edge, near the thumb, with back to the list, then the
 * page's own control. On a phone it takes the place of the list's dock: the pill stays where it is
 * and changes its shape while the screens slide under it (`.dock-pill` in styles.css). Back goes
 * back in the history when the app came from the list, so the list keeps its scroll; after a
 * reload or from a link, it goes to `/`. On a phone the page slides away to the right and uncovers
 * the list; on a desktop it slides away from beside the list.
 */
function PageActions({ children }: { children?: ReactNode }) {
  const canGoBack = useCanGoBack();
  const router = useRouter();
  const onBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    beforeScreenChange();
    if (!canGoBack) return;
    event.preventDefault();
    // The browser's back plays the transition too (`animateTraversals` in features/screens).
    router.history.back();
  };
  return (
    <nav className="dock hp-actions" aria-label="Habit">
      <div className="dock-pill">
        <Link
          to="/"
          className="dock-button hp-back"
          aria-label="Back to habits"
          viewTransition={screenTransition}
          onClick={onBack}
        >
          <CaretLeftIcon weight="bold" />
        </Link>
        {children}
      </div>
    </nav>
  );
}

/** A deleted habit, or a link to one that never existed: a calm way back. */
function MissingHabit() {
  return (
    <main className="habit-page">
      <div className="hp-missing">
        <DaySquare color="stone" intensity={0} variant="ghost" size="2.5rem" animated={false} />
        <h1 className="hp-missing-title">This habit is not here</h1>
        <p className="hp-missing-text">It was deleted, or the link is wrong.</p>
        <Link to="/" className="hp-missing-link">
          Back to habits
        </Link>
      </div>
      <PageActions />
    </main>
  );
}

/** Until the first data comes (no snapshot yet): the shape of the page, without data. */
function PageSkeleton() {
  return (
    <main className="habit-page hp-skeleton" aria-busy aria-label="Loading the habit">
      <div className="hp-identity">
        <span className="hp-skeleton-icon" />
        <span className="hp-skeleton-name" />
      </div>
      <PageActions />
    </main>
  );
}
