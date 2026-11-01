import type { Habit } from "@habit/core";
import { demoState } from "@habit/data/testing";
import { expect, test } from "vite-plus/test";

import { enteringHabits, NEW_HABIT_MS } from "@/features/list/row-entrance";

const NOW = 1_800_000_000_000;
const [water, read] = Object.values(demoState("2026-11-01" as never).habits) as Habit[];
const made = (habit: Habit, createdAt: number): Habit => ({ ...habit, createdAt });

test("the first load never animates a row", () => {
  expect(enteringHabits(null, [made(water!, NOW)], NOW)).toEqual([]);
});

test("a habit made a moment ago enters", () => {
  const fresh = made(read!, NOW - 50);
  expect(enteringHabits(new Set([water!.id]), [water!, fresh], NOW)).toEqual([fresh]);
});

test("an old habit that comes into view does not enter: a reload, a sync, the Undo of a delete", () => {
  const old = made(read!, NOW - NEW_HABIT_MS - 1);
  expect(enteringHabits(new Set([water!.id]), [water!, old], NOW)).toEqual([]);
});
