import { v7 } from "uuid";

import { parseDay, type Day } from "./day";
import type { Entry, EntryValue } from "./entry";
import type { Habit, HabitIcon, Kind } from "./habit";
import type { HabitId } from "./ids";
import { orderBetween } from "./order";
import type { HabitColor } from "./palette";

// The import of a HabitKit export (formatVersion 2), as the app writes it to a JSON file. Only the
// fields that the import reads are typed. docs/import.md explains the mapping and what is lost.

export interface HabitKitHabit {
  id: string;
  name: string;
  description: string | null;
  /** A HabitKit icon name, such as "dumbbell", or "defaultForEmoji" when `emoji` is set. */
  icon: string;
  /** A Tailwind color name, such as "indigo". */
  color: string;
  archived: boolean;
  orderIndex: number;
  /** An ISO date-time, such as "2025-09-22T03:21:07.970697Z". */
  createdAt: string;
  isInverse: boolean;
  inverseStartDate: string | null;
  inverseSpanBounds: unknown[];
  emoji: string | null;
  /** "measure" for a habit that records a quantity; absent for a habit that counts taps. */
  kind?: string;
  unit?: string;
}

export interface HabitKitCompletion {
  id: string;
  /** The local midnight of the day, in UTC: add `timezoneOffsetInMinutes` to get the local date. */
  date: string;
  habitId: string;
  timezoneOffsetInMinutes: number;
  amountOfCompletions: number;
  note: string | null;
}

/** The goal of a habit for a period. A habit can have several, one after the other. */
export interface HabitKitInterval {
  habitId: string;
  startDate: string;
  endDate: string | null;
  type: string;
  requiredNumberOfCompletions: number | null;
  requiredNumberOfCompletionsPerDay: number | null;
  unitType: string | null;
  streakType: string | null;
  allowExceedingGoal: boolean;
}

export interface HabitKitExport {
  formatVersion: number;
  habits: HabitKitHabit[];
  completions: HabitKitCompletion[];
  intervals: HabitKitInterval[];
  reminders: unknown[];
  categories: unknown[];
  categoryMappings: unknown[];
}

export interface HabitKitImportOptions {
  /** The time of the import: the `updatedAt` of each Habit and Entry. */
  now: number;
  /** The largest `order` of the Habits that the person already has: see `lastOrder`. */
  lastOrder?: string;
  /** Import archived habits as normal Habits. Default false: Habit has no archive yet. */
  includeArchived?: boolean;
}

/** What the import changed or left out, so that the person can check it. */
export interface HabitKitReport {
  habitsByKind: Record<Kind, number>;
  entries: number;
  /** The archived habits that were not imported, with the count of their completions. */
  skippedHabits: { name: string; completions: number }[];
  skippedCompletions: {
    /** Of the skipped (archived) habits. */
    ofSkippedHabits: number;
    /** With the amount 0: HabitKit keeps the row of a tap that was undone. */
    empty: number;
    /** Of a habit that is not in the export. */
    unknownHabit: number;
    badDate: number;
    /** A second completion of a habit on the same Day: the Entry keeps the larger amount. */
    sameDay: number;
  };
  /** Habit has no notes on an Entry, so the notes are lost. */
  droppedNotes: { habit: string; day: Day; note: string }[];
  /** HabitKit icons without a clear Phosphor equivalent: these Habits got the fallback icon. */
  fallbackIcons: { habit: string; icon: string }[];
  /** HabitKit colors that the import does not know: these Habits got the fallback color. */
  unknownColors: { habit: string; color: string }[];
  /** Names longer than 60 characters, the maximum of Habit, before the cut. */
  shortenedNames: string[];
  /** Completions of a check Habit with an amount above 1, which became a plain check. */
  cutToCheck: number;
  warnings: string[];
}

export interface HabitKitImport {
  /** Sorted by `order`. */
  habits: Habit[];
  /** Sorted by Habit (in the order of `habits`), then by Day. */
  entries: Entry[];
  report: HabitKitReport;
}

const NAME_MAX_LENGTH = 60;
const FALLBACK_ICON = "sparkle";
const FALLBACK_COLOR: HabitColor = "stone";

