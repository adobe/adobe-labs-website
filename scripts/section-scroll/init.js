/**
 * Slows the previous section when a rounded section covers it.
 *
 * Motion is opt-in: classes, Lenis, GSAP, and CSS load only when
 * `prefers-reduced-motion: no-preference` matches. This module owns that opt-in
 * and the classification of which section covers which; the behaviour itself
 * lives alongside it:
 *
 * - `section-scroll/config-and-utils.js` — predicates, tuning constants, geometry
 * - `section-scroll/section-motion.js` — GSAP tweens (loaded on demand with the bundle)
 * - `section-scroll/focus-reveal.js` — scroll a covered control into view
 * - `section-scroll/footer-reveal.js` — the footer garage door
 *
 * See the README's section-surface notes for the authored behaviour, and
 * `styles/section-scroll.css` for the parts CSS owns (sticky, stacking, and the
 * touch-only intro lag).
 *
 * Exports beyond `initSectionScroll` exist for tests.
 */
import { loadCSS } from '../aem.js';
import { debounce } from '../utils/utils.js';
import {
  CLASS_CSS_COVER,
  CLASS_FADE,
  CLASS_INTRO,
  CLASS_NEXT,
  CLASS_OVERLAY,
  CLASS_SLOW,
  coversPrevious,
  dimEntryStart,
  introLagPx,
  isRounded,
  pinTopPx,
  staysInFlow,
  usesCssCover,
  usesTouchScroll,
} from './config-and-utils.js';
import {
  bindFocusReveal,
  cancelFocusReveal,
  clearFocusReveal,
  layoutTop,
  undimmedScrollTop,
} from './focus-reveal.js';
import {
  bindFooterReveal,
  clearFooterReveal,
  refreshFooterReveal,
} from './footer-reveal.js';

const MOTION_MQ = '(prefers-reduced-motion: no-preference)';

/** Sticky offset for a pinned rounded card. */
const VAR_PIN_TOP = '--section-scroll-slow-top';

/** Touch-only intro lag distance, consumed by a CSS view timeline. */
const VAR_INTRO_LAG = '--section-scroll-intro-lag';

/** View-timeline entry percentage where a touch cover starts to dim. */
const VAR_DIM_START = '--section-scroll-dim-start';

/** Named view timeline for one incoming section, inherited by its dim layer. */
const VAR_DIM_TIMELINE = '--section-scroll-dim-timeline';

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
/** Whether those bindings fade with scroll-driven CSS instead of GSAP. */
let boundToCssCover = false;
/** @type {((event: MouseEvent) => void) | null} */
let onHashClick = null;

/**
 * Whether the visitor has opted into motion.
 *
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
 * Host for the dim layer: the hero card when this section has one, otherwise
 * the section (rounded cards).
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {HTMLElement}
 */
function overlayHost(section) {
  if (!isRounded(section)) {
    const hero = section.querySelector('.hero');
    if (hero instanceof HTMLElement) return hero;
  }
  return section;
}

/**
 * Dim layer on the outgoing card. A span so it is not styled as a
 * `main > .section > div` content column. Reuses one that is already there.
 * Both the GSAP tweens and the touch CSS fades paint this same node.
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {HTMLElement}
 */
function ensureOverlay(section) {
  const host = overlayHost(section);
  let overlay = host.querySelector(`:scope > .${CLASS_OVERLAY}`);
  if (!(overlay instanceof HTMLElement)) {
    overlay = document.createElement('span');
    overlay.className = CLASS_OVERLAY;
    overlay.setAttribute('aria-hidden', 'true');
    host.append(overlay);
  }
  return overlay;
}

/**
 * Removes dim layers. Reverting a GSAP context restores inline styles, but
 * not nodes appended here.
 *
 * @param {ParentNode} root
 * @returns {void}
 */
