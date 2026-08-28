# Atlas PDF SDK

Atlas is a reusable React/TypeScript PDF viewer and transactional document editor. The demonstration host in `A/` supplies attachment metadata and document sources to the SDK; the SDK owns loading, rendering, navigation, editing, annotations, printing, and export.

## Capabilities and Stack

PDF.js provides lazy high-DPI rendering, selectable text, navigation, and byte-range URL loading. MuPDF.js 1.28.0 runs in an on-demand Web Worker for transactional page operations, native notes/highlights/redactions, applied redaction, bookmark editing, widget inspection, and final serialization. The editor supports rotation, reorder, delete, import/merge, extraction, keep-selected, copy/paste, undo/redo, save/cancel, print, and local export.

## Phase 1 Status

Phase 1 implements the working SDK and performs only build/start smoke checks. Final requirement certification, screenshots, broad browser testing, adversarial testing, benchmarks, and the final test report are intentionally deferred to Phases 2 and 3.

## Setup

Prerequisite: Node.js 22.13+ or 24+.

```bash
npm install
npm run dev
```

The development server prints its local URL. No environment variables or manual asset copying are required.

```bash
npm run build       # Type-check and create A/dist
npm run typecheck   # Check TypeScript
npm run lint        # Run ESLint
npm test            # Run focused Phase 1 unit tests
```

## SDK Integration

```tsx
import { PdfViewerSDK } from './src/sdk/PdfViewerSDK';

<PdfViewerSDK
  source={{ kind: 'url', url: 'https://files.example.com/report.pdf' }}
  attachment={{ id: 'report-42', filename: 'report.pdf' }}
  onReady={({ pageCount }) => console.log(pageCount)}
  onDirtyChange={(dirty) => protectHostNavigation(dirty)}
  onSave={(bytes, filename) => persistInHost(bytes, filename)}
/>
```

The host owns source metadata, navigation, and persistence. The SDK also accepts local `File` objects or raw `Uint8Array` bytes and exposes progress, page, error, password, dirty, and save callbacks.

## Browser and Range-Server Requirements

Use a current Chrome, Edge, Firefox, or Safari release with Web Workers, WebAssembly, canvas, `ResizeObserver`, and `IntersectionObserver`. For fast first-page URL display, the origin must allow CORS, expose range headers, return `206 Partial Content`, and serve a linearized PDF. Background stream/autofetch is disabled so complete bytes are only requested explicitly for processing; servers without range support may require a full viewing response.

## Repository Layout

- `A/` — working MVP, reusable SDK, demonstration host, and app README
- `B/architecture.md` — component diagram, lifecycles, state, and tradeoffs
- `C/phase-1-plan.md` — plan saved before application changes
- `C/phase-1-implementation.md` — evidence-based implementation record
- `C/ai-usage.md` — Codex missions, recommendations, corrections, and validation
- `REQUIREMENTS.md` — assignment acceptance checklist

## Licensing

The project is AGPL-3.0-or-later because it uses MuPDF.js WebAssembly. See [`LICENSE`](LICENSE), [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md), and [`A/public/SOURCE_OFFER.txt`](A/public/SOURCE_OFFER.txt). PDF.js is Apache-2.0. Corresponding application source is public at <https://github.com/jsyed-se/neubus_pdf_viewer>; deployed copies must retain the source-and-license notice.

## Known Limitations

The referenced video was unavailable. Text-selection annotation is per page, annotation resize is numeric rather than handle-based, and signature-widget creation is not claimed; exact blockers are recorded in the implementation document. Cursor Plan-mode and exported-transcript artifacts were not available in this Codex environment and were not fabricated.
