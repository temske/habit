// @vitest-environment edge-runtime
import type { Day, Entry, Habit, HabitId } from "@habit/core";
import { importHabitKit } from "@habit/core";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const OWNER = "user_owner";
const ALL: { from: Day; to: Day } = { from: "2000-01-01" as Day, to: "2099-12-31" as Day };

beforeEach(() => {
  vi.stubEnv("OWNER_USER_IDS", OWNER);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

/** A small HabitKit export: two habits, three completions. */
function mapped(lastOrder?: string): { habits: Habit[]; entries: Entry[] } {
  const habit = (id: string, orderIndex: number) => ({
    id,
    name: id,
    description: null,
    icon: "dumbbell",
    color: "green",
    archived: false,
    orderIndex,
    createdAt: "2025-09-22T03:21:07.970Z",
    isInverse: false,
    inverseStartDate: null,
    inverseSpanBounds: [],
    emoji: null,
  });
  const completion = (habitId: string, date: string) => ({
    id: `${habitId}-${date}`,
    date,
    habitId,
    timezoneOffsetInMinutes: 240,
    amountOfCompletions: 1,
    note: null,
  });
  const { habits, entries } = importHabitKit(
    {
      formatVersion: 2,
      habits: [habit("gym", 0), habit("book", 1)],
      completions: [
        completion("gym", "2026-10-24T20:00:00.000Z"),
        completion("gym", "2026-10-25T20:00:00.000Z"),
        completion("book", "2026-10-25T20:00:00.000Z"),
      ],
      intervals: [],
    },
    { now: 1_000, ...(lastOrder !== undefined && { lastOrder }) },
  );
  return { habits, entries };
}

function setup() {
  const t = convexTest(schema, modules);
  const run = async (lastOrder?: string) => {
    const { habits, entries } = mapped(lastOrder);
    const habitResult = await t.mutation(internal.habitkit.insertHabits, {
      userId: OWNER,
      habits,
    });
    const entryResult = await t.mutation(internal.habitkit.insertEntries, {
      userId: OWNER,
      entries,
    });
    return { habitResult, entryResult, habits };
  };
  return { t, run };
}

describe("the HabitKit import", () => {
  test("writes the Habits and the Entries, and the owner sees them", async () => {
    const { t, run } = setup();
    const { habitResult, entryResult, habits } = await run();
    expect(habitResult).toEqual({ inserted: 2, existing: 0 });
    expect(entryResult).toEqual({ inserted: 3, existing: 0, withoutHabit: 0 });

    const data = await t.withIdentity({ subject: OWNER }).query(api.data.days, ALL);
    expect(data.habits.map((habit) => habit.name)).toEqual(["gym", "book"]);
    expect(data.entries).toHaveLength(3);
    expect(
      await t.query(internal.habitkit.count, {
        userId: OWNER,
        habitIds: habits.map((habit) => habit.id),
      }),
    ).toEqual({ habits: 2, entries: 3 });
  });

  test("a second run adds nothing", async () => {
    const { t, run } = setup();
    await run();
    const lastOrder = await t.query(internal.habitkit.lastOrder, { userId: OWNER });
    const second = await run(lastOrder ?? undefined);
    expect(second.habitResult).toEqual({ inserted: 0, existing: 2 });
    expect(second.entryResult).toEqual({ inserted: 0, existing: 3, withoutHabit: 0 });
    const data = await t.withIdentity({ subject: OWNER }).query(api.data.days, ALL);
    expect(data.habits).toHaveLength(2);
    expect(data.entries).toHaveLength(3);
  });

  test("does not overwrite an Entry that the owner cleared", async () => {
    const { t, run } = setup();
    const { habits } = await run();
    const gym = habits[0]!.id;
    await t.withIdentity({ subject: OWNER }).mutation(api.data.perform, {
      action: { type: "clearEntry", habitId: gym, day: "2026-10-25" as Day },
      now: 2_000,
    });
    await run();
    const data = await t.withIdentity({ subject: OWNER }).query(api.data.days, ALL);
    expect(data.entries.filter((entry) => entry.habitId === gym)).toHaveLength(1);
  });

  test("lastOrder is the largest order of the user's Habits", async () => {
    const { t, run } = setup();
    expect(await t.query(internal.habitkit.lastOrder, { userId: OWNER })).toBeNull();
    const { habits } = await run("a5");
    expect(await t.query(internal.habitkit.lastOrder, { userId: OWNER })).toBe(habits[1]!.order);
  });

  test("skips an Entry of a Habit that the user does not have", async () => {
    const { t } = setup();
    const result = await t.mutation(internal.habitkit.insertEntries, {
      userId: OWNER,
      entries: [
        {
          habitId: "missing" as HabitId,
          day: "2026-10-26" as Day,
          value: { kind: "check" },
          updatedAt: 1,
        },
      ],
    });
    expect(result).toEqual({ inserted: 0, existing: 0, withoutHabit: 1 });
  });

  test("refuses a user who is not an owner", async () => {
    const { t } = setup();
    await expect(
      t.mutation(internal.habitkit.insertHabits, {
        userId: "user_typo",
        habits: mapped().habits,
      }),
    ).rejects.toThrow(/notAnOwner/);
  });
});