function clearOverlays(root) {
  root.querySelectorAll(`.${CLASS_OVERLAY}`).forEach((el) => el.remove());
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
  clearFocusReveal();
  clearFooterReveal(root);
  // Reverting the GSAP context restores inline styles, not the overlay nodes
  // motion appended.
  motion?.clearMotionState(root);
  clearOverlays(root);
  root.querySelectorAll('.hero__content').forEach((el) => {
    if (el instanceof HTMLElement) el.style.removeProperty('animation-timeline');
  });
  const mains = [...root.querySelectorAll('main')];
  if (root instanceof Element && root.matches('main')) mains.unshift(root);
  mains.forEach((main) => {
    if (!(main instanceof HTMLElement)) return;
    main.classList.remove(CLASS_CSS_COVER);
    main.style.removeProperty('timeline-scope');
  });
  root.querySelectorAll(`.${CLASS_SLOW}, .${CLASS_NEXT}, .${CLASS_INTRO}, .${CLASS_FADE}`)
    .forEach((el) => {
      el.classList.remove(CLASS_SLOW, CLASS_NEXT, CLASS_INTRO, CLASS_FADE);
      if (el instanceof HTMLElement) {
        el.style.removeProperty(VAR_PIN_TOP);
        el.style.removeProperty(VAR_INTRO_LAG);
        el.style.removeProperty(VAR_DIM_START);
        el.style.removeProperty(VAR_DIM_TIMELINE);
        el.style.removeProperty('view-timeline-name');
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
  boundToCssCover = usesCssCover();
  /** @type {string[]} */
  const coverNames = [];

  /**
   * Classifies each cover pair, writes the CSS variables, and binds the footer
   * and focus reveal. Runs inside the GSAP context once motion is attached.
   *
   * @returns {void}
   */
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
      if (!(section instanceof HTMLElement) || !(next instanceof HTMLElement)) return;
      if (boundToCssCover) {
        const name = `--section-scroll-cover-${index}`;
        coverNames.push(name);
        const overlay = ensureOverlay(section);
        const dimStart = dimEntryStart(section);
        next.style.setProperty('view-timeline-name', name);
        section.style.setProperty(VAR_DIM_TIMELINE, name);
        section.style.setProperty(VAR_DIM_START, dimStart);
        // Inline, not only the custom property: `animation-timeline` needs a
        // dashed-ident, and an unregistered variable is not one in every browser.
        overlay.style.setProperty('animation-timeline', name);
        section.querySelectorAll('.hero__content').forEach((node) => {
          if (node instanceof HTMLElement) node.style.setProperty('animation-timeline', name);
        });
      } else if (started && motion) {
        ensureOverlay(section);
        motion.bindPair(section, next);
      }
    });
    if (boundToCssCover && coverNames.length) {
      main.classList.add(CLASS_CSS_COVER);
      main.style.setProperty('timeline-scope', coverNames.join(', '));
    }
    /**
     * Scrolls by `delta` pixels. Lenis owns the position when it is attached.
     *
     * @param {number} delta Pixels to scroll; negative moves up
     * @returns {void}
     */
    const scrollBy = (delta) => {
      if (lenis) {
        lenis.scrollTo(lenis.scroll + delta, { immediate: true });
        return;
      }
      window.scrollBy(0, delta);
    };
    bindFooterReveal(main, root, { scrollBy });
    if (started) {
      bindFocusReveal({
        scrollBy,
        getScroll: () => (lenis ? lenis.scroll : window.scrollY),
      });
    }
  };

  if (started && gsap && !boundToCssCover) motionCtx = gsap.context(decorate, main);
  else decorate();
}

/**
 * Advances Lenis from the GSAP ticker so scroll stays on the same clock as the tweens.
 *
 * @param {number} time Seconds from the GSAP ticker
 * @returns {void}
 */
function tickLenis(time) {
  lenis?.raf(time * 1000);
}

/**
 * Same-page `#id` target of a click, when that id exists. Hash-only `href`s are
 * same-document even when the resolved URL differs (a `<base href>` or a
 * trailing-slash mismatch).
 *
 * @param {EventTarget | null} target
 * @returns {{ el: HTMLElement, hash: string } | null}
 */
function samePageHashTarget(target) {
  const link = target instanceof Element ? target.closest('a[href]') : null;
  if (!(link instanceof HTMLAnchorElement)) return null;
  const raw = link.getAttribute('href') || '';
  let hash = '';
  if (raw.startsWith('#')) {
    hash = raw;
  } else {
    let next;
    try {
      next = new URL(link.href, window.location.href);
    } catch {
      return null;
    }
    const current = new URL(window.location.href);
    if (next.origin !== current.origin) return null;
    const strip = (path) => (path.length > 1 ? path.replace(/\/$/, '') : path);
    if (strip(next.pathname) !== strip(current.pathname)) return null;
    hash = next.hash;
  }
  if (!hash || hash === '#') return null;
  const el = document.getElementById(decodeURIComponent(hash.slice(1)));
  return el instanceof HTMLElement ? { el, hash } : null;
}

/**
 * Moves keyboard focus with an in-page jump. The hash-click capture listener
 * swallows the pager's own click handler, so this is what keeps Tab inside the
 * destination section instead of the control that was just activated.
 *
 * @param {HTMLElement} el
 * @returns {void}
 */
function focusHashTarget(el) {
  let target = el;
  if (el.matches('main > .section')) {
    const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading instanceof HTMLElement) target = heading;
  }
  if (
    !target.hasAttribute('tabindex')
    && !target.matches('a[href], button, input, select, textarea, summary')
  ) {
    target.tabIndex = -1;
  }
  target.focus({ preventScroll: true });
}

