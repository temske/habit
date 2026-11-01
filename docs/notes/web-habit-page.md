# web-habit-page: notes

The notes of the web-habit-page milestone: the page of one habit (`/habits/$habitId`), with the
grid of the last 12 months and the calendar.

## What exists

The route is `apps/web/src/routes/habits.$habitId.tsx`. The page is in
`apps/web/src/features/habit-page/`.

| File | What it does |
| --- | --- |
| `index.tsx` | The page: the bar (back, Edit), the title (the icon and the name), the description, the grid and the calendar. Also the skeleton (no data yet) and the empty state of a deleted or unknown habit. |
| `year-grid.tsx` | The grid of the last 12 months: 52 Monday weeks of small gauges. Each Month over its columns is a button that moves the calendar there. |
| `month-calendar.tsx` | The calendar: one Month per page, and all its input (tap, hold and paint, long press, keyboard). |
| `use-month-pager.ts` | The paging of the calendar: the drag, the rubber band, the settle with the sheet spring, the instant change from the keyboard. |
| `use-edited-day-in-view.ts` | On a phone, keeps the Day that the input sheet edits above the sheet. |
| `months.ts` | The Month math: the weeks of a Month, the columns and Months of the grid, the Month names. |
| `habit-page.css` | The styles, in the world of `styles.css` (DESIGN.md). |
| `habit-page.test.tsx`, `months.test.ts` | Behaviour tests (Testing Library on `FakeHabitDataProvider`) and the Month math. |

## How the page behaves

- **Title.** The habit's duotone icon (1.75rem) and its name (1.5rem, 600, wraps), then the
  description. A name in a right-to-left script reads in its own direction.
- **Back** goes back in the history when the app came from the list, so the list keeps its scroll.
  After a reload or from a link, it goes to `/`. **Edit** opens `?edit=<habitId>`.
- **Grid.** 52 Monday weeks that end with the week of today (`gridWeeks(today, 52)`), so it always
  fits in the live window and never waits for data. Each column belongs to the Month of its Monday.
  The Month of the calendar has its label in `ink` at 600. The grid does not animate.
- **Calendar.** One Month per page, always 6 rows high, Monday first. Days outside the Month are
  blank. The date sits over each gauge, and today is bold. A choice shows the emoji (or the first
  letter) of its Option in the square.
- **Months.** A swipe to the right shows the previous Month. There are no future Months: the
  current one has a rubber band. The other ways to change the Month: the arrows next to the
  title, "Today" (only when another Month shows), a horizontal trackpad swipe, Page Up and Page
  Down, and the arrow keys across a Month edge. A short quick flick turns the page. A Month older
  than the live window loads with `useMonth`, and its Days take no input until it is loaded.
- **Input** (docs/v1.md, "Input"), with `tapResult`, `paintAction` and `intensity` from
  `@habit/core` and `useAct` (on `usePerform`):
  - check: a tap toggles. On touch, a hold of 200 ms and a drag paint the Days, across rows too.
    A paint is one batch with one Undo toast ("Painted 3 days", "Cleared 2 days", the list's
    words). A hold without a drag is a tap, without a toast. A faster move is a swipe between
    Months, or a scroll. With a mouse, a drag paints at once.
  - number: a tap adds the Step. A long press of 450 ms (the list's) or a right click opens
    `?entry=<habitId>:<day>`.
  - choice, scale, text: a tap opens `?entry=…`.
  - future Days are disabled.
- **Keyboard.** The Months of the grid are one Tab stop (arrows, Home, End). The calendar is one
  Tab stop, on today. The arrows move between Days and across Months. Page Up and Page Down move
  a Month and keep the date. Enter or Space is a tap. A Month change from the keyboard is
  instant.
- **The Day under edit.** It rises above the scrim with a ring in the habit color, as in the list.
  On a phone the page rises with the sheet's spring until the Day is just above the sheet, and
  comes back when the sheet closes.
- **From the list.** A tap on a row's name opens the page with a view transition
  (`features/screens/screen-transition.ts`). On a phone it is a push, as in a native app: the page
  slides in from the right over the list, and the list moves 30% to the left and dims. Back, and the
  browser's back and forward, play the reverse, unless the browser animates the change itself (the
  back swipe on iOS). The direction is a view transition type (`screen-push`, `screen-pop`) that
  screens.css reads. While a view transition runs, the browser gives every tap to the document
  (docs/notes/integration.md). So a finger that lands during the transition ends it at once, and
  its tap clicks the control under it when the page is in place: a quick tap on a Day counts. Under
  reduced motion the screens only crossfade. A browser without view transitions navigates
  without it.

  Until November 2026 the row's icon and name grew into the title (a shared-element "plate"
  transition). On a phone the title flew across the screen, and the owner asked for a native push
  instead.
