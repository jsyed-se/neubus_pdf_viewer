import { describe, expect, it } from 'vitest';
import { calculateScale, pagesForMode } from '../lib/viewMath';

describe('calculateScale', () => {
  const base = {
    customScale: 1,
    viewportWidth: 1_000,
    viewportHeight: 800,
    pageWidth: 600,
    pageHeight: 800,
    mountedPageCount: 1,
    pageGap: 24,
  };

  it('uses the actual available width for fit-to-width', () => {
    expect(calculateScale({ ...base, zoomMode: 'fit-width' })).toBeCloseTo(1_000 / 600);
  });

  it('uses both page dimensions for fit-to-viewport', () => {
    expect(calculateScale({ ...base, zoomMode: 'fit-viewport' })).toBeCloseTo(1);
  });

  it('fits both mounted pages and their gap in spread fit-to-width', () => {
    const single = calculateScale({ ...base, zoomMode: 'fit-viewport' });
    const spread = calculateScale({ ...base, zoomMode: 'fit-width', mountedPageCount: 2 });
    expect(spread).toBeLessThan(single);
    expect(spread).toBeCloseTo((1_000 - 24) / 1_200);
  });

  it('uses the already measured workspace with no rail or panel deductions', () => {
    const reducedWorkspace = calculateScale({
      ...base,
      zoomMode: 'fit-width',
      viewportWidth: 690,
    });
    expect(reducedWorkspace).toBeCloseTo(690 / 600);
  });
});

describe('pagesForMode', () => {
  it('keeps the cover alone and pairs later pages', () => {
    expect(pagesForMode('spread', 1, 7)).toEqual([1]);
    expect(pagesForMode('spread', 2, 7)).toEqual([2, 3]);
    expect(pagesForMode('spread', 3, 7)).toEqual([2, 3]);
    expect(pagesForMode('spread', 7, 7)).toEqual([6, 7]);
  });

  it('returns every page in continuous mode', () => {
    expect(pagesForMode('continuous', 1, 4)).toEqual([1, 2, 3, 4]);
  });
});
