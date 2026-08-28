import * as mupdf from 'mupdf';

const source = new mupdf.PDFDocument();
const pageObject = source.addPage([0, 0, 612, 792], 0, {}, 'q Q');
source.insertPage(-1, pageObject);
source.enableJournal();

source.beginOperation('Annotate');
const page = source.loadPage(0);
const note = page.createAnnotation('Text');
note.setRect([72, 72, 108, 108]);
note.setContents('MuPDF worker spike');
note.update();
const highlight = page.createAnnotation('Highlight');
highlight.setQuadPoints([[72, 126, 240, 126, 72, 144, 240, 144]]);
highlight.setContents('Selected-text quad spike');
highlight.update();
source.endOperation();

source.beginOperation('Add bookmark');
const outline = source.outlineIterator();
outline.insert({ title: 'First page', uri: '#page=1', open: false });
outline.destroy();
source.endOperation();

source.beginOperation('Rotate page');
source.findPage(0).put('Rotate', 90);
source.endOperation();

const output = source.saveToBuffer('garbage=compact,compress=yes').asUint8Array();
const reopened = new mupdf.PDFDocument(output);
const annotations = reopened.loadPage(0).getAnnotations();

console.log(JSON.stringify({
  wasm: true,
  pageCount: reopened.countPages(),
  annotationTypes: annotations.map((annotation) => annotation.getType()),
  rotation: reopened.findPage(0).getInheritable('Rotate').asNumber(),
  outline: reopened.loadOutline(),
  canUndo: source.canUndo(),
  byteLength: output.byteLength,
}));
