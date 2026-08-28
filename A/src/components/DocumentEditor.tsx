import { useRef } from 'react';
import {
  Clipboard,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus2,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { EngineSnapshot } from '../sdk/types';
import { PdfPageCanvas } from './PdfPageCanvas';

interface DocumentEditorProps {
  document: PDFDocumentProxy;
  snapshot: EngineSnapshot;
  selected: Set<number>;
  busy: boolean;
  onSelectedChange: (selected: Set<number>) => void;
  onCommand: (command: string, payload?: unknown) => void;
  onImport: (file: File) => void;
  onCancel: () => void;
  onSave: () => void;
  onExport: () => void;
}

function EditorButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className="tool-button" type="button" disabled={disabled} onClick={onClick} aria-label={label}>
      {children}
      <span>{label}</span>
    </button>
  );
}

export function DocumentEditor({
  document,
  snapshot,
  selected,
  busy,
  onSelectedChange,
  onCommand,
  onImport,
  onCancel,
  onSave,
  onExport,
}: DocumentEditorProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const selectedPages = [...selected].sort((a, b) => a - b);
  const noneSelected = selected.size === 0;
  const allSelected = selected.size === snapshot.pageCount;
  const maxSelected = noneSelected ? snapshot.pageCount - 1 : Math.max(...selectedPages);

  const togglePage = (pageIndex: number) => {
    const next = new Set(selected);
    if (next.has(pageIndex)) next.delete(pageIndex);
    else next.add(pageIndex);
    onSelectedChange(next);
  };

  return (
    <section className="document-editor" aria-label="Document editor">
      <header className="editor-toolbar">
        <div className="editor-title"><span className="editor-mark">✎</span> Document editor</div>
        <div className="editor-actions" role="toolbar" aria-label="Document editor toolbar">
          <EditorButton label="Import" disabled={busy} onClick={() => importRef.current?.click()}><FilePlus2 /></EditorButton>
          <EditorButton label="Delete" disabled={busy || noneSelected || allSelected} onClick={() => onCommand('delete')}><Trash2 /></EditorButton>
          <EditorButton label="Rotate left" disabled={busy || noneSelected} onClick={() => onCommand('rotate', -90)}><RotateCcw /></EditorButton>
          <EditorButton label="Rotate right" disabled={busy || noneSelected} onClick={() => onCommand('rotate', 90)}><RotateCw /></EditorButton>
          <EditorButton label="Extract" disabled={busy || noneSelected} onClick={() => onCommand('extract')}><Scissors /></EditorButton>
          <EditorButton label="Keep selected" disabled={busy || noneSelected || allSelected} onClick={() => onCommand('keep')}><Clipboard /></EditorButton>
          <EditorButton label="Copy" disabled={busy || noneSelected} onClick={() => onCommand('copy')}><Copy /></EditorButton>
          <EditorButton label="Paste" disabled={busy || !snapshot.hasClipboard} onClick={() => onCommand('paste', maxSelected)}><ClipboardPaste /></EditorButton>
          <EditorButton label="Undo" disabled={busy || !snapshot.canUndo} onClick={() => onCommand('undo')}><Undo2 /></EditorButton>
          <EditorButton label="Redo" disabled={busy || !snapshot.canRedo} onClick={() => onCommand('redo')}><Redo2 /></EditorButton>
          <button
            type="button"
            className="text-action"
            disabled={busy}
            onClick={() => onSelectedChange(allSelected ? new Set() : new Set(snapshot.pages.map((page) => page.index)))}
          >
            {allSelected ? 'Select none' : 'Select all'}
          </button>
        </div>
        <div className="editor-commit-actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={onExport}><Download /> Export</button>
          <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}><X /> Cancel</button>
          <button type="button" className="primary-button" disabled={busy} onClick={onSave}><Save /> Save changes</button>
        </div>
        <input
          name="editor-import-pdf"
          ref={importRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.currentTarget.value = '';
          }}
        />
      </header>
      <div className="editor-grid" aria-busy={busy}>
        {snapshot.pages.map((page) => {
          const isSelected = selected.has(page.index);
          return (
            <article
              className={`editor-page-card${isSelected ? ' selected' : ''}`}
              key={`${page.index}-${page.rotation}`}
              draggable={!busy}
              onDragStart={(event) => event.dataTransfer.setData('text/page-index', String(page.index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData('text/page-index'));
                if (Number.isInteger(from) && from !== page.index) onCommand('move', { from, to: page.index });
              }}
            >
              <button
                className="page-select-button"
                type="button"
                aria-pressed={isSelected}
                onClick={() => togglePage(page.index)}
              >
                <span className="page-index-dot">{isSelected ? '✓' : page.index + 1}</span>
                <PdfPageCanvas document={document} pageNumber={page.index + 1} scale={0.28} compact />
              </button>
              <div className="reorder-row">
                <button
                  type="button"
                  aria-label={`Move page ${page.index + 1} left`}
                  disabled={busy || page.index === 0}
                  onClick={() => onCommand('move', { from: page.index, to: page.index - 1 })}
                >←</button>
                <span>Page {page.index + 1}{page.rotation ? ` · ${page.rotation}°` : ''}</span>
                <button
                  type="button"
                  aria-label={`Move page ${page.index + 1} right`}
                  disabled={busy || page.index === snapshot.pageCount - 1}
                  onClick={() => onCommand('move', { from: page.index, to: page.index + 1 })}
                >→</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
