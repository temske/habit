# Habit

A habit tracker with a calm look and unusual interactions. Read [`GLOSSARY.md`](./GLOSSARY.md) and
[`docs/adr/`](./docs/adr) before starting, when they exist: they have the domain's terms and the
decisions behind the code.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# Commands

Vite+ first: run everything through `vp`, never `pnpm`, `npm`, `npx` or `pnpm exec` directly. pnpm
is still the package manager underneath (its version is pinned in `package.json`), but `vp` drives
it, and docs, PR descriptions and CI use `vp` too.

| Instead of                              | Run                                                              |
| --------------------------------------- | ---------------------------------------------------------------- |
| `pnpm install`                          | `vp install`                                                     |
| `pnpm add`, `pnpm remove`               | `vp add --filter <package> …`, `vp remove --filter <package> …` |
| `pnpm check`, `pnpm test`, `pnpm build` | `vp check`, `vp test`, `vp build`                                |
| `pnpm dev`, `pnpm preview`              | `vp dev`, `vp preview`                                           |
| `npx shadcn@latest …`, `pnpm dlx …`     | `vp -C apps/web dlx shadcn@latest …`                             |

**No script or task shadows a built-in.** `vp dev` always runs the built-in, never the `dev`
script, so a script named after a built-in (`dev`, `build`, `preview`, `check`, `lint`, `fmt`,
`test`, `pack`, `install`, …) would make `vp dev` and `vp run dev` do different things. No
`package.json` or `vite.config.ts` in the workspace defines one. Something that has to run before
or after a built-in gets its own name, such as `dev:fresh`, and runs with `vp run <name>`.

Before you push, `vp run ready` passes: `vp check`, each package's tests and `vp build`, as CI runs
them. `vp check --fix` formats and applies lint fixes.

# Workspace

A Vite+ workspace on pnpm.

| Package                     | What goes in it                                                            |
| --------------------------- | -------------------------------------------------------------------------- |
| `apps/web` (`@habit/web`) | The web app: a React SPA with TanStack Router, Tailwind CSS and shadcn/ui. |
| `packages/core` (`@habit/core`) | The domain: types and pure rules, no React, no backend. |
| `packages/data` (`@habit/data`) | The Convex backend and the React hooks; the only package that knows Convex (ADR 0001). |

- **An app holds only what is particular to it**, such as its screens. Code that is not part of
  one app goes in a package under `packages/`, named `@habit/<name>`, even while only one app
  uses it: code that more than one app needs, or a layer of the architecture, such as a core layer
  with the business logic. The apps never import each other, and a package is imported by its
  name, never by path. A `no-restricted-imports` rule in the root `vite.config.ts` enforces the
  second part.
- **`@/` is `apps/web/src`, in the web app only.** Packages use relative imports.
- **A dependency goes in the package that imports it:** `vp add --filter @habit/web <name>`,
  with `-D` for a dev dependency. Versions come from the catalog in `pnpm-workspace.yaml`, pinned
  to an exact version. `vp add` writes `catalog:` for a dependency the catalog has; add a new one
  to the catalog first. The root `package.json` has only the toolchain.
- **Run commands from the root.** `vp check` and `vp test` cover every package, and `vp dev`,
  `vp build` and `vp preview` act on `apps/web` (`defaultPackage` in the root `vite.config.ts`).
  That default applies to a bare command only: with any option, name the app, as in
  `vp -C apps/web dev --port 5199`. `vp -C <dir> <command>` runs any command as if from that
  package.
- **A new package** gets a `vite.config.ts` with a `test` block named after it and a `unit` task
  (`run: { tasks: { unit: "vp test" } }`), as `apps/web` has, so `vp test` and `vp run ready`
  pick it up.
- **Tailwind scans `apps/web/src` only.** A package with class names needs an `@source` line in
  `apps/web/src/styles.css`.
- **shadcn/ui** components go to `apps/web/src/components/ui` with
  `vp -C apps/web dlx shadcn@latest add <name>`. The style is `base-nova`, on Base UI. The shadcn
  skill in `.agents/skills/shadcn` has the rules.

# Language

- **Everything in the repository is in English:** docs, code, identifiers, comments, commit
  messages, PR titles and descriptions. The owner may talk to you in Russian; what you write into
  the repository stays in English.

# Docs

- Docs live in [`docs/`](./docs) as Markdown, in English.
- The v1 spec is [`docs/v1.md`](./docs/v1.md); the build plan, with the contracts, the ownership of
  files and the merge protocol, is [`docs/build-plan.md`](./docs/build-plan.md).
- Write plainly: say what something does and why, in short sentences. No marketing tone.

# Testing

`vp test` runs each package's tests; the web app's run in jsdom with Testing Library.

- **Test meaningful logic or observable behavior.**
- **Don't test the implementation:** don't render components to static markup to assert props or
  attributes, and don't add tests that merely assert callback wiring or mirror the implementation.

# Pull requests

Every feature goes to `main` through a pull request on GitHub (`temske/habit`), never by a
direct push. A ruleset on `main` enforces this: it takes no direct pushes and no force pushes,
merges only by squash, and needs two checks to pass: `Check, test and build` (`ci.yml`, the
`ready` task) and `PR title` (`pr-title.yml`, the commit format below).

1. **Branch and push.** Work on a branch, run `vp run ready`, push, and open the PR with
   `gh pr create`. The title follows the commit format below.
2. **Screenshots for a UI change.** The description shows the screen before and after the change.
   If several variants were tried (for example in the lab, docs/lab.md), it shows a screenshot of
   each one and names the one that was picked. Take them on the fake provider
   (`VITE_HABIT_DATA=fake`), on a phone viewport at 2x or 3x, in the light and the dark theme.
   GitHub's API cannot upload images, so commit them to `.github/pr-assets/<branch>/` in one
   commit, remove them in the next, and link them by the first commit's SHA:
   `https://raw.githubusercontent.com/temske/habit/<sha>/.github/pr-assets/<branch>/<file>.png`.
   The squash keeps them off `main`, and the PR's history keeps the links working.
3. **Wait for CI.** Merge only after both checks pass: `gh pr checks <n> --watch`. A red or
   pending check means no merge; GitHub refuses it anyway.
4. **Merge** with the squash command below, then delete the branch.

# Commits

Every commit message and every PR title is `<type>(<scope>): <summary>`, per
[Conventional Commits](https://www.conventionalcommits.org). The scope is optional, and a `!` before
the colon marks a breaking change.

- **Squash merges:** the PR's title becomes the commit on `main`, so the title follows the format
  too. The merge keeps GitHub's ` (#N)` suffix. Merge with the title as the subject, since for a
  PR with a single commit GitHub uses that commit's message instead:

  ```sh
  n=<PR>; gh pr merge $n --repo temske/habit --squash --subject "$(gh pr view $n --repo temske/habit --json title -q .title) (#$n)"
  ```

- **Types:** `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`,
  `style`. `refactor` changes no behaviour and `perf` only speed or memory; `build` is dependencies,
  bundling and the `vite.config.ts` tasks, `ci` the workflows; `style` is formatting alone; `revert`
  repeats the reverted title; `chore` is the rest.
- **Scopes:** optional. Name the area the change is in, such as `web`. Leave the scope out when a
  change spans many areas.
- **Summary:** imperative mood, lowercase start, no trailing period, about 72 characters at most.
  Issue references go in the body (`Closes #N`), not in the summary.
- **Breaking changes:** `!` after the type or scope, plus a `BREAKING CHANGE:` footer that explains
  the migration.