- **Motion** follows DESIGN.md: a Day presses to 0.95 in 120 ms, a hold shrinks it to 0.9 over
  the time to the paint or the input, the pages settle with the sheet spring and the finger's
  speed. Under reduced motion a new page fades in, and a dragged page snaps without a fade.

## Changes outside this milestone's files

Each is in its own commit, with the reason in the body.

- **`apps/web/src/router.tsx`: the scroll position.** The router scrolled to the top after every
  navigation. A sheet's search param is a navigation, and so is the back that closes the sheet:
  a scrolled list jumped to the top under a sheet. Now a change of the search params alone does
  not change the scroll. A new screen starts at the top. The back gesture returns to a screen
  where it was left (`scrollRestoration` as a function).
- **`apps/web/src/features/list/habit-row.tsx`: the view transition.** The row's link asks for the
  screen transition (`screenTransition`) and lets a tap through while it runs.
- **`apps/web/src/routeTree.gen.ts`**: generated for the new route.

## Checks

- `vp run ready` before each push.
- 17 behaviour tests:
  - the input rules: the check tap, the hold and paint with one Undo, and a fast swipe that paints
    nothing. The number tap and long press. Choice, scale and text open the input. Future Days
    are locked.
  - the Months: swipes, no future Months, the grid, the arrows, Today, the keyboard.
  - a loading older Month, the skeleton, and a deleted or unknown habit.
- 2 tests for the Month math.
- In headless Chrome with real touch events (CDP), at 390×844 and 1280 wide, in both themes: every
  state (each Kind, an older Month, the input of each Kind as a sheet and as a popover, Edit, a
  paint and its toast, the empty state), the gestures (swipe both ways, the rubber band, hold and
  paint without a page scroll, a vertical drag that scrolls, a long press, a flick, a tap right
  after a swipe), the keyboard, and the frames of the transitions.
- break-ui with the list's dev datasets (`?data=worst`) and a year of Entries, at 320, 375, 390, 430
  and 1280 px, with the root font at 150% and 200%: fixed the squares that overlapped with large
  text and the Month names that touched on narrow grids.
- A motion review (review-animations), then its fixes.
- mobile-native: hover only under a fine pointer, no tap highlight, `dvh`, safe areas, `pan-y` on
  the calendar, no text selection or callout on a long press, feedback on pointer down.

## Assumptions

- **52 weeks, not 53.** GitHub shows 53 columns. 52 keep the grid inside the live window of 13
  months, so it never needs `useMonth` (docs/notes/core.md). The first column can hold the last
  days of the Month 12 months back.
- **Month names over the grid.** Short names ("Oct") where they fit. The first letter on phones
  narrower than about 408 px and with large text. Each Month button has the full name for screen
  readers.
- **A mouse does not swipe the calendar.** A mouse drag paints check Days at once, as in the list.
  On a desktop the Months change with the arrows, a trackpad swipe and the keyboard.
- **"Today" in the calendar head** is not in the spec: it shows only when an older Month is on
  screen, so the way back to the current Month is one tap.
- **A deleted habit's page** shows "This habit is not here" with a way back. Deleting from this
  page's Edit sheet goes to the list (the form milestone's behaviour).

## For the other milestones

- **List (cohesion).** The motion review noted that a number square of the list shrinks with
  `transform: scale(0.9)` over 450 ms, linearly, from the first moment of a press
  (`styles.css`, `.day-cells[data-kind="number"]`).

  So a quick tap on a number square in the list
  starts a linear shrink, not the 0.95 press. The habit page keeps the 0.95 press on `transform`
  and puts the hold on the `scale` property (`habit-page.css`, `.hp-day-press`). The list can do
  the same.

## Open questions for the owner

- **Swipe from the left edge on iOS.** Safari's own back gesture takes a swipe that starts at the
  left edge of the screen, so a swipe to the previous Month must start a little inside it. A web
  page cannot change that.
- Do you want the full short Month names on every phone, at 11 px, instead of the first letters?

## What needs a real phone

The gestures were checked with emulated touch in Chrome, not on hardware. On an iPhone, check
these:

- the 200 ms hold before a paint, against a quick swipe
- that a paint never scrolls the page
- the haptics
- the push between the list and a page in Safari, and that the back swipe does not play it twice
- the page that rises above the input sheet, with the keyboard open (the text Kind).

## Findings of the integration milestone

- **The flaky test** ("a fast swipe on check Days…") was a real bug of the calendar: a slide that
  a newer move replaced still called back when it stopped, and its finish showed the old Month
  under the new title. Each slide now has a number, and only the newest one finishes (`32e84c9`).
- **A tap lost during the transition from the list:** fixed as described under "From the list".

## A mistake on the way

`94d88bf` (the break-ui fixes) reached `main` with a type error in a test helper. The merge
command printed the failure of `vp run ready` but still pushed. `5fb66e5` fixed it about three
minutes later, and one CI run failed. The merge now runs from a script that stops at the first
failure.
