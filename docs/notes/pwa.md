# Notes of the installable app (PWA)

The web app installs from Safari to the iPhone's Home Screen and opens like an app: no browser
bars, at once, and also without the network. The spec is in `docs/v1.md` ("Installable app").

## What was built

- **Manifest** (`apps/web/public/manifest.webmanifest`): name and short name "Habit", `id`,
  `start_url` and `scope` `/`, `display: standalone`, `theme_color` and `background_color` black
  (the ground of the icon and of the dark theme). The manifest takes one color only; the
  `theme-color` tags in `index.html` keep one for each scheme (white, black).
- **iOS tags** (`apps/web/index.html`): `apple-mobile-web-app-capable` (and the standard
  `mobile-web-app-capable`), `apple-mobile-web-app-title`, the status bar style `default`, and
  `apple-touch-icon`. `viewport-fit=cover` was there already.
  - Why `default`: `black-translucent` puts the content under the status bar with white text,
    which is invisible on the light theme's white ground. `default` gives the status bar its own
    band, and iOS colors it from `theme-color`.
- **Icons** (`apps/web/public/`): one Day gauge, two thirds full, blue on black (DESIGN.md, "App
  icon"). `apps/web/scripts/icons.ts` draws all of them in Chrome: `vp -C apps/web run icons`.
- **Safe areas:** the screens already padded the top and bottom insets (the day header, the bottom
  of the list, the habit page's title and its buttons, the sheets, the toast, the sign-in
  screens). New: a bottom sheet is at most the screen less 3rem and both insets (it ignored the
  bottom one), and the body pads the left and right insets for a phone on its side.
- **The service worker** (`apps/web/sw/`, below).
- **Clerk in the bundle** (`packages/data/src/HabitDataProvider.tsx`, below).
- **The sign-in in the installed app** (below).
- **A check of all of it**: `vp -C apps/web run pwa` (`apps/web/e2e/pwa.ts`).

## The service worker

**The tool: a small worker of our own, not vite-plugin-pwa.** vite-plugin-pwa 2.0.0 supports Vite
8, but it brings Workbox's build (Rollup, Babel, Terser) for about 60 lines of rules, and its
`autoUpdate` reloads an open page under the person's finger. Our worker is
`apps/web/sw/worker.ts` (about 120 lines). A Vite plugin (`apps/web/build/service-worker.ts`)
bundles it with Rolldown to `/sw.js`, as one script without imports, and writes the list of files
to precache into it. The rules are in `apps/web/sw/strategy.ts`, with tests.

**What it caches:**

- At install (the "shell"): `index.html` (as `/`), every script and style of the build, IBM Plex
  Sans in Latin and Latin Extended (WOFF2), the icons and the manifest. 35 files, about 1.1 MB
  (most of it Clerk, Convex and React).
- On first use: any other file under `/assets/`: the Phosphor icons that a habit loads by name
  (about 200 chunks, of which the owner uses a few), the other font subsets, IBM Plex Mono. Their
  names hold a content hash, so a cached copy never goes stale. At the first visit the page loads
  before the worker exists; when the worker takes over, the page sends it the paths of the files
  it loaded, so the icons of that visit open offline too.

**What it answers:**

| Request | Answer |
| --- | --- |
| Any other origin: Convex (WebSocket and HTTP), Clerk's Frontend API and CDN, Google | Never touched: the browser handles it as if there were no worker. |
| Not GET | Never touched. |
| A page of the app (`/`, `/habits/<id>`, `/sso-callback`) | The cached `index.html`, so the app opens without the network. |
| Another page on the origin (such as a proxy of Clerk under `/__clerk/`) | Never touched. |
| A precached file, or a file under `/assets/` | From the cache, or fetched and cached. A response that is not a 200 of this origin, or that is HTML (a host that rewrites a missing chunk to `index.html`), is never cached. |
| Anything else (such as `/sw.js`) | Never touched. |

The browser fetches `/sw.js` past the HTTP cache (`updateViaCache: "none"`).

**Updates.** A deploy changes the list of files, so it changes the version in `sw.js`. The
browser looks for a new `sw.js` at each start, and the app looks again each time it comes back to
the screen (at most every 10 minutes): an installed app on iOS can stay open for days. The new
worker installs (it copies the files whose hashed names did not change from the old cache), takes
over at once, and deletes the old caches. Then the page (`apps/web/src/service-worker.ts`):

- reloads at once if the app came to the screen less than 10 s ago (the person just opened it),
- or else reloads the next time the app comes back to the screen, so it never reloads during use.

The reload after a missing chunk (`vite:preloadError` in `main.tsx`) still works: an old tab that
asks for a chunk the deploy removed misses the cache and gets the server's 404. Offline it no
longer reloads (there is nothing new to load), and a habit icon that is not in the cache keeps an
empty box and loads when the network is back.

## Clerk in the bundle, for the offline start

The app shows the snapshot only after Clerk knows the user (`docs/notes/integration.md`). Clerk's
React SDK loaded Clerk's script from Clerk's CDN, and the worker must not cache Clerk's requests.
So an offline start stayed on "Loading" forever.

Now `HabitDataProvider` passes Clerk's own instance from `@clerk/clerk-js` (the public `Clerk`
prop). The script is part of the app's bundle, so the worker caches it with the app. Measured on a
production build with the dev backend, signed in as the owner test user:

