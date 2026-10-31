import { describe, expect, test } from "vite-plus/test";

import { parseDay } from "./day";
import type { Habit } from "./habit";
import {
  importHabitKit,
  type HabitKitCompletion,
  type HabitKitExport,
  type HabitKitHabit,
  type HabitKitInterval,
} from "./habitkit";

const NOW = Date.UTC(2026, 9, 31, 12);

let count = 0;

/** A HabitKit habit with a random-looking UUID of its own, as the app exports it. */
function kitHabit(fields: Partial<HabitKitHabit> = {}): HabitKitHabit {
  count += 1;
  const hex = count.toString(16).padStart(12, "0");
  return {
    id: `3f2a9c1e-7b4d-4e8a-9c3f-${hex}`,
    name: `Habit ${count}`,
    description: null,
    icon: "dumbbell",
    color: "green",
    archived: false,
    orderIndex: count,
    createdAt: "2025-09-22T03:21:07.970697Z",
    isInverse: false,
    inverseStartDate: null,
    inverseSpanBounds: [],
    emoji: null,
    ...fields,
  };
}

function interval(habit: HabitKitHabit, fields: Partial<HabitKitInterval> = {}): HabitKitInterval {
  return {
    habitId: habit.id,
    startDate: "2025-09-21T18:00:00.000Z",
    endDate: null,
    type: "none",
    requiredNumberOfCompletions: null,
    requiredNumberOfCompletionsPerDay: 1,
    unitType: "incremental",
    streakType: "day",
    allowExceedingGoal: false,
    ...fields,
  };
}

function completion(
  habit: HabitKitHabit,
  fields: Partial<HabitKitCompletion> = {},
): HabitKitCompletion {
  count += 1;
  return {
    id: `c-${count}`,
    date: "2026-10-25T20:00:00.000Z",
    habitId: habit.id,
    timezoneOffsetInMinutes: 240,
    amountOfCompletions: 1,
    note: null,
    ...fields,
  };
}

function exportOf(
  habits: HabitKitHabit[],
  completions: HabitKitCompletion[] = [],
  intervals: HabitKitInterval[] = habits.map((habit) => interval(habit)),
): HabitKitExport {
  return {
    formatVersion: 2,
    habits,
    completions,
    intervals,
    reminders: [],
    categories: [],
    categoryMappings: [],
  };
}

function run(data: unknown, options: { lastOrder?: string; includeArchived?: boolean } = {}) {
  return importHabitKit(data, { now: NOW, ...options });
}

function only(habits: Habit[]): Habit {
  expect(habits).toHaveLength(1);
  return habits[0]!;
}

describe("importHabitKit: a habit", () => {
  test("keeps the name, the description and the time of creation, and sets updatedAt to now", () => {
    const kit = kitHabit({
      name: "  gym ",
      description: " lift heavy ",
      createdAt: "2025-09-22T03:21:07.970697Z",
    });
    const habit = only(run(exportOf([kit])).habits);
    expect(habit).toMatchObject({
      name: "gym",
      description: "lift heavy",
      createdAt: Date.UTC(2025, 8, 22, 3, 21, 7, 970),
      updatedAt: NOW,
    });
    expect(habit.deletedAt).toBeUndefined();
  });

  test("makes a missing description empty", () => {
    expect(only(run(exportOf([kitHabit({ description: null })])).habits).description).toBe("");
  });

  test("cuts a name longer than 60 characters and reports it", () => {
    const kit = kitHabit({ name: "x".repeat(70) });
    const result = run(exportOf([kit]));
    expect(only(result.habits).name).toBe("x".repeat(60));
    expect(result.report.shortenedNames).toEqual(["x".repeat(70)]);
  });

  test("names a habit without a name", () => {
    expect(only(run(exportOf([kitHabit({ name: "  " })])).habits).name).toBe("Untitled");
  });

  test("an inverse habit is a quit Habit, any other a build Habit", () => {
    const quit = kitHabit({ isInverse: true });
    const build = kitHabit({ isInverse: false });
    const habits = run(exportOf([quit, build])).habits;
    expect(habits.map((habit) => habit.direction)).toEqual(["quit", "build"]);
  });
});

