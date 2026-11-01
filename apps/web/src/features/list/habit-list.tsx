import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { lastDays, orderBetween, paintAction, tapResult, type Day, type Habit } from "@habit/core";
import { useEntries, useHabits } from "@habit/data";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useAct } from "@/components/act";
import { dayOfMonth, weekdayLetter } from "@/components/format";
import { preloadHabitIcons } from "@/components/habit-icon";
import { haptic } from "@/components/haptics";
import { entryRef, useOpenSheet, useSheetSearch } from "@/components/sheet-search";
import { useIsWide } from "@/components/use-media-query";
import { Dock, useTabEnter } from "@/features/dock";
import { HabitRow } from "@/features/list/habit-row";
import { useRowEntrance } from "@/features/list/row-entrance";
import { useToday } from "@/features/list/use-today";

/** A press on the icon or the name this long lifts the row for a reorder (touch). */
const LIFT_DELAY_MS = 300;

/**
 * The habit list, the main screen: a sticky header of the last Days, a row per habit, and the
 * dock over the bottom edge, near the thumb. No title, no cards, no lines: space separates the
 * rows. With `pageOpen`, the page of a habit is open beside the list (a desktop), and a row opens
 * its page in that place.
 */
export function HabitList({ pageOpen = false }: { pageOpen?: boolean }) {
  const { source, habits } = useHabits();
  const entries = useEntries();
  const act = useAct();
  const openSheet = useOpenSheet();
  const today = useToday();
  const wide = useIsWide();
  const days = useMemo(() => lastDays(today, wide ? 7 : 5), [today, wide]);
  const ignoreClicksUntil = useRef(0);
  const rows = useRef<HTMLDivElement>(null);
  const tabEnter = useTabEnter();

  useEffect(() => preloadHabitIcons(habits.map((habit) => habit.icon)), [habits]);
  useOpenNewWhenEmpty(source !== "none" && habits.length === 0);
  useRowEntrance(rows, habits, source !== "none");

  const onTap = useCallback(
    (habit: Habit, day: Day) => {
      const result = tapResult(habit, day, entries(habit.id, day), today);
      if (result.type === "action") act(result.action);
      else if (result.type === "openInput") openSheet({ entry: entryRef(habit.id, day) });
    },
    [act, entries, openSheet, today],
  );

  const onOpenInput = useCallback(
    (habit: Habit, day: Day) => openSheet({ entry: entryRef(habit.id, day) }),
    [openSheet],
  );

  const onPaint = useCallback(
    (habit: Habit, painted: Day[], mode: "set" | "clear") => {
      const action = paintAction(habit, painted, mode, today, entries);
      const count = action.type === "batch" ? action.actions.length : 1;
      if (count === 0) return;
      const noun = count === 1 ? "day" : "days";
      act(action, {
        undo: mode === "set" ? `Painted ${count} ${noun}` : `Cleared ${count} ${noun}`,
      });
    },
    [act, entries, today],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: LIFT_DELAY_MS, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Space lifts and drops; Enter still opens the habit.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    ignoreClicksUntil.current = performance.now() + 250;
    if (over === null || active.id === over.id) return;
    const from = habits.findIndex((habit) => habit.id === active.id);
    const to = habits.findIndex((habit) => habit.id === over.id);
    if (from < 0 || to < 0) return;
    const moved = arrayMove(habits, from, to);
    const order = orderBetween(moved[to - 1]?.order, moved[to + 1]?.order);
    act({ type: "moveHabit", id: habits[from]!.id, order });
  };

  const announcements = useMemo(() => reorderAnnouncements(habits), [habits]);

  // The click that ends a mouse drag must not open the habit under the pointer. dnd-kit stops
  // that click at the document for 50ms, before React sees it, but not its default: the browser
  // would follow the link's href. A listener on the window comes first and cancels it.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (performance.now() < ignoreClicksUntil.current) event.preventDefault();
    };
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, []);

  return (
    <div className="habit-list" data-tab-enter={tabEnter}>
      <h1 className="sr-only">Habits</h1>
      <DayHeader days={days} today={today} />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        accessibility={{ announcements }}
        onDragStart={() => haptic("lift")}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          ignoreClicksUntil.current = performance.now() + 250;
        }}
      >
        <SortableContext
          items={habits.map((habit) => habit.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={rows} className="relative">
            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                days={days}
                today={today}
                entries={entries}
                replace={pageOpen}
                onTap={onTap}
                onOpenInput={onOpenInput}
                onPaint={onPaint}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Dock current="habits" canCreate={source !== "none"} />
    </div>
  );
}

/** The weekday letter over the date of each column; today is bright and bold. */
function DayHeader({ days, today }: { days: Day[]; today: Day }) {
  return (
    <div className="list-header" aria-hidden>
      <div className="day-columns">
        {days.map((day) => (
          <div key={day} className="list-header-day" data-today={day === today ? "" : undefined}>
            <small>{weekdayLetter(day)}</small>
            <span>{dayOfMonth(day)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** With no habits, the create sheet opens by itself, once per visit of the list. */
function useOpenNewWhenEmpty(empty: boolean) {
  const openSheet = useOpenSheet();
  const { new: creating, edit, entry } = useSheetSearch();
  const opened = useRef(false);
  const sheetOpen = creating === true || edit !== undefined || entry !== undefined;
  useEffect(() => {
    if (!empty || opened.current || sheetOpen) return;
    opened.current = true;
    openSheet({ new: true });
  }, [empty, openSheet, sheetOpen]);
}

function reorderAnnouncements(habits: Habit[]): Announcements {
  const name = (id: string | number) =>
    habits.find((habit) => habit.id === id)?.name ?? "The habit";
  const position = (id: string | number) => habits.findIndex((habit) => habit.id === id) + 1;
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over === null
        ? undefined
        : `${name(active.id)} is at position ${position(over.id)} of ${habits.length}.`,
    onDragEnd: ({ active, over }) =>
      over === null
        ? `${name(active.id)} was dropped.`
        : `${name(active.id)} was dropped at position ${position(over.id)} of ${habits.length}.`,
    onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
  };
}
