# Notes of the integration milestone

The app on the real backend, end to end: the sign-in, the "no access" screen, the real provider in
the dev server, an end-to-end check, and the finish review across the screens.

## How the owner runs it in the morning

1. `git pull`, then `vp install`.
2. `vp dev`, then open the address that it prints. The dev server uses the real backend (the
   Convex dev deployment and the Clerk development instance). No `.env.local` is necessary.
3. Sign in with Google. The "no access" screen shows your Clerk user id and a command. Copy the
   command, run it from the repository root, then reload the page.
4. For the demo data without a backend: `VITE_HABIT_DATA=fake vp dev`.

## What the owner must do by hand

- **Add your Clerk user id to the owners** (step 3 above). The screen gives the exact command:

  ```sh
  vp -C packages/data exec convex env set --deployment fantastic-chihuahua-570 OWNER_USER_IDS "user_3L3tBtYfJHjf9ZrdScO5oy8SQwe,<your user id>"
  ```

- Nothing else for development. Production is not made (by the rules of this build): see
  `docs/notes/data.md`.

## What works end to end

`apps/web/e2e/real-backend.ts` checked all of this on the real backend, in Google Chrome at
390×844, on a dev server of its own. The last run passed every check.

- Signed out: the sign-in screen. The email code signs in the owner test user.
- No habits: the create sheet opens by itself. The check creates a habit of each Kind through the
  sheet: check, number (with a unit and a Target), choice, scale, text.
- A tap on a check toggles the Day. A tap on a number adds its Step.
- A drag over four Days of a check habit paints them. "Painted 4 days" offers Undo, and Undo clears
  them.
- The input of a value: a long press on a number (a typed value, then Enter), a pick of a choice,
  a pick of a scale, a note of a text habit.
- A reorder with a drag of the row.
- The habit page, opened from the list: a tap in the calendar during the transition from the row,
  the previous Month, "Today", a Month in the grid.
- An edit of the name, then "Delete habit", then Undo: the habit comes back in its place.
- A reload with the socket of Convex cut off: the list comes from the snapshot, with the values of
  the last session.
- A new browser and a new sign-in: the server kept each value and the order.
- The guest test user: "No access", the user id, the command with the guest's id, and the
  sign-out back to the sign-in screen.

**The start after a reload** (production build, `vp preview`, measured per animation frame): the
app mounts at about 0.1 s and shows the list from the snapshot at about 0.65–0.9 s. The list comes
in the same frame as the end of Clerk's load. Convex is not on that path: the time is the same
with the socket of Convex cut off.

## How to run the end-to-end check

```sh
vp -C apps/web run e2e
```

- It deletes the data of the owner test user, starts its own dev server on port 5433 with
  `VITE_HABIT_DATA=convex`, and stops that server at the end. Then it deletes the owner test
  user's data again, so the deployment keeps no test data. It prints each step and each failure.
  Screenshots and the server's `dev.log` go to `$TMPDIR/habit-e2e` (or `$E2E_SHOTS`).
- The reset deletes by the owner test user's id only (`admin:deleteUserData`), on the deployment
  of `VITE_CONVEX_URL` in `apps/web`'s Vite env, so it needs no `packages/data/.env.local`. The
  owner's real habits on that deployment are not touched.
- It hides the lab panel of the dev server (`docs/lab.md`): the panel covered the sheets'
  buttons, and the run keeps each lab control on its first option.
- It needs the network, Google Chrome, and the login of the Convex CLI (for the reset). So it is an
  uncached task of its own, not a part of `vp run ready`, and CI does not run it.
- If port 5433 is in use, it stops with a message. Options: `E2E_URL` (use a dev server that runs
  already), `E2E_PORT`, `E2E_HEADED=true` (show the browser), `E2E_CHROME` (the path of another
  Chrome or Chromium binary).

## What was built

- **`features/auth/`**: `AuthGate` in the root route maps each state of `useAuth()` to a screen.
  `DESIGN.md` ("Before the list") describes them.
  - `loading`: the bare ground, so a fast start shows no flash. After 1 s the empty mark (five Day
    gauges) fades in, at the place where the sign-in screen draws it.
  - `signedOut`: the five gauges fill one after the other with the gauge's spring. Then the name
    and one action, "Continue with Google". In development, "Sign in with an email code" opens a
    two-step form (email, then code). "owner" and "guest" in its note fill in a test user. There
    is no marketing copy.
  - `noAccess`: says so plainly, shows the Clerk user id and the command, each with a copy button,
    and "Sign out". The gauges stay empty: this account has no data. The user id and the command
    are in IBM Plex Mono, which the browser loads only for this screen.
- **`@habit/data`**: `AuthState.signedOut` has an optional `emailCode` (`sendCode`, `verifyCode`).
  `HabitDataProvider` implements it with Clerk's `signIn.emailCode` and `finalize`. The fake
  provider accepts the code `424242` too (`FAKE_EMAIL_CODE`), and signs in an address that
  contains "guest" without access.
- **`apps/web/.env.development`**: `VITE_HABIT_DATA=convex` and the two public values of the dev
  backend.
- **`apps/web/e2e/real-backend.ts`** and the task `e2e`, with `playwright-core` as a dev
  dependency.

## Fixes in other areas

