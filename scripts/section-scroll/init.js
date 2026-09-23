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
 *
 * A focused control that a cover, the sticky header, or a section-scroll fade
 * is painting over is scrolled into view in this file. The footer garage door
 * (last rounded card over the menu, then the Adobe logo) lives here too.
 *
 * See the README's section-surface notes for the authored behaviour, and
 * `styles/section-scroll.css` for the parts CSS owns (sticky, stacking, and the
 * touch-only intro lag).
 *
 * Exports beyond `initSectionScroll` exist for tests.
 */
import { loadCSS } from '../aem.js';
import { debounce } from '../utils/utils.js';
import { ENTRY_END, entryProgress, holdLogoEntry } from '../utils/entry-progress.js';
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
  coverStartPx,
  usesCssCover,
  usesTouchScroll,
} from './config-and-utils.js';

/**
 * Scrolls a focused control fully into view when a section cover, the sticky
 * header, or a section-scroll fade is painting over it.
 *
 * The browser's own focus scroll only checks that the control is inside the
 * viewport. A pinned card stays in that viewport while the next section draws
 * on top of it, so the control is "on screen" and still hidden. Taking it out
 * of the tab order would skip something the user can reach; scrolling until it
 * is clear keeps it reachable (WCAG 2.2 SC 2.4.11). The scroll is limited so
 * the control itself stays inside the viewport. A cover overlay that is still
 * dimming the section is the exception: that scroll continues until the
 * overlay is gone.
 */

/** Default focus ring: 2px outline plus 2px offset. Matches `overflow-clip-margin`. */
const RING = 4;

/**
 * Space past the focus ring before a covering section counts as clear.
 * Parallax on a pinned card moves the control partway with the scroll, so a
 * tight edge leaves the last line under the next section.
 */
const COVER_GAP = 8;

/** Ring plus the gap above, used when a section is the thing covering. */
const COVER_CLEARANCE = RING + COVER_GAP;

/**
 * A pinned card's copy shifts on each scroll, so one pass clears only part of
 * the overlap. The second pass projects the rest; these extra frames are the
 * fallback when that rate is not linear.
 */
const MAX_PASSES = 12;

/** @type {((event: FocusEvent) => void) | null} */
let onFocusIn = null;
/** @type {number} */
let rafId = 0;
/** @type {number} */
let generation = 0;
/** Layout tops measured for the in-flight uncover. Sibling heights do not change mid-reveal. */
/** @type {Map<HTMLElement, number> | null} */
let layoutCache = null;
/** Stuck-ancestor answers for the in-flight uncover. */
/** @type {Map<HTMLElement, boolean> | null} */
let stuckCache = null;
/** Parsed `--nav-height` for the in-flight uncover, or null outside one. */
/** @type {number | null} */
let revealNav = null;

/**
 * Drops geometry cached for one uncover.
 *
 * @returns {void}
 */
function dropRevealCache() {
  layoutCache = null;
  stuckCache = null;
  revealNav = null;
}

/**
 * The skip link focuses `main` itself. That landmark is not a covered control,
 * and scrolling it would fight the jump to the top of the page. Content-grid
 * pagers are also skipped: mousedown focuses the link, and uncovering it after
 * the hash jump pulls the page back to the old section. Page-header jump links
 * are hash links too, but they stay in the tab order under the hero, so they
 * must still uncover.
 *
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function skipsReveal(el) {
  return Boolean(
    el.closest('header')
    || el.closest('body > footer')
    || el.matches('body > main')
    || el.closest('.content-grid__pager-link'),
  );
}

/**
 * Document Y of `el` from in-flow sibling heights, ignoring a sticky offset.
 *
 * @param {HTMLElement} el
 * @returns {number}
 */
