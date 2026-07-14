# AGENTS.md

## Cursor Cloud specific instructions

Excalidraw is a Yarn (classic, v1) workspaces monorepo. The two products are the
`@excalidraw/excalidraw` React component library (`packages/*`) and the
`excalidraw-app` web application (excalidraw.com) that consumes it. Standard dev
commands live in the root `package.json` and `CLAUDE.md`; use those.

Non-obvious notes for running/testing in this environment:

- **Dev server**: `yarn start` runs the `excalidraw-app` Vite dev server on
  **http://localhost:3001** (port comes from `VITE_APP_PORT` in the
  repo-root `.env.development`; Vite falls back to 3000 if unset). The app is a
  client-only SPA and runs fully standalone — no local backend is required to
  draw/edit. The dev server re-runs `yarn` on start, so it is safe to launch
  even right after a fresh install.
- **External services are optional**: real-time collaboration
  (`excalidraw-room`, expected at `localhost:3002`) and the AI backend
  (`localhost:3016`) are the only `.env.development` values pointing at
  localhost, but their source is NOT in this repo. They are only needed to
  exercise live collaboration or AI features; everything else points at hosted
  dev endpoints.
- **Lint**: `yarn test:code` currently reports pre-existing prettier warnings in
  `packages/excalidraw/data/slides.ts` and
  `packages/excalidraw/tests/scene/slides.test.ts` (from the committed
  "presentation mode" work). These are not environment issues; `yarn fix` would
  resolve them but do not modify committed code unless asked.
- **Tests**: `yarn test:app --watch=false` runs the full vitest suite once
  (~1500 tests). A noisy `Failed to parse URL from /api/dev/local-boards`
  stderr message during `MobileMenu.test.tsx` is expected and does not fail the
  suite. Use `yarn test:update` to update snapshots.
- **TypeScript version warning**: eslint/@typescript-eslint prints an
  "unsupported TypeScript version" banner (repo uses TS 5.9.3). This is
  cosmetic and lint still runs correctly.
