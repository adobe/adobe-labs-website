/**
 * Slows the previous section when a rounded section covers it.
 *
 * Motion is opt-in: classes, Lenis, GSAP, and CSS load only when
 * `prefers-reduced-motion: no-preference` matches. This module owns that opt-in
 * and the classification of which section covers which; the behaviour itself
 * lives alongside it:
 *
 * - `section-scroll/sections.js` — predicates, tuning constants, geometry
 * - `section-scroll/motion.js` — GSAP tweens (loaded on demand with the bundle)
 * - `section-scroll/footer-reveal.js` — the footer garage door
 *
 * See the README's section-surface notes for the authored behaviour, and
 * `styles/section-scroll.css` for the parts CSS owns (sticky, stacking, and the
 * touch-only intro lag).
 *
 * Exports beyond `initSectionScroll` exist for tests.
 */
import { loadCSS } from './aem.js';
import { debounce } from './utils/utils.js';
import {
  CLASS_FADE,
  CLASS_INTRO,
  CLASS_NEXT,
  CLASS_SLOW,
  coversPrevious,
  introLagPx,
  pinTopPx,
  staysInFlow,
  usesTouchScroll,
} from './section-scroll/sections.js';
import {
  bindFooterReveal,
  clearFooterReveal,
  refreshFooterReveal,
} from './section-scroll/footer-reveal.js';

const MOTION_MQ = '(prefers-reduced-motion: no-preference)';

/** Sticky offset for a pinned rounded card. */
const VAR_PIN_TOP = '--section-scroll-slow-top';

/** Touch-only intro lag distance, consumed by a CSS view timeline. */
const VAR_INTRO_LAG = '--section-scroll-intro-lag';

/**
 * GSAP's stock ticker lag smoothing, restored on teardown. Driving Lenis from
 * the ticker needs it off, but the setting is global to GSAP.
 */
const LAG_THRESHOLD_MS = 500;
const LAG_STEP_MS = 33;

/** @type {MediaQueryList | null} */
let motionMq = null;
let started = false;
/** @type {(() => void) | null} */
let onResize = null;
/** @type {object | null} */
let lenis = null;
/** @type {object | null} */
let gsap = null;
/** @type {object | null} */
let ScrollTrigger = null;
/** @type {object | null} */
let motion = null;
/** @type {{ revert: () => void } | null} */
let motionCtx = null;
/** Touch state the current bindings were built for. */
let boundToTouch = false;

/**
 * @returns {boolean}
 */
function prefersMotion() {
  return window.matchMedia(MOTION_MQ).matches;
}

/**
 * Geometry that CSS reads. Recomputed on resize without rebuilding tweens.
 *
 * @param {Element} section Classified outgoing section
 * @returns {void}
 */
function applySectionVars(section) {
  if (!(section instanceof HTMLElement)) return;
  if (section.classList.contains(CLASS_INTRO)) {
    section.style.removeProperty(VAR_PIN_TOP);
    if (usesTouchScroll()) section.style.setProperty(VAR_INTRO_LAG, `${introLagPx(section)}px`);
    else section.style.removeProperty(VAR_INTRO_LAG);
    return;
  }
  section.style.setProperty(VAR_PIN_TOP, `${pinTopPx(section)}px`);
}

/**
 * Reverts tweens and strips classification from a tree.
 *
 * @param {ParentNode} [root=document]
 * @returns {void}
 */
function clear(root = document) {
  motionCtx?.revert();
  motionCtx = null;
  clearFooterReveal(root);
  // Overlays and `inert` only exist if motion set them, and reverting the
  // context restores neither.
  motion?.clearMotionState(root);
  root.querySelectorAll(`.${CLASS_SLOW}, .${CLASS_NEXT}, .${CLASS_INTRO}, .${CLASS_FADE}`)
    .forEach((el) => {
      el.classList.remove(CLASS_SLOW, CLASS_NEXT, CLASS_INTRO, CLASS_FADE);
      if (el instanceof HTMLElement) {
        el.style.removeProperty(VAR_PIN_TOP);
        el.style.removeProperty(VAR_INTRO_LAG);
      }
    });
}

/**
 * Marks cover pairs and binds motion when GSAP is running.
 *
 * @param {ParentNode} [root=document]
 * @returns {void}
 */