function measureLayoutTop(el) {
  let y = 0;
  /** @type {Element | null} */
  let node = el;
  const seen = new Set();
  while (
    node instanceof HTMLElement
    && node !== document.documentElement
    && !seen.has(node)
  ) {
    seen.add(node);
    const parent = node.parentElement;
    if (!(parent instanceof HTMLElement)) break;
    const parentStyle = getComputedStyle(parent);
    y += parseFloat(parentStyle.paddingTop) || 0;
    y += parseFloat(parentStyle.borderTopWidth) || 0;
    const gap = parseFloat(parentStyle.rowGap) || 0;
    const children = [...parent.children];
    const index = children.indexOf(node);
    const previous = children.slice(0, index).reduce((sum, child) => {
      if (!(child instanceof HTMLElement)) return sum;
      const cs = getComputedStyle(child);
      return {
        y: sum.y
          + (parseFloat(cs.marginTop) || 0)
          + child.offsetHeight
          + (parseFloat(cs.marginBottom) || 0),
        skipped: sum.skipped + 1,
      };
    }, { y: 0, skipped: 0 });
    y += previous.y;
    const { skipped } = previous;
    y += parseFloat(getComputedStyle(node).marginTop) || 0;
    if (skipped) y += gap * skipped;
    node = parent;
  }
  return y;
}

/**
 * Document Y of `el` in layout. Chrome's `offsetTop` on a sticky card is the
 * pinned box (same lie as `getBoundingClientRect`), so a Previous pager would
 * stop short of the section top. Previous siblings' heights do not move when
 * those siblings stick.
 *
 * Repeated calls during one uncover reuse the first measurement.
 *
 * @param {HTMLElement} el
 * @returns {number}
 */
export function layoutTop(el) {
  const cached = layoutCache?.get(el);
  if (cached !== undefined) return cached;
  const y = measureLayoutTop(el);
  layoutCache?.set(el, y);
  return y;
}

/**
 * Parsed `--nav-height`, or 0 when the custom property is missing.
 *
 * @returns {number}
 */
function readNavHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--nav-height');
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Parsed `--nav-height` for the current uncover, measured once per reveal.
 *
 * @returns {number}
 */
function navHeight() {
  if (revealNav !== null) return revealNav;
  return readNavHeight();
}

/**
 * True when `el` is `position: sticky` and currently stuck to its top offset.
 *
 * @param {HTMLElement} el Element to test
 * @returns {boolean}
 */
function isCurrentlyStuck(el) {
  const { position, top } = getComputedStyle(el);
  if (position !== 'sticky') return false;
  const stickyTop = parseFloat(top);
  if (!Number.isFinite(stickyTop)) return false;
  return el.getBoundingClientRect().top <= stickyTop + 1;
}

/**
 * A stuck ancestor stays put while the page scrolls, so the control moves only
 * once that ancestor releases.
 *
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function hasStuckAncestor(el) {
  const cached = stuckCache?.get(el);
  if (cached !== undefined) return cached;
  let node = el;
  let stuck = false;
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement && isCurrentlyStuck(node)) {
      stuck = true;
      break;
    }
    node = node.parentElement;
  }
  stuckCache?.set(el, stuck);
  return stuck;
}

/**
 * True when both rectangles have area and intersect.
 *
 * @param {DOMRect} a
 * @param {DOMRect} b
 * @returns {boolean}
 */
function overlaps(a, b) {
  return a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0
    && a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right;
}

/**
 * Scroll position where `section` is no longer dimmed. Null when it has no
 * following section. The dim eases in from `coverStartPx` and is gone once the
 * next section sits at or below that line.
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {number | null}
 */
function coverClearScroll(section) {
  const next = section.nextElementSibling;
  if (!(next instanceof HTMLElement)) return null;
  return layoutTop(next) - coverStartPx(section);
}

/**
 * Scroll that clears a fade or a hero painted over the page header. Null when
 * nothing fading `el` needs a scroll.
 *
 * @param {HTMLElement} el Focused control
 * @param {number} scroll Current page scroll
 * @returns {number | null}
 */
