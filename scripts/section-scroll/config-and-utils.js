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

/**
 * Following section, when the outgoing card pins flush to the top. It needs
 * another radius of overlap so the outgoing card's rounded bottom does not
 * reveal the page background.
 */
export const CLASS_SEAM = 'section-scroll-seam';

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
 * in sync with the `@supports` block in `styles/features/section-scroll.css`.
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

/**
 * Full-screen hero text offset, set on the hero section. A variable rather than
 * a transform on each element, so anything added beside the copy after binding
 * (such as the CR pin) recedes with it.
 */
export const VAR_HERO_TEXT_Y = '--section-scroll-hero-text-y';

/** Viewport query for a stacked page header (`< 48rem`). */
const SMALL_MQ = '(width < 48rem)';

/** Footer columns stack below this width. Matches `blocks/footer/footer.css`. */
export const FOOTER_STACKED_MQ = '(width < 64rem)';

/**
 * A stacked footer is fully uncovered once its top reaches this share of the
 * viewport. Desktop keeps using the menu's own height.
 */
export const FOOTER_UNCOVER_VH = 0.5;

/** Touch phones/tablets: skip Lenis; intro lag is CSS on the compositor where supported. */
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
 * True when a page header and a default hero share the section.
 * Index pages such as Sneaks and Playground author them together.
 *
 * @param {Element | null} el Section to test
 * @returns {boolean}
 */
export function isHeaderHeroSection(el) {
  return Boolean(el?.querySelector('.page-header') && el.querySelector('.hero'));
}

/**
 * Adjacent `section-rounded-default` siblings read as one card, so neither
 * covers the other. A plain section after a shared page header and hero does
 * not cover that hero; the header still sticks under the hero on its own.
 *
 * @param {Element} previous
 * @param {Element | undefined} next
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
 * Where along the cover (0–1) the outgoing card actually pins.
 * The next card overlaps the previous one, so the cover line arrives while
 * that card is still in flow. `0` when the cards do not overlap.
 *
 * @param {number} overlapPx How far the next section starts above the previous bottom
 * @param {number} coverPx Scroll from the cover line to the top of the viewport
 * @returns {number}
 */
export function coverPinProgress(overlapPx, coverPx) {
  if (!coverPx || overlapPx <= 0) return 0;
  return Math.min(1, overlapPx / coverPx);
}

/**
 * Linear progress that stays at rest until `at`, then catches up by the end.
 * Holds a rounded card's content still through the overlap before the pin.
 *
 * @param {number} progress
 * @param {number} at
 * @returns {number}
 */
