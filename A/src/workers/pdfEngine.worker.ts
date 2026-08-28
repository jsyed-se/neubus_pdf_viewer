/// <reference lib="webworker" />

import * as mupdf from 'mupdf';
import type {
  AnnotationMetadata,
  BookmarkMetadata,
  EngineCommand,
  EngineResult,
  EngineSnapshot,
  WidgetMetadata,
} from '../sdk/types';

let document: mupdf.PDFDocument | null = null;
let committedBytes: Uint8Array | null = null;
let clipboardBytes: Uint8Array | null = null;
let dirty = false;

function copyBytes(bytes: Uint8Array<ArrayBufferLike>): Uint8Array {
  return Uint8Array.from(bytes);
}

function openPdf(bytes: Uint8Array, password?: string): mupdf.PDFDocument {
  const doc = new mupdf.PDFDocument(bytes);
  if (doc.needsPassword()) {
    if (!password || doc.authenticatePassword(password) === 0) {
      doc.destroy();
      throw new Error('A valid password is required for document processing.');
    }
  }
  return doc;
}

function requireDocument(): mupdf.PDFDocument {
  if (!document) throw new Error('No PDF is open in the document engine.');
  return document;
}

function serialize(doc = requireDocument()): Uint8Array {
  const buffer = doc.saveToBuffer('garbage=compact,compress=yes');
  const bytes = copyBytes(buffer.asUint8Array());
  buffer.destroy();
  return bytes;
}

function withOperation(name: string, operation: (doc: mupdf.PDFDocument) => void) {
  const doc = requireDocument();
  doc.beginOperation(name);
  try {
    operation(doc);
    doc.endOperation();
    dirty = true;
  } catch (error) {
    doc.abandonOperation();
    throw error;
  }
}

function normalizePageIndexes(pages: number[], count: number): number[] {
  return [...new Set(pages)]
    .filter((page) => Number.isInteger(page) && page >= 0 && page < count)
    .sort((a, b) => a - b);
}

function buildSubset(source: mupdf.PDFDocument, pages: number[]): Uint8Array {
  const target = new mupdf.PDFDocument();
  for (const page of pages) target.graftPage(-1, source, page);
  const bytes = serialize(target);
  target.destroy();
  return bytes;
}

function rectFromQuads(quads: mupdf.Quad[]): mupdf.Rect {
  const xValues = quads.flatMap((quad) => [quad[0], quad[2], quad[4], quad[6]]);
  const yValues = quads.flatMap((quad) => [quad[1], quad[3], quad[5], quad[7]]);
  return [Math.min(...xValues), Math.min(...yValues), Math.max(...xValues), Math.max(...yValues)];
}

function annotationMetadata(pageIndex: number, page: mupdf.PDFPage): AnnotationMetadata[] {
  const inversePageTransform = mupdf.Matrix.invert(page.getTransform());
  return page.getAnnotations().map((annotation, index) => {
    const quads = annotation.getQuadPoints();
    const pageRect = quads.length > 0 ? rectFromQuads(quads) : annotation.getRect();
    return {
      index,
      type: annotation.getType(),
      pageIndex,
      rect: mupdf.Rect.transform(pageRect, inversePageTransform),
      contents: annotation.getContents(),
      author: annotation.hasAuthor() ? annotation.getAuthor() : '',
      opacity: annotation.getOpacity(),
    };
  });
}

function flattenOutline(
  items: ReturnType<mupdf.Document['loadOutline']>,
  path: number[] = [],
  depth = 0,
): BookmarkMetadata[] {
  if (!items) return [];
  return items.flatMap((item, index) => {
    const itemPath = [...path, index];
    return [
      {
        path: itemPath,
        title: item.title || 'Untitled bookmark',
        page: typeof item.page === 'number' ? item.page : null,
        depth,
      },
      ...flattenOutline(item.down ?? null, itemPath, depth + 1),
    ];
  });
}

