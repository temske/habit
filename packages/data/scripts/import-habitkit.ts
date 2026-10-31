// Imports a HabitKit export into the Convex deployment of packages/data/.env.local, for one owner.
// See docs/import.md. Run it from the repository root:
//
//   vp -C packages/data run import:habitkit <file> --dry-run
//   vp -C packages/data run import:habitkit <file> --user <Clerk user id>
//
// It maps the export with `importHabitKit` of @habit/core and writes through the internal
// functions of convex/habitkit.ts, with the Convex CLI (`convex run`), which has the admin rights
// of the logged-in developer. A second run adds nothing.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { importHabitKit, type Entry, type Habit, type HabitKitReport } from "@habit/core";

const USAGE = `Usage: vp -C packages/data run import:habitkit <file> [options]

Options:
  --dry-run            Print the summary, write nothing.
  --user <id>          The Clerk user id of the owner who gets the Habits. Required to write.
  --include-archived   Import archived habits as normal Habits (default: skip them).
  --prod               Write to the production deployment, not the dev deployment.
  --help               Print this text.`;

/** The count of Entries in one mutation, well under the limits of a Convex transaction. */
const ENTRY_BATCH = 500;

const PACKAGE_DIR = resolve(import.meta.dirname, "..");
const ROOT_DIR = resolve(PACKAGE_DIR, "../..");

main();

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      user: { type: "string" },
      "include-archived": { type: "boolean", default: false },
      prod: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) return console.log(USAGE);
  const file = positionals[0];
  if (file === undefined || positionals.length > 1) return fail(USAGE);
  const dryRun = values["dry-run"];
  const userId = values.user;
  if (!dryRun && userId === undefined) return fail(`--user is required to write.\n\n${USAGE}`);
  const convex = (fn: string, args: object): unknown => convexRun(fn, args, values.prod);

  const path = findFile(file);
  const data: unknown = JSON.parse(readFileSync(path, "utf8"));
  // With a user, the new Habits go after the Habits that the owner already has.
  const lastOrder = userId === undefined ? null : convex("habitkit:lastOrder", { userId });
  const { habits, entries, report } = importHabitKit(data, {
    now: Date.now(),
    ...(typeof lastOrder === "string" && { lastOrder }),
    includeArchived: values["include-archived"],
  });

  console.log(`HabitKit export: ${path}`);
  if (userId !== undefined) {
    console.log(`Owner: ${userId} (${values.prod ? "production" : "dev"} deployment)`);
  }
  printSummary(habits, entries, report);
  if (dryRun) return console.log("\nDry run: nothing was written.");

  console.log("\nWriting…");
  const habitResult = convex("habitkit:insertHabits", { userId, habits }) as {
    inserted: number;
    existing: number;
  };
  console.log(`Habits: ${habitResult.inserted} added, ${habitResult.existing} already there.`);
  const total = { inserted: 0, existing: 0, withoutHabit: 0 };
  for (let start = 0; start < entries.length; start += ENTRY_BATCH) {
    const batch = entries.slice(start, start + ENTRY_BATCH);
    const result = convex("habitkit:insertEntries", { userId, entries: batch }) as typeof total;
    total.inserted += result.inserted;
    total.existing += result.existing;
    total.withoutHabit += result.withoutHabit;
    console.log(`Entries: ${start + batch.length} of ${entries.length} sent.`);
  }
  console.log(
    `Entries: ${total.inserted} added, ${total.existing} already there, ${total.withoutHabit} without a Habit.`,
  );

  const stored = convex("habitkit:count", {
    userId,
    habitIds: habits.map((habit) => habit.id),
  }) as { habits: number; entries: number };
  console.log(`\nOn the deployment: ${stored.habits} of these Habits, ${stored.entries} Entries.`);
  if (stored.habits !== habits.length || stored.entries < entries.length) {
    fail("The deployment has fewer rows than the import made. See the output above.");
  }
}

function printSummary(habits: Habit[], entries: Entry[], report: HabitKitReport): void {
  const kinds = Object.entries(report.habitsByKind)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${kind} ${count}`)
    .join(", ");
  const skipped = report.skippedCompletions;
  console.log(`\nHabits: ${habits.length} (${kinds || "none"})`);
  console.log(`Entries: ${entries.length}`);
  console.log(
    `Skipped habits: ${report.skippedHabits.length} archived` +
      list(report.skippedHabits.map(({ name, completions }) => `${name} (${completions})`)),
  );
  console.log(
    `Skipped completions: ${skipped.ofSkippedHabits} of archived habits, ${skipped.empty} with ` +
      `the amount 0, ${skipped.unknownHabit} of an unknown habit, ${skipped.badDate} with a bad ` +
      `date, ${skipped.sameDay} on a Day that already had one`,
  );
  console.log(
    `Dropped notes: ${report.droppedNotes.length}` +
      list(report.droppedNotes.map(({ habit, day, note }) => `${habit} ${day}: ${note}`)),
  );
  console.log(
    `Fallback icons: ${report.fallbackIcons.length}` +
      list(report.fallbackIcons.map(({ habit, icon }) => `${habit} (${icon})`)),
  );
  console.log(
    `Unknown colors: ${report.unknownColors.length}` +
      list(report.unknownColors.map(({ habit, color }) => `${habit} (${color})`)),
  );
  console.log(`Shortened names: ${report.shortenedNames.length}` + list(report.shortenedNames));
  console.log(`Amounts above 1 cut to a check: ${report.cutToCheck}`);
  for (const warning of report.warnings) console.log(`Warning: ${warning}`);

  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.habitId, (counts.get(entry.habitId) ?? 0) + 1);
  console.log(
    "\n  #  Name                            Kind        Direction  Icon                  Color      Entries",
  );
  habits.forEach((habit, index) => {
    const kind =
      habit.kind === "number"
        ? `number${habit.target === undefined ? "" : ` ≤${habit.target}`}`
        : habit.kind;
    const icon = habit.icon.type === "emoji" ? habit.icon.emoji : habit.icon.name;
    console.log(
      `${String(index + 1).padStart(3)}  ${pad(habit.name, 30)}  ${pad(kind, 10)}  ` +
        `${pad(habit.direction, 9)}  ${pad(icon, 20)}  ${pad(habit.color, 9)}  ` +
        `${String(counts.get(habit.id) ?? 0).padStart(7)}`,
    );
  });
}

function list(items: string[]): string {
  return items.length === 0 ? "" : `\n  - ${items.join("\n  - ")}`;
}

function pad(text: string, width: number): string {
  const characters = Array.from(text);
  return characters.length > width
    ? `${characters.slice(0, width - 1).join("")}…`
    : text + " ".repeat(width - characters.length);
}

/** The path of the export: as given, or from the repository root when it is not there. */
function findFile(file: string): string {
  if (isAbsolute(file) || existsSync(file)) return resolve(file);
  const fromRoot = join(ROOT_DIR, file);
  if (existsSync(fromRoot)) return fromRoot;
  return fail(`No such file: ${file}`);
}

/** Runs a Convex function with the Convex CLI and returns its result. */
function convexRun(fn: string, args: object, prod: boolean): unknown {
  const result = spawnSync(
    join(PACKAGE_DIR, "node_modules/.bin/convex"),
    ["run", fn, JSON.stringify(args), ...(prod ? ["--prod"] : [])],
    { cwd: PACKAGE_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    return fail(`convex run ${fn} failed:\n${result.stderr.trim() || result.stdout.trim()}`);
  }
  return JSON.parse(result.stdout);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
