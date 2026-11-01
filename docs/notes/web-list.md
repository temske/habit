# web-list: notes

The notes of the web-list milestone: A, the design foundation of the web app, and B, the habit
list and the input of a value.

## A: the design foundation

### What the other screens can use

All of it is in `apps/web/src/components/`.

| Import | What it does |
| --- | --- |
| `DaySquare` from `@/components/day-square` | The gauge of one Day. Props: `color`, `intensity` (0 to 1), `size` (a CSS length, default `var(--square)`), `variant` (`day`, `ghost`, `future`), `animated` (default true; turn it off for a large static grid), `label`. It is only the picture: wrap it in your own button. |
| `HabitIcon`, `PHOSPHOR_ICON_GROUPS`, `preloadHabitIcons` from `@/components/habit-icon` | The icon of a habit: a Phosphor duotone icon in the habit color, or an emoji. `PHOSPHOR_ICON_GROUPS` is the curated list for an icon picker (about 200 names in 12 groups). |
| `ResponsiveSheet`, `MorphHeight` from `@/components/sheet` | A bottom sheet on a phone (Base UI Drawer, swipe down to dismiss), a centered dialog or an anchored popover on a desktop (`desktop="dialog" \| "popover"`, `anchor`). The content morphs its height with a spring. |
| `useSheetSearch`, `useOpenSheet`, `useCloseSheet`, `entryRef`, `parseEntryRef` from `@/components/sheet-search` | The sheet search params (`?new`, `?edit`, `?entry`). Open with `useOpenSheet()({ edit: id })`; close with `useCloseSheet()()`, which goes back when the app opened the sheet, so the back gesture and the close button agree. |
| `useRetained` from `@/components/use-retained` | Keeps the last search param while a sheet animates out. |
| `useAct` from `@/components/act` | Performs an Action with the feedback: an optional Undo toast (`act(action, { undo: "Habit deleted" })`), and "Couldn't save" with Retry when the write fails. |
| `toastUndo`, `toastSaveError`, `toastMessage` from `@/components/toast` | The toast capsule (Sonner, headless). The one `<AppToaster />` is in the root route. |
| `springs`, `durations`, `PULSE_VELOCITY` from `@/components/motion` | The motion presets for Motion (`motion/react`). `--spring-fill` and `--spring-sheet` are the same springs for CSS transitions. |
| `habitColorStyle`, `habitColorVar` from `@/components/palette` | Puts a habit color in scope as `--c`; then `text-habit`, `bg-habit` and `border-habit` use it. |
| `useIsWide`, `useMediaQuery` from `@/components/use-media-query` | The wide layout (at 640px and more: 7 Days, a 20px base, dialogs instead of sheets). |
| `haptic` from `@/components/haptics` | A short haptic tick where the browser can give one. |

Tokens (in `apps/web/src/styles.css`, both themes): `ground`, `ink` to `ink-4`, `line`,
`line-strong`, `surface` to `surface-3`, `toast`, `toast-ink`, as Tailwind colors (`bg-ground`,
`text-ink-3` and so on), the 16 `--habit-*` colors, and the list's measures (`--gutter`, `--row`,
`--icon`, `--square`, `--square-gap`). The `squircle-*` utility gives squircle corners with a radius
fallback. The shadcn variables map onto these tokens, so a shadcn component wears the world.

### Decisions and assumptions

- **Theme by the system setting only.** `dark:` is the `prefers-color-scheme` media query, not a
  class. There is no theme switch.
- **Light palette.** The owner's 16 dark values, darkened to about L 0.64 with the same chroma, so a
  full square has 3.3:1 against white. The frame of a partial square takes 40% of the habit color
  in the light theme (35% in the dark theme, as the owner set), because a 35% frame was too faint
  on white.
- **Light toast.** The toast capsule is inverted in the light theme (dark capsule, light text), so
  an Undo is never missed on white. The dark theme keeps the sketch's `#1c1c1e` capsule.
- **Ghost text contrast.** The sketch's `#636366` for the "New habit" text is 3.5:1 on black,
  under WCAG AA. It is `#7c7c80` (5:1) instead.
