# Phase 1 Implementation Record

## Baseline Findings

The repository contained no application source, architecture document, AI log, README, or reference video. The deployed app was inspected after authorized sign-in. It provided a useful layout and interaction baseline—host attachment header, URL/local input, compact viewer toolbar, thumbnail rail, three view modes, native-looking annotation tools, and selectable page-card editor—but its implementation and serialized output were not available. Phase 1 is therefore a written-requirement-driven greenfield implementation, not a source migration.

## Capability Status

| Area | Status | Evidence | Limitation |
| --- | --- | --- | --- |
| Typed SDK boundary | Implemented | `sdk/types.ts`, `PdfViewerSDK.tsx`, demo `App.tsx` | Host persistence is demonstrated through callbacks, not a backend |
| Local / URL / byte loading | Implemented | discriminated inputs and PDF.js loading task | Browser/server CORS rules apply |
| Range/linearized loading | Implemented | URL passed directly with ranges enabled and background stream/autofetch disabled | A server without ranges may require a full response; fastest first page needs HTTP 206 and a linearized PDF |
| Progress/cancel/password/errors | Implemented | loading panel, destroyable task, password callback, actionable error mapping | Broad encrypted/corrupt-file validation is Phase 2/3 |
| Viewing/navigation | Implemented | lazy high-DPI pages/thumbnails, selectable PDF.js text, direct/prev/next, keyboard, three modes | Tagged-PDF reading order and screen-reader behavior depend on source quality and await Phase 2 validation |
| Real fit modes | Implemented | actual workspace observer, mounted spread count, live gap, `lib/viewMath.ts`, focused tests | Browser zoom can affect available CSS pixels |
| Transactional editor | Implemented | worker journal, committed bytes, Save/Cancel, dirty guards | Very large import histories can consume worker memory |
| Page operations | Implemented | rotate/reorder/delete/graft/subset/copy/paste through MuPDF | Complex unsupported structures may be lost when MuPDF grafts pages |
| Print | Implemented | current serialized bytes, synchronous placeholder, cleanup/error state | Browser print UI remains browser-dependent |
| Export | Implemented | complete/working/selected downloads with predictable names | Combined-operation certification belongs to Phase 2/3 |
| Native text notes | Implemented | MuPDF `Text` annotation | FreeText layout is not provided |
| Native highlight | Implemented | drawn region, typed match, and PDF.js text-selection MuPDF `Highlight` quads | Text selection is processed per page |
| Rectangle redaction | Implemented | MuPDF `Redact` annotation | User must explicitly apply it to remove content |
| Text-selection redaction | Implemented | PDF.js selection rectangles convert through the rotated page viewport to MuPDF native `Redact` quads | Multi-page selections are not batched |
| Applied redaction | Implemented | MuPDF `applyRedactions` removes covered content | Destructive by design; validate complex graphics in Phase 2/3 |
| Annotation interaction | Implemented | pointer/text-selection draw, selected list state, page outline, edit text, numeric resize, delete | Resize uses PDF-point input rather than drag handles |
| Signature form fields | Blocked | visible blocker in annotation panel | MuPDF.js 1.28 browser types expose widget inspection but no safe signature-field/AcroForm creation helper; low-level cyclic object work was not considered reliable enough to claim |
| Widget annotations | Partial | existing widget type/name/value inspection | Widget creation is blocked for the same verified API gap |
| Bookmark read/create/edit/delete | Implemented | MuPDF outline and iterator calls; spike verified create/reopen | New bookmarks are added at root level |
| Accessibility / responsive UI | Implemented | semantic labels, selectable text layer, focus, live regions, reorder buttons, tablet CSS | Tagged-PDF reading order and broad screen-reader behavior are not yet certified |

## Important Files

