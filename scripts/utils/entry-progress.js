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
 * True while `footer-reveal.js` is writing both entry custom properties.
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
 * Entry progress in -100–0: `ENTRY_START` while `previous` still covers `el`,
 * `ENTRY_END` once it has lifted by the element's own height.
 *
 * @param {Element | null} previous Element covering `el`
 * @param {Element | null} el Element rising into view
 * @param {object} [options]
 * @param {number} [options.viewportHeight=window.innerHeight]
 * @param {number} [options.height] `el` height in px; measured when omitted or 0
 * @returns {number}
 */
export function entryProgress(previous, el, options = {}) {
  const { viewportHeight = window.innerHeight, height } = options;
  if (!(previous instanceof HTMLElement) || !(el instanceof HTMLElement)) return ENTRY_START;
  const size = height || el.offsetHeight;
  if (!size) return ENTRY_START;
  const bottom = previous.getBoundingClientRect().bottom ?? 0;
  const progress = ((viewportHeight - bottom) / size) * 100 - 100;
  return Math.max(ENTRY_START, Math.min(ENTRY_END, progress));
}
