import type { Habit } from "@habit/core";
import { useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, type RefObject } from "react";

import { durations, morphTiming } from "@/components/motion";

/**
 * A habit made this long ago or less is new: it was created on this device a moment ago (the
 * create sheet writes `createdAt` with the local clock), or synced in from another device at once.
 * A habit that only comes into view (the first load, the live data after the snapshot, the Undo of
 * a delete) is older.
 */
export const NEW_HABIT_MS = 3000;

/**
 * The delay of the entrance after the "Add habit" press: the sheet starts to leave first, so the
 * row grows into the room the sheet gives back.
 */
const ENTRANCE_DELAY_MS = 120;

/** `--ease-out` of styles.css. */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/**
 * The habits that enter the list now: those not in `previous` and made in the last `NEW_HABIT_MS`.
 * None on the first load (`previous` is null), so a start or a reload never animates.
 */
export function enteringHabits(
  previous: ReadonlySet<string> | null,
  habits: readonly Habit[],
  now: number,
): Habit[] {
  if (previous === null) return [];
  return habits.filter((habit) => !previous.has(habit.id) && now - habit.createdAt <= NEW_HABIT_MS);
}

/**
 * Animates a new habit's row into the list at its place: it grows from no height with the morph
 * spring, so the rows under it and "New habit" move down with it, and its content rises and fades
 * in. Under reduced motion, nothing moves: the row is there at once, and it fades in.
 *
 * `rows` holds one element per habit, in the order of `habits`. `loaded` is false until the first
 * data, which never animates.
 */
export function useRowEntrance(
  rows: RefObject<HTMLElement | null>,
  habits: readonly Habit[],
  loaded: boolean,
): void {
  const reduceMotion = useReducedMotion() === true;
  const known = useRef<Set<string> | null>(null);

  useLayoutEffect(() => {
    if (!loaded) return;
    const entering = enteringHabits(known.current, habits, Date.now());
    known.current = new Set(habits.map((habit) => habit.id));
    const container = rows.current;
    if (container === null) return;
    for (const habit of entering) {
      const row = container.children[habits.indexOf(habit)];
      if (row instanceof HTMLElement) enter(row, reduceMotion);
    }
  }, [rows, habits, loaded, reduceMotion]);
}

function enter(row: HTMLElement, reduceMotion: boolean): void {
  const content = row.firstElementChild;
  // jsdom has no Web Animations.
  if (typeof row.animate !== "function" || !(content instanceof HTMLElement)) return;

  if (reduceMotion) {
    content.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: durations.fade,
      easing: EASE_OUT,
      delay: ENTRANCE_DELAY_MS,
      fill: "backwards",
    });
    return;
  }

  const height = row.offsetHeight;
  const spring = {
    duration: morphTiming.duration,
    easing: morphTiming.easing,
    delay: ENTRANCE_DELAY_MS,
    fill: "backwards" as const,
  };
  // The row clips its content while it is shorter than it.
  row.style.overflow = "clip";
  const grow = row.animate([{ height: "0px" }, { height: `${height}px` }], spring);
  content.animate([{ transform: "translateY(-0.75rem)" }, { transform: "none" }], spring);
  content.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 240,
    easing: EASE_OUT,
    delay: ENTRANCE_DELAY_MS,
    fill: "backwards",
  });
  const done = () => row.style.removeProperty("overflow");
  grow.finished.then(done, done);
}
