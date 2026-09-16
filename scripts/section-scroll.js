/**
 * Slows the previous section when a rounded section covers it.
 *
 * Motion is opt-in: classes, Lenis, and CSS load only when
 * `prefers-reduced-motion: no-preference` matches. Rounded cards pin and lag
 * as the next card covers them. A page header or default hero does not pin:
 * its content keeps moving, just slower, while the first rounded section
 * overlaps it. A full-screen hero pins; its headline and CTA recede at half
 * scroll speed. Adjacent `section-rounded-default` siblings stay one card and
 * are skipped. A dark overlay fades in and blurs when that overlap starts
 * and reaches full strength as the incoming section covers it.
 */
import { loadCSS } from './aem.js';
import { debounce } from './utils/utils.js';

const MOTION_MQ = '(prefers-reduced-motion: no-preference)';
const CLASS_SLOW = 'section-scroll-slow';
const CLASS_NEXT = 'section-scroll-next';
const CLASS_INTRO = 'section-scroll-intro';
const SCROLL_CLASSES = [CLASS_SLOW, CLASS_NEXT, CLASS_INTRO];

/** Inner travel once the next section is past the cover line, as a fraction of the viewport. */
const SHIFT_VH = 0.2;

/**
 * Viewport fraction where an incoming rounded section starts the pin, lag,
 * and dim. Higher starts sooner (the card is still lower on screen).
 */
export const COVER_START_VH = 0.7;

/**
 * Viewport fraction before the pin used to ease into the slowed parallax.
 */
export const COVER_EASE_VH = 0.2;

/** Peak overlay opacity when the next section has covered the previous. */
const OVERLAY_DIM = 0.8;

/** Share of overlap scroll to hold back on intro sections (page header / default hero). */
export const INTRO_LAG = 0.2;

/** Share of page scroll applied to full-screen hero headline and CTA (half speed). */
export const HERO_TEXT_SPEED = 0.5;

/** @type {MediaQueryList | null} */
let motionMq = null;

/** @type {boolean} */
let started = false;

/** @type {(() => void) | null} */
let onResize = null;

/** @type {{
 *   on: (event: string, handler: () => void) => void,
 *   off: (event: string, handler: () => void) => void,
 *   resize: () => void,
 *   destroy: () => void,
 * } | null} */
let lenis = null;

/** @type {Array<{
 *   slow: HTMLElement,
 *   next: HTMLElement,
 *   intro: boolean,
 *   introHeight: number,
 *   overlayStart: number,
 * }>} */
let pairs = [];

/**
 * Whether a node is a rounded Labs section.
 *
 * @param {Element | null} el
 * @returns {boolean}
 */
function isRounded(el) {
  if (!el?.classList) return false;
  return [...el.classList].some((name) => name.startsWith('section-rounded-'));
}

/**
 * Full-screen hero in its own first section — already tucked under the nav.
 *
 * @param {Element | null} el
 * @returns {boolean}
 */
function isFullScreenHero(el) {
  return Boolean(el?.classList.contains('hero-container')
    && el.querySelector('.hero-full-screen'));
}

/**
 * Page header or default hero — slow in flow, do not pin.
 *
 * @param {Element | null} el
 * @returns {boolean}
 */
function isIntroSection(el) {
  return Boolean(el && !isRounded(el) && !isFullScreenHero(el));
}

/**
 * Overlay whenever a rounded section follows another section. Adjacent
 * default cards stay one surface and are skipped.
 *
 * @param {Element} previous
 * @param {Element} next
 * @returns {boolean}
 */
function shouldSlow(previous, next) {
  if (!isRounded(next)) return false;
  return !(isRounded(previous)
    && previous.classList.contains('section-rounded-default')
    && next.classList.contains('section-rounded-default'));
}

/**
 * Y position, in px, where an incoming rounded section starts the transition.
 *
 * @returns {number}
 */
function coverStartY() {
  return window.innerHeight * COVER_START_VH;
}

/**
 * Sticky `top` so the section keeps scrolling until the next section's
 * top sits at COVER_START_VH, then pins while the next section covers it.
 *
 * @param {HTMLElement} el
 * @returns {void}
 */
