# Import from HabitKit

The import reads a HabitKit export (a JSON file, `formatVersion` 2) and adds its habits and
completions to one owner, as Habits and Entries. It has three parts:

- `importHabitKit` in `packages/core/src/habitkit.ts`: the mapping. It is pure and has tests.
- `packages/data/convex/habitkit.ts`: internal Convex functions that write the rows.
- `packages/data/scripts/import-habitkit.ts`: the command that reads the file, prints a summary and
  calls the functions through the Convex CLI.

## How to run it

1. In HabitKit, export the data and copy the JSON file to `imports/habitkit/` in the repository.
   Git ignores `imports/`, because the file has personal data. Do not commit it.
2. Make sure that `packages/data/.env.local` has the `CONVEX_DEPLOYMENT` of the target deployment
   (see `docs/notes/data.md`).
3. Push the Convex functions, so that the deployment has `habitkit:*`:

   ```sh
   vp -C packages/data run convex:push
   ```

4. Find the Clerk user id of the owner. The Convex variable `OWNER_USER_IDS` has the owners:

   ```sh
   vp -C packages/data exec convex env get OWNER_USER_IDS
   ```

5. Do a dry run. It prints the summary and writes nothing. With `--user`, it also reads the order
   of the owner's Habits:

   ```sh
   vp -C packages/data run import:habitkit imports/habitkit/<file>.json --dry-run --user <user id>
   ```

6. Read the summary. Then do the import:

   ```sh
   vp -C packages/data run import:habitkit imports/habitkit/<file>.json --user <user id>
   ```

The command prints the count of Habits and Entries on the deployment at the end. These counts must
be equal to the counts of the summary.

Options:

- `--include-archived`: import the archived habits too, as normal Habits.
- `--prod`: write to the production deployment, not the dev deployment.

A path that is not found from `packages/data` is read from the repository root.

## A second run

A second run of the same export adds nothing. The id of each Habit is a UUIDv7 with the time of
creation of the HabitKit habit and random bits from a hash of the HabitKit id. So the same export
always gives the same ids. The functions write a Habit only when its id is new for the owner, and
an Entry only when its Habit and Day have no Entry. They also do not write over a deleted Habit or
a cleared Entry.

A new export from HabitKit has the old habits with the same ids. Its import adds only the new
habits and the new days. It does not change the Habits and the Entries that are already there.

The functions write only for a user in `OWNER_USER_IDS`. The habits go in one mutation, the Entries
in mutations of 500.

## The mapping

| HabitKit                                | Habit                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `name`                                  | The name, trimmed. An empty name becomes "Untitled". A name above 60 characters is cut. |
| `description`                           | The description, trimmed. `null` becomes empty.                                         |
| `emoji`                                 | An emoji icon. It wins over `icon`.                                                     |
| `icon`                                  | A Phosphor icon from the table below, else `sparkle` (the default of a new Habit).      |
| `color`                                 | The Habit color with the nearest hue (table below). An unknown color becomes `stone`.   |
| `isInverse`                             | `true` gives the Direction `quit`, `false` gives `build`.                               |
| the goal of the current interval        | One completion a day gives a `check` Habit. More gives a `number` Habit with that Target and the Step 1. |
| `kind: "measure"`, `unit`               | A `number` Habit with the unit and the Step 1. A unit "/N", such as "/10", gives the Target N. |
| `orderIndex`                            | The order. Equal indexes sort by the time of creation. The Habits go after the owner's Habits. |
| `createdAt`                             | `createdAt`. `updatedAt` is the time of the import.                                     |
| `archived: true`                        | Skipped, with its completions. Habit has no archive yet (a v2 feature).                 |

The current interval is the interval without an `endDate`, else the interval that started last.
A habit without an interval is a `check` Habit.

A completion becomes an Entry:

- The Day is `date` plus `timezoneOffsetInMinutes`. HabitKit writes the local midnight of the day
  in UTC: `2026-10-25T20:00:00.000Z` with the offset 240 is the Day `2026-10-26`.
- A completion with `amountOfCompletions` 0 gives no Entry. HabitKit keeps this row when a tap is
  undone, and a Day without an Entry is the same as "not done".
