import {
  HABIT_COLORS,
  newId,
  type Direction,
  type Habit,
  type HabitColor,
  type HabitDraft,
  type HabitIcon,
  type HabitId,
  type HabitIssue,
  type HabitState,
  type Kind,
  type Option,
  type OptionId,
} from "@habit/core";

/**
 * What the form holds while the person types. The numbers stay text until they are read, so "1."
 * and "0," can pass through on the way to "1.5" and "0,5". Choice and scale share one list of
 * Options, so a change of the Kind between them keeps the labels.
 */
export interface FormState {
  name: string;
  description: string;
  icon: HabitIcon;
  color: HabitColor;
  direction: Direction;
  kind: Kind;
  unit: string;
  target: string;
  step: string;
  options: Option[];
}

/** The fields that can carry a message. */
export type IssueField = HabitIssue["field"];

export const OPTION_LIMITS = {
  choice: { min: 1, max: 12 },
  scale: { min: 2, max: 5 },
} as const satisfies Record<"choice" | "scale", { min: number; max: number }>;

/** The icon of a new habit until the person picks one, or the name suggests one. */
export const DEFAULT_ICON: HabitIcon = { type: "phosphor", name: "sparkle" };

export function newForm(color: HabitColor): FormState {
  return {
    name: "",
    description: "",
    icon: DEFAULT_ICON,
    color,
    direction: "build",
    kind: "check",
    unit: "",
    target: "",
    step: "1",
    options: [],
  };
}

/** The form of an existing Habit. */
export function formOf(habit: Habit): FormState {
  return {
    name: habit.name,
    description: habit.description,
    icon: habit.icon,
    color: habit.color,
    direction: habit.direction,
    kind: habit.kind,
    unit: habit.kind === "number" ? (habit.unit ?? "") : "",
    target: habit.kind === "number" && habit.target !== undefined ? String(habit.target) : "",
    step: habit.kind === "number" ? String(habit.step) : "1",
    options: habit.kind === "choice" || habit.kind === "scale" ? habit.options : [],
  };
}

/**
 * The form with another Kind. A choice gets one empty Option and a scale two, when the list has
 * fewer, so the next step has rows to fill.
 */
export function withKind(form: FormState, kind: Kind): FormState {
  if (kind !== "choice" && kind !== "scale") return { ...form, kind };
  let options = form.options;
  while (offered(options).length < OPTION_LIMITS[kind].min) options = addOption(options);
  return { ...form, kind, options };
}

/** The draft that `validateHabitDraft` and `createHabit` read. Empty number fields are unset. */
export function draftOf(form: FormState): HabitDraft {
  const base = {
    name: form.name,
    description: form.description,
    icon: form.icon,
    color: form.color,
    direction: form.direction,
  };
  switch (form.kind) {
    case "check":
    case "text":
      return { ...base, kind: form.kind };
    case "number": {
      const unit = form.unit.trim();
      const target = parseDecimal(form.target);
      return {
        ...base,
        kind: "number",
        ...(unit === "" ? {} : { unit }),
        ...(target === undefined ? {} : { target }),
        step: parseDecimal(form.step) ?? Number.NaN,
      };
    }
    case "choice":
    case "scale":
      return { ...base, kind: form.kind, options: cleanOptions(form.options) };
  }
}

/** The Options as they are saved: labels and emoji without the spaces around them. */
export function cleanOptions(options: readonly Option[]): Option[] {
  return options.map(cleanOption);
}

function cleanOption(option: Option): Option {
  const emoji = option.emoji?.trim();
  const clean: Option = { ...option, label: option.label.trim() };
  if (emoji === undefined || emoji === "") delete clean.emoji;
  else clean.emoji = emoji;
  return clean;
}

/**
 * A decimal from the text of a field: "1,5" and "1.5" are both 1.5, an empty field is undefined,
 * and text that is not a number is NaN (which the validation rejects).
 */
export function parseDecimal(text: string): number | undefined {
  const clean = text.trim().replace(",", ".");
  if (clean === "") return undefined;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(clean)) return Number.NaN;
  return Number(clean);
}

/**
 * The calm sentence for each issue, by field. The Direction changes the words only: a quit Habit
 * calls its Target "limit".
 */
export function issueMessages(
  issues: readonly HabitIssue[],
  form: Pick<FormState, "kind" | "direction">,
): Partial<Record<IssueField, string>> {
  const messages: Partial<Record<IssueField, string>> = {};
  for (const issue of issues) {
    if (messages[issue.field] !== undefined) continue;
    messages[issue.field] = issueMessage(issue, form);
  }
  return messages;
}

