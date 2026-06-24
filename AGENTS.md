# Trip Map Instructions

## Required references

- Read the exact Expo SDK 56 documentation at https://docs.expo.dev/versions/v56.0.0/ before changing Expo or React Native code.
- Use the repository skill at `.agents/skills/trip-map-workflow/SKILL.md` when changing Trip Map features, UI, map data, persistence, or build configuration.

## Working agreements

- Treat the Vite web app (`src/App.tsx`, `src/styles.css`) as the active MVP surface.
- Use `pnpm` and the scripts defined in `package.json`.
- Preserve existing user changes and keep edits scoped to the request.
- After TypeScript or UI changes, run `pnpm typecheck` and `pnpm build`.
- For significant UI changes, verify the local app visually when browser tooling is available.
- Do not add Codex as a commit author or co-author.
