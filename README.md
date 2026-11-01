# Habit

A habit tracker with a calm look and unusual interactions.

## Requirements

- [Vite+](https://viteplus.dev) (`vp`). It installs Node.js from `.node-version` and pnpm from
  `package.json` on its own.

## Start

```sh
vp install
vp dev
```

`vp dev` serves the web app on http://localhost:5173.

`vp install` also turns on the Git hooks in `.vite-hooks/`: each commit runs `vp run ready` and
checks the commit message format, as CI does.

## Commands

| Command        | What it does                                                    |
| -------------- | --------------------------------------------------------------- |
| `vp dev`       | Serves the web app with hot reload.                             |
| `vp check`     | Formats, lints and type checks every package. `--fix` fixes.    |
| `vp test`      | Runs the tests of every package.                                |
| `vp build`     | Builds the web app into `apps/web/dist`.                        |
| `vp run ready` | `vp check`, the tests and `vp build`, as CI runs them.          |

## Layout

| Path         | What it holds                                                     |
| ------------ | ----------------------------------------------------------------- |
| `apps/web`   | The web app: React, TanStack Router, Tailwind CSS and shadcn/ui.  |
| `packages/`  | Code that is not part of one app, such as a core layer.           |

[`AGENTS.md`](./AGENTS.md) has the rules for the repository: commands, layout, tests and commits.
