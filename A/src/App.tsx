import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, FileUp, Link2 } from 'lucide-react';
import { PdfViewerSDK } from './sdk/PdfViewerSDK';
import type { AttachmentMetadata, PdfDocumentSource } from './sdk/types';

function metadataFor(source: PdfDocumentSource): AttachmentMetadata {
  const filename = source.kind === 'file'
    ? source.file.name
    : source.kind === 'bytes'
      ? source.filename
      : source.filename ?? source.url.split('/').pop() ?? 'remote-document.pdf';
  return { id: crypto.randomUUID(), filename, label: source.kind === 'url' ? 'Remote PDF' : 'Local workspace' };
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<PdfDocumentSource | null>(null);
  const [attachment, setAttachment] = useState<AttachmentMetadata | undefined>();
  const [url, setUrl] = useState('');
  const [dirty, setDirty] = useState(false);
  const [hostStatus, setHostStatus] = useState('PDF workspace');

  const handleReady = useCallback(({ pageCount }: { pageCount: number }) => {
    setHostStatus(`${pageCount} page${pageCount === 1 ? '' : 's'} ready`);
  }, []);
  const handleError = useCallback((error: Error) => setHostStatus(error.message), []);
  const handleSave = useCallback(() => setHostStatus('Changes committed · Local workspace'), []);

  const canReplaceDocument = () => !dirty || window.confirm('This document has unsaved changes. Discard them and open another PDF?');

  const openSource = (next: PdfDocumentSource) => {
    if (!canReplaceDocument()) return;
    setSource(next);
    setAttachment(metadataFor(next));
    setHostStatus(next.kind === 'url' ? 'Remote PDF' : 'Local workspace');
  };

  return (
    <main className="app-shell">
      <header className="host-header">
        <button
          type="button"
          className="back-button"
          onClick={() => {
            if (!canReplaceDocument()) return;
            setSource(null);
            setAttachment(undefined);
            setHostStatus('PDF workspace');
          }}
        >
          <ArrowLeft /> Back to results
        </button>
        <div className="attachment-summary">
          <span className="attachment-icon">A</span>
          <span>
            <strong>{attachment?.filename ?? 'Atlas PDF SDK'}</strong>
            <small>{source ? hostStatus : 'Reusable viewer demonstration'}</small>
          </span>
        </div>
        <form
          className="source-controls"
          onSubmit={(event) => {
            event.preventDefault();
            const nextUrl = url.trim();
            if (!nextUrl) return;
            try {
              const parsed = new URL(nextUrl);
              if (!/^https?:$/.test(parsed.protocol)) throw new Error();
              openSource({ kind: 'url', url: parsed.toString() });
            } catch {
              setHostStatus('Enter a complete http:// or https:// PDF URL.');
            }
          }}
        >
          <label>
            <span className="visually-hidden">Remote PDF URL</span>
            <Link2 />
            <input
              id="remote-pdf-url"
              name="remote-pdf-url"
              aria-label="Remote PDF URL"
              type="url"
              value={url}
              placeholder="https://…/file.pdf"
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <button type="submit" className="secondary-button">Open URL</button>
          <button type="button" className="open-button" onClick={() => fileInputRef.current?.click()}><FileUp /> Open PDF</button>
          <input
            id="local-pdf-file"
            name="local-pdf-file"
            ref={fileInputRef}
            hidden
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) openSource({ kind: 'file', file });
              event.currentTarget.value = '';
            }}
          />
        </form>
        <a className="source-offer-link" href="/SOURCE_OFFER.txt" target="_blank" rel="noreferrer">Source &amp; AGPL license</a>
      </header>
      <PdfViewerSDK
        source={source}
        attachment={attachment}
        onDirtyChange={setDirty}
        onReady={handleReady}
        onError={handleError}
        onSave={handleSave}
      />
    </main>
  );
}
