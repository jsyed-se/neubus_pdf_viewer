export type PdfDocumentSource =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string; filename?: string }
  | { kind: 'bytes'; bytes: Uint8Array; filename: string };

export interface AttachmentMetadata {
  id: string;
  filename: string;
  label?: string;
}

export type ViewMode = 'continuous' | 'single' | 'spread';
export type ZoomMode = 'custom' | 'fit-width' | 'fit-viewport';
export type AnnotationTool = 'none' | 'text' | 'highlight' | 'redact' | 'highlight-text' | 'redact-text';

export interface ViewerLifecycleCallbacks {
  onReady?: (details: { pageCount: number; filename: string }) => void;
  onProgress?: (loaded: number, total?: number) => void;
  onError?: (error: Error) => void;
  onPageChange?: (page: number) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSave?: (bytes: Uint8Array, filename: string) => void;
  onCloseRequest?: () => void;
  onPasswordRequest?: (reason: 'required' | 'incorrect') => Promise<string | null>;
}

export interface PdfViewerSDKProps extends ViewerLifecycleCallbacks {
  source: PdfDocumentSource | null;
  attachment?: AttachmentMetadata;
  className?: string;
}

export interface PageMetadata {
  index: number;
  width: number;
  height: number;
  rotation: number;
  annotationCount: number;
  widgetCount: number;
}

export interface AnnotationMetadata {
  index: number;
  type: string;
  pageIndex: number;
  rect: [number, number, number, number];
  contents: string;
  author: string;
  opacity: number;
}

export interface BookmarkMetadata {
  path: number[];
  title: string;
  page: number | null;
  depth: number;
}

export interface WidgetMetadata {
  index: number;
  pageIndex: number;
  fieldType: string;
  name: string;
  label: string;
  value: string;
  rect: [number, number, number, number];
}

export interface EngineSnapshot {
  pageCount: number;
  pages: PageMetadata[];
  annotations: AnnotationMetadata[];
  widgets: WidgetMetadata[];
  bookmarks: BookmarkMetadata[];
  canUndo: boolean;
  canRedo: boolean;
  hasClipboard: boolean;
  dirty: boolean;
  wasm: true;
  capabilities: {
    nativeAnnotations: true;
    appliedRedaction: true;
    bookmarkEditing: true;
    signatureWidgetCreation: false;
  };
}

export type EngineCommand =
  | { type: 'open'; bytes: Uint8Array; password?: string }
  | { type: 'reset' }
  | { type: 'snapshot' }
  | { type: 'serialize' }
  | { type: 'commit' }
  | { type: 'cancel' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'rotate'; pages: number[]; degrees: -90 | 90 }
  | { type: 'reorder'; order: number[] }
  | { type: 'move'; page: number; to: number }
  | { type: 'delete'; pages: number[] }
  | { type: 'copy'; pages: number[] }
  | { type: 'paste'; after: number }
  | { type: 'import'; bytes: Uint8Array; after: number; password?: string }
  | { type: 'extract'; pages: number[] }
  | { type: 'keep'; pages: number[] }
  | {
      type: 'addAnnotation';
      page: number;
      annotationType: 'Text' | 'Highlight' | 'Redact';
      pdfRect: [number, number, number, number];
      contents?: string;
      apply?: boolean;
    }
  | {
      type: 'addTextMatchAnnotation';
      page: number;
      annotationType: 'Highlight' | 'Redact';
      text: string;
      apply?: boolean;
    }
  | {
      type: 'addQuadAnnotation';
      page: number;
      annotationType: 'Highlight' | 'Redact';
      pdfQuads: Array<[number, number, number, number, number, number, number, number]>;
      contents?: string;
      apply?: boolean;
    }
  | {
      type: 'updateAnnotation';
      page: number;
      annotationIndex: number;
      contents?: string;
      opacity?: number;
      rect?: [number, number, number, number];
    }
  | { type: 'deleteAnnotation'; page: number; annotationIndex: number }
  | { type: 'applyRedactions'; page: number }
  | { type: 'addBookmark'; title: string; page: number }
  | { type: 'updateBookmark'; path: number[]; title: string; page: number }
  | { type: 'deleteBookmark'; path: number[] };

export interface EngineResult {
  snapshot?: EngineSnapshot;
  bytes?: Uint8Array;
  copiedPages?: number;
  matchCount?: number;
}