describe("importHabitKit: the icon", () => {
  test("an emoji habit keeps its emoji", () => {
    const kit = kitHabit({ icon: "defaultForEmoji", emoji: "⚡" });
    expect(only(run(exportOf([kit])).habits).icon).toEqual({ type: "emoji", emoji: "⚡" });
  });

  test("a HabitKit icon with a clear Phosphor equivalent becomes that icon", () => {
    const cases: [string, string][] = [
      ["dumbbell", "barbell"],
      ["capsules", "pill"],
      ["smartphoneSlash", "device-mobile-slash"],
      ["toothbrush", "tooth"],
      ["bookSpine", "book"],
      ["personMeditation", "flower-lotus"],
    ];
    const kits = cases.map(([icon]) => kitHabit({ icon }));
    const icons = run(exportOf(kits)).habits.map((habit) => habit.icon);
    expect(icons).toEqual(cases.map(([, name]) => ({ type: "phosphor", name })));
  });

  test("any other icon becomes the fallback, and the report names it", () => {
    const kit = kitHabit({ name: "bible", icon: "preaching" });
    const result = run(exportOf([kit]));
    expect(only(result.habits).icon).toEqual({ type: "phosphor", name: "sparkle" });
    expect(result.report.fallbackIcons).toEqual([{ habit: "bible", icon: "preaching" }]);
  });
});

describe("importHabitKit: the color", () => {
  test("each HabitKit color becomes the nearest Habit color", () => {
    const cases: [string, Habit["color"]][] = [
      ["red", "rose"],
      ["yellow", "mustard"],
      ["indigo", "violet"],
      ["sky", "sky"],
      ["fuchsia", "mauve"],
      ["pink", "raspberry"],
      ["cyan", "sky"],
      ["gray", "slate"],
      ["neutral", "stone"],
      ["stone", "stone"],
    ];
    const kits = cases.map(([color]) => kitHabit({ color }));
    const colors = run(exportOf(kits)).habits.map((habit) => habit.color);
    expect(colors).toEqual(cases.map(([, color]) => color));
  });

  test("an unknown color becomes stone, and the report names it", () => {
    const kit = kitHabit({ name: "odd", color: "#123456" });
    const result = run(exportOf([kit]));
    expect(only(result.habits).color).toBe("stone");
    expect(result.report.unknownColors).toEqual([{ habit: "odd", color: "#123456" }]);
  });
});

describe("importHabitKit: the Kind", () => {
  test("one completion a day is a check Habit", () => {
    const kit = kitHabit();
    const habits = run(exportOf([kit], [], [interval(kit)])).habits;
    expect(only(habits).kind).toBe("check");
  });

  test("more than one completion a day is a number Habit with that Target", () => {
    const kit = kitHabit();
    const habits = run(
      exportOf([kit], [], [interval(kit, { requiredNumberOfCompletionsPerDay: 3 })]),
    ).habits;
    expect(only(habits)).toMatchObject({ kind: "number", target: 3, step: 1 });
  });

  test("the current interval sets the goal, not an old one", () => {
    const kit = kitHabit();
    const intervals = [
      interval(kit, {
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2025-06-01T00:00:00.000Z",
        requiredNumberOfCompletionsPerDay: 1,
      }),
      interval(kit, {
        startDate: "2025-06-01T00:00:00.000Z",
        requiredNumberOfCompletionsPerDay: 4,
      }),
    ];
    expect(only(run(exportOf([kit], [], intervals)).habits)).toMatchObject({ target: 4 });
  });

  test("a habit without an interval is a check Habit", () => {
    expect(only(run(exportOf([kitHabit()], [], [])).habits).kind).toBe("check");
  });

  test("a measure habit is a number Habit with its unit", () => {
    const kit = kitHabit({ kind: "measure", unit: "km" });
    expect(only(run(exportOf([kit])).habits)).toEqual(
      expect.objectContaining({ kind: "number", unit: "km", step: 1 }),
    );
    expect(only(run(exportOf([kit])).habits)).not.toHaveProperty("target");
  });

  test("a measure habit with a unit such as /10 gets that Target", () => {
    const kit = kitHabit({ kind: "measure", unit: "/10" });
    expect(only(run(exportOf([kit])).habits)).toMatchObject({
      kind: "number",
      unit: "/10",
      target: 10,
    });
  });
});