- **Desktop.** At 640px and more, the root font size is 20px, so every rem in the app scales by
  1.25, and the layout is a 600px column.
- **Sheets.** Base UI's Drawer (already in the app, and Base UI is the curated pick for dialogs and
  popovers) is the phone sheet; Dialog and Popover are the desktop forms. The phone sheet floats
  8px above the bottom edge with large squircle corners, as in Family.
- **Icons.** A curated catalog of about 200 Phosphor icons, each loaded as its own small chunk, not
  the whole set of 1,500. A name outside the catalog draws a circle. To add an icon, add a line to
  `components/habit-icon/catalog.ts`.
- **Motion.** The gauge fill is a CSS transition with Motion's spring as a `linear()` easing, so a
  fast series of taps retargets it. The pulse to about 1.04 is a physical spring started with a
  velocity. Under reduced motion the fill changes in place with a short fade, and sheets fade.
- **Fake data knobs.** In fake mode, `VITE_HABIT_FAKE_START_MS` (a cold start without a
  snapshot: the sign-in loads for half of it, the data for the other half),
  `VITE_HABIT_FAKE_LATENCY_MS` and `VITE_HABIT_FAKE_FAIL=true`
  (in `apps/web/.env.development.local`, which git ignores) show the loading, the pending and the
  failed states.
- **The rubber band.** The root has `overscroll-behavior: contain`, not `none`: iOS keeps its
  bounce at the ends of the list, so a fling eases out instead of stopping dead, and Chrome still
  has no pull-to-refresh and no swipe between pages. The sheets keep their scroll to themselves:
  their scroll areas have `contain`, and Base UI's Drawer cancels a touch move that would reach
  the page.

## B: the habit list and the input of a value

### What it does

- **The list** (`/`, `features/list/`): a sticky header of the last Days (5 under 640px, 7 from
  640px), a row per habit, and the ghost "New habit" row (opens `?new=true`). No title on screen;
  a hidden `h1` "Habits" names the page for screen readers.
- **Tap** applies `tapResult`: a check toggles, a number adds its Step, a choice, scale or text
  opens the input.
- **Drag to paint** (check habits): the first square sets the mode, every square under the finger
  gets it, and one batch (`paintAction`) is performed on release, with "Painted N days" or
  "Cleared N days" and Undo.
- **Long press** (450ms) or a right click (or the context-menu key) on a number square opens the
  exact value. A held number square shrinks for the whole hold, to show the wait.
- **Reorder**: a long press (300ms) on the icon or the name lifts the row on touch; with a mouse, a
  6px drag lifts it; with a keyboard, Space lifts and drops, and Enter opens the habit. One
  `moveHabit` with `orderBetween` on drop.
- **A tap on the icon or the name** opens `/habits/<id>`.
- **Midnight**: the columns move to the new Day while the app is open (`useToday`).
- **Loading**: the app's loading screen (`AuthGate`) stays until the habits are there and the
  icons of the first screen have loaded (2 s at most), then fades out over the complete list. The
  list had a skeleton before; the owner saw the start build up in steps (the day header, the rows
  without icons, the icons), so the list now shows once.
- **A new habit enters** (`features/list/row-entrance.ts`): its row grows at its place while the
  create sheet leaves. Only a habit made in the last 3 s, so a load or a reload never animates.
- **No habits**: the create sheet opens by itself, once per visit of the list.
- **Failed writes**: the screen rolls back (the provider does it) and "Couldn't save" offers Retry,
  which performs the same Action again.