function setSlowTop(el) {
  const top = isFullScreenHero(el)
    ? 0
    : coverStartY() - el.offsetHeight;
  el.style.setProperty('--section-scroll-slow-top', `${top}px`);
}

/**
 * Clamps a 0–1 progress value.
 *
 * @param {number} value
 * @returns {number}
 */
function clampProgress(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Inner parallax for a rounded card: ease in before the pin so scrolling
 * does not snap from full speed to the slowed rate, then continue after pin.
 *
 * @param {HTMLElement} next
 * @returns {number} translateY in px
 */
function roundedShift(next) {
  const vh = window.innerHeight;
  if (vh <= 0) return 0;
  const pinY = coverStartY();
  const easeY = Math.min(vh, vh * (COVER_START_VH + COVER_EASE_VH));
  const { top } = next.getBoundingClientRect();
  const postPinSpeed = COVER_START_VH > 0 ? SHIFT_VH / COVER_START_VH : 0;
  const easeSpan = easeY - pinY;
  const prePinLag = easeSpan > 0 ? (1 - postPinSpeed) * easeSpan * 0.5 : 0;

  if (top >= easeY) return 0;
  if (top >= pinY) {
    const u = clampProgress((easeY - top) / easeSpan);
    return prePinLag * u * u;
  }
  const t = clampProgress((pinY - top) / pinY);
  return prePinLag - SHIFT_VH * t * vh;
}

/**
 * Overlay progress from 0 (incoming section starts overlapping) to 1
 * (incoming section has reached the top of the viewport).
 *
 * @param {HTMLElement} next
 * @param {number} overlayStart Incoming top, in px, where overlap begins
 * @returns {number}
 */
function overlayProgress(next, overlayStart) {
  if (overlayStart <= 0) return 0;
  const { top } = next.getBoundingClientRect();
  return clampProgress((overlayStart - top) / overlayStart);
}

/**
 * Viewport Y where dim begins. Caps at the incoming section's rest top so a
 * short full-screen hero (60lvh on small screens) is not already dimmed.
 *
 * @param {HTMLElement} next
 * @param {boolean} intro
 * @param {number} introHeight
 * @returns {number}
 */
function overlayStartY(next, intro, introHeight) {
  if (intro) return Math.min(introHeight, window.innerHeight);
  const restTop = next.getBoundingClientRect().top + window.scrollY;
  if (restTop > 0) return Math.min(coverStartY(), restTop);
  return coverStartY();
}

/**
 * Pixel lag so intro content recedes slower while the first rounded
 * section covers it. Span is the overlap in view (intro height, capped
 * at the viewport).
 *
 * @param {HTMLElement} next
 * @param {number} introHeight
 * @returns {number}
 */
function introShift(next, introHeight) {
  const span = Math.min(introHeight, window.innerHeight);
  if (span <= 0) return 0;
  const { top } = next.getBoundingClientRect();
  const t = clampProgress((span - top) / span);
  return t * span * INTRO_LAG;
}

/**
 * Pixel offset so full-screen hero headline and CTA recede at half
 * the page scroll speed while the pinned hero stays put.
 *
 * @returns {number} translateY in px (negative = up)
 */
function heroTextShift() {
  return -window.scrollY * HERO_TEXT_SPEED;
}

/**
 * Applies inner lag and dim from each pair's cover progress.
 *
 * @returns {void}
 */
export function updateSectionScrollShift() {
  pairs.forEach((pair) => {
    const {
      slow,
      next,
      intro,
      introHeight,
      overlayStart,
    } = pair;
    if (isFullScreenHero(slow)) {
      slow.style.setProperty('--section-scroll-shift', '0');
      slow.style.setProperty('--section-scroll-hero-text', `${Number(heroTextShift().toFixed(2))}px`);
    } else if (intro) {
      slow.style.setProperty('--section-scroll-shift', `${introShift(next, introHeight)}px`);
    } else {
      slow.style.setProperty('--section-scroll-shift', `${Number(roundedShift(next).toFixed(2))}px`);
    }
    slow.style.setProperty('--section-scroll-dim', String(OVERLAY_DIM * overlayProgress(next, overlayStart)));
  });
}

/**
 * Removes classification classes and inline animation hooks from a tree.
 *
 * @param {ParentNode} [root=document]
 * @returns {void}
 */
function clearClasses(root = document) {
  root.querySelectorAll(SCROLL_CLASSES.map((c) => `.${c}`).join(', ')).forEach((el) => {
    el.classList.remove(...SCROLL_CLASSES);
    if (el instanceof HTMLElement) {
      el.style.removeProperty('--section-scroll-slow-top');
      el.style.removeProperty('--section-scroll-shift');
      el.style.removeProperty('--section-scroll-hero-text');
      el.style.removeProperty('--section-scroll-dim');
      el.style.removeProperty('z-index');
    }
  });
}

/**
 * Marks rounded pairs: the outgoing section slows, the incoming one covers.
 *
 * @param {ParentNode} [root=document]
 * @returns {void}
 */
export function classifySectionScroll(root = document) {
  clearClasses(root);
  pairs = [];

  const main = root.querySelector('main');
  if (!main) return;

  const sections = [...main.querySelectorAll(':scope > .section')];

  sections.forEach((section, index) => {
    const next = sections[index + 1];
    if (!next || !shouldSlow(section, next)) return;
    section.classList.add(CLASS_SLOW);
    next.classList.add(CLASS_NEXT);
    if (next instanceof HTMLElement && section instanceof HTMLElement) {
      const intro = isIntroSection(section);
      if (intro) section.classList.add(CLASS_INTRO);
      else setSlowTop(section);
      const introHeight = intro ? section.offsetHeight : 0;
      pairs.push({
        slow: section,
        next,
        intro,
        introHeight,
        overlayStart: overlayStartY(next, intro, introHeight),
      });
    }
  });

  updateSectionScrollShift();
}

/**
 * Whether the visitor has opted into motion.
 *
 * @returns {boolean}
 */
function prefersMotion() {
  return window.matchMedia(MOTION_MQ).matches;
}

/**
 * Starts Lenis and drives inner lag from its scroll loop.
 *
 * @returns {Promise<void>}
 */
async function attachLenis() {
  if (lenis) {
    lenis.resize();
    return;
  }
  const { default: Lenis } = await import('../deps/lenis/dist/index.js');
  lenis = new Lenis({ autoRaf: true });
  lenis.on('scroll', updateSectionScrollShift);
}

/**
 * Stops Lenis if it is running.
 *
 * @returns {void}
 */
function detachLenis() {
  if (!lenis) return;
  lenis.off('scroll', updateSectionScrollShift);
  lenis.destroy();
  lenis = null;
}

/**
 * Stops transitions but keeps the motion-query listener.
 *
 * @returns {void}
 */
function stop() {
  if (!started) return;
  started = false;
  detachLenis();
  if (onResize) {
    window.removeEventListener('resize', onResize);
    onResize = null;
  }
  clearClasses();
  pairs = [];
}

/**
 * Enables Lenis, slowdown classes, and CSS when motion is opted in.
 *
 * @returns {Promise<void>}
 */
async function start() {
  if (started || !prefersMotion()) return;
  started = true;

  const base = window.hlx?.codeBasePath || '';
  await Promise.all([
    loadCSS(`${base}/styles/section-scroll.css`),
    loadCSS(`${base}/deps/lenis/dist/lenis.css`),
    attachLenis(),
  ]);
  classifySectionScroll();

  onResize = debounce(() => {
    classifySectionScroll();
    lenis?.resize();
  });
  window.addEventListener('resize', onResize);
}

/**
 * Reacts to a mid-session change of the motion media query.
 *
 * @returns {void}
 */
function onMotionChange() {
  if (prefersMotion()) {
    start();
    return;
  }
  stop();
}

/**
 * Tears down classes and listeners (reduced-motion toggle or tests).
 *
 * @returns {void}
 */
export function teardownSectionScroll() {
  stop();
  if (motionMq) {
    motionMq.removeEventListener('change', onMotionChange);
    motionMq = null;
  }
}

/**
 * Page entry: subscribe to the motion query and start when opted in.
 *
 * @returns {Promise<void>}
 */
export async function initSectionScroll() {
  if (!motionMq) {
    motionMq = window.matchMedia(MOTION_MQ);
    motionMq.addEventListener('change', onMotionChange);
  }
  if (prefersMotion()) await start();
}
