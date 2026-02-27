# Repository Guidelines

## Project Structure & Module Organization
- Core app code lives in `src/`.
- Route-level pages are in `src/views/` (main chat flow is under `src/views/completions/`).
- Reusable UI components are in `src/components/` (usually folder-per-component with `index.vue`).
- Global state is in `src/stores/` (Pinia modules such as `api-settings/` and `chat-rooms/`).
- Shared logic belongs in `src/hooks/` (`use-*` composables), utilities in `src/utils/`, and constants in `src/config/`.
- Styles and assets are in `src/styles/` and `src/assets/`; static public files are in `public/`; build output is `dist/`.

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev` — start Vite dev server (LAN enabled via `--host`).
- `npm run build` — generate production build in `dist/`.
- `npm run preview` — preview the production build locally.
- `npm run lint` — run ESLint with auto-fix on `src/`.
- `npm run format` — format JS/Vue/SCSS/CSS with Prettier.
- `npm run stylelint` — lint and auto-fix style files.
- `npm run commit` — create a conventional commit message via Commitizen.

## Coding Style & Naming Conventions
- Use 2-space indentation, single quotes, no semicolons, max line length ~100 (see `.prettierrc`).
- Prefer Vue 3 Composition API patterns and keep composables in `use-*.js` files.
- Use kebab-case for component directories/files (for example, `api-settings-dialog/step-model-select.vue`).
- Keep store modules and utility folders focused and single-purpose.

## Testing Guidelines
- There is currently no dedicated automated test script in `package.json`.
- Minimum pre-PR quality gate: run `npm run lint`, `npm run stylelint`, and `npm run build`.
- Manually verify key flows: chat send/stream, model selection, and settings import/export.
- If adding tests, colocate them near features using `*.spec.js` naming.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat`, `fix`, `refactor`, `docs`, etc.); emoji prefixes are used in recent history (example: `✨ feat(ui): add model search`).
- Keep commit subjects concise and action-oriented; add scope when useful (e.g., `feat(sender): ...`).
- PRs should include: change summary, linked issue(s), verification steps, and screenshots/GIFs for UI changes.
- Ensure lint/build pass before requesting review.

## Security & Configuration Tips
- Do not commit real API keys.
- Start from `env/.env.example` when preparing local environment variables.
- For production, prefer server-side key management or API proxying.
