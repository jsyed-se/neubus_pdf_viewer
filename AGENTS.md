# Repository Guidelines

## Requirements & Source of Truth

Read [`REQUIREMENTS.md`](REQUIREMENTS.md) before planning or implementation. Treat its A–D checklist as the acceptance criteria, preserve the distinction between required and bonus work, and map implementation and tests to the relevant section. Do not silently change scope: record ambiguities and obtain direction. Before completion, the captain and vice captain must verify every applicable requirement and end-to-end flow.

## Project Structure & Module Organization

Treat `A/` as the React/TypeScript MVP and SDK root. Application code is in `A/src/`, static license/source assets are in `A/public/`, and focused tests are in `A/src/tests/`. Keep SDK integration under `A/src/sdk/`, UI in `A/src/components/`, and document processing in `A/src/workers/`. Architecture lives in `B/`; plans and AI/implementation records live in `C/`. Do not track build output, coverage, dependencies, secrets, or private PDFs.

## Build, Test, and Development Commands

Root npm scripts delegate to the `A/` workspace:

- `npm run dev` starts the local development server.
- `npm run build` creates a production build in `A/dist/`.
- `npm test` runs focused Vitest checks.
- `npm run lint` checks formatting and static-analysis rules.
- `npm run typecheck` checks TypeScript without emitting files.

Update this guide and the README when commands or prerequisites change.

## Coding Style & Naming Conventions

Use React and TypeScript with two-space indentation. Name components and classes in `PascalCase`, variables and functions in `camelCase`, and files for their primary export, such as `PdfPageCanvas.tsx`. Use `kebab-case` for assets. Keep PDF.js display work separate from MuPDF worker processing. Run type-checking and ESLint before committing.

## Testing Guidelines

Add Vitest coverage with behavior changes and regression fixes. Name unit tests `*.test.ts` or `*.test.tsx`; reserve `*.spec.ts` for later browser scenarios. Phase 1 tests cover deterministic view calculations and the MuPDF spike verifies serialization/reopen behavior. Broader browser evidence belongs to Phases 2 and 3.

## Commit & Pull Request Guidelines

Because no Git history is present, use concise, imperative subjects such as `Add keyboard page navigation`. Pull requests must describe user-visible changes, verification, and linked issues. Include screenshots or recordings for UI changes. Never commit credentials, private documents, local environment files, or generated bundles.

## Sub-Agent Collaboration Policy

For every task, the primary agent must delegate work before implementation and assign three distinct sub-agents:

- **Captain:** Reviews the plan and completed work, tracks blockers or drift, keeps execution focused on the goal, and confirms final readiness.
- **Vice captain:** Independently checks every requirement against the delivered features, sub-features, user flows, tests, and edge cases. It reports missing work or scope drift before completion.
- **Documentation agent:** Records behavior, decisions, setup, verification, and limitations in simple language. It updates relevant repository documentation when behavior or commands change.

The primary agent coordinates implementation, resolves conflicting feedback, and verifies the result. Work is not complete until all three agents fulfill their responsibilities and identified gaps are fixed or disclosed. This requirement applies only to the primary agent; delegated agents must not recreate these roles unless explicitly requested. Additional focused agents may be used when capacity permits.
