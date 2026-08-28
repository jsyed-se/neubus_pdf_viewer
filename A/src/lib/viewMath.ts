import type { ViewMode, ZoomMode } from '../sdk/types';

export function calculateScale({
  zoomMode,
  customScale,
  viewportWidth,
  viewportHeight,
  pageWidth,
  pageHeight,
  mountedPageCount,
  pageGap,
}: {
  zoomMode: ZoomMode;
  customScale: number;
  viewportWidth: number;
  viewportHeight: number;
  pageWidth: number;
  pageHeight: number;
  mountedPageCount: number;
  pageGap: number;
}) {
  const pageSlots = Math.max(1, mountedPageCount);
  const pagesWidth = pageWidth * pageSlots;
  const gapsWidth = pageGap * Math.max(0, pageSlots - 1);
  const availableWidth = Math.max(1, viewportWidth - gapsWidth);
  const availableHeight = Math.max(1, viewportHeight);
  if (zoomMode === 'fit-width') return Math.max(0.1, availableWidth / pagesWidth);
  if (zoomMode === 'fit-viewport') {
    return Math.max(0.1, Math.min(availableWidth / pagesWidth, availableHeight / pageHeight));
  }
  return Math.max(0.2, Math.min(customScale, 5));
}

export function pagesForMode(viewMode: ViewMode, currentPage: number, pageCount: number) {
  if (pageCount <= 0) return [];
  if (viewMode === 'continuous') return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (viewMode === 'single' || currentPage === 1) return [Math.max(1, Math.min(currentPage, pageCount))];
  const start = currentPage % 2 === 0 ? currentPage : currentPage - 1;
  return [start, start + 1].filter((page) => page >= 1 && page <= pageCount);
}