- **Online start** (worker active): the list shows at about 350 ms after the navigation starts,
  against about 530 ms with the CDN script (6 reloads each, desktop Chrome).
- **Offline start:** the list from the snapshot shows after about 14 s. Clerk retries its API
  for about 6 s and the session token for about 7 s, then reports the last session in its
  "degraded" state. Before, it never showed.
- **The cost:** the first visit downloads about 660 KB more (gzip): the npm build of Clerk holds
  what its CDN build loads on demand (the wallets of the Web3 sign-ins).

Two rules:

- **One Clerk instance for each key** (`clerkInstance`). React's StrictMode mounts the provider
  two times in development; with two instances, the session of a sign-in went to one and the hooks
  listened to the other, and the email-code sign-in never finished.
- **`@clerk/clerk-js` and `@clerk/react` must resolve one `@clerk/shared`.** The lockfile
  dedupes it to 4.43.0. When you update one of the two packages, update the other and check that
  `pnpm-lock.yaml` has one `@clerk/shared`. The type check fails when there are two.

## Sign-in in the installed app

**What happens on iOS.** In an app on the Home Screen, a page of another origin (Clerk's
Frontend API, then Google) does not open in the app's window: iOS opens it in a Safari sheet. That
sheet has its own cookies, apart from the installed app (iOS gives each Home Screen app its own
storage). Google signs in inside the sheet, and the return to `habit.tem.sh/sso-callback` also
loads in the sheet, so the session lands in the sheet, and the installed app stays signed out. A
popup does not help: it opens the same sheet. Reports of the same problem with other auth
libraries:
[FlashCardApp #19](https://github.com/Naijei1/FlashCardApp/pull/19),
[bulwarkmail #1267](https://github.com/bulwarkmail/webmail/issues/1267),
[wynteam #663](https://github.com/warren-wyn-dev/wynteam/pull/663). None of them is about Clerk,
and none was checked here on a device.

**What the app does.** In the installed app (`display-mode: standalone`, or
`navigator.standalone` on iOS) the sign-in screen offers the email code alone, on any Clerk
instance: "Sign in with an email code" is its primary button, and "Continue with Google" is not
there. The two steps run inside the app and use Clerk's API only, so the session stays in the
app and the app never leaves its origin (see "Browser bars in the installed app" below). A browser
tab offers Google, and the email code under it on the development instance, with its note about
the test users; the deployment at habit.tem.sh runs on that instance (`docs/deploy.md`). A browser
tab on a production instance offers Google alone.

**What a production instance will need** (`docs/deploy.md`): the email code turned on as a
sign-in strategy, and the owner's Google email on the owner's Clerk user (a user that Google
created has it). Clerk then sends a code to that address and signs in the same user. The
development instance has the email code on already.

## Browser bars in the installed app

The owner's installed app (iOS 26) first opened with no bars. Later the same app showed browser
bars on its own pages: a top bar with the host "habit.tem.sh" and a menu button, and at the bottom
back and forward, share, reload, and a compass that opens the page in Safari.

**What iOS does.** Apple: "In Home Screen web apps on iOS, links outside the scope will open in
Safari View Controller" ([WWDC23, "What's new in web apps"](https://developer.apple.com/videos/play/wwdc2023/10120/)).
That view has its own bars. When the navigation comes back to a page in the scope, the page loads
in that view, so the bars stay. Apple documents neither the look of these bars in iOS 26 nor when
they go away. Since iOS 26 every site added to the Home Screen opens as a web app, unless "Open as
Web App" is turned off when it is added; then the icon is a bookmark and always opens in Safari
([WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/#every-site-can-be-a-web-app-on-ios-and-ipados)).

**What in the app leaves the scope.** A search of the code found these top-level navigations to
another origin, all of them in the sign-in:

- "Continue with Google" (`signIn.sso` in `packages/data/src/HabitDataProvider.tsx`): Google, then
  Clerk's Frontend API on `*.clerk.accounts.dev`, then back to `/sso-callback`.
- `clerk.redirectToSignIn()` and `redirectToSignUp()`: Clerk's Account Portal on
  `*.accounts.dev`. They run when the Google sign-in fails or needs another step.

Nothing else leaves the origin. There is no `window.open`, no link with a `target`, and no
assignment of another origin to `location`. The reloads (`vite:preloadError` in `main.tsx`, the
update in `src/service-worker.ts`, the error screen's "Reload") load a page of the app, in the
scope. A Clerk development instance does not redirect on load in a client-only app: clerk-js
gets the dev browser token with a `fetch` (`devBrowser.ts`), and the `__clerk_handshake` redirect
belongs to Clerk's server SDKs.

**What changed.** The installed app no longer offers Google, so nothing in it navigates to another
origin. A browser tab keeps Google.

**What stays unverified.** Nothing here ran on an iPhone. The owner's screenshots do not show what
happened between 11:22 (no bars) and 11:38 (bars). If the owner did not sign in with Google in
between, the cause is something that the code cannot see, and these notes do not explain it.

**How to get the app back without bars:** close it in the app switcher (swipe it up), then open
it from its Home Screen icon. It starts again at `start_url` in its own window. If the bars are
still there, delete the icon, open https://habit.tem.sh in Safari, and add it again with Share,
"Add to Home Screen", with "Open as Web App" on.

## The error screen and the chunks of a deploy

**The error screen.** An error that a screen does not handle shows a calm screen in the frame of
the sign-in screens: the empty Days, "Something went wrong", "The app stopped. Reload it to go
on.", a "Reload" button, and the error's message in small text (`src/features/app-error`). The
router uses it for every route (`defaultErrorComponent`), and a boundary in `main.tsx` catches an
error of the data provider too. Before, the router showed its own "Something went wrong!" with
the raw message and no way out.

**The owner's crash.** Tapping the icon in the habit form showed "null is not an object (evaluating
'T.H.useContext')". `T.H` is React's hook dispatcher, and the code is React's `useContext` in the
deployed `IconBase.es` chunk, where React sits. It is null when a hook runs outside a render of
the renderer that owns this copy of React. Each build has one React and one React DOM (checked in
both deploys of 2026-10-31 and 2026-11-01). The first hook of each Phosphor icon is
`useContext(IconContext)`, and the icon picker loads about 200 icon chunks at once. The crash came
at 11:37, a minute after the deploy of #21 (merged at 11:35:54). The crash did not happen again
in desktop Chrome or in Playwright's WebKit, on a production build with the fake provider and on
the deployed files of both deploys with the dev backend:

- the icon picker of the create and of the edit sheet,
- the switch of the served files from the old deploy to the new one under an open app, with the
  worker's update,
- icon chunks that fail once and load again.

Playwright's WebKit is newer than the WebKit of iOS 26. The root cause is not known.

**Every deploy renamed the main chunks.** Two Vercel builds of the same code gave different files:
12 chunks had new names, `haptics-*` (React DOM, Clerk, Convex, the router) and the chunks that
import it. Vercel gives the build its system variables with the `VITE_` prefix too
(`VITE_VERCEL_GIT_COMMIT_SHA`, the commit message, the deployment id), and Clerk reads
`import.meta.env[name]`, so the bundle held all of `import.meta.env`. An app that stayed open
across any merge, even one of docs, then asked for chunks that the new deploy did not have. Now
`vite.config.ts` removes `VITE_VERCEL_*` before Vite reads the env, and the same code builds the
same files (checked: two builds with different values of these variables are identical).

## Checks

- `vp -C apps/web run pwa` (fake provider, production build, `vp preview`, Chrome): no
  installability error from Chrome (`Page.getInstallabilityErrors`, the check Lighthouse uses), the
  manifest, each icon's size, the iOS tags, the precache, only same-origin URLs in the caches, the
  icons of the first visit cached, an offline reload of the list and of a habit page, and the
  update to a new build in an open tab (new cache in, old cache out, reload shows the list).
- On the dev backend (production build, owner test user): no response of Convex or Clerk came from
  the worker, the caches hold no other origin, the offline start shows the snapshot (above).
- `vp -C apps/web run e2e`: the email-code sign-in passes. The run then stopped at the creation of
  the first habit: the create form changed in #12, and the check was not updated. The check
  follows the new form since then, and passes.
- The safe areas: Chrome cannot set `env(safe-area-inset-*)`, so the screenshots of the PR
  replace each one in the served CSS and JS with an iPhone 15 Pro's values (59px top, 34px
  bottom) and look at every screen and sheet.

## For the owner, on the iPhone

Nothing here was checked on a real iPhone. After the deploy, at https://habit.tem.sh:

1. In Safari: Share, then "Add to Home Screen". The name is "Habit" and the icon is the blue gauge
   on black. Open it from the Home Screen: no Safari bars.
2. Sign in: tap "Sign in with an email code", type your Google email, and type the code from the
   email. The list must open in the installed app. (On the development instance, Clerk sends
   real emails to real addresses; the test users' code 424242 works for the test users only.)
3. The installed app offers no Google button: only "Sign in with an email code". The app must
   keep no bars through the whole sign-in.
4. The status bar, in the light and the dark appearance: its band and the clock must be readable,
   and nothing of the app may sit under the clock or the Dynamic Island.
5. At the bottom: the last row of the list, the toast, the habit page's buttons and each sheet
   (new habit, edit, the long press on a number) stay above the home indicator.
6. With the keyboard open in a sheet (the name of a new habit, a number value): the field and the
   button stay visible.
7. Turn the phone on its side once: no text under the notch.
8. Offline: open the app once online, close it from the app switcher, turn on Airplane Mode, and
   open it. The list must show (it can take up to about 15 s, while Clerk gives up on its server).
   Note the time.
9. Updates: after the next deploy, open the app. The new version must show at that start or the
   next one, with no manual cache clear.

## Open questions

- **The offline start takes about 14 s** (Clerk's retries). A faster one shows the snapshot of
  the last user at once and checks the user after Clerk loads, the open question of
  `docs/notes/integration.md`. That changes the rule of the spec and belongs to `@habit/data`.
- **The first visit downloads about 660 KB more** for Clerk in the bundle. Later starts read it
  from the cache. If that matters, an option is to host Clerk's CDN build on our origin, which
  loads its Web3 parts on demand; it relies on more of Clerk's internals.
- **Google in the installed app** is hidden (above). If the owner wants it back, a way that keeps
  the app in its scope is the sign-in in Safari and a short code that hands the session to the
  app.
- **The crash of the icon picker** (above) has no known root cause. If it comes again, the error
  screen shows its message: note it, the time, and what was tapped.
