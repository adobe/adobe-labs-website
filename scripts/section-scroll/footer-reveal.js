/**
 * The last rounded card garage-doors the footer menu the same way the footer
 * later reveals the Adobe logo: the menu sticks to the bottom, clips, and rises
 * behind the card until it is in, then `.section-scroll-logo` hands over to the
 * logo's own sticky.
 *
 * Uses no GSAP: this is one custom property driven from scroll, and the shared
 * entry math in `utils/entry-progress.js` is the same math `footer.js` uses for
 * the logo.
 */
import { ENTRY_END, ENTRY_START, entryProgress } from '../utils/entry-progress.js';
import { setTabOrderSuppressed } from '../utils/tab-order.js';
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
    setTabOrderSuppressed(el, false);
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
 * @param {HTMLElement} main
 * @param {ParentNode} root
 * @returns {void}
 */
export function bindFooterReveal(main, root) {
  const lastRounded = [...main.querySelectorAll(':scope > .section')].filter(isRounded).at(-1);
  const doc = root.nodeType === Node.DOCUMENT_NODE ? root : root.ownerDocument;
  const footer = doc?.querySelector('body > footer');
  if (!(lastRounded instanceof HTMLElement) || !(footer instanceof HTMLElement)) return;

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

  const resolve = () => {
    if (!inner?.isConnected) {
      inner = footer.querySelector('.footer__inner');
      innerHeight = 0;
    }
    if (inner && !innerHeight) innerHeight = inner.offsetHeight;
    return inner;
  };

  const sync = () => {
    const el = resolve();
    if (!el) return;
    const progress = entryProgress(lastRounded, el, { height: innerHeight });
    el.style.setProperty(VAR_PROGRESS, String(progress));
    footer.classList.toggle(CLASS_LOGO, progress >= ENTRY_END);
    /*
     * The card covers the menu outright at ENTRY_START, so its links and the
     * newsletter field would take keyboard focus from behind it. Only when it is
     * fully covered: a menu that is partly up is visible enough to focus, and
     * WCAG 2.4.11 asks about components that are entirely hidden. A zero height
     * means the measurement failed rather than that the menu is hidden, and
     * suppressing on that would leave the footer unreachable.
     */
    setTabOrderSuppressed(el, innerHeight > 0 && progress <= ENTRY_START);
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
  sync();
}