- A check Habit gets a check Entry. An amount above 1 on a check Habit becomes a check too, and the
  summary counts it.
- A number Habit gets the amount as its value.
- When a habit has two completions on one Day, the Entry keeps the larger amount.
- The `updatedAt` of each Entry is the time of the import.

### Icons

| HabitKit                         | Phosphor              |
| -------------------------------- | --------------------- |
| `bath`                           | `bathtub`             |
| `bed`                            | `bed`                 |
| `bike`                           | `bicycle`             |
| `book`, `bookSpine`              | `book`                |
| `briefcase`, `business`          | `briefcase`           |
| `capsules`, `tablets`            | `pill`                |
| `cigarette`                      | `cigarette`           |
| `close`                          | `prohibit`            |
| `coffeebean`                     | `coffee-bean`         |
| `dumbbell`                       | `barbell`             |
| `film`                           | `film-strip`          |
| `graduation`                     | `graduation-cap`      |
| `heart`                          | `heart`               |
| `moneybill`                      | `money`               |
| `moon`                           | `moon`                |
| `newspaper`                      | `newspaper`           |
| `palette`                        | `palette`             |
| `pen`                            | `pen`                 |
| `personMeditation`               | `flower-lotus`        |
| `sickness`                       | `thermometer`         |
| `smartphoneSlash`                | `device-mobile-slash` |
| `sun`                            | `sun`                 |
| `toothbrush`                     | `tooth`               |
| `utensils`                       | `fork-knife`          |

HabitKit's default icon `activity` (a pulse line) is not in the table on purpose. It tells nothing
about the habit, so it gets `sparkle`. Other icons without a clear equivalent, such as `linkedin`,
`preaching`, `fries` and `bowling`, also get `sparkle`. The summary lists each Habit that got it.

### Colors

HabitKit uses the Tailwind color names. Habit's palette is muted, so the import compares the hue
only. The grays go to the two muted colors.

| HabitKit                    | Habit       |
| --------------------------- | ----------- |
| `red`, `rose`               | `rose`      |
| `orange`                    | `apricot`   |
| `amber`                     | `ochre`     |
| `yellow`                    | `mustard`   |
| `lime`                      | `olive`     |
| `green`                     | `green`     |
| `emerald`                   | `jade`      |
| `teal`                      | `teal`      |
| `cyan`, `sky`               | `sky`       |
| `blue`                      | `blue`      |
| `indigo`, `violet`, `purple` | `violet`   |
| `fuchsia`                   | `mauve`     |
| `pink`                      | `raspberry` |
| `slate`, `gray`, `zinc`     | `slate`     |
| `neutral`, `stone`          | `stone`     |

## What is lost

- **Archived habits** and their completions, unless you use `--include-archived`.
- **Notes** of completions. An Entry has no note. The summary prints each dropped note with its
  habit and Day.
- **Goals per week or month** (`requiredNumberOfCompletions`, the interval `type`) and the history
  of old intervals. Only the daily goal of the current interval is used.
- **Streak settings** (`streakType`) and `allowExceedingGoal`. Habit has no streaks, and a number
  Entry can always go above its Target.
- **The inverse spans** (`inverseStartDate`, `inverseSpanBounds`). A quit Habit records the days
  as Entries, the same as a build Habit.
- **Reminders, categories and category mappings.** Habit has none of them.
- **The time of each completion** (`capturedAt`) and the time zone. An Entry has a Day only.
- **The amount above 1** on a habit that becomes a check Habit.

## The first import

On 2026-10-31 the owner's export `habitkit_export_2026-10-31.json` went to the dev deployment
`fantastic-chihuahua-570`:

- 24 Habits: 23 `check`, 1 `number` ("шелешения", unit "/10", Target 10).
- 2451 Entries.
- 25 archived habits skipped, with 961 completions.
- 120 completions with the amount 0 skipped.
- 0 notes dropped.
- 2 Habits with the fallback icon: "шелешения" (`activity`) and "apply for a job" (`linkedin`).

No habit in this export had `isInverse` set, so all 24 Habits are `build`. Habits such as "reels",
"yt", "сладости" and "no fap" can be quit habits: change the Direction in the edit sheet if so.
