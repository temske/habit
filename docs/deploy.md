# Deploy

The web app runs on Vercel at **https://habit.tem.sh**. It is a dev deployment: it uses the same
backends as `vp dev`, on purpose. The owner uses it every day, and the data is the data of the dev
server.

## What runs where

| Part                | Where                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| The web app         | Vercel project `habit` in the team `choimoetas-projects`. A static SPA, with no functions.          |
| The domain          | `habit.tem.sh`. Also `habit-blue-beta.vercel.app`, the project's own production URL.              |
| The data            | The Convex dev deployment `fantastic-chihuahua-570` (`https://fantastic-chihuahua-570.convex.cloud`). |
| The sign-in         | The Clerk application "Habit", development instance (`pleased-antelope-7833.clerk.accounts.dev`).  |
| The source          | The GitHub repository `temske/habit`, branch `main`.                                              |

There is no Convex production deployment and no Clerk production instance. `docs/notes/data.md`
lists what a production setup needs.

## Why the dev backends

The app has one user, the owner. The dev backends already have the owner's data, the Clerk JWT
template `convex` and `OWNER_USER_IDS`. A production setup needs a second Convex deployment, a Clerk
production instance with its own Google OAuth credentials, and a move of the data. That work gives
the owner nothing new now.

The results of this choice:

- The deployed app and `vp dev` show the same data. A change in one shows in the other.
- Clerk shows "Clerk has been loaded with development keys" in the console. Development instances
  have usage limits. One user is far below them.
- Google sign-in uses Clerk's shared development credentials, so Google's page says "to continue to
  Clerk".
- The sign-in screen also offers the email code (`apps/web/src/features/auth/sign-in.tsx`). The
  screen shows it when the Clerk key is a development key (`pk_test_`). A build on a production
  instance offers Google only.
- The "no access" screen shows the name of the Convex deployment to a stranger who signs in. The
  data stays closed: only `OWNER_USER_IDS` get data.

## How a deploy happens

- **A merge to `main`** deploys to production: `habit.tem.sh` and `habit-blue-beta.vercel.app`.
  Vercel's GitHub app builds each push to `main`.
- **A push to another branch** makes a preview deployment. Vercel Authentication protects
  previews: only a member of the Vercel team can open them. A preview uses the same dev backends.
- **The build:**
  - Vercel installs the workspace with the pnpm version from `devEngines` in the root
    `package.json`. It takes Node.js 26 from `engines`.
  - Then it runs `vp build` in `apps/web`, and serves `apps/web/dist`.
  - `apps/web/vercel.ts` sets this. It also sends each path that is not a file to `index.html`, so
    a deep link such as `/habits/<id>` opens. Paths under `/assets/` are not sent there: a chunk of
    an older build gets a 404, not HTML.
- **Rollback:** `vercel rollback`, or the Deployments page of the project.

### A deploy from the CLI

Usually you do not need one. If you do, run it from the repository root, after `vercel link`
(project `habit`, scope `choimoetas-projects`):

```sh
vercel deploy                 # a preview
vercel deploy --prod          # production
```

Vercel blocked a CLI deploy from a git checkout with "the commit author doesn't have permission to
create deployments". The CLI sends the commit's author, and Vercel did not match it to the owner's
account. The pushes of the GitHub account `temske` pass. If a CLI deploy is blocked, deploy a copy
of the tree without `.git`, with `.vercel/` copied in.

## Settings outside the repository

These settings are in the Vercel project, not in a file:

- Root Directory: `apps/web`. "Include files outside the Root Directory" is on, because the app
  imports `packages/*`.
- Framework preset: Vite. `vercel.ts` sets the commands.
- Git: `temske/habit`, production branch `main`.
- Domain: `habit.tem.sh`.
- Environment variables, for Production and Preview:

  | Name                         | Value                                                         |
  | ---------------------------- | ------------------------------------------------------------- |
  | `VITE_HABIT_DATA`            | `convex`                                                      |
  | `VITE_CONVEX_URL`            | `https://fantastic-chihuahua-570.convex.cloud`                |
  | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_cGxlYXNlZC1hbnRlbG9wZS03ODMzLmNsZXJrLmFjY291bnRzLmRldiQ` |

  The values are public: Vite puts them into the JavaScript. They are the values of
  `apps/web/.env.development`. Vite reads them at build time, so a change takes effect at the next
  deploy. To change one:

  ```sh
  vercel env update VITE_CONVEX_URL production
  vercel env update VITE_CONVEX_URL preview
  ```

## DNS

Porkbun has the DNS of `tem.sh`. The apex is on Netlify. Do not change it. `habit.tem.sh` needs
one record:

| Type  | Host    | Answer                                | TTL |
| ----- | ------- | ------------------------------------- | --- |
| CNAME | `habit` | `26a9aef78e55c6e6.vercel-dns-017.com` | 600 |

Vercel needs no TXT record: the Vercel account has `tem.sh` already. When the CNAME resolves,
Vercel issues the TLS certificate. `vercel domains inspect habit.tem.sh` shows the state.

## The first sign-in on a new device

1. Open https://habit.tem.sh and select "Continue with Google".
2. If the "no access" screen comes, the account is not an owner. Run the command that the screen
   shows from the repository root, then reload the page. `docs/notes/data.md` describes the owner
   list.
