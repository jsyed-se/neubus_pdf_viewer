# Third-Party Notices

This project is distributed under **AGPL-3.0-or-later** because it links MuPDF.js into the browser document worker. The full license is in [`LICENSE`](LICENSE), and the built application serves the same text as `/LICENSE.txt`.

| Dependency | Version | License | Role / source |
| --- | --- | --- | --- |
| MuPDF.js (`mupdf`) | 1.28.0 | AGPL-3.0-or-later | WASM PDF processing, native annotations, redaction, page changes, outlines, and serialization. [Pinned upstream source](https://github.com/ArtifexSoftware/mupdf/tree/1.28.0) and [exact npm artifact](https://registry.npmjs.org/mupdf/-/mupdf-1.28.0.tgz) |
| PDF.js (`pdfjs-dist`) | 6.2.108 | Apache-2.0 | Progressive/range loading and browser canvas rendering. [Upstream source](https://github.com/mozilla/pdf.js) |
| React / React DOM | 19.2.8 | MIT | SDK and demonstration UI. [Upstream source](https://github.com/facebook/react) |
| Lucide React | 1.35.0 | ISC | Interface icons. [Upstream source](https://github.com/lucide-icons/lucide) |

Exact resolved packages are recorded in `package-lock.json`. No dependency source was modified. The application source, build scripts, worker source, and dependency lock file are the preferred form for modification of this submission. See [`A/public/SOURCE_OFFER.txt`](A/public/SOURCE_OFFER.txt).

The application's corresponding source is published at <https://github.com/jsyed-se/neubus_pdf_viewer>.
