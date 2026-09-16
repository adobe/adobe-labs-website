/**
 * Which sections cover which, and the geometry that follows from it.
 *
 * Pure predicates and numbers only — no GSAP, no DOM writes. `section-scroll.js`
 * uses these to classify pairs; `motion.js` uses them to place tweens.
 */

/** Outgoing section: the one being covered. */
export const CLASS_SLOW = 'section-scroll-slow';

/** Incoming section: the one doing the covering. */
export const CLASS_NEXT = 'section-scroll-next';

/** Outgoing section that stays in flow instead of pinning. */
export const CLASS_INTRO = 'section-scroll-intro';

/** Page-header wrapper inside an intro section. */
export const CLASS_FADE = 'section-scroll-fade';

/** Inner travel after the pin, as a fraction of the viewport. */
export const SHIFT_VH = 0.2;

/** Viewport fraction where the incoming section starts the pin, lag, and dim. */
export const COVER_START_VH = 0.7;

/** Viewport fraction before the pin used to ease into the slowed parallax. */
export const COVER_EASE_VH = 0.2;

/** Peak overlay opacity when the next section has covered the previous. */
export const OVERLAY_DIM = 0.8;

/** Share of overlap scroll held back on intro sections (page header / default hero). */
export const INTRO_LAG = 0.2;

/** Viewport fraction over which the page-header wrapper fades out. */
export const HEADER_FADE_VH = 0.17;

/** Longer fade on small screens, where the stacked page header is taller. */
export const HEADER_FADE_VH_SMALL = 0.4;

/** Share of page scroll applied to full-screen hero headline and CTA. */
export const HERO_TEXT_SPEED = 0.5;

/** Viewport query for a stacked page header (`< 48rem`). */
const SMALL_MQ = '(width < 48rem)';

/** Touch phones/tablets: skip Lenis; intro lag is CSS on the compositor. */
const TOUCH_MQ = '(hover: none) and (pointer: coarse)';

/**
 * @param {Element | null} el
 * @returns {boolean}
 */
export function isRounded(el) {
  return typeof el?.className === 'string' && el.className.includes('section-rounded-');
}

/**
 * @param {Element | null} el
 * @returns {boolean}
 */
export function isFullScreenHero(el) {
  return Boolean(el?.classList.contains('hero-container') && el.querySelector('.hero-full-screen'));
}

/**
 * Page header or default hero: stays in flow rather than pinning, so its
 * content keeps scrolling (just slower) while the first card covers it.
 *
 * @param {Element | null} el
 * @returns {boolean}
 */
export function staysInFlow(el) {
  return Boolean(el && !isRounded(el) && !isFullScreenHero(el));
}

/**
 * Adjacent `section-rounded-default` siblings read as one card, so neither
 * covers the other.
 *
 * @param {Element} previous
 * @param {Element} next
 * @returns {boolean}
 */
export function coversPrevious(previous, next) {
  if (!isRounded(next)) return false;
  return !(previous.classList.contains('section-rounded-default')
    && next.classList.contains('section-rounded-default'));
}

/**
 * Page-header fade distance as a fraction of the viewport.
 *
 * @returns {number}
 */
export function headerFadeVh() {
  return window.matchMedia(SMALL_MQ).matches ? HEADER_FADE_VH_SMALL : HEADER_FADE_VH;
}

/**
 * True on phones and most tablets, where native scroll and a JS translate on
 * the same hero fight each other (visible jitter on iOS).
 *
 * @returns {boolean}
 */
export function usesTouchScroll() {
  return window.matchMedia?.(TOUCH_MQ)?.matches === true;
}

/**
 * Inner-lag endpoints for a rounded card, in px.
 *
 * @param {number} vh
 * @returns {{ prePinLag: number, postPinEnd: number }}
 */
export function roundedParallax(vh) {
  if (vh <= 0) return { prePinLag: 0, postPinEnd: 0 };
  const prePinLag = (1 - SHIFT_VH / COVER_START_VH) * vh * COVER_EASE_VH * 0.5;
  return { prePinLag, postPinEnd: prePinLag - SHIFT_VH * vh };
}

/**
 * Overlap distance held back on an intro section, in px.
 *
 * @param {HTMLElement} section
 * @returns {number}
 */
export function introLagPx(section) {
  return Math.min(section.offsetHeight, window.innerHeight) * INTRO_LAG;
}

/**
 * Sticky offset that parks a rounded card at the cover line. A full-screen hero
 * pins at the top instead, so it is never pulled under the nav.
 *
 * @param {HTMLElement} section
 * @returns {number}
 */
export function pinTopPx(section) {
  if (isFullScreenHero(section)) return 0;
  return window.innerHeight * COVER_START_VH - section.offsetHeight;
}