describe("importHabitKit: the order", () => {
  test("sorts by orderIndex, then by the time of creation, after lastOrder", () => {
    const third = kitHabit({ name: "third", orderIndex: 2 });
    const second = kitHabit({
      name: "second",
      orderIndex: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const first = kitHabit({ name: "first", orderIndex: 1, createdAt: "2025-01-01T00:00:00.000Z" });
    const habits = run(exportOf([third, second, first]), { lastOrder: "a5" }).habits;
    expect(habits.map((habit) => habit.name)).toEqual(["first", "second", "third"]);
    const orders = habits.map((habit) => habit.order);
    expect(orders[0]! > "a5").toBe(true);
    expect([...orders].sort()).toEqual(orders);
    expect(new Set(orders).size).toBe(3);
  });
});

describe("importHabitKit: the ids", () => {
  const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  test("each Habit gets a UUIDv7 that starts with its time of creation", () => {
    const kit = kitHabit({ createdAt: "2025-09-22T03:21:07.970Z" });
    const { id } = only(run(exportOf([kit])).habits);
    expect(id).toMatch(UUID_V7);
    const msecs = parseInt(id.replaceAll("-", "").slice(0, 12), 16);
    expect(msecs).toBe(Date.UTC(2025, 8, 22, 3, 21, 7, 970));
  });

  test("the same export gives the same ids, so a second import finds the Habits it made", () => {
    const kits = [kitHabit(), kitHabit()];
    const first = run(exportOf(kits)).habits.map((habit) => habit.id);
    const second = run(exportOf(kits)).habits.map((habit) => habit.id);
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(2);
  });

  test("two habits made in the same millisecond get different ids", () => {
    const createdAt = "2025-09-22T03:14:51.521Z";
    const ids = run(exportOf([kitHabit({ createdAt }), kitHabit({ createdAt })])).habits.map(
      (habit) => habit.id,
    );
    expect(new Set(ids).size).toBe(2);
  });
});

describe("importHabitKit: the Entries", () => {
  test("the date plus the time zone offset gives the local Day", () => {
    const kit = kitHabit();
    const completions = [
      completion(kit, { date: "2026-10-25T20:00:00.000Z", timezoneOffsetInMinutes: 240 }),
      completion(kit, { date: "2025-09-21T18:00:00.000Z", timezoneOffsetInMinutes: 360 }),
      completion(kit, { date: "2026-03-01T05:00:01.000Z", timezoneOffsetInMinutes: -300 }),
    ];
    const days = run(exportOf([kit], completions)).entries.map((entry) => entry.day);
    expect(days).toEqual(["2025-09-22", "2026-03-01", "2026-10-26"].map(parseDay));
  });

  test("a completion of a check Habit is a check Entry, for the Habit's id, at now", () => {
    const kit = kitHabit();
    const result = run(exportOf([kit], [completion(kit)]));
    expect(result.entries).toEqual([
      {
        habitId: only(result.habits).id,
        day: parseDay("2026-10-26"),
        value: { kind: "check" },
        updatedAt: NOW,
      },
    ]);
  });

  test("a check Habit with more than one completion on a Day keeps a check, and the report counts it", () => {
    const kit = kitHabit();
    const result = run(exportOf([kit], [completion(kit, { amountOfCompletions: 3 })]));
    expect(result.entries.map((entry) => entry.value)).toEqual([{ kind: "check" }]);
    expect(result.report.cutToCheck).toBe(1);
  });

  test("a completion of a number Habit keeps its amount", () => {
    const kit = kitHabit({ kind: "measure", unit: "/10" });
    const result = run(exportOf([kit], [completion(kit, { amountOfCompletions: 7 })]));
    expect(result.entries.map((entry) => entry.value)).toEqual([{ kind: "number", value: 7 }]);
  });

  test("a completion with the amount 0 (a tap that was undone) gives no Entry", () => {
    const kit = kitHabit();
    const result = run(exportOf([kit], [completion(kit, { amountOfCompletions: 0 })]));
    expect(result.entries).toEqual([]);
    expect(result.report.skippedCompletions.empty).toBe(1);
  });

  test("two completions on the same Day give one Entry with the larger amount", () => {
    const kit = kitHabit({ kind: "measure", unit: "km" });
    const completions = [
      completion(kit, { date: "2026-10-25T20:00:00.000Z", amountOfCompletions: 2 }),
      completion(kit, { date: "2026-10-26T09:00:00.000Z", amountOfCompletions: 5 }),
      completion(kit, { date: "2026-10-26T10:00:00.000Z", amountOfCompletions: 3 }),
    ];
    const result = run(exportOf([kit], completions));
    expect(result.entries.map((entry) => entry.value)).toEqual([{ kind: "number", value: 5 }]);
    expect(result.report.skippedCompletions.sameDay).toBe(2);
  });

  test("a completion of an unknown habit or with a bad date is skipped and counted", () => {
    const kit = kitHabit();
    const stranger = kitHabit();
    const completions = [completion(stranger), completion(kit, { date: "yesterday" })];
    const result = run(exportOf([kit], completions));
    expect(result.entries).toEqual([]);
    expect(result.report.skippedCompletions).toMatchObject({ unknownHabit: 1, badDate: 1 });
  });

  test("a note is dropped, and the report keeps its text", () => {
    const kit = kitHabit({ name: "gym" });
    const completions = [
      completion(kit, { note: "legs day" }),
      completion(kit, { date: "2026-10-26T20:00:00.000Z", note: " " }),
    ];
    const result = run(exportOf([kit], completions));
    expect(result.entries).toHaveLength(2);
    expect(result.report.droppedNotes).toEqual([
      { habit: "gym", day: parseDay("2026-10-26"), note: "legs day" },
    ]);
  });

  test("entries are sorted by Habit, then by Day", () => {
    const a = kitHabit({ orderIndex: 1 });
    const b = kitHabit({ orderIndex: 0 });
    const completions = [
      completion(a, { date: "2026-10-02T00:00:00.000Z", timezoneOffsetInMinutes: 0 }),
      completion(b, { date: "2026-10-03T00:00:00.000Z", timezoneOffsetInMinutes: 0 }),
      completion(a, { date: "2026-10-01T00:00:00.000Z", timezoneOffsetInMinutes: 0 }),
    ];
    const result = run(exportOf([a, b], completions));
    const [habitB, habitA] = result.habits;
    expect(result.entries.map((entry) => [entry.habitId, entry.day])).toEqual([
      [habitB!.id, "2026-10-03"],
      [habitA!.id, "2026-10-01"],
      [habitA!.id, "2026-10-02"],
    ]);
  });
});

describe("importHabitKit: archived habits", () => {
  test("are skipped by default, with their completions, and the report names them", () => {
    const active = kitHabit({ name: "active" });
    const archived = kitHabit({ name: "old", archived: true });
    const completions = [completion(active), completion(archived), completion(archived)];
    const result = run(exportOf([active, archived], completions));
    expect(result.habits.map((habit) => habit.name)).toEqual(["active"]);
    expect(result.entries).toHaveLength(1);
    expect(result.report.skippedHabits).toEqual([{ name: "old", completions: 2 }]);
    expect(result.report.skippedCompletions.ofSkippedHabits).toBe(2);
  });

  test("are imported as normal Habits with includeArchived", () => {
    const archived = kitHabit({ name: "old", archived: true });
    const result = run(exportOf([archived], [completion(archived)]), { includeArchived: true });
    expect(result.habits.map((habit) => habit.name)).toEqual(["old"]);
    expect(result.entries).toHaveLength(1);
    expect(result.report.skippedHabits).toEqual([]);
  });
});

describe("importHabitKit: the report", () => {
  test("counts the Habits of each Kind and the Entries", () => {
    const check = kitHabit();
    const measure = kitHabit({ kind: "measure", unit: "/10" });
    const result = run(
      exportOf(
        [check, measure],
        [completion(check), completion(measure, { amountOfCompletions: 6 })],
      ),
    );
    expect(result.report.habitsByKind).toEqual({
      check: 1,
      number: 1,
      choice: 0,
      scale: 0,
      text: 0,
    });
    expect(result.report.entries).toBe(2);
  });
});

describe("importHabitKit: the input", () => {
  test("rejects data that is not a HabitKit export", () => {
    expect(() => run(null)).toThrow(/HabitKit/);
    expect(() => run({ habits: [] })).toThrow(/HabitKit/);
    expect(() => run({ ...exportOf([]), habits: [{ name: "no id" }] })).toThrow(/HabitKit/);
  });

  test("reports a format version other than 2, and still reads the data", () => {
    const result = run({ ...exportOf([kitHabit()]), formatVersion: 3 });
    expect(result.habits).toHaveLength(1);
    expect(result.report.warnings).toEqual([expect.stringContaining("formatVersion 3")]);
  });
});
