/**
 * Shared entry progress math for the footer logo and the footer menu.
 */
import { ENTRY_END, ENTRY_START, entryProgress } from './entry-progress.js';

/**
 * @param {number} height
 * @returns {HTMLElement}
 */
function sized(height) {
  const el = document.createElement('div');
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height });
  return el;
}

/**
 * @param {number} bottom
 * @returns {HTMLElement}
 */
function above(bottom) {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({ bottom });
  return el;
}

describe('entryProgress', () => {
  it('runs from fully covered to fully entered over the element height', () => {
    const el = sized(240);

    expect(entryProgress(above(800), el, { viewportHeight: 800 })).toBe(ENTRY_START);
    expect(entryProgress(above(680), el, { viewportHeight: 800 })).toBe(-50);
    expect(entryProgress(above(560), el, { viewportHeight: 800 })).toBe(ENTRY_END);
  });

  it('clamps to -100–0 past either end', () => {
    const el = sized(240);

    expect(entryProgress(above(900), el, { viewportHeight: 800 })).toBe(ENTRY_START);
    expect(entryProgress(above(0), el, { viewportHeight: 800 })).toBe(ENTRY_END);
  });

  it('stays covered when either element is missing', () => {
    expect(entryProgress(null, sized(240))).toBe(ENTRY_START);
    expect(entryProgress(above(0), null)).toBe(ENTRY_START);
  });

  it('stays covered when the element has no height yet', () => {
    expect(entryProgress(above(0), sized(0), { viewportHeight: 800 })).toBe(ENTRY_START);
  });

  it('uses a cached height instead of measuring', () => {
    const el = sized(0);

    expect(entryProgress(above(680), el, { viewportHeight: 800, height: 240 })).toBe(-50);
  });
});