- `A/src/sdk/PdfViewerSDK.tsx` — SDK lifecycle, loading, viewing, print, export, annotations, outlines
- `A/src/workers/pdfEngine.worker.ts` — all MuPDF WASM processing and transaction state
- `A/src/components/PdfPageCanvas.tsx` — lazy high-DPI render, selectable text layer, and rotation-aware coordinate conversion
- `A/src/components/DocumentEditor.tsx` — page manipulation UI
- `A/src/sdk/types.ts` — public integration contract and worker protocol
- `A/src/lib/viewMath.ts` — fit/spread calculations
- `B/architecture.md` — architecture and tradeoffs

## Design Decisions

PDF.js owns remote transport and rendering because it can expose pages before a full remote download. MuPDF owns mutation and final bytes because it provides verified document, page, annotation, redaction, outline, widget-inspection, and serialization APIs. MuPDF work remains outside the UI thread. Serialized revisions are reloaded atomically into PDF.js after mutations. `pdf-lib` was intentionally not added because no mandatory page-operation gap required it.

## Changes From Baseline AI Output

The implementation did not inherit source AI output. Material Codex corrections are recorded in `C/ai-usage.md`, including the worker lifecycle and PDF.js proxy race fixes. Controls were removed or disabled when the underlying worker state could not support them; signature creation is presented as a blocker, not a simulated feature.

## AGPL Compliance Actions

- Root and app packages declare `AGPL-3.0-or-later`.
- The full MuPDF-provided AGPL text is copied unchanged to `LICENSE` and served as `A/public/LICENSE.txt`.
- `THIRD_PARTY_NOTICES.md` names exact direct dependencies, licenses, roles, and upstream sources.
- `A/public/SOURCE_OFFER.txt` identifies the preferred source form and exact upstream sources.
- `package-lock.json` pins the dependency graph; no MuPDF source modifications were made.
- The repository contains the application and worker source used to produce the build.
- The deployed notice links the public application source and the exact MuPDF 1.28.0 source tag.

## Checks Run

- `npm install` — completed; 184 packages audited, 0 vulnerabilities at install time.
- `node A/src/tests/mupdf-spike.mjs` — created/reopened a valid one-page PDF with native `Text` and quad `Highlight` annotations, 90° rotation, root bookmark, and journal state.
- `npm run typecheck` — passed after correcting PDF.js v6 lifecycle/data types.
- `npm run lint` — passed after lifecycle and hook cleanup; final rerun is part of the handoff gate.
- `npm test` — 6 focused fit/spread tests passed.
- `npm run build` — production build completed and emitted separate PDF.js worker plus `mupdf-wasm` (10.4 MB uncompressed).
- `npm run dev` / local browser smoke — the exact root command started Vite; a remote 14-page PDF loaded with a selectable text layer and no MuPDF/WASM network request before processing; spread fit-width mounted two pages with zero calculated overflow; selected text serialized/reloaded as a native `Highlight`; selecting its panel row produced an on-page outline; MuPDF initialized with 14 real editor cards; Paste was correctly disabled; page 1 serialized/reloaded at 90°; Undo became available; Save returned to the viewer; and the final tab reported no console errors. Proxy-swap and missing-highlight-rectangle assumptions exposed by smoke were corrected before the passing rerun.

## Known Limitations

- The reference video and original source were absent.
- Multi-page text-selection batching, drag annotation resize, signature/widget creation, and cryptographic signing are not claimed.
- Cursor Plan-mode and Cursor transcript upload evidence remains absent.
- This phase does not provide comprehensive browser, malformed/encrypted document, combination-export, performance, or accessibility certification.

## Phase 2 Starting Point

Start Phase 2 by running the clean root setup, loading controlled local/URL/linearized/encrypted fixtures, and producing requirement-mapped browser evidence. Verify every combined edit/export/reopen flow, annotation coordinate behavior at each rotation/zoom, applied redaction content removal, bookmarks after save, dirty-state prompts, print behavior, and resource cleanup. Capture screenshots only in Phase 2 after those checks pass.
