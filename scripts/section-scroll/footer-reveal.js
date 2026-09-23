/**
 * The last rounded card garage-doors the footer menu the same way the footer
 * later reveals the Adobe logo: the menu sticks to the bottom, clips, and rises
 * behind the card until it is in, then `.section-scroll-logo` hands over to the
 * logo's own sticky.
 *
 * Uses no GSAP: this is one custom property driven from scroll, and the shared
 * entry math in `utils/entry-progress.js` is the same math `footer.js` uses for
 * the logo. The menu stays in the tab order; focusing a control that the card
 * still covers scrolls the card off it so the control is not hidden.
 */
import { ENTRY_END, entryProgress } from '../utils/entry-progress.js';
import { isRounded } from './sections.js';

/** Last rounded card, raised above the footer. */
const CLASS_REVEAL = 'section-scroll-reveal';

/** `main`, scoped so mid-chain sticky cards keep their own stacking. */
const CLASS_REVEAL_MAIN = 'section-scroll-reveal-main';

/** Footer, parked behind the last card. */
const CLASS_UNDER = 'section-scroll-under';

/** Menu is fully in: release the sticky clip and let the logo take over. */
const CLASS_LOGO = 'section-scroll-logo';

const VAR_PROGRESS = '--section-scroll-inner-progress';

/** @type {(() => void) | null} */
let onScroll = null;
/** @type {((event: Event) => void) | null} */
let onFocusIn = null;
/** @type {HTMLElement | null} */
let boundFooter = null;
/** @type {(() => void) | null} */
let syncNow = null;
let raf = 0;

/**
 * Native page scroll used when section-scroll has not wired Lenis.
 *
 * @param {number} delta Pixels to scroll; negative moves up
 * @returns {void}
 */
function defaultScrollBy(delta) {
  window.scrollBy(0, delta);
}

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
  if (boundFooter && onFocusIn) {
    boundFooter.removeEventListener('focusin', onFocusIn);
  }
  boundFooter = null;
  onFocusIn = null;
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

  const scrollByDelta = options.scrollBy ?? defaultScrollBy;

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
  };

  /*
   * The last card paints over the menu while it is still in the viewport, so
   * native scroll-into-view treats the focused control as already on screen.
   * `.footer__inner` also uses `overflow: clip`, which cannot scroll. Jump the
   * page until the card's bottom sits at the menu's fully-in line. A zero
   * height means the measurement failed rather than that the menu is hidden.
   */
  /**
   * Scrolls the last card off a focused menu control. Native scroll-into-view
   * treats that control as on screen while the card still covers it.
   *
   * @returns {void}
   */
  const uncoverForFocus = () => {
    const el = resolve();
    if (!el || !innerHeight) return;
    const progress = entryProgress(lastRounded, el, { height: innerHeight });
    if (progress >= ENTRY_END) return;
    const delta = lastRounded.getBoundingClientRect().bottom
      - (window.innerHeight - innerHeight);
    if (delta <= 0) return;
    scrollByDelta(delta);
    sync();
  };

  syncNow = () => {
    innerHeight = 0;
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
  onFocusIn = uncoverForFocus;
  footer.addEventListener('focusin', onFocusIn);
  sync();
}
