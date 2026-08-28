# Atlas PDF SDK Application

## Capabilities

The SDK accepts local files, remote URLs, or raw bytes. PDF.js provides progressive/range loading and high-DPI lazy canvas rendering. MuPDF.js runs in a dedicated Web Worker for real page mutations, native annotations, applied redaction, bookmarks, and final PDF serialization.

Implemented viewing features include thumbnails, previous/next/direct navigation, current-page tracking, continuous/single/cover-aware spread modes, keyboard navigation, custom zoom, and fit-to-width/fit-to-viewport calculated from the live container and page dimensions.

The transactional editor supports select all/none, rotation, drag or accessible-button reordering, deletion, import/merge, extraction, keep-selected, copy/paste, undo/redo, save, cancel, and local export. It blocks deletion of every page and protects dirty work during editor close, document replacement, and browser unload.

Native `Text`, `Highlight`, and `Redact` annotations are saved into the PDF. Highlight/redaction can use a drawn rectangle, typed text match, or direct selection in the PDF.js text layer. Redactions can remain annotations or be applied to remove covered content. Annotations can be selected in the panel, outlined on-page, edited, resized numerically, and deleted. Bookmarks can be read, created, edited, and deleted. Existing form widgets are inspected; creation of signature widgets is not claimed.

## SDK Integration

```tsx
import { PdfViewerSDK } from './src/sdk/PdfViewerSDK';
import type { PdfDocumentSource } from './src/sdk/types';

const source: PdfDocumentSource = {
  kind: 'url',
  url: 'https://files.example.com/report.pdf',
  filename: 'report.pdf',
};

<PdfViewerSDK
  source={source}
  attachment={{ id: 'report-42', filename: 'report.pdf' }}
  onReady={({ pageCount }) => console.log(pageCount)}
  onPageChange={(page) => console.log(page)}
  onDirtyChange={(dirty) => protectHostNavigation(dirty)}
  onSave={(bytes, filename) => persistInHost(bytes, filename)}
  onError={(error) => reportToHost(error)}
/>
```

The host owns the source, attachment metadata, surrounding navigation, and component lifecycle. The SDK owns the PDF state and reports lifecycle changes through typed callbacks. Password handling can be customized with `onPasswordRequest`.

## Commands

Run from the repository root:

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
```

## Browser and Remote-Server Requirements

Use a current desktop or tablet release of Chrome, Edge, Firefox, or Safari with Web Workers, WebAssembly, canvas, `ResizeObserver`, and `IntersectionObserver`. JavaScript must be enabled.

For progressive and linearized remote loading, the PDF server must:

- allow the application origin through CORS;
- expose `Content-Length`, `Accept-Ranges`, and `Content-Range` as needed;
- answer `Range: bytes=…` requests with HTTP `206 Partial Content`;
- serve a genuinely linearized PDF for fastest first-page display.

PDF.js receives the URL directly with ranges enabled and background stream/autofetch disabled. Full bytes are explicitly requested only when editing, annotating, printing, or exporting requires them; a server without byte ranges may still need to return the full PDF for viewing. User PDFs are not uploaded by this application; local files remain in the browser, while remote URLs are fetched directly from their origin.

## Repository Layout

- `src/sdk/` — typed SDK boundary, viewer orchestration, and worker client
- `src/components/` — page canvas/text layer and transactional editor UI
- `src/workers/` — MuPDF WebAssembly document engine
- `src/lib/` and `src/tests/` — deterministic view math and focused tests
- `public/` — deployed AGPL license and corresponding-source notice

## Printing and Export

Print uses the current serialized document, opens a synchronous placeholder window to avoid popup blocking, waits for the PDF URL to load, invokes browser print, and revokes temporary resources. Exports use sanitized predictable filenames such as `report-edited.pdf` and `report-selected-pages.pdf`.

## Accessibility

Controls use semantic buttons, labels, pressed/disabled states, visible focus, status/error live regions, and keyboard page navigation. Page reordering has left/right buttons in addition to drag-and-drop. The layout adapts to desktop and tablet widths.

## Known Limitations

- Direct text selection creates annotations one page at a time; multi-page selections are not batched.
- Annotation resizing uses explicit PDF-point dimensions instead of drag handles.
- MuPDF.js 1.28 exposes browser widget inspection but not a safe signature-field creation helper; signature/widget creation and cryptographic signing are not claimed.
- Browser print UI and supported options remain browser-dependent.
- Comprehensive compatibility, encrypted-PDF, corrupt-PDF, and large-file validation belongs to Phases 2 and 3.

## License

AGPL-3.0-or-later. The built app serves `/LICENSE.txt` and `/SOURCE_OFFER.txt`; corresponding source is at <https://github.com/jsyed-se/neubus_pdf_viewer>. See the repository root notices for complete dependency details.
