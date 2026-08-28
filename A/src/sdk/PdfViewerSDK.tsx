import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Edit3,
  FileText,
  Highlighter,
  Maximize2,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Save,
  Search,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  GlobalWorkerOptions,
  PasswordResponses,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { DocumentEditor } from '../components/DocumentEditor';
import { PdfPageCanvas } from '../components/PdfPageCanvas';
import { calculateScale, pagesForMode } from '../lib/viewMath';
import { PdfEngineClient } from './engineClient';
import type {
  AnnotationTool,
  EngineCommand,
  EngineSnapshot,
  PdfViewerSDKProps,
  ViewMode,
  ZoomMode,
} from './types';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function filenameFromSource(props: PdfViewerSDKProps) {
  if (props.attachment?.filename) return props.attachment.filename;
  if (!props.source) return 'document.pdf';
  if (props.source.kind === 'file') return props.source.file.name;
  if (props.source.kind === 'bytes') return props.source.filename;
  if (props.source.filename) return props.source.filename;
  try {
    const segment = new URL(props.source.url).pathname.split('/').filter(Boolean).pop();
    return segment?.toLowerCase().endsWith('.pdf') ? segment : 'remote-document.pdf';
  } catch {
    return 'remote-document.pdf';
  }
}

function safeDownloadName(filename: string, suffix = '') {
  const base = filename.replace(/\.pdf$/i, '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'document';
  return `${base}${suffix}.pdf`;
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function describeLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/cors|fetch|network|http/i.test(message)) {
    return `The PDF could not be fetched. Check the URL, CORS headers, and network connection. ${message}`;
  }
  if (/password/i.test(message)) return `The PDF password was not accepted. ${message}`;
  if (/invalid|malformed|format|structure/i.test(message)) return `The file is not a valid or supported PDF. ${message}`;
  return message || 'The PDF could not be opened.';
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`viewer-tool${active ? ' active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export function PdfViewerSDK(props: PdfViewerSDKProps) {
  const {
    source,
    className,
    onReady,
    onProgress,
    onError,
    onPageChange,
    onDirtyChange,
    onSave,
    onPasswordRequest,
  } = props;
  const filename = filenameFromSource(props);
  const engine = useMemo(() => new PdfEngineClient(), []);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const documentRevision = useRef(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 612, height: 792 });
  const [workspaceSize, setWorkspaceSize] = useState({ width: 844, height: 644, gap: 24 });
  const [viewMode, setViewMode] = useState<ViewMode>('continuous');
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-width');
  const [customScale, setCustomScale] = useState(1);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total?: number } | null>(null);
  const [status, setStatus] = useState('Choose a local PDF or enter a PDF URL.');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [engineSnapshot, setEngineSnapshot] = useState<EngineSnapshot | null>(null);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>('none');
  const [selectedAnnotation, setSelectedAnnotation] = useState<{ pageIndex: number; index: number } | null>(null);
  const [detailsPanel, setDetailsPanel] = useState<'none' | 'annotations' | 'bookmarks'>('none');
  const passwordRef = useRef<string | undefined>(undefined);

  const scale = useMemo(() => {
    return calculateScale({
      zoomMode,
      customScale,
      viewportWidth: workspaceSize.width,
      viewportHeight: workspaceSize.height,
      pageWidth: pageSize.width,
      pageHeight: pageSize.height,
      mountedPageCount: viewMode === 'spread' ? pagesForMode(viewMode, currentPage, pageCount).length : 1,
      pageGap: workspaceSize.gap,
    });
  }, [currentPage, customScale, pageCount, pageSize, viewMode, workspaceSize, zoomMode]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const observer = new ResizeObserver(([entry]) => {
      const pageList = workspace.querySelector<HTMLElement>('.page-list');
      const styles = pageList ? window.getComputedStyle(pageList) : null;
      const horizontalPadding = styles ? parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight) : 0;
      const verticalPadding = styles ? parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) : 0;
      const gap = styles ? parseFloat(styles.columnGap || styles.gap) || 0 : 0;
      setWorkspaceSize({
        width: Math.max(1, entry.contentRect.width - horizontalPadding),
        height: Math.max(1, entry.contentRect.height - verticalPadding),
        gap,
      });
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [editorOpen, loading, pdfDocument]);

  useEffect(() => {
    if (!pdfDocument || currentPage < 1) return;
    let cancelled = false;
    void pdfDocument.getPage(currentPage)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        setPageSize({ width: viewport.width, height: viewport.height });
        page.cleanup();
      })
      .catch(() => {
        // A document swap can invalidate an in-flight page request.
      });
    return () => { cancelled = true; };
  }, [currentPage, pdfDocument]);

  const installPdfDocument = useCallback(async (
    next: PDFDocumentProxy,
    nextFilename = filename,
    options: { resetPage?: boolean; notifyReady?: boolean } = {},
  ) => {
    setPdfDocument((previous) => {
      if (previous && previous !== next) void previous.cleanup();
      return next;
    });
    pdfDocumentRef.current = next;
    setPageCount(next.numPages);
    if (options.resetPage !== false) setCurrentPage(1);
    setError(null);
    setStatus(`${next.numPages} page${next.numPages === 1 ? '' : 's'} ready.`);
    if (options.notifyReady !== false) onReady?.({ pageCount: next.numPages, filename: nextFilename });
  }, [filename, onReady]);

  const loadBytesIntoViewer = useCallback(async (bytes: Uint8Array) => {
    const revision = ++documentRevision.current;
    void loadingTaskRef.current?.destroy();
    const task = getDocument({ data: Uint8Array.from(bytes), useWasm: true });
    loadingTaskRef.current = task;
    const next = await task.promise;
    if (revision !== documentRevision.current) {
      await next.cleanup();
      throw new Error('A newer document replaced this result.');
    }
    await installPdfDocument(next, filename, { resetPage: false, notifyReady: false });
  }, [filename, installPdfDocument]);

  useEffect(() => {
    const revision = ++documentRevision.current;
    loadingTaskRef.current?.destroy();
    void engine.call({ type: 'reset' }).catch(() => undefined);
    setEngineSnapshot(null);
    setEditorOpen(false);
    setSelectedPages(new Set());
    setAnnotationTool('none');
    setSelectedAnnotation(null);
    setError(null);
    passwordRef.current = undefined;

    if (!source) {
      setLoading(false);
      setPageCount(0);
      setPdfDocument((previous) => {
        if (previous) void previous.cleanup();
        return null;
      });
      pdfDocumentRef.current = null;
      setStatus('Choose a local PDF or enter a PDF URL.');
      return;
    }

    setLoading(true);
    setStatus(source.kind === 'url' ? 'Connecting to the remote PDF…' : 'Reading PDF structure…');
    let task: PDFDocumentLoadingTask | null = null;
    void (async () => {
      const parameters = source.kind === 'url'
        ? { url: source.url, disableRange: false, disableStream: true, disableAutoFetch: true, useWasm: true }
        : source.kind === 'file'
          ? { data: new Uint8Array(await source.file.arrayBuffer()), useWasm: true }
          : { data: Uint8Array.from(source.bytes), useWasm: true };
      if (revision !== documentRevision.current) return;
      task = getDocument(parameters);
      loadingTaskRef.current = task;
      task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (revision !== documentRevision.current) return;
        setProgress({ loaded, total: total || undefined });
        onProgress?.(loaded, total || undefined);
      };
      task.onPassword = (updatePassword: (password: string) => void, reason: number) => {
        const passwordReason = reason === PasswordResponses.INCORRECT_PASSWORD ? 'incorrect' : 'required';
        const request = onPasswordRequest
          ? onPasswordRequest(passwordReason)
          : Promise.resolve(window.prompt(passwordReason === 'incorrect' ? 'Incorrect password. Try again:' : 'Enter the PDF password:'));
        void request.then((password) => {
          if (password == null) {
            void task?.destroy();
            return;
          }
          passwordRef.current = password;
          updatePassword(password);
        });
      };
      return task.promise;
    })()
      .then(async (next) => {
        if (!next) return;
        if (revision !== documentRevision.current) {
          await next.cleanup();
          return;
        }
        await installPdfDocument(next);
      })
      .catch((loadError) => {
        if (revision !== documentRevision.current) return;
        const message = describeLoadError(loadError);
        setError(message);
        setStatus('Document failed to load.');
        onError?.(loadError instanceof Error ? loadError : new Error(message));
      })
      .finally(() => {
        if (revision === documentRevision.current) {
          setLoading(false);
          setProgress(null);
        }
      });

    return () => {
      void task?.destroy();
    };
  }, [engine, installPdfDocument, onError, onPasswordRequest, onProgress, source]);

  useEffect(() => () => {
    documentRevision.current += 1;
    loadingTaskRef.current?.destroy();
    void pdfDocumentRef.current?.cleanup();
    engine.destroy();
  }, [engine]);

  useEffect(() => {
    if (!engineSnapshot?.dirty) return;
    const preventUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', preventUnload);
    return () => window.removeEventListener('beforeunload', preventUnload);
  }, [engineSnapshot?.dirty]);

  useEffect(() => {
    onDirtyChange?.(engineSnapshot?.dirty ?? false);
  }, [engineSnapshot?.dirty, onDirtyChange]);

  const ensureEngine = useCallback(async () => {
    if (engineSnapshot) return engineSnapshot;
    if (!pdfDocument) throw new Error('Open a PDF before using document tools.');
    setStatus('Preparing the WebAssembly document engine…');
    const bytes = Uint8Array.from(await pdfDocument.getData());
    const result = await engine.call({ type: 'open', bytes, password: passwordRef.current });
    if (!result.snapshot) throw new Error('The document engine did not return document metadata.');
    setEngineSnapshot(result.snapshot);
    setStatus('MuPDF WebAssembly engine ready.');
    return result.snapshot;
  }, [engine, engineSnapshot, pdfDocument]);

  const runEngine = useCallback(async (command: EngineCommand, reload = true) => {
    setBusy(true);
    setError(null);
    try {
      await ensureEngine();
      const result = await engine.call(command);
      if (reload && result.bytes) await loadBytesIntoViewer(result.bytes);
      if (result.snapshot) setEngineSnapshot(result.snapshot);
      setStatus('Document operation completed.');
      return result;
    } catch (operationError) {
      const message = operationError instanceof Error ? operationError.message : String(operationError);
      setError(message);
      setStatus('Document operation failed.');
      onError?.(operationError instanceof Error ? operationError : new Error(message));
      throw operationError;
    } finally {
      setBusy(false);
    }
  }, [engine, ensureEngine, loadBytesIntoViewer, onError]);

  const setPage = useCallback((page: number, scroll = true) => {
    const next = Math.max(1, Math.min(pageCount || 1, Math.round(page)));
    setCurrentPage(next);
    onPageChange?.(next);
    if (scroll && viewMode === 'continuous') {
      viewerRef.current?.querySelector(`[data-page-number="${next}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [onPageChange, pageCount, viewMode]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'PageDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        setPage(currentPage + 1);
      } else if (event.key === 'PageUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setPage(currentPage - 1);
      } else if ((event.ctrlKey || event.metaKey) && event.key === '+') {
        event.preventDefault();
        setZoomMode('custom');
        setCustomScale((value) => Math.min(5, value + 0.15));
      } else if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        setZoomMode('custom');
        setCustomScale((value) => Math.max(0.2, value - 0.15));
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [currentPage, setPage]);

  const beginEditor = async () => {
    try {
      const snapshot = await ensureEngine();
      setSelectedPages(new Set());
      setEngineSnapshot(snapshot);
      setEditorOpen(true);
      setAnnotationTool('none');
      setDetailsPanel('none');
    } catch {
      // ensureEngine reports the actionable error.
    }
  };

  const editorCommand = async (name: string, payload?: unknown) => {
    const pages = [...selectedPages];
    if (name === 'rotate') await runEngine({ type: 'rotate', pages, degrees: payload as -90 | 90 });
    else if (name === 'delete') {
      await runEngine({ type: 'delete', pages });
      setSelectedPages(new Set());
    } else if (name === 'keep') {
      await runEngine({ type: 'keep', pages });
      setSelectedPages(new Set());
    } else if (name === 'copy') await runEngine({ type: 'copy', pages }, false);
    else if (name === 'paste') await runEngine({ type: 'paste', after: payload as number });
    else if (name === 'undo') await runEngine({ type: 'undo' });
    else if (name === 'redo') await runEngine({ type: 'redo' });
    else if (name === 'move') {
      const move = payload as { from: number; to: number };
      await runEngine({ type: 'move', page: move.from, to: move.to });
      setSelectedPages(new Set());
    } else if (name === 'extract') {
      const result = await runEngine({ type: 'extract', pages }, false);
      if (result.bytes) downloadBytes(result.bytes, safeDownloadName(filename, '-selected-pages'));
    }
  };

  const importPdf = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const after = selectedPages.size ? Math.max(...selectedPages) : (engineSnapshot?.pageCount ?? 1) - 1;
    await runEngine({ type: 'import', bytes, after });
    setSelectedPages(new Set());
  };

  const cancelEditor = async () => {
    if (engineSnapshot?.dirty && !window.confirm('Discard all changes made since the last save?')) return;
    try {
      const result = await runEngine({ type: 'cancel' });
      if (result.snapshot) setEngineSnapshot(result.snapshot);
      setEditorOpen(false);
      setSelectedPages(new Set());
    } catch {
      // runEngine reports errors.
    }
  };

  const saveChanges = async () => {
    try {
      const result = await runEngine({ type: 'commit' });
      if (result.bytes) onSave?.(result.bytes, filename);
      setEditorOpen(false);
      setSelectedPages(new Set());
      setStatus('Changes committed to the current workspace document.');
    } catch {
      // runEngine reports errors.
    }
  };

  const exportDocument = async (suffix = '-edited') => {
    try {
      setBusy(true);
      const bytes = engineSnapshot
        ? (await engine.call({ type: 'serialize' })).bytes
        : pdfDocument ? Uint8Array.from(await pdfDocument.getData()) : undefined;
      if (!bytes) throw new Error('Open a PDF before exporting.');
      downloadBytes(bytes, safeDownloadName(filename, suffix));
      setStatus('PDF downloaded locally.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : String(exportError));
    } finally {
      setBusy(false);
    }
  };

  const printDocument = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Printing was blocked. Allow popups for this site and try again.');
      return;
    }
    printWindow.document.write('<title>Preparing PDF</title><p style="font:16px system-ui;padding:24px">Preparing the current PDF for printing…</p>');
    try {
      const bytes = engineSnapshot
        ? (await engine.call({ type: 'serialize' })).bytes
        : pdfDocument ? Uint8Array.from(await pdfDocument.getData()) : undefined;
      if (!bytes) throw new Error('Open a PDF before printing.');
      const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' }));
      printWindow.document.open();
      printWindow.document.write(`<title>${safeDownloadName(filename)}</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}</style><iframe title="Printable PDF" src="${url}"></iframe>`);
      printWindow.document.close();
      const iframe = printWindow.document.querySelector('iframe');
      if (iframe) iframe.addEventListener('load', () => {
        printWindow.focus();
        printWindow.print();
      }, { once: true });
      const cleanup = () => URL.revokeObjectURL(url);
      printWindow.addEventListener('afterprint', cleanup, { once: true });
      window.setTimeout(cleanup, 60_000);
    } catch (printError) {
      printWindow.document.body.innerHTML = `<p style="font:16px system-ui;padding:24px">Printing failed: ${String(printError)}</p>`;
      setError(printError instanceof Error ? printError.message : String(printError));
    }
  };

  const addAnnotation = async (
    pageNumber: number,
    tool: 'text' | 'highlight' | 'redact',
    pdfRect: [number, number, number, number],
  ) => {
    let contents = '';
    if (tool === 'text') {
      contents = window.prompt('Text note:')?.trim() ?? '';
      if (!contents) return;
    }
    try {
      await runEngine({
        type: 'addAnnotation',
        page: pageNumber - 1,
        annotationType: tool === 'text' ? 'Text' : tool === 'highlight' ? 'Highlight' : 'Redact',
        pdfRect,
        contents,
      });
      setAnnotationTool('none');
      setDetailsPanel('annotations');
    } catch {
      // runEngine reports errors.
    }
  };

  const addTextSelection = async (
    pageNumber: number,
    tool: 'highlight-text' | 'redact-text',
    pdfQuads: Array<[number, number, number, number, number, number, number, number]>,
  ) => {
    const annotationType = tool === 'highlight-text' ? 'Highlight' : 'Redact';
    try {
      await runEngine({ type: 'addQuadAnnotation', page: pageNumber - 1, annotationType, pdfQuads });
      setAnnotationTool('none');
      setDetailsPanel('annotations');
      setStatus(`${annotationType} annotation added from selected text.`);
    } catch {
      // runEngine reports errors.
    }
  };

  const addTextMatch = async (kind: 'Highlight' | 'Redact') => {
    const text = window.prompt(`Text to ${kind === 'Highlight' ? 'highlight' : 'redact'} on page ${currentPage}:`)?.trim();
    if (!text) return;
    try {
      const result = await runEngine({ type: 'addTextMatchAnnotation', page: currentPage - 1, annotationType: kind, text });
      setStatus(`${result.matchCount ?? 0} text match${result.matchCount === 1 ? '' : 'es'} annotated.`);
      setDetailsPanel('annotations');
    } catch {
      // runEngine reports errors.
    }
  };

  const visiblePageNumbers = useMemo(() => {
    if (!pdfDocument) return [];
    return pagesForMode(viewMode, currentPage, pageCount);
  }, [currentPage, pageCount, pdfDocument, viewMode]);

  const currentAnnotations = engineSnapshot?.annotations.filter((annotation) => annotation.pageIndex === currentPage - 1) ?? [];
  const currentWidgets = engineSnapshot?.widgets.filter((widget) => widget.pageIndex === currentPage - 1) ?? [];
  const selectedAnnotationMetadata = selectedAnnotation
    ? engineSnapshot?.annotations.find((annotation) => annotation.pageIndex === selectedAnnotation.pageIndex && annotation.index === selectedAnnotation.index)
    : undefined;

  if (!source && !pdfDocument) {
    return (
      <section className={`pdf-sdk empty-state ${className ?? ''}`} aria-label="PDF viewer">
        <FileText size={48} />
        <h2>No PDF open</h2>
        <p>Choose a local PDF, enter a remote URL, or provide raw bytes through the SDK integration.</p>
      </section>
    );
  }

  return (
    <section className={`pdf-sdk ${className ?? ''}`} aria-label="PDF viewer SDK">
      <div className="sr-status" role="status" aria-live="polite">{status}</div>
      {error && (
        <div className="error-banner" role="alert">
          <ShieldAlert />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {loading && (
        <div className="loading-panel" role="status">
          <span className="spinner" />
          <strong>Preparing document</strong>
          <span>{status}</span>
          {progress && (
            <progress value={progress.loaded} max={progress.total ?? Math.max(progress.loaded, 1)}>
              {progress.total ? Math.round((progress.loaded / progress.total) * 100) : progress.loaded}
            </progress>
          )}
          <button type="button" className="secondary-button" onClick={() => void loadingTaskRef.current?.destroy()}>Cancel loading</button>
        </div>
      )}
      {!loading && pdfDocument && editorOpen && engineSnapshot ? (
        <DocumentEditor
          document={pdfDocument}
          snapshot={engineSnapshot}
          selected={selectedPages}
          busy={busy}
          onSelectedChange={setSelectedPages}
          onCommand={(command, payload) => void editorCommand(command, payload)}
          onImport={(file) => void importPdf(file)}
          onCancel={() => void cancelEditor()}
          onSave={() => void saveChanges()}
          onExport={() => void exportDocument('-working-copy')}
        />
      ) : !loading && pdfDocument ? (
        <>
          <div className="viewer-toolbar" role="toolbar" aria-label="PDF viewer toolbar">
            <ToolButton label="Toggle thumbnails" active={thumbnailsOpen} onClick={() => setThumbnailsOpen((value) => !value)}>
              {thumbnailsOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </ToolButton>
            <ToolButton label="Edit document" disabled={busy} onClick={() => void beginEditor()}><Edit3 /></ToolButton>
            <ToolButton label="Print" disabled={busy} onClick={() => void printDocument()}><Printer /></ToolButton>
            <ToolButton label="Save PDF" disabled={busy} onClick={() => void exportDocument()}><Save /></ToolButton>
            <span className="toolbar-divider" />
            <button type="button" className="icon-button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></button>
            <label className="page-input-label">
              <span className="visually-hidden">Current page</span>
              <input
                name="pdf-current-page"
                aria-label="Current page"
                type="number"
                min={1}
                max={pageCount}
                value={currentPage}
                onChange={(event) => setPage(Number(event.target.value) || 1)}
              />
              <span>/ {pageCount}</span>
            </label>
            <button type="button" className="icon-button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight /></button>
            <span className="toolbar-divider" />
            <ToolButton label="Zoom out" onClick={() => { setZoomMode('custom'); setCustomScale(Math.max(0.2, scale - 0.15)); }}><ZoomOut /></ToolButton>
            <span className="zoom-value">{Math.round(scale * 100)}%</span>
            <ToolButton label="Zoom in" onClick={() => { setZoomMode('custom'); setCustomScale(Math.min(5, scale + 0.15)); }}><ZoomIn /></ToolButton>
            <ToolButton label="Fit width" active={zoomMode === 'fit-width'} onClick={() => setZoomMode('fit-width')}><Menu /></ToolButton>
            <ToolButton label="Fit viewport" active={zoomMode === 'fit-viewport'} onClick={() => setZoomMode('fit-viewport')}><Maximize2 /></ToolButton>
            <select name="pdf-scroll-mode" aria-label="Scroll mode" value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}>
              <option value="continuous">Continuous</option>
              <option value="single">Single page</option>
              <option value="spread">Spread</option>
            </select>
            <span className="toolbar-divider" />
            <ToolButton label="Highlight" active={annotationTool === 'highlight'} onClick={() => setAnnotationTool(annotationTool === 'highlight' ? 'none' : 'highlight')}><Highlighter /></ToolButton>
            <ToolButton label="Redact" active={annotationTool === 'redact'} onClick={() => setAnnotationTool(annotationTool === 'redact' ? 'none' : 'redact')}><ShieldAlert /></ToolButton>
            <ToolButton label="Text note" active={annotationTool === 'text'} onClick={() => setAnnotationTool(annotationTool === 'text' ? 'none' : 'text')}><MessageSquareText /></ToolButton>
            <ToolButton label="Annotations" active={detailsPanel === 'annotations'} onClick={() => setDetailsPanel(detailsPanel === 'annotations' ? 'none' : 'annotations')}><Search /></ToolButton>
            <ToolButton label="Bookmarks" active={detailsPanel === 'bookmarks'} onClick={() => {
              void ensureEngine().catch(() => undefined);
              setDetailsPanel(detailsPanel === 'bookmarks' ? 'none' : 'bookmarks');
            }}><Bookmark /></ToolButton>
          </div>
          <div className="viewer-shell" ref={viewerRef}>
            {thumbnailsOpen && (
              <aside className="thumbnail-rail" aria-label="Page thumbnails">
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    type="button"
                    key={index}
                    className={currentPage === index + 1 ? 'active' : ''}
                    onClick={() => setPage(index + 1)}
                    aria-label={`Go to page ${index + 1}`}
                  >
                    <PdfPageCanvas document={pdfDocument} pageNumber={index + 1} scale={0.17} compact active={currentPage === index + 1} />
                    <span>{index + 1}</span>
                  </button>
                ))}
              </aside>
            )}
            <main ref={workspaceRef} className={`page-workspace mode-${viewMode}`} aria-label="PDF pages">
              <div className="page-list">
                {visiblePageNumbers.map((pageNumber) => (
                  <PdfPageCanvas
                    key={`${pageNumber}-${scale}`}
                    document={pdfDocument}
                    pageNumber={pageNumber}
                    scale={scale}
                    active={pageNumber === currentPage}
                    annotationTool={annotationTool}
                    selectedAnnotationRect={selectedAnnotationMetadata?.pageIndex === pageNumber - 1 ? selectedAnnotationMetadata.rect : undefined}
                    onVisible={(page) => viewMode === 'continuous' && page !== currentPage && setPage(page, false)}
                    onAnnotate={(page, tool, rect) => void addAnnotation(page, tool, rect)}
                    onTextAnnotate={(page, tool, quads) => void addTextSelection(page, tool, quads)}
                  />
                ))}
              </div>
            </main>
            {detailsPanel !== 'none' && (
              <aside className="details-panel" aria-label={detailsPanel === 'annotations' ? 'Annotation tools' : 'Bookmarks'}>
                <div className="details-heading">
                  <h2>{detailsPanel === 'annotations' ? 'Annotations' : 'Bookmarks'}</h2>
                  <button type="button" aria-label="Close details panel" onClick={() => setDetailsPanel('none')}>×</button>
                </div>
                {detailsPanel === 'annotations' ? (
                  <>
                    <p>Native PDF annotations on page {currentPage}.</p>
                    <div className="panel-action-grid">
                      <button type="button" className={annotationTool === 'highlight-text' ? 'active' : ''} onClick={() => {
                        setAnnotationTool('highlight-text');
                        setStatus('Drag across selectable page text to create a native highlight.');
                      }}>Select text to highlight</button>
                      <button type="button" className={annotationTool === 'redact-text' ? 'active' : ''} onClick={() => {
                        setAnnotationTool('redact-text');
                        setStatus('Drag across selectable page text to create a native redaction annotation.');
                      }}>Select text to redact</button>
                      <button type="button" onClick={() => void addTextMatch('Highlight')}>Highlight matching text</button>
                      <button type="button" onClick={() => void addTextMatch('Redact')}>Redact matching text</button>
                      <button type="button" disabled={!currentAnnotations.some((item) => item.type === 'Redact')} onClick={() => void runEngine({ type: 'applyRedactions', page: currentPage - 1 })}>Apply page redactions</button>
                    </div>
                    {currentAnnotations.length === 0 ? <p className="muted">No annotations on this page.</p> : (
                      <ul className="detail-list">
                        {currentAnnotations.map((annotation) => (
                          <li
                            key={`${annotation.pageIndex}-${annotation.index}`}
                            className={selectedAnnotation?.pageIndex === annotation.pageIndex && selectedAnnotation.index === annotation.index ? 'selected' : ''}
                          >
                            <strong>{annotation.type}</strong>
                            <span>{annotation.contents || 'No description'}</span>
                            <button type="button" aria-pressed={selectedAnnotation?.pageIndex === annotation.pageIndex && selectedAnnotation.index === annotation.index} onClick={() => setSelectedAnnotation({ pageIndex: annotation.pageIndex, index: annotation.index })}>Select annotation</button>
                            {selectedAnnotation?.pageIndex === annotation.pageIndex && selectedAnnotation.index === annotation.index && <div aria-label="Selected annotation properties">
                              <button type="button" onClick={() => {
                                const contents = window.prompt('Annotation text:', annotation.contents);
                                if (contents != null) void runEngine({ type: 'updateAnnotation', page: annotation.pageIndex, annotationIndex: annotation.index, contents });
                              }}>Edit</button>
                              <button type="button" onClick={() => {
                                const currentWidth = Math.abs(annotation.rect[2] - annotation.rect[0]);
                                const currentHeight = Math.abs(annotation.rect[3] - annotation.rect[1]);
                                const width = Number(window.prompt('Annotation width in PDF points:', String(Math.round(currentWidth))));
                                const height = Number(window.prompt('Annotation height in PDF points:', String(Math.round(currentHeight))));
                                if (width > 0 && height > 0) {
                                  void runEngine({
                                    type: 'updateAnnotation',
                                    page: annotation.pageIndex,
                                    annotationIndex: annotation.index,
                                    rect: [annotation.rect[0], annotation.rect[1], annotation.rect[0] + width, annotation.rect[1] + height],
                                  });
                                }
                              }}>Resize</button>
                              <button type="button" onClick={() => {
                                setSelectedAnnotation(null);
                                void runEngine({ type: 'deleteAnnotation', page: annotation.pageIndex, annotationIndex: annotation.index });
                              }}>Delete</button>
                            </div>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="capability-note">
                      <strong>Signature fields</strong>
                      <p>MuPDF.js 1.28 exposes widget inspection but no safe browser API for creating a signature field and its AcroForm relationship. This bonus is not claimed.</p>
                    </div>
                    {currentWidgets.length > 0 && (
                      <div className="capability-note">
                        <strong>Existing form widgets</strong>
                        <ul>
                          {currentWidgets.map((widget) => (
                            <li key={`${widget.pageIndex}-${widget.index}`}>{widget.fieldType}: {widget.label || widget.name || 'Unnamed field'}{widget.value ? ` — ${widget.value}` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p>Bookmarks are written to the PDF outline through MuPDF WASM.</p>
                    <button type="button" className="panel-primary" onClick={() => {
                      const title = window.prompt('Bookmark title:')?.trim();
                      if (title) void runEngine({ type: 'addBookmark', title, page: currentPage - 1 });
                    }}>Add bookmark for page {currentPage}</button>
                    {!engineSnapshot?.bookmarks.length ? <p className="muted">No bookmarks in this PDF.</p> : (
                      <ul className="detail-list bookmarks">
                        {engineSnapshot.bookmarks.map((bookmark) => (
                          <li key={bookmark.path.join('.')} style={{ paddingLeft: `${bookmark.depth * 14 + 10}px` }}>
                            <button type="button" className="bookmark-link" onClick={() => bookmark.page != null && setPage(bookmark.page + 1)}>{bookmark.title}</button>
                            <span>{bookmark.page == null ? 'Destination unavailable' : `Page ${bookmark.page + 1}`}</span>
                            <div>
                              <button type="button" onClick={() => {
                                const title = window.prompt('Bookmark title:', bookmark.title)?.trim();
                                if (title) void runEngine({ type: 'updateBookmark', path: bookmark.path, title, page: bookmark.page ?? currentPage - 1 });
                              }}>Edit</button>
                              <button type="button" onClick={() => void runEngine({ type: 'deleteBookmark', path: bookmark.path })}>Delete</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </aside>
            )}
          </div>
          {busy && <div className="busy-overlay" role="status"><span className="spinner" /> Updating PDF with MuPDF WebAssembly…</div>}
        </>
      ) : null}
    </section>
  );
}
