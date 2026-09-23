/**
 * The last rounded card garage-doors the footer menu the same way the footer
 * later reveals the Adobe logo: the menu sticks to the bottom, clips, and rises
 * behind the card until it is in, then `.section-scroll-logo` hands over to the
 * logo's own sticky.
 *
 * Uses no GSAP. One scroll frame writes both custom properties from the shared
 * entry math in `utils/entry-progress.js`: the menu's, and the logo's, which
 * `footer.js` otherwise drives on pages that never start section scroll. The
 * menu stays in the tab order; focusing a control that the card
 * still covers scrolls the card off it so the control is not hidden. The logo
 * is not a tab stop, so a keyboard focus into the footer also scrolls until
 * the logo has fully risen.
 */
import { ENTRY_END, entryProgress, holdLogoEntry } from '../utils/entry-progress.js';
import { isRounded } from './config-and-utils.js';

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
let onFocusIn = null;
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
  if (boundFooter && onFocusIn) {
    boundFooter.removeEventListener('focusin', onFocusIn);
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
  onFocusIn = () => {
    const fromKeyboard = keyboardNav;
    keyboardNav = false;
    uncoverForFocus(fromKeyboard);
  };
  footer.addEventListener('focusin', onFocusIn);
  sync();
}