/**
 * HabitKit icons that have a clear equivalent in the Phosphor catalog of the web app. HabitKit's
 * default icon ("activity", a pulse line) is not here on purpose: it does not say anything about
 * the habit, so it gets the fallback, the same icon that a new Habit gets.
 */
const ICONS: Record<string, string> = {
  bath: "bathtub",
  bed: "bed",
  bike: "bicycle",
  book: "book",
  bookSpine: "book",
  briefcase: "briefcase",
  business: "briefcase",
  capsules: "pill",
  cigarette: "cigarette",
  close: "prohibit",
  coffeebean: "coffee-bean",
  dumbbell: "barbell",
  film: "film-strip",
  graduation: "graduation-cap",
  heart: "heart",
  moneybill: "money",
  moon: "moon",
  newspaper: "newspaper",
  palette: "palette",
  pen: "pen",
  personMeditation: "flower-lotus",
  sickness: "thermometer",
  smartphoneSlash: "device-mobile-slash",
  sun: "sun",
  tablets: "pill",
  toothbrush: "tooth",
  utensils: "fork-knife",
};

/**
 * The Tailwind colors of HabitKit, each to the Habit color with the nearest hue. Habit's palette
 * is muted, so the grays go to the two muted colors: the blue grays to slate, the warm ones and
 * neutral to stone.
 */
const COLORS: Record<string, HabitColor> = {
  red: "rose",
  orange: "apricot",
  amber: "ochre",
  yellow: "mustard",
  lime: "olive",
  green: "green",
  emerald: "jade",
  teal: "teal",
  cyan: "sky",
  sky: "sky",
  blue: "blue",
  indigo: "violet",
  violet: "violet",
  purple: "violet",
  fuchsia: "mauve",
  pink: "raspberry",
  rose: "rose",
  slate: "slate",
  gray: "slate",
  zinc: "slate",
  neutral: "stone",
  stone: "stone",
};

/**
 * The Habits and Entries of a HabitKit export, and a report of what changed or was left out. Pure:
 * the same export and options give the same result, with the same ids. `data` is the parsed JSON
 * of the file; it throws when that is not a HabitKit export.
 *
 * - A habit becomes a check Habit when its current goal is one completion a day, and a number
 *   Habit with that Target when the goal is more. A "measure" habit becomes a number Habit with
 *   its unit, and with the Target N when the unit is "/N".
 * - The id of each Habit is a UUIDv7 with the habit's time of creation and random bits from the
 *   HabitKit id, so a second import of the same export gives the same ids and adds nothing.
 * - Archived habits are skipped unless `includeArchived` is set.
 */
