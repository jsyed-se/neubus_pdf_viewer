# Architecture and Design

## Component Diagram

```text
Demo host (`App`)
  owns source, attachment metadata, host navigation, lifecycle
             │ typed props + lifecycle callbacks
             ▼
`PdfViewerSDK`
  ├─ loading/view state ── PDF.js loading task + PDF.js worker
  │                         range/stream transport, page render, passwords
  ├─ viewer UI ─────────── lazy high-DPI canvases, thumbnails, fit/navigation
  ├─ editor UI ─────────── selection, drag/accessible reorder, transactions
  └─ `PdfEngineClient` ─── dedicated document Web Worker
                              └─ MuPDF.js WebAssembly
                                 page mutation, annotations, redaction,
                                 outlines, widget inspection, serialization
```

## SDK Integration Boundary

The host supplies a discriminated `file`, `url`, or `bytes` source plus attachment metadata. It owns surrounding navigation and decides how to react to `onReady`, `onProgress`, `onPageChange`, `onDirtyChange`, `onSave`, `onError`, and password requests. The SDK owns every PDF concern. This keeps host navigation and attachment rules out of both PDF engines.

## Major Modules

- `sdk/PdfViewerSDK.tsx` coordinates lifecycle, viewing state, dirty-state protection, print, and export.
- `components/PdfPageCanvas.tsx` renders visible pages and selectable text at device pixel ratio, then converts region and text-selection coordinates through the PDF.js viewport.
- `components/DocumentEditor.tsx` provides transactional page manipulation and accessible reorder controls.
- `sdk/engineClient.ts` is a request/response bridge with pending-call cleanup.
- `workers/pdfEngine.worker.ts` owns the MuPDF document, journal, clipboard, committed bytes, native PDF structures, and serialization.

## State Management

React state holds view mode, current page, zoom policy, panel visibility, loading status, errors, and the worker snapshot. The worker is the authority for committed/working PDF bytes, journal history, clipboard pages, annotations, outlines, and dirty state. The host retains attachment/source state. A monotonically increasing viewer revision rejects stale loads; worker requests carry unique IDs.

## Document-Loading Lifecycle

For URLs, the SDK passes the URL directly to PDF.js with byte ranges enabled and background stream/autofetch disabled. This prevents an idle viewer from eagerly acquiring the entire file while still allowing available pages to render through HTTP 206 requests. CORS and byte-range support remain server responsibilities; a server without ranges may require a full response. Local files and raw bytes go directly to PDF.js. Cancellation destroys the loading task. Full bytes are acquired once, lazily, when a mutation, annotation, print, or export requires MuPDF.

## Viewing Lifecycle

PDF.js page viewports provide real page dimensions. A `ResizeObserver` measures the actual `.page-workspace` content box after the thumbnail rail or details panel changes it; page-list padding, live gap, and the mounted one- or two-page set feed both fit modes. Canvas backing stores are scaled for high-DPI screens. `IntersectionObserver` renders pages/thumbnails near the viewport and tracks the current page; distant pages remain placeholders. Single and cover-aware spread modes mount only their active page set.

## Editing and Save Lifecycle

Entering the editor initializes MuPDF from complete bytes and enables its journal. Operations mutate only the working document and return serialized bytes that atomically replace the PDF.js view. Undo/redo uses the MuPDF journal. `Cancel` reloads committed bytes; `Save` serializes and replaces the commit; `Export` serializes without changing the commit. Host replacement, editor close, and browser unload protect dirty work. Every-page deletion and unavailable commands are disabled.

## WASM Worker Responsibilities

MuPDF.js performs rotation, reorder, delete, graft/import, subset extraction, copy/paste, native annotation creation/edit/delete, redaction application, bookmark CRUD, widget inspection, and final serialization. This is meaningful WASM execution rather than dependency presence. PDF.js remains the specialized display/range-loading engine. `pdf-lib` was not added because the verified MuPDF API covers mandatory page operations.

## Decisions and Tradeoffs

- **Two engines:** PDF.js has stronger browser streaming/rendering; MuPDF has stronger document mutation. Atomic serialized revisions cost CPU but prevent split-brain state.
- **Performance:** Lazy rendering, range-only remote acquisition, and capped device scale avoid fetching or rendering every page. `PdfEngineClient` creates the MuPDF worker only on the first processing command, so its ~10 MB WASM payload is deferred until editing, annotation, print, or export.
- **History:** MuPDF journaling avoids storing a complete PDF for each undo step. Import and clipboard still increase worker memory for large files.
- **Accessibility:** Semantic toolbars, live regions, visible focus, button-based reorder, and PDF.js text layers support keyboard workflows and selectable page text. Full tagged-PDF reading order still depends on source quality.
- **Annotations:** Region tools and per-page text selection create native PDF structures that survive export. A selected annotation is identified in the panel and outlined on the page; numeric resizing is reliable but less direct than drag handles.
- **Printing:** A synchronously opened placeholder avoids popup timing, but final print controls remain browser-owned.

## Licensing

MuPDF.js 1.28.0 is AGPL-3.0-or-later, so the application uses the same license. The repository carries the full license, dependency notice, exact lock file, deployed source notice, the public application source URL, and the pinned MuPDF 1.28.0 source tag. The built app serves license/source-offer files. PDF.js is Apache-2.0.

## Privacy and Security

Local PDFs remain in browser memory and are never uploaded. Remote PDFs are fetched only from the user-provided origin. URLs are restricted by the demo host to HTTP(S). Filenames are sanitized before download. The app does not execute embedded PDF JavaScript, collect telemetry, store passwords, or retain files after page close. CORS, malicious-PDF hardening, and dependency updates require continued review.

## If I Had One More Day

- Add drag handles for annotation resizing and richer property controls.
- Implement and validate low-level AcroForm signature-widget creation if the browser MuPDF API gains safe support.
- Add bounded worker checkpoints and configurable memory limits for very large edit histories.
- Preserve nested outline placement when adding new child bookmarks.
- Add a host-supplied confirmation callback instead of relying on browser confirmation dialogs.
- Add Phase 2 cross-browser, encrypted-file, malformed-file, range-server, and combined-export validation.
- Add multi-page text-selection batching and tagged-PDF reading-order audits.