function opacityDelta(el, scroll) {
  const fade = el.closest(`.${CLASS_FADE}`);
  if (fade instanceof HTMLElement) {
    const opacity = parseFloat(getComputedStyle(fade).opacity);
    if (Number.isFinite(opacity) && opacity < 1) return -scroll;
    // The intro hero paints over the sticky page header at z-index, even
    // while the fade is still at opacity 1. Scroll to the top of the fade.
    const rect = el.getBoundingClientRect();
    const section = fade.parentElement;
    if (section instanceof HTMLElement) {
      const covered = [...section.children].some((sibling) => (
        sibling instanceof HTMLElement
        && sibling !== fade
        && !sibling.classList.contains(CLASS_OVERLAY)
        && overlaps(sibling.getBoundingClientRect(), rect)
      ));
      if (covered) return -scroll;
    }
  }

  let node = el.parentElement;
  while (node && node !== document.body) {
    if (!(node instanceof HTMLElement)) break;
    const opacity = parseFloat(getComputedStyle(node).opacity);
    if (Number.isFinite(opacity) && opacity < 1) {
      const section = node.closest('main > .section');
      if (!(section instanceof HTMLElement)) return 0;
      const clearAt = coverClearScroll(section);
      if (clearAt === null) return 0;
      const delta = clearAt - scroll;
      return delta < 0 ? delta : 0;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Scroll that drops the focus ring below the sticky nav. Zero when the control
 * is already clear, or when a stuck ancestor cannot move it further.
 *
 * @param {HTMLElement} el Focused control
 * @param {DOMRect} rect `el`'s visual box
 * @param {number} nav Parsed `--nav-height`
 * @param {boolean} stuck Whether a sticky ancestor is currently stuck
 * @returns {number}
 */
function headerDelta(el, rect, nav, stuck) {
  if (rect.top >= nav + RING) return 0;
  // A control parked against the nav by its own sticky cannot drop the ring
  // below the header; scrolling would repeat the same few pixels.
  if (stuck && rect.top >= nav - 1) return 0;
  return rect.top - nav - RING;
}

/**
 * Later sections whose boxes overlap the focused control, including the gap
 * past the focus ring. A hit test would miss a cover that only clips the
 * control's edge, and the dim layer is `pointer-events: none`.
 *
 * @param {HTMLElement} el
 * @param {DOMRect} rect
 * @returns {HTMLElement[]}
 */
function obscurers(el, rect) {
  /** @type {HTMLElement[]} */
  const list = [];
  const focus = new DOMRect(
    rect.left - COVER_CLEARANCE,
    rect.top - COVER_CLEARANCE,
    rect.width + COVER_CLEARANCE * 2,
    rect.height + COVER_CLEARANCE * 2,
  );
  let sibling = (el.closest('main > .section') || el).nextElementSibling;
  while (sibling) {
    if (
      sibling instanceof HTMLElement
      && sibling.classList.contains('section')
      && !sibling.contains(el)
      && overlaps(sibling.getBoundingClientRect(), focus)
    ) {
      list.push(sibling);
    }
    sibling = sibling.nextElementSibling;
  }
  return list;
}

/**
 * Later sibling of the focused control's section: the direction a cover
 * approaches from.
 *
 * @param {HTMLElement} el
 * @param {HTMLElement} section
 * @returns {boolean}
 */
function isFollowing(el, section) {
  const from = el.closest('main > .section') || el;
  let sibling = from.nextElementSibling;
  while (sibling) {
    if (sibling === section || sibling.contains(section)) return true;
    sibling = sibling.nextElementSibling;
  }
  return false;
}

/**
 * Scroll that clears `section` off `el`. Positive moves the page down, negative
 * moves it up. Zero when the section does not cover the control.
 *
 * @param {HTMLElement} el Focused control
 * @param {HTMLElement} section Section painting over `el`
 * @param {DOMRect} rect `el`'s visual box
 * @returns {number}
 */
function deltaForSection(el, section, rect) {
  const coverRect = section.getBoundingClientRect();
  if (!isFollowing(el, section)) {
    const delta = coverRect.bottom - (rect.top - COVER_CLEARANCE);
    return delta > 0 ? delta : 0;
  }

  // The focused control is stuck, so the covering section has to move down.
  // Use the visual overlap, not the document offset: a short cover only needs
  // a short scroll, and a layout position can jump by a whole page.
  if (hasStuckAncestor(el)) {
    const delta = coverRect.top - (rect.bottom + COVER_CLEARANCE);
    return delta < 0 ? delta : 0;
  }
  // The cover is stuck and the control is still in flow, so the control has
  // to move up past the cover's top edge.
  if (isCurrentlyStuck(section)) {
    const delta = rect.bottom + COVER_CLEARANCE - coverRect.top;
    return delta > 0 ? delta : 0;
  }
  return 0;
}

/**
 * Largest scroll that still leaves `rect` fully on screen if it moves one
 * pixel per pixel of scroll. A stuck control will not move, and one that
 * releases will stop at the viewport edge instead of leaving it.
 *
 * @param {DOMRect} rect
 * @param {number} delta
 * @param {number} nav Parsed `--nav-height`
 * @returns {number}
 */
function movementClamp(rect, delta, nav) {
  if (Math.abs(delta) < 1) return 0;
  const minTop = nav + RING;
  const maxBottom = Math.max(minTop + 1, window.innerHeight - RING);
  const minDelta = rect.bottom - maxBottom;
  const maxDelta = rect.top - minTop;
  const clamped = minDelta > maxDelta
    ? maxDelta
    : Math.min(maxDelta, Math.max(minDelta, delta));
  return Math.abs(clamped) < 1 ? 0 : clamped;
}

/**
 * Scroll that brings `rect` back inside the viewport. Zero when it already is.
 *
 * @param {DOMRect} rect
 * @returns {number}
 */
function intoViewDelta(rect) {
  const minTop = navHeight() + RING;
  const maxBottom = window.innerHeight - RING;
  if (rect.top < minTop) return rect.top - minTop;
  if (rect.bottom > maxBottom) return rect.bottom - maxBottom;
  return 0;
}

/**
 * Scroll position where `el`'s section is no longer dimmed, or `scrollTop` when
 * it has no visible cover overlay. The dim eases in from `coverStartPx` and is
 * gone once the next section sits at or below that line.
 *
 * @param {HTMLElement} el Focused control, or the section itself
 * @param {number} scrollTop Candidate page scroll
 * @returns {number}
 */
export function undimmedScrollTop(el, scrollTop) {
  const section = el.matches('main > .section') ? el : el.closest('main > .section');
  if (!(section instanceof HTMLElement)) return scrollTop;
  const overlay = section.querySelector(`.${CLASS_OVERLAY}`);
  if (!(overlay instanceof HTMLElement)) return scrollTop;
  const opacity = parseFloat(getComputedStyle(overlay).opacity);
  if (!Number.isFinite(opacity) || opacity <= 0) return scrollTop;
  const clearAt = coverClearScroll(section);
  if (clearAt === null) return scrollTop;
  return Math.min(scrollTop, clearAt);
}

/**
 * Scroll delta that brings `el` fully into view. Negative scrolls up.
 * Zero when the control is already clear, or when both sections are in flow
 * and scrolling would move them together.
 *
 * @param {HTMLElement} el
 * @param {number} scroll Current page scroll (Lenis when it is driving)
 * @returns {number}
 */
export function revealDelta(el, scroll) {
  if (skipsReveal(el)) return 0;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return 0;

  const nav = navHeight();
  const stuck = hasStuckAncestor(el);
  let delta = 0;
  const faded = opacityDelta(el, scroll);
  if (faded !== null && faded !== 0) delta = faded;
  else {
    const deltas = obscurers(el, rect)
      .map((section) => deltaForSection(el, section, rect))
      .filter((entry) => Math.abs(entry) >= 1);
    if (deltas.length) {
      const negatives = deltas.filter((entry) => entry < 0);
      delta = negatives.length ? Math.min(...negatives) : Math.max(...deltas);
    } else {
      const header = headerDelta(el, rect, nav, stuck);
      delta = header < -1 ? header : 0;
    }
  }

  // A stuck control stays put while the cover moves, so the viewport clamp
  // would stop the scroll short and leave the last line covered. A dim overlay
  // paints the whole outgoing section, so uncovering the control alone can
  // leave the bottom of the previous section still dimmed. Only an upward
  // correction counts: a zero here means there is no visible overlay.
  const clearDim = undimmedScrollTop(el, scroll) - scroll;
  const undim = clearDim < 0;
  if (stuck) return undim && clearDim < delta ? clearDim : delta;
  const clamped = movementClamp(rect, delta, nav);
  return undim && clearDim < clamped ? clearDim : clamped;
}

/**
 * Scrolls until `el` is clear of whatever covers it, over several frames when
 * parallax moves the control with the page.
 *
 * @param {HTMLElement} el Focused control
 * @param {(delta: number) => void} scrollBy Page scroll for one pass
 * @param {() => number} getScroll Current page scroll
 * @returns {void}
 */
function reveal(el, scrollBy, getScroll) {
  dropRevealCache();
  layoutCache = new Map();
  stuckCache = new Map();
  revealNav = readNavHeight();
  generation += 1;
  const id = generation;
  let pass = 0;
  let previous = Infinity;

  /**
   * One uncover pass. Repeats until the control is clear, the projected
   * remainder finishes the overlap, or `MAX_PASSES` is reached.
   *
   * @returns {void}
   */
  const step = () => {
    rafId = 0;
    if (id !== generation || !el.isConnected) {
      dropRevealCache();
      return;
    }
    if (pass >= MAX_PASSES) {
      dropRevealCache();
      return;
    }
    // Parallax can move the control after the uncover scroll. If that lands
    // it fully outside the viewport, bring it back and stop.
    if (pass > 0 && !hasStuckAncestor(el)) {
      const rect = el.getBoundingClientRect();
      const offscreen = rect.bottom <= 0 || rect.top >= window.innerHeight;
      let back = intoViewDelta(rect);
      if (offscreen && Math.abs(back) >= 1) {
        // Pulling the control back on screen can scroll into the cover again.
        // Stop at the last position where the overlay is clear.
        const scroll = getScroll();
        const room = undimmedScrollTop(el, scroll + back) - scroll;
        if (back > 0) back = Math.min(back, room);
        if (Math.abs(back) < 1) {
          dropRevealCache();
          return;
        }
        scrollBy(back);
        dropRevealCache();
        return;
      }
    }
    const delta = revealDelta(el, getScroll());
    if (Math.abs(delta) < 1) {
      dropRevealCache();
      return;
    }
    // Pinned parallax moves the control with the scroll, so the first pass
    // clears only a fraction of the overlap. The same fraction finishes it.
    let stepDelta = delta;
    if (pass > 0) {
      const cleared = Math.abs(previous) - Math.abs(delta);
      if (cleared < 0.5) {
        dropRevealCache();
        return;
      }
      const scale = Math.abs(previous) / cleared;
      const sameWay = Math.sign(delta) === Math.sign(previous);
      if (sameWay && scale > 1 && scale < 8) stepDelta = delta * scale;
    }
    previous = stepDelta;
    pass += 1;
    scrollBy(stepDelta);
    rafId = requestAnimationFrame(step);
  };

  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(step);
}

/**
 * Drops an in-flight uncover so a hash jump is not pulled back to the control
 * that just received focus (the pager link on mousedown).
 *
 * @returns {void}
 */
export function cancelFocusReveal() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  generation += 1;
  dropRevealCache();
}

/**
 * Cancels an in-flight uncover and removes the focus listener.
 *
 * @returns {void}
 */
export function clearFocusReveal() {
  cancelFocusReveal();
  if (onFocusIn) {
    document.removeEventListener('focusin', onFocusIn);
    onFocusIn = null;
  }
}

/**
 * Scrolls a focused control into view when a cover, the sticky header, or a
 * fade is painting over it.
 *
 * @param {object} [options]
 * @param {(delta: number) => void} [options.scrollBy] Page scroll; Lenis when wired
 * @param {() => number} [options.getScroll] Current page scroll
 * @returns {void}
 */
export function bindFocusReveal(options = {}) {
  clearFocusReveal();
  const scrollBy = options.scrollBy ?? ((delta) => window.scrollBy(0, delta));
  const getScroll = options.getScroll ?? (() => window.scrollY);

  onFocusIn = (event) => {
    const { target } = event;
    if (!(target instanceof HTMLElement)) return;
    if (skipsReveal(target)) return;
    reveal(target, scrollBy, getScroll);
  };
  document.addEventListener('focusin', onFocusIn);
}

/**
 * The last rounded card garage-doors the footer menu the same way the footer
 * later reveals the Adobe logo: the menu sticks to the bottom, clips, and rises
 * behind the card until it is in, then `.section-scroll-logo` hands over to the
 * logo's own sticky.
 *
 * Uses no GSAP. One scroll frame writes both entry custom properties from the
 * shared math in `utils/entry-progress.js`: the menu's, and the logo's, which
 * `footer.js` otherwise drives on pages that never start section scroll.
 */

/** Last rounded card, raised above the footer. */
const CLASS_REVEAL = 'section-scroll-reveal';

/** `main`, scoped so mid-chain sticky cards keep their own stacking. */
const CLASS_REVEAL_MAIN = 'section-scroll-reveal-main';

/** Footer, parked behind the last card. */
const CLASS_UNDER = 'section-scroll-under';

/** Menu is fully in: release the sticky clip and let the logo take over. */
const CLASS_LOGO = 'section-scroll-logo';

const VAR_PROGRESS = '--section-scroll-inner-progress';

/** Same property `footer.js` writes for the logo rise. */
const VAR_LOGO = '--footer-logo-entry-progress';

/** @type {(() => void) | null} */
let onScroll = null;
/** @type {((event: Event) => void) | null} */
let onFooterFocusIn = null;
/** @type {((event: KeyboardEvent) => void) | null} */
let onKeyDown = null;
/** @type {(() => void) | null} */
let onPointer = null;
/** True after Tab, until a pointer press. Keyboard focus should reveal the logo. */
let keyboardNav = false;
/** @type {HTMLElement | null} */
let boundFooter = null;
/** @type {(() => void) | null} */
let syncNow = null;
let raf = 0;

/**
 * Reverts the garage door.
 *
 * @param {ParentNode} root
 * @returns {void}
 */
export function clearFooterReveal(root) {
  if (onScroll) {
    window.removeEventListener('scroll', onScroll);
    onScroll = null;
  }
  if (boundFooter && onFooterFocusIn) {
    boundFooter.removeEventListener('focusin', onFooterFocusIn);
  }
  if (onKeyDown) {
    window.removeEventListener('keydown', onKeyDown);
    onKeyDown = null;
  }
  if (onPointer) {
    window.removeEventListener('pointerdown', onPointer);
    onPointer = null;
  }
  keyboardNav = false;
  boundFooter = null;
  onFooterFocusIn = null;
  syncNow = null;
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  root.querySelectorAll(
    `.${CLASS_REVEAL}, .${CLASS_UNDER}, .${CLASS_REVEAL_MAIN}, .${CLASS_LOGO}`,
  ).forEach((el) => {
    el.classList.remove(CLASS_REVEAL, CLASS_UNDER, CLASS_REVEAL_MAIN, CLASS_LOGO);
  });
  root.querySelectorAll('.footer__inner').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.removeProperty(VAR_PROGRESS);
  });
  root.querySelectorAll('.footer__logo').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    el.style.removeProperty(VAR_LOGO);
  });
  holdLogoEntry(false);
}

