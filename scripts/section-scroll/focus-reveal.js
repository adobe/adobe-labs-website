/**
 * Scrolls a focused control fully into view when a section cover, the sticky
 * header, or a section-scroll fade is painting over it.
 *
 * The browser's own focus scroll only checks that the control is inside the
 * viewport. A pinned card stays in that viewport while the next section draws
 * on top of it, so the control is "on screen" and still hidden. Taking it out
 * of the tab order would skip something the user can reach; scrolling until it
 * is clear keeps it reachable (WCAG 2.2 SC 2.4.11). The scroll is limited so
 * the control itself stays inside the viewport.
 *
 * The footer menu is not handled here. Its clip and translate mean a rectangle
 * clearance fights the garage door, so `footer-reveal.js` scrolls that card
 * off on its own `focusin`.
 */
import {
  CLASS_FADE,
  CLASS_INTRO,
  COVER_START_VH,
} from './sections.js';

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
 * Document Y of `el` in layout. Chrome's `offsetTop` on a sticky card is the
 * pinned box (same lie as `getBoundingClientRect`), so a Previous pager would
 * stop short of the section top. Previous siblings' heights do not move when
 * those siblings stick.
 *
 * @param {HTMLElement} el
 * @returns {number}
 */
export function layoutTop(el) {
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
    let skipped = 0;
    for (const child of parent.children) {
      if (child === node) break;
      if (!(child instanceof HTMLElement)) continue;
      const cs = getComputedStyle(child);
      y += (parseFloat(cs.marginTop) || 0)
        + child.offsetHeight
        + (parseFloat(cs.marginBottom) || 0);
      skipped += 1;
    }
    y += parseFloat(getComputedStyle(node).marginTop) || 0;
    if (skipped) y += gap * skipped;
    node = parent;
  }
  return y;
}

/**
 * Parsed `--nav-height`, or 0 when the custom property is missing.
 *
 * @returns {number}
 */
function navHeight() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--nav-height');
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
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
  let node = el;
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement && isCurrentlyStuck(node)) return true;
    node = node.parentElement;
  }
  return false;
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
      for (const sibling of section.children) {
        if (!(sibling instanceof HTMLElement) || sibling === fade) continue;
        if (sibling.classList.contains('section-scroll-overlay')) continue;
        if (overlaps(sibling.getBoundingClientRect(), rect)) return -scroll;
      }
    }
  }

  let node = el.parentElement;
  while (node && node !== document.body) {
    if (!(node instanceof HTMLElement)) break;
    const opacity = parseFloat(getComputedStyle(node).opacity);
    if (Number.isFinite(opacity) && opacity < 1) {
      const section = node.closest('main > .section');
      const next = section?.nextElementSibling;
      if (!(section instanceof HTMLElement) || !(next instanceof HTMLElement)) return 0;
      const line = section.classList.contains(CLASS_INTRO)
        ? Math.min(section.offsetHeight, window.innerHeight)
        : window.innerHeight * COVER_START_VH;
      const delta = layoutTop(next) - line - scroll;
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
 * @returns {number}
 */
function headerDelta(el, rect) {
  const nav = navHeight();
  if (rect.top >= nav + RING) return 0;
  // A control parked against the nav by its own sticky cannot drop the ring
  // below the header; scrolling would repeat the same few pixels.
  if (hasStuckAncestor(el) && rect.top >= nav - 1) return 0;
  return rect.top - nav - RING;
}

/**
 * Points inside `rect` that are also inside the viewport, for hit-testing what
 * paints over the control.
 *
 * @param {DOMRect} rect Focused control's visual box
 * @returns {Array<[number, number]>}
 */
function samplePoints(rect) {
  const inset = 1;
  const candidates = [
    [rect.left + rect.width / 2, rect.top + rect.height / 2],
    [rect.left + inset, rect.top + inset],
    [rect.right - inset, rect.top + inset],
    [rect.left + inset, rect.bottom - inset],
    [rect.right - inset, rect.bottom - inset],
  ];
  return candidates.filter(([x, y]) => (
    x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight
  ));
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
 * Sections painting over `el`. The next sibling is included even when only
 * the control's edge is covered, which a center hit-test would miss.
 *
 * @param {HTMLElement} el
 * @param {DOMRect} rect
 * @returns {HTMLElement[]}
 */
function obscurers(el, rect) {
  /** @type {HTMLElement[]} */
  const list = [];
  /**
   * Records a section that paints over the focused control. Skips the control's
   * own section, and the page header and footer.
   *
   * @param {Element | null} section
   * @returns {void}
   */
  const add = (section) => {
    if (!(section instanceof HTMLElement)) return;
    if (section.contains(el) || el.contains(section)) return;
    if (section.tagName === 'HEADER' || section.tagName === 'FOOTER') return;
    if (!list.includes(section)) list.push(section);
  };

  const own = el.closest('main > .section');
  const next = own?.nextElementSibling;
  if (next instanceof HTMLElement && next.classList.contains('section')) {
    const focus = new DOMRect(
      rect.left - COVER_CLEARANCE,
      rect.top - COVER_CLEARANCE,
      rect.width + COVER_CLEARANCE * 2,
      rect.height + COVER_CLEARANCE * 2,
    );
    if (overlaps(next.getBoundingClientRect(), focus)) add(next);
  }

  if (typeof document.elementsFromPoint === 'function') {
    samplePoints(rect).forEach(([x, y]) => {
      const hit = document.elementsFromPoint(x, y).find((node) => (
        node instanceof Element && node !== el && !el.contains(node) && !node.contains(el)
      ));
      const section = hit?.closest('main > .section');
      if (section instanceof HTMLElement) add(section);
    });
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
  const start = el.closest('main > .section') || el;
  let sibling = start.nextElementSibling;
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
 * @returns {number}
 */
function movementClamp(rect, delta) {
  if (Math.abs(delta) < 1) return 0;
  const minTop = navHeight() + RING;
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
      const header = headerDelta(el, rect);
      delta = header < -1 ? header : 0;
    }
  }

  // A stuck control stays put while the cover moves, so the viewport clamp
  // would stop the scroll short and leave the last line covered.
  if (hasStuckAncestor(el)) return delta;
  return movementClamp(rect, delta);
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
    if (id !== generation || !el.isConnected) return;
    if (pass >= MAX_PASSES) return;
    // Parallax can move the control after the uncover scroll. If that lands
    // it fully outside the viewport, bring it back and stop.
    if (pass > 0 && !hasStuckAncestor(el)) {
      const rect = el.getBoundingClientRect();
      const offscreen = rect.bottom <= 0 || rect.top >= window.innerHeight;
      const back = intoViewDelta(rect);
      if (offscreen && Math.abs(back) >= 1) {
        scrollBy(back);
        return;
      }
    }
    const delta = revealDelta(el, getScroll());
    if (Math.abs(delta) < 1) return;
    // Pinned parallax moves the control with the scroll, so the first pass
    // clears only a fraction of the overlap. The same fraction finishes it.
    let stepDelta = delta;
    if (pass > 0) {
      const cleared = Math.abs(previous) - Math.abs(delta);
      if (cleared < 0.5) return;
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
