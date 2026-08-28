# Phase 1 Implementation Plan

## Goal

Deliver a reusable React and TypeScript PDF Viewer SDK plus a demonstration host application in `A/`. Phase 1 ends when the repository builds, type-checks, lints, starts, performs real PDF operations, and is ready for Phase 2 validation.

## Baseline Evidence

### Repository baseline

No application source or prior `A/`, `B/`, or `C/` implementation artifacts were present at the start. Only `AGENTS.md` and `REQUIREMENTS.md` existed, so there is no local implementation to preserve or repair.

### Observed deployed behavior

The authenticated reference application was inspected on 2026-08-28. It shows a host header with attachment metadata, local/URL opening, and a viewer toolbar for thumbnails, editor entry, print, save, page navigation, zoom, fit modes, three view modes, highlight, redact, and text note. Its editor uses selectable page cards, import, delete, rotation, extraction, undo/redo, select-all, cancel/save, and accessible left/right reorder buttons. The reference visually uses a compact white toolbar above a pale workspace with a thumbnail rail. These observations guide interaction and layout only; they do not prove that the deployed controls serialize real PDF changes.

### Unavailable evidence

`example_viewer_demo.mov` was not supplied, and no original source was available. No behavior is attributed to the video or absent source. Cursor Plan-mode and exported-transcript evidence is also unavailable and will not be fabricated.

## Requirement Classes

- **Written:** The Phase 1 brief and `REQUIREMENTS.md` are authoritative.
- **Observed:** Only the deployed UI behavior listed above is treated as observed.
- **Inferred:** A spread is cover-aware paired pages; local save is a browser download; a visual signature widget is not cryptographic signing; dirty-document protection uses confirmation prompts.
- **Design decisions:** PDF.js owns progressive display; a dedicated worker using MuPDF.js WASM owns processing and serialization; the host owns metadata/source/lifecycle while the SDK owns document behavior.
- **Bonus:** Advanced native annotations, applied redaction, signature widgets, and outline editing remain labeled bonus, but each receives an honest implemented/blocked status.

## Work Plan

1. Verify MuPDF.js worker APIs with a small feasibility spike before building UI around them.
2. Scaffold root scripts and the `A/` Vite React/TypeScript application with a typed SDK boundary.
3. Implement PDF.js local/URL/byte loading, progress, cancellation, password/error handling, high-DPI lazy rendering, thumbnails, navigation, real fit calculations, keyboard controls, and continuous/single/spread modes.
4. Implement a transactional editor with committed and working revisions, selection, rotation, drag/accessible reorder, deletion, import/merge, extraction, keep-selected, copy/paste, undo/redo, save/cancel/export, and dirty-state protection.
5. Route real page mutations, serialization, native annotations, redaction, widgets, and bookmarks through the MuPDF WASM worker wherever its verified API supports them.
6. Print/export the current edited bytes with predictable names and correct temporary-resource cleanup.
7. Add semantic controls, focus visibility, status announcements, responsive layout, stale-job cancellation, and lifecycle cleanup.
8. Complete architecture, implementation, AI-use, licensing, and README documentation.
9. Run only Phase 1 install, build, type-check, lint, unit/smoke, and startup checks. Stop before Phase 2 screenshots or comprehensive validation.

## Implementation Guardrails

- URL viewing goes directly through PDF.js byte-range transport with background stream/autofetch disabled; full bytes are acquired lazily for editing/export.
- A monotonically increasing revision prevents stale worker or renderer results from winning.
- No control ships unless it performs a real operation or is clearly disabled with an honest explanation.
- MuPDF capabilities are claimed only when the call path executes in its worker and exported output contains the result.
- MuPDF AGPL license, notices, dependency disclosure, and corresponding-source instructions are included.
- Invalid edits are disabled, all-page deletion is blocked, and unsaved changes are protected.

## Phase Boundary

Phase 1 includes implementation and minimal build/start smoke checks. Final certification, screenshots, broad browser/adversarial testing, performance benchmarks, and the final test report belong to Phases 2 and 3.
