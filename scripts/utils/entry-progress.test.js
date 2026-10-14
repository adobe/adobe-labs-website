/**
 * Shared entry progress math for the footer logo and the footer menu.
 */
import {
  ENTRY_END,
  ENTRY_START,
  entryProgress,
  entryShortfall,
} from './entry-progress.js';

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
 * Places `el` as a laid-out box. The bottom edge is what entry progress rises toward.
 *
 * @param {HTMLElement} el
 * @param {number} top
 * @param {number} height
 * @returns {void}
 */
function place(el, top, height) {
  el.getBoundingClientRect = () => ({ top, bottom: top + height, height });
}

/**
 * Element glued to the viewport bottom, which is the garage door's stuck position.
 *
 * @param {number} height
 * @param {number} viewportHeight
 * @returns {HTMLElement}
 */
function stuck(height, viewportHeight) {
  const el = sized(height);
  place(el, viewportHeight - height, height);
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
    const el = stuck(240, 800);

    expect(entryProgress(above(800), el, { viewportHeight: 800 })).toBe(ENTRY_START);
    expect(entryProgress(above(680), el, { viewportHeight: 800 })).toBe(-50);
    expect(entryProgress(above(560), el, { viewportHeight: 800 })).toBe(ENTRY_END);
  });

  it('clamps to -100–0 past either end', () => {
    const el = stuck(240, 800);

    expect(entryProgress(above(900), el, { viewportHeight: 800 })).toBe(ENTRY_START);
    expect(entryProgress(above(0), el, { viewportHeight: 800 })).toBe(ENTRY_END);
  });

  it('treats an unmeasured box as stuck to the viewport bottom', () => {
    const el = sized(240);

    expect(entryProgress(above(680), el, { viewportHeight: 800 })).toBe(-50);
  });

  it('stays covered on a tall viewport while the cover still overlaps the box', () => {
    const el = sized(450);
    place(el, 1200, 450);

    // Box bottom is 1650. The viewport floor (3440) must not count as revealed.
    expect(entryProgress(above(1400), el, { viewportHeight: 3440 })).toBeCloseTo(-44.44, 1);
    expect(entryProgress(above(1200), el, { viewportHeight: 3440 })).toBe(ENTRY_END);
  });

  it('keeps the viewport floor when the element is stuck there on a tall screen', () => {
    const el = stuck(450, 3440);

    expect(entryProgress(above(3440 - 225), el, { viewportHeight: 3440 })).toBe(-50);
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
    place(el, 560, 240);

    expect(entryProgress(above(680), el, { viewportHeight: 800, height: 240 })).toBe(-50);
  });
});

describe('entryShortfall', () => {
  it('is the distance from the cover to the stuck floor', () => {
    const el = stuck(240, 800);

    expect(entryShortfall(above(680), el, { viewportHeight: 800 })).toBe(120);
    expect(entryShortfall(above(560), el, { viewportHeight: 800 })).toBe(0);
  });

  it('stops at the element box when a tall viewport continues below it', () => {
    const el = sized(450);
    place(el, 1200, 450);

    expect(entryShortfall(above(1400), el, { viewportHeight: 3440 })).toBe(200);
  });
});
