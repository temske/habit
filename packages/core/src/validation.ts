import type { HabitDraft, Option } from "./habit";

export type HabitIssue =
  | { field: "name"; code: "required" | "tooLong" }
  | { field: "target"; code: "notPositive" }
  | { field: "step"; code: "notPositive" }
  | {
      field: "options";
      code: "tooFew" | "tooMany" | "emptyLabel" | "labelTooLong" | "duplicateLabel";
    };

const NAME_MAX_LENGTH = 60;
const OPTION_LABEL_MAX_LENGTH = 40;
const OPTION_COUNT = { choice: { min: 1, max: 12 }, scale: { min: 2, max: 5 } } as const;

/**
 * The problems of a draft, or an empty list when it is valid. Each issue is listed once.
 * - name: required after trimming, a maximum of 60 characters (an emoji counts as one).
 * - number: target (when set) and step above 0.
 * - choice: 1 to 12 Options that are not retired. scale: 2 to 5. Labels of these Options not empty
 *   and unique (after trimming, without regard to case), a maximum of 40 characters (an emoji
 *   counts as one). Retired Options are not checked.
 */
export function validateHabitDraft(draft: HabitDraft): HabitIssue[] {
  const issues: HabitIssue[] = [];
  const name = draft.name.trim();
  if (name === "") issues.push({ field: "name", code: "required" });
  else if (characterCount(name) > NAME_MAX_LENGTH) issues.push({ field: "name", code: "tooLong" });

  if (draft.kind === "number") {
    if (draft.target !== undefined && !(draft.target > 0)) {
      issues.push({ field: "target", code: "notPositive" });
    }
    if (!(draft.step > 0)) issues.push({ field: "step", code: "notPositive" });
  }

  if (draft.kind === "choice" || draft.kind === "scale") {
    issues.push(...optionIssues(draft.options, OPTION_COUNT[draft.kind]));
  }
  return issues;
}

/** The characters that a person sees (grapheme clusters), so each emoji counts as one. */
function characterCount(text: string): number {
  // Without Intl.Segmenter (Firefox before 125), count the code points.
  if (typeof Intl.Segmenter !== "function") return Array.from(text).length;
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
}

function optionIssues(options: Option[], count: { min: number; max: number }): HabitIssue[] {
  const issues: HabitIssue[] = [];
  const offered = options.filter((option) => option.retiredAt === undefined);
  if (offered.length < count.min) issues.push({ field: "options", code: "tooFew" });
  if (offered.length > count.max) issues.push({ field: "options", code: "tooMany" });

  const labels = offered.map((option) => option.label.trim().toLowerCase());
  const filled = labels.filter((label) => label !== "");
  // Before an empty label: the form shows a long label at once, while a new row is still empty.
  if (filled.some((label) => characterCount(label) > OPTION_LABEL_MAX_LENGTH))
    issues.push({ field: "options", code: "labelTooLong" });
  if (filled.length < labels.length) issues.push({ field: "options", code: "emptyLabel" });
  if (new Set(filled).size < filled.length)
    issues.push({ field: "options", code: "duplicateLabel" });
  return issues;
}