export function classifySectionScroll(root = document) {
  clear(root);
  const main = root.querySelector('main');
  if (!main) return;
  boundToTouch = usesTouchScroll();

  const decorate = () => {
    const sections = [...main.querySelectorAll(':scope > .section')];
    sections.forEach((section, index) => {
      const next = sections[index + 1];
      if (!next || !coversPrevious(section, next)) return;
      section.classList.add(CLASS_SLOW);
      next.classList.add(CLASS_NEXT);
      if (staysInFlow(section)) {
        section.classList.add(CLASS_INTRO);
        section.querySelector(':scope > .page-header-wrapper')?.classList.add(CLASS_FADE);
      }
      applySectionVars(section);
      if (started && motion) motion.bindPair(section, next);
    });
    bindFooterReveal(main, root, {
      scrollBy(delta) {
        if (lenis) {
          lenis.scrollTo(lenis.scroll + delta, { immediate: true });
          return;
        }
        window.scrollBy(0, delta);
      },
    });
  };

  if (started && gsap) motionCtx = gsap.context(decorate, main);
  else decorate();
}

/**
 * Resize handling. Every trigger uses function-based `start`/`end` with
 * `invalidateOnRefresh`, so a refresh is enough — reverting and rebinding the
 * whole context would also churn the overlay nodes on every resize. Only a
 * change in touch scrolling moves work between GSAP and CSS, so only that
 * needs a full reclassification.
 *
 * @returns {void}
 */
function onViewportChange() {
  lenis?.resize();
  if (usesTouchScroll() !== boundToTouch) {
    classifySectionScroll();
    return;
  }
  document.querySelectorAll(`main > .${CLASS_SLOW}`).forEach((el) => applySectionVars(el));
  refreshFooterReveal();
  ScrollTrigger?.refresh();
}

/**
 * @param {number} time Seconds from the GSAP ticker
 * @returns {void}
 */
function tickLenis(time) {
  lenis?.raf(time * 1000);
}

/**
 * Loads the vendored bundles and the tweens that need them, then hands scroll to
 * Lenis everywhere except touch.
 *
 * All three requests go out together. Lenis does not depend on GSAP's module,
 * only on `ScrollTrigger.update` at wiring time, so fetching it after GSAP would
 * add a round trip for nothing.
 *
 * @returns {Promise<void>}
 */
async function attach() {
  const needsLenis = !usesTouchScroll() && !lenis;
  const [lib, mod, lenisLib] = await Promise.all([
    gsap ? null : import('../deps/gsap/dist/index.js'),
    motion ? null : import('./section-scroll/motion.js'),
    needsLenis ? import('../deps/lenis/dist/index.js') : null,
  ]);
  if (lib) {
    gsap = lib.gsap;
    ScrollTrigger = lib.ScrollTrigger;
  }
  if (mod) motion = mod;
  if (!lenisLib) return;
  const { default: Lenis } = lenisLib;
  lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tickLenis);
  // Lenis drives its own rAF from this ticker, so smoothing a lagging frame
  // would desync it from the scroll position. `stop()` puts this back.
  gsap.ticker.lagSmoothing(0);
}

/**
 * @returns {void}
 */
function stop() {
  if (!started) return;
  started = false;
  if (gsap) gsap.ticker.remove(tickLenis);
  if (lenis) {
    if (ScrollTrigger) lenis.off('scroll', ScrollTrigger.update);
    lenis.destroy();
    lenis = null;
    // Global to GSAP, so leaving it off would strip lag smoothing from every
    // other animation on the page for the rest of the visit.
    gsap?.ticker.lagSmoothing(LAG_THRESHOLD_MS, LAG_STEP_MS);
  }
  if (onResize) {
    window.removeEventListener('resize', onResize);
    onResize = null;
  }
  clear();
}

/**
 * @returns {Promise<void>}
 */
async function start() {
  if (started || !prefersMotion()) return;
  started = true;
  const base = window.hlx?.codeBasePath || '';
  const assets = [
    loadCSS(`${base}/styles/section-scroll.css`),
    attach(),
  ];
  if (!usesTouchScroll()) {
    assets.push(loadCSS(`${base}/deps/lenis/dist/lenis.css`));
  }
  await Promise.all(assets);
  classifySectionScroll();
  onResize = debounce(onViewportChange);
  window.addEventListener('resize', onResize);
}

/**
 * @returns {void}
 */
function onMotionChange() {
  if (prefersMotion()) start();
  else stop();
}

/**
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
 * @returns {Promise<void>}
 */
export async function initSectionScroll() {
  if (!motionMq) {
    motionMq = window.matchMedia(MOTION_MQ);
    motionMq.addEventListener('change', onMotionChange);
  }
  if (prefersMotion()) await start();
}