export function importHabitKit(data: unknown, options: HabitKitImportOptions): HabitKitImport {
  const kit = parseExport(data);
  const report: HabitKitReport = {
    habitsByKind: { check: 0, number: 0, choice: 0, scale: 0, text: 0 },
    entries: 0,
    skippedHabits: [],
    skippedCompletions: { ofSkippedHabits: 0, empty: 0, unknownHabit: 0, badDate: 0, sameDay: 0 },
    droppedNotes: [],
    fallbackIcons: [],
    unknownColors: [],
    shortenedNames: [],
    cutToCheck: 0,
    warnings: [],
  };
  if (kit.formatVersion !== 2) {
    report.warnings.push(
      `The export has formatVersion ${kit.formatVersion}; the import knows formatVersion 2.`,
    );
  }

  const completionCounts = new Map<string, number>();
  for (const completion of kit.completions) {
    completionCounts.set(completion.habitId, (completionCounts.get(completion.habitId) ?? 0) + 1);
  }

  const kept: HabitKitHabit[] = [];
  const skipped = new Set<string>();
  for (const habit of kit.habits) {
    if (habit.archived && options.includeArchived !== true) {
      skipped.add(habit.id);
      report.skippedHabits.push({
        name: habit.name,
        completions: completionCounts.get(habit.id) ?? 0,
      });
    } else {
      kept.push(habit);
    }
  }
  kept.sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      timeOf(a.createdAt, 0) - timeOf(b.createdAt, 0) ||
      compareText(a.id, b.id),
  );

  const habits: Habit[] = [];
  const byKitId = new Map<string, Habit>();
  let order = options.lastOrder;
  for (const kitHabit of kept) {
    order = orderBetween(order);
    const habit = toHabit(kitHabit, currentInterval(kit.intervals, kitHabit.id), {
      order,
      now: options.now,
      report,
    });
    habits.push(habit);
    byKitId.set(kitHabit.id, habit);
    report.habitsByKind[habit.kind] += 1;
  }

  // The amount of each (Habit, Day), the larger one when a Day has two completions.
  const amounts = new Map<HabitId, Map<Day, number>>();
  for (const completion of kit.completions) {
    if (skipped.has(completion.habitId)) {
      report.skippedCompletions.ofSkippedHabits += 1;
      continue;
    }
    const habit = byKitId.get(completion.habitId);
    if (habit === undefined) {
      report.skippedCompletions.unknownHabit += 1;
      continue;
    }
    const day = localDay(completion);
    if (day === undefined) {
      report.skippedCompletions.badDate += 1;
      continue;
    }
    const note = completion.note?.trim() ?? "";
    if (note !== "") report.droppedNotes.push({ habit: habit.name, day, note });
    if (!(completion.amountOfCompletions > 0)) {
      report.skippedCompletions.empty += 1;
      continue;
    }
    const days = amounts.get(habit.id) ?? new Map<Day, number>();
    amounts.set(habit.id, days);
    const previous = days.get(day);
    if (previous !== undefined) report.skippedCompletions.sameDay += 1;
    days.set(day, Math.max(previous ?? 0, completion.amountOfCompletions));
  }

  const entries: Entry[] = [];
  for (const habit of habits) {
    const days = [...(amounts.get(habit.id) ?? new Map<Day, number>())].sort(([a], [b]) =>
      compareText(a, b),
    );
    for (const [day, amount] of days) {
      let value: EntryValue;
      if (habit.kind === "number") {
        value = { kind: "number", value: amount };
      } else {
        if (amount > 1) report.cutToCheck += 1;
        value = { kind: "check" };
      }
      entries.push({ habitId: habit.id, day, value, updatedAt: options.now });
    }
  }
  report.entries = entries.length;
  return { habits, entries, report };
}

function toHabit(
  kit: HabitKitHabit,
  interval: HabitKitInterval | undefined,
  context: { order: string; now: number; report: HabitKitReport },
): Habit {
  const { report } = context;
  let name = kit.name.trim();
  if (name === "") name = "Untitled";
  const characters = Array.from(name);
  if (characters.length > NAME_MAX_LENGTH) {
    report.shortenedNames.push(name);
    name = characters.slice(0, NAME_MAX_LENGTH).join("").trimEnd();
  }

  let icon: HabitIcon;
  const emoji = kit.emoji?.trim() ?? "";
  if (emoji !== "") {
    icon = { type: "emoji", emoji };
  } else {
    const phosphor = ICONS[kit.icon];
    if (phosphor === undefined) report.fallbackIcons.push({ habit: name, icon: kit.icon });
    icon = { type: "phosphor", name: phosphor ?? FALLBACK_ICON };
  }

  let color = COLORS[kit.color];
  if (color === undefined) {
    report.unknownColors.push({ habit: name, color: kit.color });
    color = FALLBACK_COLOR;
  }

  const createdAt = timeOf(kit.createdAt, context.now);
  const base = {
    id: idOf(kit.id, createdAt),
    name,
    description: kit.description?.trim() ?? "",
    icon,
    color,
    direction: kit.isInverse ? ("quit" as const) : ("build" as const),
    order: context.order,
    createdAt,
    updatedAt: context.now,
  };

  const perDay = interval?.requiredNumberOfCompletionsPerDay ?? 1;
  if (kit.kind === "measure") {
    const unit = kit.unit?.trim() ?? "";
    const outOf = /^\/\s*(\d+(?:\.\d+)?)$/.exec(unit);
    const target = outOf !== null ? Number(outOf[1]) : perDay > 1 ? perDay : undefined;
    return {
      ...base,
      kind: "number",
      ...(unit !== "" && { unit }),
      ...(target !== undefined && { target }),
      step: 1,
    };
  }
  if (perDay > 1) return { ...base, kind: "number", target: perDay, step: 1 };
  return { ...base, kind: "check" };
}

