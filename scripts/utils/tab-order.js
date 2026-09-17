/**
 * Takes the controls inside a visually hidden element out of the tab order, and
 * puts them back.
 *
 * Two things the section surfaces hide stay in the viewport rather than
 * scrolling away: a pinned card, which the cards above it cover for the rest of
 * the page; and the sticky page-header wrapper, which fades out under the nav.
 * A keyboard user would otherwise tab into controls in either of them that they
 * cannot see — WCAG 2.2 SC 2.4.11, Focus Not Obscured. The footer menu is
 * different: it is the next stop in document order, so taking it out of the tab
 * order would make it unreachable. Focusing a covered footer control scrolls
 * the last card off it instead.
 *
 * Deliberately not `inert`, and not GSAP's `autoAlpha` (which adds
 * `visibility: hidden`): both of those also drop the content from the
 * accessibility tree, so a screen reader user could no longer reach a card by
 * heading or landmark navigation, and the page header's own heading would vanish
 * a fifth of a viewport into the page. That trades a keyboard defect for a worse
 * content-loss defect. Suppressing only the tab order keeps everything readable
 * and navigable by assistive technology, and scrolling restores it.
 *
 * Lives here rather than in `section-scroll/motion.js` so the helper stays
 * importable without pulling GSAP.
 */

/** Marks an element whose tab order is currently suppressed. */
export const ATTR_SUPPRESSED = 'data-section-scroll-unfocusable';

/** Stores the tabindex a control had before it was hidden. */
export const ATTR_TABINDEX = 'data-section-scroll-tabindex';

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]',
  '[tabindex]',
].join(',');

/**
 * @param {HTMLElement} host Element whose controls should be skipped
 * @param {boolean} hidden
 * @returns {void}
 */
export function setTabOrderSuppressed(host, hidden) {
  if (hidden === host.hasAttribute(ATTR_SUPPRESSED)) return;
  host.toggleAttribute(ATTR_SUPPRESSED, hidden);
  host.querySelectorAll(FOCUSABLE).forEach((el) => {
    if (hidden) {
      // An empty stored value means the control had no tabindex of its own.
      el.setAttribute(ATTR_TABINDEX, el.getAttribute('tabindex') ?? '');
      el.setAttribute('tabindex', '-1');
      return;
    }
    const original = el.getAttribute(ATTR_TABINDEX);
    if (original === null) return;
    if (original === '') el.removeAttribute('tabindex');
    else el.setAttribute('tabindex', original);
    el.removeAttribute(ATTR_TABINDEX);
  });
}

/**
 * Restores every suppressed host in a tree. Teardown path: reverting a GSAP
 * context restores inline styles, but not attributes.
 *
 * @param {ParentNode} root
 * @returns {void}
 */
export function clearTabOrderSuppression(root) {
  root.querySelectorAll(`[${ATTR_SUPPRESSED}]`).forEach((el) => setTabOrderSuppressed(el, false));
}
