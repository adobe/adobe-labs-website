/**
 * Scroll-linked entry progress for elements that rise into view from behind the
 * element stacked above them: the footer Adobe logo, and the footer menu while
 * the last rounded card garage-doors it.
 */

/** Element is still fully covered. */
export const ENTRY_START = -100;

/** Element has fully risen into view. */
export const ENTRY_END = 0;

/**
 * True while section scroll is writing both entry custom properties.
 * The footer's own logo listener then skips its layout read.
 */
let logoHeld = false;

/**
 * Hands the logo rise to section scroll, or gives it back to `footer.js`.
 *
 * @param {boolean} held
 * @returns {void}
 */
export function holdLogoEntry(held) {
  logoHeld = held;
}

/**
 * Whether section scroll currently owns the logo rise.
 *
 * @returns {boolean}
 */
export function logoEntryHeld() {
  return logoHeld;
}

/**
 * Bottom edge the cover rises toward. A stuck element sits on the viewport
 * floor, so that floor is the line. An element still in flow on a tall screen
 * ends higher up, and the empty viewport below it must not count as revealed.
 * A box with no edges yet (jsdom, or not laid out) is treated as stuck.
 *
 * @param {HTMLElement} el
 * @param {number} viewportHeight
 * @returns {number}
 */
function stickLine(el, viewportHeight) {
  const { top, bottom } = el.getBoundingClientRect();
  const laidOut = typeof top === 'number' && typeof bottom === 'number' && (top !== 0 || bottom !== 0);
  return Math.min(viewportHeight, laidOut ? bottom : viewportHeight);
}

/**
 * Shared cover measurement for progress and the keyboard scroll distance.
 *
 * @param {Element | null} previous
 * @param {Element | null} el
 * @param {object} options
 * @param {number} [options.viewportHeight]
 * @param {number} [options.height]
 * @returns {{ size: number, coverBottom: number, line: number } | null}
 */
function measureEntry(previous, el, options) {
  const { viewportHeight = window.innerHeight, height } = options;
  if (!(previous instanceof HTMLElement) || !(el instanceof HTMLElement)) return null;
  const size = height || el.offsetHeight;
  if (!size) return null;
  return {
    size,
    coverBottom: previous.getBoundingClientRect().bottom ?? 0,
    line: stickLine(el, viewportHeight),
  };
}

/**
 * Entry progress in -100–0: `ENTRY_START` while `previous` still covers `el`,
 * `ENTRY_END` once it has lifted by the element's own height.
 *
 * While `el` is stuck to the viewport bottom this matches the viewport floor.
 * While `el` sits higher, progress reaches `ENTRY_END` only when the cover
 * has cleared `el`'s own box.
 *
 * @param {Element | null} previous Element covering `el`
 * @param {Element | null} el Element rising into view
 * @param {object} [options]
 * @param {number} [options.viewportHeight=window.innerHeight]
 * @param {number} [options.height] `el` height in px; measured when omitted or 0
 * @returns {number}
 */
export function entryProgress(previous, el, options = {}) {
  const measured = measureEntry(previous, el, options);
  if (!measured) return ENTRY_START;
  const { size, coverBottom, line } = measured;
  const progress = ((line - coverBottom) / size) * 100 - 100;
  return Math.max(ENTRY_START, Math.min(ENTRY_END, progress));
}

/**
 * Pixels `previous` must still rise before `el` counts as fully entered.
 * Zero once the cover has cleared the stick line. Missing elements report
 * zero so a keyboard jump does not scroll.
 *
 * @param {Element | null} previous Element covering `el`
 * @param {Element | null} el Element rising into view
 * @param {object} [options]
 * @param {number} [options.viewportHeight=window.innerHeight]
 * @param {number} [options.height] `el` height in px; measured when omitted or 0
 * @returns {number}
 */
export function entryShortfall(previous, el, options = {}) {
  const measured = measureEntry(previous, el, options);
  if (!measured) return 0;
  const { size, coverBottom, line } = measured;
  return Math.max(0, coverBottom - (line - size));
}