function issueMessage(issue: HabitIssue, form: Pick<FormState, "kind" | "direction">): string {
  switch (issue.field) {
    case "name":
      return issue.code === "required"
        ? "Give the habit a name."
        : "Keep the name to 60 characters.";
    case "target":
      return form.direction === "quit"
        ? "The limit is a number above 0, or empty."
        : "The target is a number above 0, or empty.";
    case "step":
      return "The step is a number above 0.";
    case "options": {
      const limits = form.kind === "scale" ? OPTION_LIMITS.scale : OPTION_LIMITS.choice;
      switch (issue.code) {
        case "tooFew":
          return form.kind === "scale"
            ? `A scale needs at least ${limits.min} options.`
            : "Add at least one option.";
        case "tooMany":
          return `${limits.max} options at most.`;
        case "emptyLabel":
          return "Each option needs a label.";
        case "labelTooLong":
          return "Keep each label to 40 characters.";
        case "duplicateLabel":
          return "Two options have the same label.";
      }
    }
  }
}

/** The color for a new habit: the first one in the palette that no habit has, else the least used. */
export function nextColor(habits: readonly Pick<Habit, "color">[]): HabitColor {
  const counts = new Map<HabitColor, number>(HABIT_COLORS.map((color) => [color, 0]));
  for (const habit of habits) counts.set(habit.color, (counts.get(habit.color) ?? 0) + 1);
  let best: HabitColor = HABIT_COLORS[0];
  for (const color of HABIT_COLORS) {
    if (counts.get(color)! < counts.get(best)!) best = color;
  }
  return best;
}

/**
 * How many taps of the Step fill a Day, or null without a Target (then any value above 0 fills it).
 * Undefined when the numbers are not valid yet.
 */
export function tapsToFill(form: Pick<FormState, "target" | "step">): number | null | undefined {
  const step = parseDecimal(form.step);
  const target = parseDecimal(form.target);
  if (step === undefined || !(step > 0)) return undefined;
  if (target === undefined) return null;
  if (!(target > 0)) return undefined;
  const ratio = target / step;
  const rounded = Math.round(ratio);
  // 4.35 / 1.45 is 3.0000000000000004 in binary floating point: three taps, not four.
  return Math.max(1, Math.abs(ratio - rounded) < 1e-9 ? rounded : Math.ceil(ratio));
}

// ── Options ─────────────────────────────────────────────────────────────────────────────────────

/** The Options that the input offers: the ones that are not retired, in order. */
export function offered(options: readonly Option[]): Option[] {
  return options.filter((option) => option.retiredAt === undefined);
}

export function retired(options: readonly Option[]): Option[] {
  return options.filter((option) => option.retiredAt !== undefined);
}

export function addOption(options: readonly Option[]): Option[] {
  return [...options, { id: newId() as OptionId, label: "" }];
}

export function updateOption(
  options: readonly Option[],
  id: OptionId,
  patch: Partial<Pick<Option, "label" | "emoji">>,
): Option[] {
  return options.map((option) => (option.id === id ? { ...option, ...patch } : option));
}

/**
 * Removes an Option. An Option that Entries use is retired instead: it keeps its place (a scale
 * counts the position of each Option), and old Entries keep showing it.
 */
export function removeOption(
  options: readonly Option[],
  id: OptionId,
  context: { used: boolean; now: number },
): Option[] {
  if (!context.used) return options.filter((option) => option.id !== id);
  return options.map((option) =>
    option.id === id ? { ...option, retiredAt: context.now } : option,
  );
}

export function restoreOption(options: readonly Option[], id: OptionId): Option[] {
  return options.map((option) => {
    if (option.id !== id) return option;
    const restored = { ...option };
    delete restored.retiredAt;
    return restored;
  });
}

/**
 * Moves an offered Option from one place among the offered Options to another. The retired
 * Options stay where they are, so the position of each in a scale does not change.
 */
export function moveOffered(options: readonly Option[], from: number, to: number): Option[] {
  const shown = offered(options);
  if (from === to || shown[from] === undefined || shown[to] === undefined) return [...options];
  const [moved] = shown.splice(from, 1);
  shown.splice(to, 0, moved!);
  let next = 0;
  return options.map((option) => (option.retiredAt === undefined ? shown[next++]! : option));
}

/**
 * The Intensity that an Entry of this Option gets in a scale: its position (retired Options
 * count) over the count of all Options, as `intensity` in @habit/core computes it.
 */
export function scaleIntensity(options: readonly Option[], id: OptionId): number {
  const position = options.findIndex((option) => option.id === id);
  return (Math.max(position, 0) + 1) / Math.max(options.length, 1);
}

/** The Options that loaded Entries of a Habit use. Older Months that are not loaded are not read. */
export function usedOptionIds(state: HabitState, habitId: HabitId): Set<OptionId> {
  const used = new Set<OptionId>();
  for (const entry of Object.values(state.entries)) {
    if (entry.habitId !== habitId || entry.deletedAt !== undefined) continue;
    if (entry.value.kind === "choice" || entry.value.kind === "scale")
      used.add(entry.value.optionId);
  }
  return used;
}

/**
 * The Options to save: the form's list without the new rows that are still empty. A row that the
 * person added but did not name is not an Option yet.
 */
export function savedOptions(options: readonly Option[], stored: ReadonlySet<OptionId>): Option[] {
  return options.filter((option) => stored.has(option.id) || option.label.trim() !== "");
}
