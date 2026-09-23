/**
 * Which sections cover which, and the geometry that follows from it.
 *
 * Pure predicates and numbers only — no GSAP, no DOM writes. `init.js`
 * uses these to classify pairs; `section-motion.js` uses them to place tweens.
 */

/** Outgoing section: the one being covered. */
export const CLASS_SLOW = 'section-scroll-slow';

/** Incoming section: the one doing the covering. */
export const CLASS_NEXT = 'section-scroll-next';

/** Outgoing section that stays in flow instead of pinning. */
export const CLASS_INTRO = 'section-scroll-intro';

/** Page-header wrapper inside an intro section. */
export const CLASS_FADE = 'section-scroll-fade';

/** Dim layer on the outgoing card. */
export const CLASS_OVERLAY = 'section-scroll-overlay';

/**
 * `main` carries this while touch fades run as scroll-driven CSS, so the
 * stylesheet and the GSAP path never both own opacity.
 */
export const CLASS_CSS_COVER = 'section-scroll-css-cover';

/**
 * Feature query for the touch fade path. `animation-range` is part of the
 * check so a browser with a partial implementation does not match. Keep this
 * in sync with the `@supports` block in `styles/section-scroll.css`.
 */
export const CSS_COVER_SUPPORT = '(animation-timeline: view()) and (animation-range: entry) and (animation-timeline: scroll()) and (animation-range: 0% 100%)';

/** Inner travel after the pin, as a fraction of the viewport. */
export const SHIFT_VH = 0.2;

/** Viewport fraction where the incoming section starts the pin, lag, and dim. */
export const COVER_START_VH = 0.6;

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
 * True when the section carries a `section-rounded-*` surface class.
 *
 * @param {Element | null} el Section to test
 * @returns {boolean}
 */
export function isRounded(el) {
  return typeof el?.className === 'string' && el.className.includes('section-rounded-');
}

/**
 * True when the section contains a full-screen hero.
 *
 * @param {Element | null} el Section to test
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
 * True when a coarse pointer can run the cover dim and header fade as
 * scroll-driven CSS, so the page does not need GSAP for those opacities.
 *
 * @returns {boolean}
 */
export function usesCssCover() {
  return usesTouchScroll() && window.CSS?.supports?.(CSS_COVER_SUPPORT) === true;
}

/**
 * Inner recede of a pinned rounded card, in px. Negative: content moves up as
 * the next card covers it. Starts from 0 so the cover never reverses.
 *
 * @param {number} vh
 * @returns {number}
 */
export function roundedParallax(vh) {
  return vh > 0 ? -SHIFT_VH * vh : 0;
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
 * Viewport Y where the incoming section starts dimming `section`.
 * Intro sections start when the next section reaches their bottom. Rounded
 * cards and full-screen heroes start at `COVER_START_VH`.
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {number}
 */
export function coverStartPx(section) {
  if (staysInFlow(section)) {
    return Math.min(section.offsetHeight, window.innerHeight);
  }
  return window.innerHeight * COVER_START_VH;
}

/**
 * View-timeline `entry` percentage where `section` starts to dim.
 * `entry 0%` is the incoming section's top at the bottom of the viewport, and
 * `entry 100%` is that top at the viewport top. The cover line sits between them.
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {string}
 */
export function dimEntryStart(section) {
  const vh = window.innerHeight;
  if (!vh) return '0%';
  const entry = (1 - coverStartPx(section) / vh) * 100;
  const clamped = Math.min(100, Math.max(0, entry));
  const rounded = Math.round(clamped * 1000) / 1000;
  return `${rounded}%`;
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