/**
 * Native hash jumps set scrollTop; Lenis overwrites it on the next raf, so the
 * first click looks like a no-op and only the second (already-hashed) click
 * moves. Prevent the native jump and let Lenis own the scroll. Cancel any
 * uncover queued from focusing the link, or it pulls the page back. `pushState`
 * keeps the URL in sync without triggering another native scroll.
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function handleHashClick(event) {
  if (!lenis || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const dest = samePageHashTarget(event.target);
  if (!dest) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  cancelFocusReveal();
  // Native `scroll-behavior: smooth` is off while Lenis runs; this is that
  // animation, owned by Lenis so it is not undone on the next raf. Layout Y
  // (not the node): Lenis and `offsetTop` both read the pinned visual box.
  // Subtract scroll-padding so the section top sits below the sticky header,
  // matching native hash jumps.
  const padding = parseFloat(
    getComputedStyle(document.documentElement).scrollPaddingTop,
  );
  const padded = layoutTop(dest.el) - (Number.isFinite(padding) ? padding : 0);
  const top = undimmedScrollTop(dest.el, padded);
  lenis.scrollTo(top > 0 ? top : 0);
  if (window.location.hash !== dest.hash) window.history.pushState(null, '', dest.hash);
  // After the click, the browser would keep focus on the pager. Move it in a
  // microtask so that does not win, then drop any uncover the heading's focusin
  // queued.
  queueMicrotask(() => {
    focusHashTarget(dest.el);
    cancelFocusReveal();
  });
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
  // Touch fades are opacity. Scroll-driven CSS owns them when the browser
  // can, so this page never downloads GSAP. Without that support, GSAP remains
  // the fallback and Lenis stays off either way.
  if (usesCssCover()) return;
  const needsLenis = !usesTouchScroll() && !lenis;
  const [lib, mod, lenisLib] = await Promise.all([
    gsap ? null : import('../../deps/gsap/dist/index.js'),
    motion ? null : import('./section-motion.js'),
    needsLenis ? import('../../deps/lenis/dist/index.js') : null,
  ]);
  if (lib) {
    gsap = lib.gsap;
    ScrollTrigger = lib.ScrollTrigger;
  }
  if (mod) motion = mod;
  if (!lenisLib) return;
  const { default: Lenis } = lenisLib;
  // Native `#id` jumps fight Lenis unless we own the click (see handleHashClick).
  // `anchors` is the fallback if that listener misses; both use Lenis's lerp so
  // in-page links keep the same smooth scroll native CSS used to provide.
  lenis = new Lenis({ autoRaf: false, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tickLenis);
  // Lenis drives its own rAF from this ticker, so smoothing a lagging frame
  // would desync it from the scroll position. `stop()` puts this back.
  gsap.ticker.lagSmoothing(0);
  if (!onHashClick) {
    onHashClick = handleHashClick;
    document.addEventListener('click', onHashClick, true);
  }
}

/**
 * Resize handling. Every trigger uses function-based `start`/`end` with
 * `invalidateOnRefresh`, so a refresh is enough — reverting and rebinding the
 * whole context would also churn the overlay nodes on every resize. Only a
 * change in touch scrolling, or in whether CSS can own the fades, moves work
 * between GSAP and CSS, so only that needs a full reclassification.
 *
 * @returns {void}
 */
function onViewportChange() {
  lenis?.resize();
  const touch = usesTouchScroll();
  const cssCover = usesCssCover();
  if (touch !== boundToTouch || cssCover !== boundToCssCover) {
    // A fine pointer still needs GSAP. A coarse pointer that can fade in CSS
    // does not, including one that previously loaded the bundle. Loading the
    // bundle is the only async step; reclassification itself stays sync so a
    // resize does not paint a frame with neither path bound.
    if (!cssCover && !motion) {
      attach().then(() => {
        if (!started) return;
        classifySectionScroll();
      });
      return;
    }
    classifySectionScroll();
    return;
  }
  document.querySelectorAll(`main > .${CLASS_SLOW}`).forEach((el) => {
    applySectionVars(el);
    if (boundToCssCover && el instanceof HTMLElement) {
      el.style.setProperty(VAR_DIM_START, dimEntryStart(el));
    }
  });
  refreshFooterReveal();
  if (!boundToCssCover) ScrollTrigger?.refresh();
}

/**
 * Tears down Lenis, listeners, and classification, and restores GSAP lag smoothing.
 *
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
  if (onHashClick) {
    document.removeEventListener('click', onHashClick, true);
    onHashClick = null;
  }
  clear();
}

/**
 * Loads the section-scroll CSS and motion bundles, then classifies sections.
 *
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
 * Starts or stops section scroll when the reduced-motion preference changes.
 *
 * @returns {void}
 */
function onMotionChange() {
  if (prefersMotion()) start();
  else stop();
}

/**
 * Stops section scroll and drops the motion-preference listener.
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
 * Opts into section scroll when motion is allowed, and watches for later changes.
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