function snapshot(): EngineSnapshot {
  const doc = requireDocument();
  const pages = [];
  const annotations: AnnotationMetadata[] = [];
  const widgets: WidgetMetadata[] = [];
  for (let index = 0; index < doc.countPages(); index += 1) {
    const page = doc.loadPage(index);
    const bounds = page.getBounds();
    const pageAnnotations = annotationMetadata(index, page);
    annotations.push(...pageAnnotations);
    const pageObject = doc.findPage(index);
    const rotationObject = pageObject.getInheritable('Rotate');
    const rotation = rotationObject.isNumber() ? rotationObject.asNumber() : 0;
    const pageWidgets = page.getWidgets();
    widgets.push(...pageWidgets.map((widget, widgetIndex) => ({
      index: widgetIndex,
      pageIndex: index,
      fieldType: widget.getFieldType(),
      name: widget.getName(),
      label: widget.getLabel(),
      value: widget.getValue(),
      rect: widget.getRect(),
    })));
    pages.push({
      index,
      width: Math.abs(bounds[2] - bounds[0]),
      height: Math.abs(bounds[3] - bounds[1]),
      rotation: ((rotation % 360) + 360) % 360,
      annotationCount: pageAnnotations.length,
      widgetCount: pageWidgets.length,
    });
    page.destroy();
  }
  return {
    pageCount: doc.countPages(),
    pages,
    annotations,
    widgets,
    bookmarks: flattenOutline(doc.loadOutline()),
    canUndo: doc.canUndo(),
    canRedo: doc.canRedo(),
    hasClipboard: clipboardBytes !== null,
    dirty,
    wasm: true,
    capabilities: {
      nativeAnnotations: true,
      appliedRedaction: true,
      bookmarkEditing: true,
      signatureWidgetCreation: false,
    },
  };
}

function getOutlineIteratorAt(path: number[]) {
  const doc = requireDocument();
  const iterator = doc.outlineIterator();
  if (path.length === 0) return iterator;
  for (let depth = 0; depth < path.length; depth += 1) {
    const targetIndex = path[depth];
    for (let index = 0; index < targetIndex; index += 1) {
      if (iterator.next() < 0) throw new Error('Bookmark no longer exists.');
    }
    if (depth < path.length - 1 && iterator.down() < 0) {
      throw new Error('Bookmark no longer exists.');
    }
  }
  if (!iterator.item()) throw new Error('Bookmark no longer exists.');
  return iterator;
}

function bookmarkUri(page: number) {
  return `#page=${page + 1}`;
}

function transformPdfRect(page: mupdf.PDFPage, rect: [number, number, number, number]) {
  const normalized: mupdf.Rect = [
    Math.min(rect[0], rect[2]),
    Math.min(rect[1], rect[3]),
    Math.max(rect[0], rect[2]),
    Math.max(rect[1], rect[3]),
  ];
  return mupdf.Rect.transform(normalized, page.getTransform());
}

function transformPdfQuad(page: mupdf.PDFPage, quad: mupdf.Quad): mupdf.Quad {
  const [a, b, c, d, e, f] = page.getTransform();
  const transformPoint = (x: number, y: number): [number, number] => [x * a + y * c + e, x * b + y * d + f];
  const upperLeft = transformPoint(quad[0], quad[1]);
  const upperRight = transformPoint(quad[2], quad[3]);
  const lowerLeft = transformPoint(quad[4], quad[5]);
  const lowerRight = transformPoint(quad[6], quad[7]);
  return [...upperLeft, ...upperRight, ...lowerLeft, ...lowerRight];
}