export function holdThenLinear(progress, at) {
  if (at <= 0) return progress;
  if (progress <= at || at >= 1) return 0;
  return (progress - at) / (1 - at);
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
 * Gap between an intro section and the section after it, in px. On touch the
 * intro holds still for this much scroll so the incoming card meets it sooner.
 *
 * @param {HTMLElement} section
 * @returns {number}
 */
export function introHoldPx(section) {
  const next = section.nextElementSibling;
  if (!(next instanceof HTMLElement)) return 0;
  return Math.max(0, next.offsetTop - section.offsetTop - section.offsetHeight);
}

/**
 * Ease for an intro lag that holds still for `hold` px of scroll, then lags
 * `lag` px over the rest of `span`. Linear when there is no hold.
 *
 * @param {number} progress
 * @param {{ hold: number, lag: number, span: number }} geometry
 * @returns {number}
 */
export function introHoldEase(progress, { hold, lag, span }) {
  const held = Math.min(hold, span);
  const total = held + lag;
  if (held <= 0 || total <= 0) return progress;
  const at = held / span;
  const px = progress < at ? progress * span : held + lag * holdThenLinear(progress, at);
  return px / total;
}

/**
 * Cover line for a rounded card, in px. `COVER_START_VH` of the viewport,
 * unless the card is shorter than that line. A short card meets the next
 * section at its own bottom, so the pin can sit at the top of a tall viewport
 * instead of floating below it. A zero height has not laid out; keep the
 * viewport line.
 *
 * @param {HTMLElement} section Rounded outgoing section
 * @returns {number}
 */
function roundedCoverLine(section) {
  const line = window.innerHeight * COVER_START_VH;
  const height = section.offsetHeight;
  if (height > 0 && height < line) return height;
  return line;
}

/**
 * Viewport Y where the incoming section starts dimming `section`.
 * Intro sections start when the next section reaches their bottom. Rounded
 * cards and full-screen heroes start at `COVER_START_VH`, and a rounded card
 * shorter than that line starts at its own bottom.
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {number}
 */
export function coverStartPx(section) {
  if (staysInFlow(section)) {
    return Math.min(section.offsetHeight, window.innerHeight);
  }
  if (isRounded(section)) return roundedCoverLine(section);
  return window.innerHeight * COVER_START_VH;
}

/**
 * View-timeline `cover` offsets, in px, over which `next` dims `section`.
 * `cover 0` is the incoming section's top at the bottom of the viewport, so
 * the end, one viewport later, is that top at the viewport top. Lengths rather
 * than `entry` percentages: `entry` ends once a section shorter than the
 * viewport is fully in view, long before its top reaches the top. Like GSAP's
 * `clamp()`, the start is never before scroll 0, so a card that loads above
 * the cover line does not open dimmed.
 *
 * @param {HTMLElement} section Outgoing section
 * @param {HTMLElement} next Incoming section
 * @returns {{ start: string, end: string }}
 */
export function dimCoverRange(section, next) {
  const vh = window.innerHeight;
  const nextTop = next.getBoundingClientRect().top + window.scrollY;
  const start = Math.max(vh - coverStartPx(section), vh - nextTop);
  return {
    start: `${Math.round(Math.min(vh, Math.max(0, start)))}px`,
    end: `${Math.round(vh)}px`,
  };
}

/**
 * True when a rounded card pins flush to the top of the viewport. It is
 * shorter than the cover line, so it no longer sits down over the next card.
 * The next card has to overlap by another radius or the rounded bottom lets
 * the page background show through.
 *
 * @param {HTMLElement} section
 * @returns {boolean}
 */
export function pinsFlush(section) {
  if (!isRounded(section)) return false;
  const height = section.offsetHeight;
  const line = window.innerHeight * COVER_START_VH;
  return height > 0 && height < line;
}

/**
 * Sticky offset that parks a rounded card at the cover line. Never positive:
 * a card shorter than the line pins at the top of the viewport, so a tall
 * viewport does not leave a gap above the parallax. A full-screen hero pins
 * at the top instead, so it is never pulled under the nav. A zero height has
 * not laid out; keep the viewport line.
 *
 * @param {HTMLElement} section
 * @returns {number}
 */
export function pinTopPx(section) {
  if (isFullScreenHero(section)) return 0;
  const height = section.offsetHeight;
  const line = window.innerHeight * COVER_START_VH;
  if (!(height > 0)) return line;
  return Math.min(0, coverStartPx(section) - height);
}

/**
 * Scroll distance for the footer garage door, in px.
 * Desktop uses the menu height. A stacked menu never runs longer than
 * `FOOTER_UNCOVER_VH` of the viewport, so a tall column is clear once its top
 * reaches mid-screen. A menu shorter than that still clears on its own height.
 *
 * @param {number} innerHeight `.footer__inner` height
 * @param {number} viewportHeight
 * @param {boolean} stacked True below `FOOTER_STACKED_MQ`
 * @returns {number}
 */
export function footerCoverDistance(innerHeight, viewportHeight, stacked) {
  if (!innerHeight) return 0;
  if (!stacked || !viewportHeight) return innerHeight;
  return Math.min(innerHeight, FOOTER_UNCOVER_VH * viewportHeight);
}

/**
 * True while the footer still starts at or below the fold, so the last card
 * can slide over it. A viewport taller than the content above the footer
 * shows the footer immediately, and the rise stays off. An unmeasured
 * footer (document top still 0) stays eligible until layout.
 *
 * @param {HTMLElement} footerEl `body > footer`
 * @param {number} [viewportHeight=window.innerHeight]
 * @returns {boolean}
 */
export function footerCoverFits(footerEl, viewportHeight = window.innerHeight) {
  if (!(viewportHeight > 0)) return true;
  const top = footerEl.getBoundingClientRect().top + (window.scrollY || 0);
  if (!(top > 0)) return true;
  return top >= viewportHeight;
}
