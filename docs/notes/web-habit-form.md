# Notes of the web-habit-form milestone

Create and edit a habit (`?new=true`, `?edit=<habitId>`): a bottom sheet on a phone, a centered
dialog on a desktop, delete with Undo. The code is in `apps/web/src/features/habit-form/`.

The owner was away. No questions were asked: each decision below comes from `docs/v1.md`,
`PRODUCT.md`, `DESIGN.md` and the build plan, and each assumption is written here. (The impeccable
skill asks to probe the user once before design decisions. The brief of this milestone forbids
questions, so the brief won.)

## What it does

- **Create, two steps** (after Family): first the icon, the name, the description, the color, the
  Kind and the Direction. Then the fields of a number, choice or scale habit. The first step adds a check or a text habit at once ("Add habit").
  For the other Kinds it goes "Next". The icon picker opens
  in a sheet stacked over the form (see "Icon picker place" below). The sheet morphs its height. "Add habit" performs
  `createHabit` with the order after `lastOrder(state)` (so also after a deleted habit) and closes
  the sheet.
- **Edit**: the same fields, without the Kind (it shows as "Set when created"). No save button:
  each change applies at once as an `updateHabit` Action. Typing applies after a 400 ms pause, on
  blur and on close, so a close never loses the last letters. Text is trimmed when saved, and in
  the field on blur.
- **Delete** (edit only): no confirmation. The habit goes away, the sheet closes, and the toast
  `Deleted “Name”` offers Undo, which restores it. When the sheet is over the page of that habit,
  the app goes to the list: it goes back past the sheet's history entry, then replaces the
  habit's page with `/`.
- **Number**: unit, Target ("Limit" for a quit habit), Step (default 1). Decimals with a point or
  a comma. Under the fields, up to five small gauges show the fill of each tap. A line counts the
  taps that fill the day ("reach the limit" for a quit habit). So a Step that is too small for
  the Target shows at once.
- **Choice and scale**: a row per Option with its emoji, its label, remove and a drag handle (the
  up and down arrow keys move it too). A scale draws each Option's fill level. Add stops at 12 (5
  for a scale). Remove stops at 1 (2 for a scale). Return in a label goes to the next row, or adds
  one. A tap on the emoji opens the emoji picker in a sheet stacked over the form: the emoji of
  the icon picker and its search, without the Phosphor icons (an Option stores an emoji), and "No
  emoji" first. A picked emoji returns to the form, with the focus on that emoji.
- **Choice and scale share their Options**, so a switch between them keeps the rows (and what
  was typed) in place. What a scale adds moves instead: each row's level gauge opens its room, one
  row after the other, and its fill rises; the label above rolls to its scale wording.
- **Icon picker place** (a lab choice, `icon-picker-place`), after the owner found the step that
  replaced the whole sheet abrupt. The options, in this order:
  - "Stacked sheet", the first and what production ships: a second sheet over the form (a Base UI
    nested drawer). The form steps back to 0.94 from its top edge, dims, hides its handle and
    rises until its top edge shows 0.625rem above the picker. The picker has no scrim of its own,
    and is at most 0.625rem shorter than a sheet can be, so it never covers that edge. A swipe
    down closes only the picker, and the form follows the finger back.
  - "Inline": the picker unfolds under the button that opened it (the icon tile, or an Option's
    emoji), the rest of the form stays and moves down, and a pick, a second tap or Escape folds it
    away.
  - "Popover": a compact picker at the button.
  - "Step": the old step, which now zooms out of the button and back into it instead of the
    sideways shift.

  Both sheets read the same choice. "Inline" shipped first. On the iPhone the owner found it
  better than the step, "but still not it", and asked for a sub-modal as on iOS, where the top
  edge of the sheet under it shows. So "Stacked sheet" ships now.
- **Option rows on touch** (a lab choice, `option-row-touch`): "Buttons" keeps the remove button
  and the handle. "Gestures" hides both on a coarse pointer: a hold of 300 ms on the emoji lifts
  the row, as in the list, and a swipe to the left uncovers Remove (a long or fast swipe removes
  at once). "Gestures, with a hint" adds a line about both under the label. A mouse always has
  the buttons, and screen readers keep the remove button.
- **Retire**: removing an Option that loaded Entries use retires it (it keeps its place, so the
  scale levels of past Days do not move). Retired Options wait under the list with Restore.
- **Icon picker**: the curated Phosphor catalog by group, or a short list of 50 emoji. One search
  covers both ("water" finds the drop). The person can also type any emoji into the search and
  use it. While the person has not picked an icon, the typed name suggests one ("Drink water"
  gets the drop, "Gym" the barbell).
- **First run**: the list opens `?new=true` by itself. The sheet's title is "Your first habit",
  and the icon tile fills with the habit color from the bottom, like a Day, with the gauge's
  pulse. No other onboarding.
- **Validation** with `validateHabitDraft`, in calm lines under the fields (no red, no shake).
  Create shows the name message after the first try (a name over 60 characters at once), the
  number messages after blur, the Option messages after the try. Edit shows them at once and
  does not save a value that is not valid: the habit keeps its last valid value.
- **Focus**: Next focuses the first field (on a desktop only, because on a phone a focus from code
  does not open the keyboard), Back returns to the Next button, a picked icon returns to the icon tile.
- **Loading**: the form is its own chunk (about 23 kB gzipped). The app loads it when it is idle,
  so the list does not wait for it.