async function handle(command: EngineCommand): Promise<EngineResult> {
  switch (command.type) {
    case 'open': {
      document?.destroy();
      document = openPdf(command.bytes, command.password);
      committedBytes = copyBytes(command.bytes);
      document.enableJournal();
      dirty = false;
      clipboardBytes = null;
      return { snapshot: snapshot() };
    }
    case 'reset':
      document?.destroy();
      document = null;
      committedBytes = null;
      clipboardBytes = null;
      dirty = false;
      return {};
    case 'snapshot':
      return { snapshot: snapshot() };
    case 'serialize':
      return { bytes: serialize(), snapshot: snapshot() };
    case 'commit': {
      const bytes = serialize();
      committedBytes = copyBytes(bytes);
      document?.destroy();
      document = openPdf(bytes);
      document.enableJournal();
      dirty = false;
      return { bytes, snapshot: snapshot() };
    }
    case 'cancel':
      if (!committedBytes) throw new Error('No committed document is available.');
      document?.destroy();
      document = openPdf(committedBytes);
      document.enableJournal();
      dirty = false;
      return { bytes: copyBytes(committedBytes), snapshot: snapshot() };
    case 'undo':
      if (requireDocument().canUndo()) requireDocument().undo();
      dirty = true;
      return { bytes: serialize(), snapshot: snapshot() };
    case 'redo':
      if (requireDocument().canRedo()) requireDocument().redo();
      dirty = true;
      return { bytes: serialize(), snapshot: snapshot() };
    case 'rotate':
      withOperation('Rotate pages', (doc) => {
        for (const pageIndex of normalizePageIndexes(command.pages, doc.countPages())) {
          const pageObject = doc.findPage(pageIndex);
          const inherited = pageObject.getInheritable('Rotate');
          const current = inherited.isNumber() ? inherited.asNumber() : 0;
          pageObject.put('Rotate', ((current + command.degrees) % 360 + 360) % 360);
        }
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'reorder':
      if (command.order.length !== requireDocument().countPages()) {
        throw new Error('A reorder operation must contain every page exactly once.');
      }
      withOperation('Reorder pages', (doc) => doc.rearrangePages(command.order));
      return { bytes: serialize(), snapshot: snapshot() };
    case 'move': {
      const count = requireDocument().countPages();
      if (command.page < 0 || command.page >= count || command.to < 0 || command.to >= count) {
        throw new Error('The requested page move is outside the document.');
      }
      const order = Array.from({ length: count }, (_, index) => index);
      const [moved] = order.splice(command.page, 1);
      order.splice(command.to, 0, moved);
      withOperation('Move page', (doc) => doc.rearrangePages(order));
      return { bytes: serialize(), snapshot: snapshot() };
    }
    case 'delete': {
      const doc = requireDocument();
      const pages = normalizePageIndexes(command.pages, doc.countPages());
      if (pages.length === 0) throw new Error('Select at least one page to delete.');
      if (pages.length === doc.countPages()) throw new Error('A PDF must keep at least one page.');
      withOperation('Delete pages', (target) => {
        for (const page of [...pages].sort((a, b) => b - a)) target.deletePage(page);
      });
      return { bytes: serialize(), snapshot: snapshot() };
    }
    case 'copy': {
      const doc = requireDocument();
      const pages = normalizePageIndexes(command.pages, doc.countPages());
      if (pages.length === 0) throw new Error('Select at least one page to copy.');
      clipboardBytes = buildSubset(doc, pages);
      return { copiedPages: pages.length, snapshot: snapshot() };
    }
    case 'paste': {
      if (!clipboardBytes) throw new Error('Copy one or more pages before pasting.');
      const source = openPdf(clipboardBytes);
      const insertAt = Math.max(-1, Math.min(command.after, requireDocument().countPages() - 1));
      withOperation('Paste pages', (doc) => {
        for (let index = 0; index < source.countPages(); index += 1) {
          doc.graftPage(insertAt + 1 + index, source, index);
        }
      });
      source.destroy();
      return { bytes: serialize(), snapshot: snapshot() };
    }
    case 'import': {
      const source = openPdf(command.bytes, command.password);
      const insertAt = Math.max(-1, Math.min(command.after, requireDocument().countPages() - 1));
      withOperation('Import document', (doc) => {
        for (let index = 0; index < source.countPages(); index += 1) {
          doc.graftPage(insertAt + 1 + index, source, index);
        }
      });
      source.destroy();
      return { bytes: serialize(), snapshot: snapshot() };
    }
    case 'extract': {
      const doc = requireDocument();
      const pages = normalizePageIndexes(command.pages, doc.countPages());
      if (pages.length === 0) throw new Error('Select at least one page to extract.');
      return { bytes: buildSubset(doc, pages), snapshot: snapshot() };
    }
    case 'keep': {
      const doc = requireDocument();
      const pages = normalizePageIndexes(command.pages, doc.countPages());
      if (pages.length === 0) throw new Error('Select at least one page to keep.');
      withOperation('Keep selected pages', (target) => target.rearrangePages(pages));
      return { bytes: serialize(), snapshot: snapshot() };
    }
    case 'addAnnotation':
      withOperation(`Add ${command.annotationType} annotation`, (doc) => {
        const page = doc.loadPage(command.page);
        const annotation = page.createAnnotation(command.annotationType);
        const transformedRect = transformPdfRect(page, command.pdfRect);
        if (command.annotationType === 'Highlight') {
          const quads: mupdf.Quad[] = [[
            transformedRect[0], transformedRect[1],
            transformedRect[2], transformedRect[1],
            transformedRect[0], transformedRect[3],
            transformedRect[2], transformedRect[3],
          ]];
          annotation.setQuadPoints(quads);
        } else {
          annotation.setRect(transformedRect);
        }
        annotation.setAuthor('Atlas PDF SDK');
        annotation.setContents(command.contents ?? '');
        if (command.annotationType === 'Highlight') annotation.setColor([1, 0.82, 0]);
        if (command.annotationType === 'Redact') annotation.setColor([0.73, 0.11, 0.11]);
        annotation.update();
        if (command.apply && command.annotationType === 'Redact') page.applyRedactions(true);
        page.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'addTextMatchAnnotation': {
      let matchCount = 0;
      withOperation(`Add text ${command.annotationType}`, (doc) => {
        const page = doc.loadPage(command.page);
        const matches = page.search(command.text);
        matchCount = matches.length;
        for (const match of matches) {
          const annotation = page.createAnnotation(command.annotationType);
          if (command.annotationType === 'Redact') annotation.setRect(rectFromQuads(match));
          annotation.setQuadPoints(match);
          annotation.setContents(`${command.annotationType}: ${command.text}`);
          annotation.setAuthor('Atlas PDF SDK');
          annotation.setColor(command.annotationType === 'Highlight' ? [1, 0.82, 0] : [0.73, 0.11, 0.11]);
          annotation.update();
        }
        if (command.apply && command.annotationType === 'Redact' && matches.length > 0) {
          page.applyRedactions(true);
        }
        page.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot(), matchCount };
    }
    case 'addQuadAnnotation':
      withOperation(`Add selected-text ${command.annotationType}`, (doc) => {
        const page = doc.loadPage(command.page);
        const annotation = page.createAnnotation(command.annotationType);
        const transformedQuads = command.pdfQuads.map((quad) => transformPdfQuad(page, quad));
        if (command.annotationType === 'Redact') annotation.setRect(rectFromQuads(transformedQuads));
        annotation.setQuadPoints(transformedQuads);
        annotation.setContents(command.contents ?? `${command.annotationType} from selected text`);
        annotation.setAuthor('Atlas PDF SDK');
        annotation.setColor(command.annotationType === 'Highlight' ? [1, 0.82, 0] : [0.73, 0.11, 0.11]);
        annotation.update();
        if (command.apply && command.annotationType === 'Redact') page.applyRedactions(true);
        page.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'updateAnnotation':
      withOperation('Update annotation', (doc) => {
        const page = doc.loadPage(command.page);
        const annotation = page.getAnnotations()[command.annotationIndex];
        if (!annotation) throw new Error('Annotation no longer exists.');
        if (typeof command.contents === 'string') annotation.setContents(command.contents);
        if (typeof command.opacity === 'number') annotation.setOpacity(command.opacity);
        if (command.rect) {
          if (annotation.getType() === 'Highlight') {
            annotation.setQuadPoints([[
              command.rect[0], command.rect[1],
              command.rect[2], command.rect[1],
              command.rect[0], command.rect[3],
              command.rect[2], command.rect[3],
            ]]);
          } else annotation.setRect(transformPdfRect(page, command.rect));
        }
        annotation.update();
        page.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'deleteAnnotation':
      withOperation('Delete annotation', (doc) => {
        const page = doc.loadPage(command.page);
        const annotation = page.getAnnotations()[command.annotationIndex];
        if (!annotation) throw new Error('Annotation no longer exists.');
        page.deleteAnnotation(annotation);
        page.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'applyRedactions':
      withOperation('Apply redactions', (doc) => {
        const page = doc.loadPage(command.page);
        page.applyRedactions(true);
        page.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'addBookmark':
      withOperation('Add bookmark', (doc) => {
        const iterator = doc.outlineIterator();
        while (iterator.item() && iterator.next() === mupdf.OutlineIterator.ITERATOR_AT_ITEM) {
          // Walk to the root-list insertion point.
        }
        iterator.insert({ title: command.title, uri: bookmarkUri(command.page), open: false });
        iterator.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'updateBookmark':
      withOperation('Update bookmark', () => {
        const iterator = getOutlineIteratorAt(command.path);
        const current = iterator.item();
        iterator.update({
          title: command.title,
          uri: bookmarkUri(command.page),
          open: current?.open ?? false,
        });
        iterator.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
    case 'deleteBookmark':
      withOperation('Delete bookmark', () => {
        const iterator = getOutlineIteratorAt(command.path);
        iterator.delete();
        iterator.destroy();
      });
      return { bytes: serialize(), snapshot: snapshot() };
  }
}

self.onmessage = async (event: MessageEvent<{ id: number; command: EngineCommand }>) => {
  const { id, command } = event.data;
  try {
    const result = await handle(command);
    self.postMessage({ id, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id, error: message });
  }
};
