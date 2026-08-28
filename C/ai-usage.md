# AI Usage Record

## Tools Used

Codex was used for Phase 1 planning, implementation, inspection, debugging, review, and documentation. The authenticated deployed baseline was inspected through browser automation after the user explicitly authorized sign-in and profile sharing.

## Evidence Boundaries

- No application source existed in the workspace at Phase 1 start.
- The deployed application was inspected, but that did not establish whether its controls performed real PDF mutations.
- `example_viewer_demo.mov` was not provided, so no behavior is attributed to it.
- Cursor Plan-mode output and a Cursor-exported transcript were not present. Codex records are not substitutes and those artifacts were not fabricated.

## Missions and Material Recommendations

| Date | Mission | Recommendation / result | Decision and validation |
| --- | --- | --- | --- |
| 2026-08-28 | Convert the assignment into repository requirements | Preserve required vs bonus scope and track open questions | Accepted; `REQUIREMENTS.md` reviewed by captain, vice captain, and documentation agents |
| 2026-08-28 | Plan Phase 1 before code | Use PDF.js for range display and MuPDF in a document worker; save the plan first | Accepted; `C/phase-1-plan.md` predates application files |
| 2026-08-28 | Inspect the deployed baseline | Reuse its host header, compact toolbar, thumbnail rail, and page-card editor interaction | Accepted as interaction guidance only; no implementation claims copied from the site |
| 2026-08-28 | Verify MuPDF feasibility | Test actual package APIs before building controls | Accepted; Node spike created a native note, bookmark, rotation, journal history, serialized bytes, and reopened them |
| 2026-08-28 | Implement reusable SDK | Keep host metadata/source/navigation outside PDF engines | Accepted through typed source union and lifecycle callbacks |
| 2026-08-28 | Implement editor and bonus features | Use MuPDF journal and native PDF structures; never claim unsupported signature creation | Accepted; blocker is visible in UI/docs |
| 2026-08-28 | Runtime smoke | Load a real remote PDF and enter the WASM editor | Exposed a PDF.js proxy-swap race; state ordering was corrected before final checks |
| 2026-08-28 | Independent completion review | Recheck fit, remote acquisition, annotations, and AGPL source delivery | Corrected fit math, disabled background full fetch, added direct text selection and annotation selection, and published corresponding source |

## Changes Made to AI-Generated Output

- Removed the initial assumption that the reference application could be inspected without authentication; the user authorized the exact consent flow before access.
- Corrected an early worker cleanup design that was incompatible with React development remount behavior.
- Corrected mutation state ordering so new worker metadata is not rendered against a destroyed PDF.js proxy.
- Made thumbnail rendering visibility-based instead of rendering every thumbnail immediately.
- Disabled Paste until the worker confirms a page clipboard exists.
- Kept signature-widget creation explicitly unsupported instead of presenting a decorative or false control.
- Replaced broad “high fidelity is mandatory” wording with the assignment’s exact required/bonus distinction in the repository requirements; Phase 1 still uses genuine WASM processing.
- Replaced shell-level fit deductions with measurements of the actual page workspace and mounted spread.
- Added PDF.js selectable text and native MuPDF quad annotations after review found typed search did not satisfy direct selection.
- Made the MuPDF worker genuinely on-demand and published the public corresponding-source URL with a pinned upstream source tag.

## Correctness Checks

The exact commands and results are recorded in `C/phase-1-implementation.md`. Phase 1 used package install/audit, TypeScript, ESLint, Vitest, a MuPDF serialization/reopen spike, production build, development-server startup, and a narrow live remote-PDF/WASM-editor smoke. No Phase 2/3 certification is claimed.

## Cursor Requirement Status

The assignment separately requires a Cursor Plan-mode plan saved/uploaded and a transcript exported from Cursor’s prompt menu. Those files were not available in this Codex workspace. If they are produced later, add them to `C/` without rewriting or fabricating their contents.
