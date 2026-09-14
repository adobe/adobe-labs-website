/**
 * Slows a rounded section once the next rounded section reaches mid-viewport.
 *
 * Motion is opt-in: classes and CSS load only when
 * `prefers-reduced-motion: no-preference` matches. Adjacent
 * `section-rounded-default` siblings stay one card and are skipped.
 * A dark overlay fades in on the outgoing section from mid-viewport
 * until the next section has covered it.
 */
import { loadCSS } from './aem.js';
import { debounce } from './utils/utils.js';

const MOTION_MQ = '(prefers-reduced-motion: no-preference)';
const CLASS_SLOW = 'section-scroll-slow';
const CLASS_NEXT = 'section-scroll-next';
const SCROLL_CLASSES = [CLASS_SLOW, CLASS_NEXT];

/** Inner travel once the next section is past mid-viewport, as a fraction of the viewport. */
const SHIFT_VH = 0.2;

/** Peak overlay opacity (subtle black) when the next section has covered the previous. */
const OVERLAY_DIM = 0.4;

/** @type {MediaQueryList | null} */
let motionMq = null;

/** @type {boolean} */
let started = false;

/** @type {(() => void) | null} */
let onResize = null;

/** @type {(() => void) | null} */
let detachScroll = null;

/** @type {Array<{ slow: HTMLElement, next: HTMLElement }>} */
let pairs = [];

/** @type {number} */
let raf = 0;

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
 * Adjacent default sections are one continuous card — no slowdown.
 *
 * @param {Element} previous
 * @param {Element} next
 * @returns {boolean}
 */
function shouldSlow(previous, next) {
  if (!isRounded(previous) || !isRounded(next)) return false;
  return !(previous.classList.contains('section-rounded-default')
    && next.classList.contains('section-rounded-default'));
}

/**
 * Sticky `top` so the section keeps scrolling until the next section's
 * top sits at mid-viewport, then pins while the next section covers it.
 *
 * @param {HTMLElement} el
 * @returns {void}
 */
function setSlowTop(el) {
  const top = window.innerHeight * 0.5 - el.offsetHeight;
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
 * Cover progress from 0 (next section at or below mid-viewport) to 1
 * (next section at the top of the viewport).
 *
 * @param {HTMLElement} next
 * @returns {number}
 */
function coverProgress(next) {
  const vh = window.innerHeight;
  if (vh <= 0) return 0;
  const mid = vh * 0.5;
  const { top } = next.getBoundingClientRect();
  return clampProgress((mid - top) / mid);
}

/**
 * Overlay progress from 0 (next section at mid-viewport) to 1 (next
 * section has covered the previous one in the viewport).
 *
 * @param {HTMLElement} slow
 * @param {HTMLElement} next
 * @returns {number}
 */
function overlayProgress(slow, next) {
  const vh = window.innerHeight;
  if (vh <= 0) return 0;
  const overlayStart = vh * 0.5;
  const nextTop = next.getBoundingClientRect().top;
  const overlayEnd = Math.max(0, slow.getBoundingClientRect().top);
  const span = overlayStart - overlayEnd;
  if (span <= 0) return nextTop <= overlayStart ? 1 : 0;
  return clampProgress((overlayStart - nextTop) / span);
}

/**
 * Applies inner lag and dim from each pair's cover progress.
 *
 * @returns {void}
 */
export function updateSectionScrollShift() {
  pairs.forEach(({ slow, next }) => {
    const t = coverProgress(next);
    slow.style.setProperty('--section-scroll-shift', `${-SHIFT_VH * t * 100}vh`);
    slow.style.setProperty('--section-scroll-dim', String(OVERLAY_DIM * overlayProgress(slow, next)));
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
      setSlowTop(section);
      pairs.push({ slow: section, next });
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
 * Coalesces scroll updates onto animation frames.
 *
 * @returns {void}
 */
function onScroll() {
  if (raf) return;
  raf = window.requestAnimationFrame(() => {
    raf = 0;
    updateSectionScrollShift();
  });
}

/**
 * Hooks native scroll to drive the inner lag.
 *
 * @returns {void}
 */
function attachScroll() {
  detachScroll?.();
  if (!pairs.length) {
    detachScroll = null;
    return;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  detachScroll = () => window.removeEventListener('scroll', onScroll);
  onScroll();
}

/**
 * Stops transitions but keeps the motion-query listener.
 *
 * @returns {void}
 */
function stop() {
  if (!started) return;
  started = false;
  detachScroll?.();
  detachScroll = null;
  if (raf) {
    window.cancelAnimationFrame(raf);
    raf = 0;
  }
  if (onResize) {
    window.removeEventListener('resize', onResize);
    onResize = null;
  }
  clearClasses();
  pairs = [];
}

/**
 * Enables slowdown classes and CSS when motion is opted in.
 *
 * @returns {Promise<void>}
 */
async function start() {
  if (started || !prefersMotion()) return;
  started = true;

  const base = window.hlx?.codeBasePath || '';
  await loadCSS(`${base}/styles/section-scroll.css`);
  classifySectionScroll();
  attachScroll();

  onResize = debounce(() => {
    classifySectionScroll();
    attachScroll();
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
