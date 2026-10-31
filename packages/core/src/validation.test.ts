import { describe, expect, test } from "vite-plus/test";

import type { HabitDraft, Option } from "./habit";
import { option } from "./test-fixtures";
import { validateHabitDraft } from "./validation";

const common = {
  name: "Habit",
  description: "",
  icon: { type: "emoji", emoji: "💧" },
  color: "blue",
  direction: "build",
} as const;

const check: HabitDraft = { ...common, kind: "check" };
const number = (fields: { target?: number; step?: number }): HabitDraft => ({
  ...common,
  kind: "number",
  step: 1,
  ...fields,
});
const choice = (options: Option[]): HabitDraft => ({ ...common, kind: "choice", options });
const scale = (options: Option[]): HabitDraft => ({ ...common, kind: "scale", options });
const labels = (count: number) =>
  Array.from({ length: count }, (_, index) => option(`Option ${index + 1}`));

describe("validateHabitDraft", () => {
  test("a valid draft of each Kind has no issues", () => {
    expect(validateHabitDraft(check)).toEqual([]);
    expect(validateHabitDraft({ ...common, kind: "text" })).toEqual([]);
    expect(validateHabitDraft(number({ target: 8, step: 0.5 }))).toEqual([]);
    expect(validateHabitDraft(number({}))).toEqual([]);
    expect(validateHabitDraft(choice(labels(1)))).toEqual([]);
    expect(validateHabitDraft(scale(labels(2)))).toEqual([]);
  });

  describe("name", () => {
    test("is required after trimming", () => {
      expect(validateHabitDraft({ ...check, name: "" })).toEqual([
        { field: "name", code: "required" },
      ]);
      expect(validateHabitDraft({ ...check, name: "  \n" })).toEqual([
        { field: "name", code: "required" },
      ]);
    });

    test("has a maximum of 60 characters after trimming", () => {
      expect(validateHabitDraft({ ...check, name: "a".repeat(60) })).toEqual([]);
      expect(validateHabitDraft({ ...check, name: ` ${"a".repeat(60)} ` })).toEqual([]);
      expect(validateHabitDraft({ ...check, name: "a".repeat(61) })).toEqual([
        { field: "name", code: "tooLong" },
      ]);
    });

    test("counts an emoji as one character, also one made of several code points", () => {
      expect(validateHabitDraft({ ...check, name: "💧".repeat(60) })).toEqual([]);
      expect(validateHabitDraft({ ...check, name: "👨‍👩‍👧".repeat(60) })).toEqual([]);
      expect(validateHabitDraft({ ...check, name: "👨‍👩‍👧".repeat(61) })).toEqual([
        { field: "name", code: "tooLong" },
      ]);
    });
  });

  describe("number", () => {
    test("a Target, when set, is above 0", () => {
      for (const target of [0, -1, Number.NaN]) {
        expect(validateHabitDraft(number({ target }))).toEqual([
          { field: "target", code: "notPositive" },
        ]);
      }
    });

    test("the Step is above 0", () => {
      for (const step of [0, -0.5, Number.NaN]) {
        expect(validateHabitDraft(number({ step }))).toEqual([
          { field: "step", code: "notPositive" },
        ]);
      }
    });
  });

  describe("options", () => {
    test("choice: 1 to 12 Options that are not retired", () => {
      expect(validateHabitDraft(choice([]))).toEqual([{ field: "options", code: "tooFew" }]);
      expect(validateHabitDraft(choice(labels(12)))).toEqual([]);
      expect(validateHabitDraft(choice(labels(13)))).toEqual([
        { field: "options", code: "tooMany" },
      ]);
      expect(validateHabitDraft(choice([option("Legs", { retiredAt: 5 })]))).toEqual([
        { field: "options", code: "tooFew" },
      ]);
    });

    test("scale: 2 to 5 Options that are not retired", () => {
      expect(validateHabitDraft(scale(labels(1)))).toEqual([{ field: "options", code: "tooFew" }]);
      expect(validateHabitDraft(scale(labels(5)))).toEqual([]);
      expect(validateHabitDraft(scale(labels(6)))).toEqual([{ field: "options", code: "tooMany" }]);
      const withRetired = [...labels(5), option("Old", { retiredAt: 5 })];
      expect(validateHabitDraft(scale(withRetired))).toEqual([]);
    });

    test("labels are not empty after trimming", () => {
      expect(validateHabitDraft(scale([option("Low"), option(" ")]))).toEqual([
        { field: "options", code: "emptyLabel" },
      ]);
    });

    test("labels have 40 characters at most, after trimming, with an emoji as one", () => {
      expect(validateHabitDraft(choice([option("a".repeat(40))]))).toEqual([]);
      expect(validateHabitDraft(choice([option(` ${"a".repeat(40)} `)]))).toEqual([]);
      expect(validateHabitDraft(choice([option("👨‍👩‍👧".repeat(40))]))).toEqual([]);
      expect(validateHabitDraft(choice([option("a".repeat(41))]))).toEqual([
        { field: "options", code: "labelTooLong" },
      ]);
    });

    test("a retired Option keeps a label over 40 characters", () => {
      const options = [option("a".repeat(41), { retiredAt: 5 }), option("Legs")];
      expect(validateHabitDraft(choice(options))).toEqual([]);
    });

    test("labels are unique, without regard to case and spaces", () => {
      expect(validateHabitDraft(choice([option("Legs"), option("legs ")]))).toEqual([
        { field: "options", code: "duplicateLabel" },
      ]);
    });

    test("a retired Option can have the label of an Option that is offered", () => {
      const options = [option("Legs", { id: "old" as Option["id"], retiredAt: 5 }), option("Legs")];
      expect(validateHabitDraft(choice(options))).toEqual([]);
    });
  });

  test("lists each issue once", () => {
    const options = [option(""), option(""), option("A"), option("a")];
    expect(validateHabitDraft({ ...choice(options), name: "" })).toEqual([
      { field: "name", code: "required" },
      { field: "options", code: "emptyLabel" },
      { field: "options", code: "duplicateLabel" },
    ]);
  });
});
