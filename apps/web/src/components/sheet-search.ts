import { entryKey, parseDay, type Day, type HabitId } from "@habit/core";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * The sheets are search params on any route, so they open over the list and over the habit page,
 * and the back gesture closes them (docs/build-plan.md, "URL"):
 * - `?new=true`: create a habit.
 * - `?edit=<habitId>`: edit a habit.
 * - `?entry=<habitId>:<day>`: the input of a value.
 * - `?monthPicker=true`: the picker of the calendar's Month, on the habit page.
 * - `?settings=true`: the settings.
 */
export interface SheetSearch {
  new?: true;
  edit?: HabitId;
  entry?: string;
  monthPicker?: true;
  settings?: true;
}

/** The root route's `validateSearch`: keeps the sheet params that are well formed, drops the rest. */
export function validateSheetSearch(search: Record<string, unknown>): SheetSearch {
  const result: SheetSearch = {};
  if (search.new === true || search.new === "true") result.new = true;
  if (typeof search.edit === "string" && search.edit !== "") result.edit = search.edit as HabitId;
  if (typeof search.entry === "string" && parseEntryRef(search.entry) !== null) {
    result.entry = search.entry;
  }
  if (search.monthPicker === true || search.monthPicker === "true") result.monthPicker = true;
  if (search.settings === true || search.settings === "true") result.settings = true;
  return result;
}

/** The value of `?entry`: `${habitId}:${day}`. */
export function entryRef(habitId: HabitId, day: Day): string {
  return entryKey(habitId, day);
}

/** Reads `?entry`, or null when it is not `<habitId>:<YYYY-MM-DD>`. */
export function parseEntryRef(ref: string): { habitId: HabitId; day: Day } | null {
  const colon = ref.lastIndexOf(":");
  if (colon <= 0) return null;
  try {
    return { habitId: ref.slice(0, colon) as HabitId, day: parseDay(ref.slice(colon + 1)) };
  } catch {
    return null;
  }
}

declare module "@tanstack/react-router" {
  interface HistoryState {
    /** Set on the history entry that opened a sheet, so closing it can go back. */
    sheet?: true;
  }
}

const NO_SHEET = {
  new: undefined,
  edit: undefined,
  entry: undefined,
  monthPicker: undefined,
  settings: undefined,
} as const;

/** The sheet params of the current location. */
export function useSheetSearch(): SheetSearch {
  return useSearch({ from: "__root__" });
}

/** Opens a sheet: pushes a history entry with the param, so the back gesture closes it. */
export function useOpenSheet(): (sheet: SheetSearch) => void {
  const navigate = useNavigate();
  return useCallback(
    (sheet: SheetSearch) => {
      void navigate({
        to: ".",
        search: (previous) => ({ ...previous, ...NO_SHEET, ...sheet }),
        state: (previous) => ({ ...previous, sheet: true }),
      });
    },
    [navigate],
  );
}

/**
 * Closes the open sheet. When this app opened it, it goes back, so the history has no leftover
 * entry; when the sheet came with the URL (a reload or a shared link), it replaces the entry.
 */
export function useCloseSheet(): () => void {
  const navigate = useNavigate();
  const router = useRouter();
  return useCallback(() => {
    if (router.state.location.state.sheet === true) {
      router.history.back();
      return;
    }
    void navigate({
      to: ".",
      search: (previous) => ({ ...previous, ...NO_SHEET }),
      replace: true,
    });
  }, [navigate, router]);
}