- **The input of a value** (`?entry=<habitId>:<day>`, `features/entry-input/`): a bottom sheet on
  a phone, a popover at the square on a desktop. Number: a field (applies after a 700ms pause, on
  Enter and on blur), −Step, +Step, "= Target" ("= Limit" for a quit habit) and Clear. Choice and
  scale: the Options as a radio list (a scale shows each Option's gauge level); a pick applies and
  closes the sheet after 220ms. Text: a note that applies as the person types; an empty note
  clears the Day. While the sheet is open, the Day under edit rises above the scrim with a ring in
  the habit color.

### Decisions and assumptions

- **A recorded zero is data.** A number Entry of 0 (0 cigarettes on a quit habit) draws the frame
  in the habit color with no fill; a Day with no Entry draws the neutral frame. Both are "frame
  only", as the owner set, but they differ.
- **Taps have no Undo toast.** A tap is undone by another tap; the toast is for paints and other
  bulk changes, as the spec says. A reorder has no toast either.
- **Choice and scale close after a pick.** Text and number stay open, since they are typed.
- **The number field applies typed values without a save button** (spec: no save buttons), after a
  pause or on Enter or blur. An empty field clears the Day only on Enter or blur, not while typing.
- **"= Target" keeps the spec's label.** Its accessible name says the action and the value ("Set
  to the target, 8 glasses"), as the finish review asked.
- **−Step stops at 0**, and does nothing on a Day with no Entry.
- **The 320px layout** shrinks the gutter to 16px and the squares to 28px, so names keep room.
- **Haptics** are best effort: `navigator.vibrate` on Android, the switch-control tick on iOS 18
  Safari, which works only inside a tap (not after the long-press timer).
- **The link to the habit page** was a raw href until the web-habit-page milestone added the
  route; it is now the typed `to="/habits/$habitId"`.
- **The habit page can reuse the marking of the Day under edit**: give its squares
  `data-entry={entryRef(habitId, day)}` (the desktop popover anchors to it) and
  `data-editing` when `useSheetSearch().entry` names them.

### Verification

- Behaviour tests (`features/list/habit-list.test.tsx`, `features/entry-input/entry-input.test.tsx`)
  on the fake provider: tap per kind, paint and Undo, Retry after a failed write, the ghost row,
  the automatic create sheet, the loading screen until the data, midnight, the number and text inputs, a link to an
  unknown habit.
- Screenshots at 390×844 and 1280×800 in both themes, every input state, and the worst case at
  320px (break-ui). In dev fake mode, `?data=worst` (or `empty`, `one`, `many`) swaps the demo
  data for a break-ui dataset and shows a small switch at the top left.
- The motion review (review-animations) found 5 defects, all fixed (reduced motion for toasts and
  the check mark, strong ease-out on fades and the reorder, shallower presses), plus the faster
  drain, the delayed touch press and the hold progress.
- impeccable's detector: no findings on the files or on the live page with each sheet open (one
  placeholder contrast finding was fixed).
- The finish review, run by a fresh subagent from impeccable's degraded finish-reviewer role (this
  harness has no shipped impeccable agent), returned "fix" with four items; see "Finish review".

### Open questions for the owner

- **The size of the first load.** The app's JavaScript is about 205 KB gzipped at start (React, the
  router, Motion, Base UI, dnd kit, Sonner). Lazy-loading the sheets and the reorder could halve
  it, if the start feels slow on a phone.

### Finish review

Run by a fresh subagent from impeccable's degraded finish-reviewer role (no shipped impeccable
agent in this harness), on captures in `apps/web/.impeccable/review/` (git ignores them).

- Round 1: **disposition: fix.** Four material fixes: the direction seed could not be
  corroborated; the Day under edit had no marking; the desktop header had no top inset; "= Target"
  did not name its action.
- Round 2 (verdict pass): the marking, the inset and the label were scored **resolved**, with no
  regressions. The seed stays **unresolved**: it needs the roll output from your direction
  session, which is not on this machine. **disposition: fix**, for that one provenance item only;
  the ship it would otherwise give covers the scored fixes, not the whole screen.
- Seed corroborated: the direction round's seed record is
  `/Users/moe/repos/potom/habit/apps/web/.impeccable/questions/seeds/bf31d7351e3e2498.json` (in the
  root checkout; git ignores it). It records three direction rounds in Operate mode, each picked in
  the picker, the third with the "safer" register, which matches FORM ("the first of three safer
  candidates in re-roll round 2"). The item is closed. Nothing else is open: **disposition: ship**,
  for the scored fixes and the closed provenance item.
- DESIGN.md and its sidecar `apps/web/.impeccable/design.json` were written afterward by a fresh
  subagent from impeccable's degraded documenter role, from the built code.
