# PDF Viewer Requirements

This document is the acceptance checklist for the project. Items marked **Bonus** are optional; all other items are required.

## A. Working Web App (MVP)

Build the MVP using a programming language listed in the job description.

### A1. PDF Viewing and Navigation

- [ ] Render PDFs in the browser.
- [ ] Provide zoom in, zoom out, fit-to-width, and fit-to-viewport controls.
- [ ] Support continuous and per-spread scroll modes.
- [ ] Support page navigation.
- [ ] Support linearized PDF loading so large documents display quickly.
- [ ] **Bonus:** Use WebAssembly for high-fidelity browser rendering.

### A2. PDF Editing (Document Editor)

- [ ] Provide a full document-editor mode with a page-manipulation toolbar.
- [ ] Rotate and reorder pages.
- [ ] Import and merge PDF documents.
- [ ] Extract pages.
- [ ] Export the edited PDF.

### A3. Printing

- [ ] Provide a Print action. Browser-native printing is acceptable.

### A4. Export and Conversion

- [ ] Export a PDF while keeping only selected pages.
- [ ] Import documents as part of the editing/export workflow.
- [ ] Save the resulting PDF locally.

### A5. WebAssembly Features — Bonus

If the WebAssembly approach is used, the following are bonus features:

- [ ] Rectangle-based and text-highlighter-based redaction annotations.
- [ ] Text annotations.
- [ ] Signature form fields and widget annotations.
- [ ] Read and write bookmarks.

## B. Architecture and Design

Provide a short architecture and design document that includes:

- [ ] One diagram showing components or modules; ASCII is acceptable.
- [ ] The state-management approach, including what state exists and where it lives.
- [ ] Key performance, accessibility, and library-choice tradeoffs.
- [ ] An “If I had one more day” roadmap containing 5–8 bullets.

## C. Cursor AI Usage Log

- [ ] Use Cursor Plan mode before building.
- [ ] Finalize the plan, save it in the workspace, and upload the file.
- [ ] From the Cursor prompt window, use the three-dot menu to export the transcript, then upload it.
- [ ] Explain what was changed from the AI output and why.
- [ ] Explain how correctness was validated.

## D. GitHub Repository and Delivery

- [ ] Provide a GitHub repository. Public is preferred; a private repository is acceptable when shared with reviewers.
- [ ] Include setup instructions and ensure `npm install && npm run dev` works from the repository root. Root scripts may delegate to the app in `A/`.
- [ ] Create top-level `A/`, `B/`, and `C/` folders:
  - `A/` contains the MVP code.
  - `B/` contains the architecture and design document.
  - `C/` contains the Cursor AI usage log and supporting files.

## Required End-to-End Checks

- [ ] Open a PDF, navigate pages, use every zoom option, and switch between both scroll modes.
- [ ] Rotate, reorder, import/merge, and extract pages through the editor toolbar.
- [ ] Export an edited PDF, export only selected pages, and save each result locally.
- [ ] Open a PDF and print it.
- [ ] Confirm a linearized PDF begins displaying progressively.
- [ ] If bonus work is claimed, verify each claimed annotation, signature-field, bookmark, and WebAssembly flow.

## Open Questions

Resolve these from the job description or with the reviewer before relying on them:

- Which listed programming languages are permitted?
- Does “per-spread” mean paired pages, cover-aware pairing, or paginated snapping?
- How will linearized loading be observed and tested?
- Does redaction require annotations only or irreversible content removal?
- Are the WebAssembly bonus features evaluated individually or only as a complete bundle?
- For signature fields and bookmarks, which create, edit, fill, sign, and nesting operations are expected?
- Does local saving require a browser download or the File System Access API?
- What document range and options must the Print action support?
- Which browsers, PDF size limits, accessibility target, and test coverage are expected?
- Where should the Cursor plan and transcript be uploaded, and must sensitive transcript content be removed first?