/**
 * Re-measures the menu after a resize.
 *
 * @returns {void}
 */
export function refreshFooterReveal() {
  syncNow?.();
}

/**
 * Garage-doors the footer menu behind the last rounded card, and scrolls that
 * card off a focused menu control.
 *
 * @param {HTMLElement} main Page main
 * @param {ParentNode} root Tree to classify; document in production
 * @param {object} [options]
 * @param {(delta: number) => void} [options.scrollBy] Page scroll used to
 *   uncover a focused control; Lenis when section-scroll has wired it
 * @returns {void}
 */
export function bindFooterReveal(main, root, options = {}) {
  const lastRounded = [...main.querySelectorAll(':scope > .section')].filter(isRounded).at(-1);
  const doc = root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument;
  const footer = doc?.querySelector('body > footer');
  if (!(lastRounded instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

  const scrollByDelta = options.scrollBy ?? ((delta) => window.scrollBy(0, delta));

  // Own both rises before the first measurement, so the footer's logo listener
  // does not read layout on the same frames.
  holdLogoEntry(true);
  main.classList.add(CLASS_REVEAL_MAIN);
  lastRounded.classList.add(CLASS_REVEAL);
  footer.classList.add(CLASS_UNDER);

  /*
   * `.footer__inner` is built by `footer.js`, and `loadLazy` does not await
   * `loadFooter`, so it may not exist yet. Resolve it lazily rather than
   * capturing null once, or the menu stays parked at its start offset.
   * Its height only changes on resize, so cache it instead of reading layout
   * on every frame.
   */
  /** @type {HTMLElement | null} */
  let inner = null;
  let innerHeight = 0;
  /** @type {HTMLElement | null} */
  let logo = null;
  let logoHeight = 0;

  /**
   * The footer menu element. `loadFooter` may not have built `.footer__inner`
   * yet, so this retries until it exists and then caches its height.
   *
   * @returns {HTMLElement | null}
   */
  const resolve = () => {
    if (!inner?.isConnected) {
      inner = footer.querySelector('.footer__inner');
      innerHeight = 0;
    }
    if (inner && !innerHeight) innerHeight = inner.offsetHeight;
    return inner;
  };

  /**
   * The Adobe logo under the menu. Height is cached with the menu's.
   *
   * @returns {HTMLElement | null}
   */
  const resolveLogo = () => {
    if (!logo?.isConnected) {
      const found = footer.querySelector('.footer__logo');
      logo = found instanceof HTMLElement ? found : null;
      logoHeight = 0;
    }
    if (logo && !logoHeight) logoHeight = logo.offsetHeight;
    return logo;
  };

  /**
   * Writes `--section-scroll-inner-progress` and swaps in the logo sticky once
   * the menu has fully risen.
   *
   * @returns {void}
   */
  const sync = () => {
    const el = resolve();
    if (!el) return;
    const progress = entryProgress(lastRounded, el, { height: innerHeight });
    el.style.setProperty(VAR_PROGRESS, String(progress));
    footer.classList.toggle(CLASS_LOGO, progress >= ENTRY_END);

    const logoEl = resolveLogo();
    const cover = logoEl?.previousElementSibling;
    if (logoEl && cover instanceof HTMLElement) {
      logoEl.style.setProperty(
        VAR_LOGO,
        String(entryProgress(cover, logoEl, { height: logoHeight })),
      );
    }
  };

  /*
   * The last card paints over the menu while it is still in the viewport, so
   * native scroll-into-view treats the focused control as already on screen.
   * `.footer__inner` also uses `overflow: clip`, which cannot scroll. Jump the
   * page until the card's bottom sits at the menu's fully-in line. A zero
   * height means the measurement failed rather than that the menu is hidden.
   *
   * The logo sits past that line and is not a tab stop, so keyboard focus
   * keeps going until the inner's bottom has risen by the logo's height.
   * While the menu is still covered the inner is stuck to the viewport
   * bottom, and that extra distance is on top of the menu shortfall.
   */
  /**
   * Scrolls the last card off a focused menu control. Keyboard focus also
   * scrolls until the Adobe logo has fully risen.
   *
   * @param {boolean} revealLogo Whether this focus came from the keyboard
   * @returns {void}
   */
  const uncoverForFocus = (revealLogo) => {
    const el = resolve();
    if (!el || !innerHeight) return;

    const menuProgress = entryProgress(lastRounded, el, { height: innerHeight });
    let delta = 0;
    if (menuProgress < ENTRY_END) {
      delta = lastRounded.getBoundingClientRect().bottom
        - (window.innerHeight - innerHeight);
    }

    const logoEl = footer.querySelector('.footer__logo');
    const mark = logoEl instanceof HTMLElement ? logoEl.offsetHeight : 0;
    const cover = logoEl?.previousElementSibling;
    let finishLogo = false;
    if (revealLogo && logoEl instanceof HTMLElement && mark && cover instanceof HTMLElement) {
      const remaining = cover.getBoundingClientRect().bottom
        - (window.innerHeight - mark);
      if (remaining > 0) {
        delta += remaining;
        finishLogo = true;
      }
    }

    if (delta <= 0) return;
    scrollByDelta(delta);
    sync();
    // Lenis scrolls immediately and may not have run the footer's scroll
    // listener yet. The delta lands on a fully risen logo, so rest it now.
    if (finishLogo) logoEl.style.setProperty(VAR_LOGO, String(ENTRY_END));
  };

  syncNow = () => {
    innerHeight = 0;
    logoHeight = 0;
    sync();
  };

  onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      sync();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  boundFooter = footer;
  onKeyDown = (event) => {
    if (event.key === 'Tab') keyboardNav = true;
  };
  onPointer = () => {
    keyboardNav = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('pointerdown', onPointer);
  onFooterFocusIn = () => {
    const fromKeyboard = keyboardNav;
    keyboardNav = false;
    uncoverForFocus(fromKeyboard);
  };
  footer.addEventListener('focusin', onFooterFocusIn);
  sync();
}

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