## Changes outside the feature folder

- **`@habit/data`: `useHabitState()`** (additive, `feat(data)`): the whole client state. The
  create form needs `lastOrder(state)` (it reads deleted habits too), and the edit form needs the
  loaded Entries to know whether an Option is in use. The build plan lists the new hook.
- **`components/sheet.tsx`** (web-list's file, two small edits):
  - `ResponsiveSheet` keeps a sheet closed for its first commit. Base UI plays the enter
    transition only when `open` turns true after mount, and every sheet of the app mounts already
    open, so **no sheet slid up** (the entry input neither). Checked with a frame sampler: both
    slide now.
  - `MorphHeight` clips with `overflow: clip` instead of `hidden`. It clips the same, but it is
    not a scroll container, so the form's sticky footer (the "Add habit" button stays in reach
    while a long step scrolls) sticks to the sheet's scroll.
- **`DESIGN.md` and `apps/web/.impeccable/design.json`**: a "Habit form" section and three
  component samples (segmented control, color swatches, icon tile).

## Assumptions

- **Steps are not in the URL.** On step 2, the back gesture closes the whole sheet (only
  `?new=true` is in the URL, per the URL contract). The in-sheet Back button goes to step 1.
- **Defaults of a new habit**: the first palette color that no habit has (else the least used),
  the "sparkle" icon, build, check.
- **An empty new Option row is not an Option.** Create drops it. Edit saves it only when it has
  a label. So "Add option" never shows an error before the person types.
- **Which Entries count for a retire**: the loaded ones, that is the live window (13 months) and
  any older month that the habit page keeps loaded. An Option that only older Entries use is
  deleted, and those Entries then point to an unknown Option (a scale counts it as the first
  level). See the open questions.
- **Restore** of a retired Option is not in the spec. It is there so that a removal by mistake can
  come back. It is off when the list is full.
- **A move keeps retired Options in their places**, and a new Option goes at the end of the list.
- **No Undo toast for an edit**: the spec asks for Undo after a delete and after bulk changes.
  An edit is undone by editing again (Cmd+Z history is v2).
- **The desktop dialog is 25rem wide** (DESIGN.md's dialog is 22rem): 8 swatches and the Option
  rows need the room.
- **An unknown or deleted habit in `?edit=`** (a stale link) closes the sheet once the live data
  is there.
- **Duplicate habit names are allowed**: `validateHabitDraft` does not refuse them.

## Verification

- **Behaviour tests** (`habit-form.test.tsx`, Testing Library on `FakeHabitDataProvider`):
  create each Kind (check, text, number with decimals, quit number without a limit, choice,
  scale with a keyboard move), the order after a deleted habit, validation (no name, a name over
  60, step 0 and a target that is not a number, a scale with one option, duplicate labels), edit
  applies at once and keeps the last valid value, a close right after typing saves, the Kind
  cannot change, retire versus remove and Restore, a stale link, delete with Undo, delete from
  the habit page. Unit tests (`draft.test.ts`) for the moves around retired Options, the taps
  math, decimals, the default color and the icon search.
- **Screenshots** (git-ignored, as web-list's review captures):
  `apps/web/.impeccable/review/habit-form/`, 48 files named
  `{phone,desktop}-{dark,light}-NN-<state>.png`: phone 390×844 and desktop 1280×800, both themes,
  for the first run, the missing name, the basics of a quit number, the limit message, the number
  step, the scale step, the icon picker (icons, emoji, search), the edit of a number habit, the
  edit of a choice with a retired Option and a duplicate label, and the delete toast. Also checked
  at 320×640 and on the list's worst-case data (`?data=worst`: a 60-character name, 12 Options
  with long labels and a retired one, an icon outside the catalog, a long unit, an Arabic scale).
  No console errors.
- **Motion**: a review-animations pass by a fresh subagent returned "Block" with 12 findings. All
  are fixed (the retired section's presence, fades under reduced motion, strong ease-out, fast
  removals, 150 ms presses at 0.95, 2px blurs). The steps, the pill and the tile were sampled
  frame by frame.
- **mobile-native**: every field is 16px or more (measured: the name 17px, the emoji field 17px,
  the others 16px), so iOS does not zoom. Radios have `touch-action: manipulation`. Hover styles
  are gated. The drag handle has `touch-action: none` and `data-base-ui-swipe-ignore`, so a drag
  does not swipe the sheet away. The icon grid scrolls with `overscroll-behavior: contain`.
- **impeccable detector**: no findings on `features/habit-form/`.

## For the owner to check on a phone

These need real hardware. A desktop browser cannot show them.

- The sheet with the keyboard open: the sticky "Next" / "Add habit" should sit above the keyboard.
- A drag of an Option's handle inside the sheet: the row should move, the sheet should not swipe.
- The emoji field of an Option with the emoji keyboard.

## Open questions for the owner

- **Retire and old Entries.** The form cannot see Entries older than the loaded months. A server
  query ("does any Entry of this habit use this Option?") can make the retire exact. Until
  then, a removed Option that only Entries older than 13 months use is deleted.
- **Back gesture on step 2.** Should it go back to step 1 instead of closing the sheet? It needs a
  second history entry, which the URL contract does not have.
- **Option labels have no length limit** in `validateHabitDraft` (names have 60). A long label is
  cut in the field and in the input of a value. A limit of about 40 in core can match the UI.
