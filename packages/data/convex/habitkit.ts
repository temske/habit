import { parseDay } from "@habit/core";
import { ConvexError, v } from "convex/values";

import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { isOwner } from "./functions";
import { vEntry, vHabit, vHabitId } from "./validators";

// The write path of the HabitKit import (docs/import.md). The script
// `packages/data/scripts/import-habitkit.ts` maps the export with `importHabitKit` of @habit/core
// and calls these functions through the Convex CLI. They are internal: only the CLI or the
// dashboard can run them, with the deployment's admin rights.
//
// A second run adds nothing: the mapping gives the same Habit ids for the same export, and a row
// that exists (also a deleted Habit or a cleared Entry) is never written again.

/** The largest `order` of the user's Habits (also the deleted ones), or null without Habits. */
export const lastOrder = internalQuery({
  args: { userId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { userId }) => {
    let last: string | null = null;
    for (const habit of await habitsOf(ctx, userId)) {
      if (last === null || habit.order > last) last = habit.order;
    }
    return last;
  },
});

/** Inserts the Habits whose id the user does not have yet. */
export const insertHabits = internalMutation({
  args: { userId: v.string(), habits: v.array(vHabit) },
  returns: v.object({ inserted: v.number(), existing: v.number() }),
  handler: async (ctx, { userId, habits }) => {
    requireOwner(userId);
    let inserted = 0;
    for (const habit of habits) {
      const doc = await ctx.db
        .query("habits")
        .withIndex("by_user_and_id", (q) => q.eq("userId", userId).eq("id", habit.id))
        .unique();
      if (doc !== null) continue;
      await ctx.db.insert("habits", { ...habit, userId });
      inserted += 1;
    }
    return { inserted, existing: habits.length - inserted };
  },
});

/**
 * Inserts the Entries that the user does not have yet. An Entry of a Habit that the user does not
 * have is not written, so a failed `insertHabits` cannot leave Entries without a Habit.
 */
export const insertEntries = internalMutation({
  args: { userId: v.string(), entries: v.array(vEntry) },
  returns: v.object({ inserted: v.number(), existing: v.number(), withoutHabit: v.number() }),
  handler: async (ctx, { userId, entries }) => {
    requireOwner(userId);
    const known = new Map<string, boolean>();
    let inserted = 0;
    let existing = 0;
    let withoutHabit = 0;
    for (const entry of entries) {
      try {
        parseDay(entry.day);
      } catch {
        throw new ConvexError({ code: "badDay", day: entry.day });
      }
      let hasHabit = known.get(entry.habitId);
      if (hasHabit === undefined) {
        const habit = await ctx.db
          .query("habits")
          .withIndex("by_user_and_id", (q) => q.eq("userId", userId).eq("id", entry.habitId))
          .unique();
        hasHabit = habit !== null;
        known.set(entry.habitId, hasHabit);
      }
      if (!hasHabit) {
        withoutHabit += 1;
        continue;
      }
      const doc = await ctx.db
        .query("entries")
        .withIndex("by_user_and_habit_and_day", (q) =>
          q.eq("userId", userId).eq("habitId", entry.habitId).eq("day", entry.day),
        )
        .unique();
      if (doc !== null) {
        existing += 1;
        continue;
      }
      await ctx.db.insert("entries", { ...entry, userId });
      inserted += 1;
    }
    return { inserted, existing, withoutHabit };
  },
});

/** How many of these Habits the user has, and how many Entries (not cleared) they have. */
export const count = internalQuery({
  args: { userId: v.string(), habitIds: v.array(vHabitId) },
  returns: v.object({ habits: v.number(), entries: v.number() }),
  handler: async (ctx, { userId, habitIds }) => {
    let habits = 0;
    let entries = 0;
    for (const id of new Set(habitIds)) {
      const habit = await ctx.db
        .query("habits")
        .withIndex("by_user_and_id", (q) => q.eq("userId", userId).eq("id", id))
        .unique();
      if (habit === null) continue;
      habits += 1;
      const docs = await ctx.db
        .query("entries")
        .withIndex("by_user_and_habit_and_day", (q) => q.eq("userId", userId).eq("habitId", id))
        .collect();
      entries += docs.filter((doc) => doc.deletedAt === undefined).length;
    }
    return { habits, entries };
  },
});

/** The import writes only for an owner, so a typo in the user id cannot make orphan rows. */
function requireOwner(userId: string): void {
  if (!isOwner(userId)) throw new ConvexError({ code: "notAnOwner", userId });
}

function habitsOf(ctx: QueryCtx, userId: string) {
  return ctx.db
    .query("habits")
    .withIndex("by_user_and_id", (q) => q.eq("userId", userId))
    .collect();
}
