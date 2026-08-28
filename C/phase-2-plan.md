# Phase 2 Validation Plan

## Baseline and Boundaries

Validation starts from clean commit `c33ba71bc845ce022366fa15656a746efc6f92a6`, which matches `origin/main`. Treat every Phase 1 claim as unverified. The referenced `example_viewer_demo.mov` is not present, so no evidence will be attributed to it. Phase 2 may make only narrow requirement-blocking fixes and stops before adversarial, stress, security, or performance work.

## Evidence Strategy

1. Inventory every original requirement in one traceability matrix with stable IDs, direct validation methods, observed results, evidence links, and honest status.
2. Generate reproducible, non-sensitive PDF fixtures for normal, multi-page, mixed-size, rotated, linearized/range, large, encrypted, annotated, bookmarked, widget, malformed, merge, extraction, and secret-redaction cases. Keep large artifacts generated rather than committed.
3. Add deterministic inspection helpers that reopen exported PDFs and report page count, order markers, dimensions, rotation, annotations, outlines, widgets, MIME/signature, and extracted text.
4. Run controlled Chromium and Firefox principal workflows. Capture network/worker evidence for range loading and WebAssembly, and record any unavailable browser capability without substituting a claim.
5. Record every observed defect before correction. Apply only the smallest fix, re-run the blocked flow, and preserve failure/revalidation evidence.
6. Freeze the final validated application commit. Capture a small screenshot set from that exact code revision with consistent, non-private fixtures and viewports.
7. Complete the validation report, defect log, Codex evidence, AI-output corrections, architecture/README review, and screenshot index. Publish a clean repository.

## Required Validation Passes

- SDK boundary, all source types, callbacks, repeated loads, and instance isolation.
- Loading, password/error/cancel flows, HTTP ranges, first-page timing, and no duplicate/full idle acquisition.
- Viewing/navigation, real fit behavior, selectable text, high-DPI backing store, and lazy large-document rendering.
- Transactional editor operations plus combined export/reopen inspection.
- Print/export filenames, MIME/signature, edited-state use, popup failure, and resource cleanup.
- Worker/WASM execution, responsiveness observation, and architecture responsibility match.
- Native annotations, rotated/zoomed coordinates, persistence, and irreversible secret removal.
- Bookmark CRUD/persistence and existing widget/signature-field inspection.
- Keyboard, focus, names/live regions, contrast scan, desktop/tablet/browser-zoom layouts.
- Root install/start commands, licensing/source delivery, privacy claims, and documentation consistency.

## Completion Gate

Do not report success while any mandatory matrix row is `PARTIAL`, `FAIL`, or `BLOCKED`. Bonus signature/widget creation remains an honest API limitation unless implementation changes. Screenshots alone never prove PDF structure, range behavior, WASM execution, redaction removal, or cleanup; pair them with logs or inspected artifacts. Captain, vice-captain, and documentation reviews must all pass before Phase 2 closes.
