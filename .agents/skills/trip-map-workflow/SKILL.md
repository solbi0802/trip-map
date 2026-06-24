---
name: trip-map-workflow
description: Develop, debug, review, or document the Trip Map repository. Use for changes to the Korea map, region labels and grouping, travel records, visit statuses, localStorage persistence, search and filters, PNG export, Vite configuration, or related UI and build verification.
---

# Trip Map Workflow

## Start

1. Read `AGENTS.md`.
2. Inspect `git status`, the current branch, and the relevant source files.
3. Read `references/project-notes.md` before changing map data, counting rules, storage, or export behavior.
4. Follow existing React, TypeScript, and CSS patterns unless the task requires a structural change.

## Implement

- Keep the active web experience in `src/App.tsx` and `src/styles.css`.
- Keep persisted data backward compatible when changing localStorage schemas.
- Use one authoritative region set for totals, status filters, map colors, and summary lists.
- Treat a colored region without an explicit record as `visited`.
- Preserve Korean labels and verify suffix removal does not truncate names such as `양구`.
- Keep controls compact and usable at desktop and mobile breakpoints.
- Avoid adding dependencies when browser or platform APIs already solve the task.

## Verify

1. Run `pnpm typecheck`.
2. Run `pnpm build`.
3. Treat the existing large-chunk warning from the GeoJSON bundle as informational unless bundle work is requested.
4. For UI changes, start the Vite server and visually inspect the relevant workflow when browser tooling is available.
5. Run `git diff --check` before committing.

## Git

- Create a focused branch when requested.
- Commit only files related to the task.
- Use a concise Conventional Commit message.
- Do not add `Co-authored-by` or other Codex attribution.