/** The interval that is in force now: one without an end, else the one that started last. */
function currentInterval(
  intervals: HabitKitInterval[],
  habitId: string,
): HabitKitInterval | undefined {
  let current: HabitKitInterval | undefined;
  for (const interval of intervals) {
    if (interval.habitId !== habitId) continue;
    if (
      current === undefined ||
      (current.endDate !== null) > (interval.endDate !== null) ||
      ((current.endDate !== null) === (interval.endDate !== null) &&
        timeOf(interval.startDate, 0) > timeOf(current.startDate, 0))
    ) {
      current = interval;
    }
  }
  return current;
}

/** The local Day of a completion: its UTC date-time moved by the offset of its time zone. */
function localDay(completion: HabitKitCompletion): Day | undefined {
  const time = Date.parse(completion.date);
  if (Number.isNaN(time)) return undefined;
  const offset = Number.isFinite(completion.timezoneOffsetInMinutes)
    ? completion.timezoneOffsetInMinutes
    : 0;
  try {
    return parseDay(new Date(time + offset * 60_000).toISOString().slice(0, 10));
  } catch {
    return undefined;
  }
}

/**
 * A UUIDv7 with `msecs` as its time and the random bits from a hash of the HabitKit id: the same
 * habit always gets the same id, and the id sorts by the habit's time of creation (ADR 0002).
 */
function idOf(kitId: string, msecs: number): HabitId {
  return v7({ msecs, random: hashBytes(kitId) }) as HabitId;
}

/** 16 bytes from a string: four FNV-1a hashes with different seeds. Not for security. */
function hashBytes(text: string): Uint8Array {
  const bytes = new Uint8Array(16);
  for (let part = 0; part < 4; part++) {
    let hash = (0x811c9dc5 ^ Math.imul(part + 1, 0x9e3779b9)) >>> 0;
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
    }
    // A final mix, so that ids that differ only at the end differ in all bytes.
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35) >>> 0;
    hash = (hash ^ (hash >>> 16)) >>> 0;
    bytes[part * 4] = hash >>> 24;
    bytes[part * 4 + 1] = (hash >>> 16) & 0xff;
    bytes[part * 4 + 2] = (hash >>> 8) & 0xff;
    bytes[part * 4 + 3] = hash & 0xff;
  }
  return bytes;
}

/** The milliseconds of an ISO date-time, or `fallback` when it is not one. */
function timeOf(text: string, fallback: number): number {
  const time = Date.parse(text);
  return Number.isNaN(time) ? fallback : time;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Checks the fields that the import reads. Throws when `data` is not a HabitKit export. */
function parseExport(data: unknown): HabitKitExport {
  const fail = (reason: string): never => {
    throw new Error(`@habit/core: not a HabitKit export: ${reason}`);
  };
  if (!isRecord(data)) return fail("not an object");
  const { habits, completions, intervals = [] } = data;
  if (!Array.isArray(habits)) return fail("no habits");
  if (!Array.isArray(completions)) return fail("no completions");
  if (!Array.isArray(intervals)) return fail("intervals is not a list");
  for (const habit of habits) {
    if (!isRecord(habit) || typeof habit.id !== "string" || typeof habit.name !== "string") {
      fail("a habit without an id or a name");
    }
  }
  for (const completion of completions) {
    if (
      !isRecord(completion) ||
      typeof completion.habitId !== "string" ||
      typeof completion.date !== "string" ||
      typeof completion.amountOfCompletions !== "number"
    ) {
      fail("a completion without a habitId, a date or an amount");
    }
  }
  return {
    reminders: [],
    categories: [],
    categoryMappings: [],
    ...(data as Partial<HabitKitExport>),
    formatVersion: typeof data.formatVersion === "number" ? data.formatVersion : 0,
    habits: habits as HabitKitHabit[],
    completions: completions as HabitKitCompletion[],
    intervals: intervals as HabitKitInterval[],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
