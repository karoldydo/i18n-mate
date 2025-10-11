# Repository Guidelines

## Project Structure & Module Organization

The React 19 app lives in `src/`, with `main.tsx` mounting `App.tsx` and routing centralised in `src/routes.ts`. Shared helpers belong in `src/lib/utils.ts`, while static assets and styles sit under `src/assets/`, `index.css`, and `App.css`. Component tests reside alongside source (for example `App.test.tsx`), with common setup in `src/test/setup.ts`. Static files under `public/` are copied verbatim at build time; generated bundles land in `dist/`, and coverage reports are written to `coverage/`. Root-level configs (`vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, lint/format configs) should generally be edited rather than duplicated.

## Build, Test, and Development Commands

- `npm run dev` launches the Vite development server with hot reload at `http://localhost:5173`.
- `npm run build` runs `tsc -b` for type-checking and emits an optimized production bundle into `dist/`.
- `npm run preview` serves the latest build for final smoke testing.
- `npm run lint` enforces the ESLint + Prettier rule set, including React compiler and accessibility checks.
- `npm run test` executes Vitest in jsdom with coverage reporters (`text-summary`, `html`, `lcov`) written to `coverage/`.
- `npm run pre-commit` applies the lint-staged pipeline (automatically triggered by Husky); run manually if Git hooks are disabled.

## Coding Style & Naming Conventions

TypeScript is required for all runtime code; keep strict typing and avoid `any`. Formatting is governed by Prettier (120-character print width, single quotes, trailing commas) and should be invoked via lint-staged or your editor. React components and files exporting components use `PascalCase`; hooks start with `use`, utilities stay camelCase, and test files mirror the subject name with a `.test.tsx` suffix. Tailwind class lists are auto-sorted by the Prettier Tailwind plugin—prefer semantic groupings over manual ordering. Imports are alphabetised by eslint-plugin-perfectionist, and `unused-imports/no-unused-imports` fails the build, so prune dead code as you work.

## Testing Guidelines

Vitest with Testing Library drives unit and interaction tests. Co-locate tests with their components, using descriptive names such as `ComponentName.test.tsx`. The shared setup (`src/test/setup.ts`) registers `@testing-library/jest-dom`; rely on those matchers instead of manual DOM assertions. Every feature PR should add or update tests covering new logic and maintain meaningful coverage (review `coverage/summary.txt`). Prefer user-centric queries (`screen.getByRole`) and avoid brittle snapshots. For iterative debugging, run `npm run test -- --watch`.

## Commit & Pull Request Guidelines

Follow the Conventional Commits style already in history (`feat:`, `docs:`, `fix:`, etc.), keeping subjects imperative and under 72 characters. Group related changes per commit and update documentation or configuration in the same change set when relevant. Pull requests must include a concise summary, screenshots or GIFs for UI changes, linked issues or task references, and a checklist confirming `npm run lint` and `npm run test` pass locally. Flag environment or schema changes prominently and provide migration steps when necessary.

## Environment & Tooling Tips

Use the Node version defined in `.nvmrc` (`nvm use`) to align with CI. Environment variables belong in `.env` (see `README.md` for the template); never commit secrets. When integrating new dependencies, update the relevant config (Vite, ESLint, Vitest) and note any follow-up actions for other contributors.