- **The drop of a reordered row opened its habit page** (list). A mouse drag that moved a row up
  ended with a click on the row's link. dnd-kit stops that click at the document for 50 ms, so
  React's handler never cancelled it, and the browser followed the link: a full page load. A
  capturing listener on the window now cancels it.
- **The desktop value input fell back to a dialog after a reload** (entry input). It looked for its
  square while it rendered, before the list was in the document. It looks again after the first
  commit, before the first paint.
- **The focus ring of a sheet's close button** went around the 44 px target. It goes around the
  disc now (`styles.css`).
- **A habit icon that loads after its row** fades in over 160 ms, instead of a pop.
- **A tab from before a deploy** asked for chunks that no longer exist, and showed the router's red
  error. On `vite:preloadError` the app reloads, at most once a minute (`main.tsx`).
- Two skeleton tests (list, habit page) reached "no data" through the fake's "loading" sign-in.
  The gate shows its own loading screen there, so the tests now sign in and ask for no data.

Found here and fixed by the web-habit-page milestone: a tap during the transition from a list row to
the habit page was lost, and a calendar test failed about one run in three. The end-to-end check
now taps during that transition.

## Finish review

impeccable's detector, then a finish review by a fresh subagent with the role of
`.agents/skills/impeccable/reference/degraded/finish-reviewer.md`. The captures are in
`apps/web/.impeccable/review/` (git ignores them): `list`, `habit-page`, `create`, `value-input`,
`sign-in`, `sign-in-email` and `no-access`, each as `-mobile-` (390×844) and `-desktop-`
(1280×800), `-dark` and `-light`, plus `value-input-reload-desktop-*`, `mobile.png` and
`desktop.png`. The list, the habit page and the sheets show the synthetic demo data. The sign-in
and "no access" captures run on the real backend.

- **Detector:** two findings on the auth screens (a 1.5 rem title off the type ramp, IBM Plex Mono
  not declared). Both were resolved in `DESIGN.md` (a `page-title` step, which the habit page's
  name already used, and a `code` step). The rerun on the changed files and on the live sign-in
  page found nothing. Eight older advisories in `styles.css` (the radii of the gauge and the icon,
  the smaller sizes of the number field) are on lines this milestone did not change. `DESIGN.md`'s
  prose documents each of them.
- **Round 1: disposition: fix**, with eight material fixes:
  1. The anchor of the desktop value input.
  2. The seed.
  3. The lost tap after the transition.
  4. The focus ring of the close button.
  5. The create dialog at 1280×800.
  6. The wrap of the command.
  7. The datalist arrow and an orphan in the note.
  8. Two lines of `DESIGN.md`.
- **Round 2 (verdict pass): disposition: fix.** Resolved: the anchor, the seed, the focus ring, the
  command, the email step, `DESIGN.md`. The lost tap was "partial" until an end-to-end run covered
  it. That run passed afterwards. Unresolved: the create dialog at 1280×800 (see below). Two
  regressions:
  - The `DESIGN.md` line of the code type said "breaks anywhere". It is fixed.
  - The reviewer saw no 44 px hit area for "owner" and "guest" in the note. The `::after` of
    `.auth-inline-link` gives them one (0.75 rem above and below a 20 px line).
- **The seed** `seed:bf31d7351e3e2498` has its record in the root checkout:
  `apps/web/.impeccable/questions/seeds/bf31d7351e3e2498.json`. That record corroborates it, as
  `docs/notes/web-list.md` says. `--check-seed` does not find it from a worktree, because git
  ignores the record.

## Assumptions

- **The email code is for development only.** The sign-in screen shows it when
  `import.meta.env.DEV` is true and the provider offers it. A production build shows Google only.
  The spec adds an email code later, if Google fails in an installed PWA (v2).
- **The command on the "no access" screen is the one of `docs/notes/data.md`**: it sets the owner
  list to the owner test user and the signed-in user. The deployment name comes from
  `VITE_CONVEX_URL`.
- **The owner has no sign-out in v1.** The spec has no settings screen. The guest gets a sign-out
  on the "no access" screen.
- **`.env.development` holds the public dev values**, so a new checkout runs `vp dev` without a
  copy of `.env.example`. `.env.local` still serves `vp build` and `vp preview`.

## Open questions for the owner

- **The create dialog does not fit a 1280×800 window.** With the desktop's 20 px base, the first
  step is about 200 px taller than the window: "Direction" and the line about the Kind sit under
  the sticky "Add habit" until you scroll. Possible fixes, all larger than a fix of this
  milestone:
  - On a wide screen, put the icon tile next to the name, and the description behind
    "+ Description".
  - Move Direction to the second step.
  - Use a smaller base on short desktop windows. This changes the spec's 20 px.
- **The start waits for Clerk.** The snapshot shows only after the load of Clerk: about 0.6–0.9 s
  here, more on a phone network. The app must know the user before it shows that user's data. A
  faster start can show the snapshot of the last user at once, and check the user after Clerk
  loads. That changes the rule of the spec ("only when the user is the same"), and the change
  belongs to `@habit/data`.
- **The "no access" screen shows its command to anyone who signs in.** Sign-up is open in Clerk
  (`docs/notes/data.md`). The command does nothing without the team's Convex login, and the ids
  are not secret, but a stranger sees the deployment name. Restrict the sign-up in Clerk if that
  matters.
