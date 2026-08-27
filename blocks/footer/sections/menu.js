import { escapeAttr, fromHTML } from '../../../scripts/utils/utils.js';

/**
 * Unwraps a single nested wrapper div if present.
 * @param {Element} node Section or column node
 * @returns {Element}
 */
function unwrapSectionColumn(node) {
  if (node.children.length === 1 && node.firstElementChild?.tagName === 'DIV') {
    return node.firstElementChild;
  }
  return node;
}

/**
 * Extracts menu column roots from a fragment section that contains h2 headings.
 * @param {Element} section Fragment section element
 * @returns {Element[]|null}
 */
export function parseSection(section) {
  if (!section.querySelector('h2')) return null;

  return [...section.children]
    .map((wrapper) => unwrapSectionColumn(wrapper))
    .flatMap((root) => {
      const nested = [...root.children].filter((child) => child.tagName === 'DIV' && child.querySelector('h2'));
      return nested.length > 1 ? nested : [root];
    });
}

/**
 * Media query for desktop footer menu layout.
 * @returns {MediaQueryList}
 */
function getDesktopQuery() {
  return window.matchMedia('(min-width: 1024px)');
}

/**
 * Whether a menu column is the newsletter column.
 * @param {Element} column Menu column element
 * @returns {boolean}
 */
function isNewsletterColumn(column) {
  return column.classList.contains('footer__menu-column--newsletter')
    || column.classList.contains('footer-newsletter');
}

/**
 * Expands or collapses a mobile menu section.
 * @param {Element} headline Menu headline element
 * @param {boolean} expanded Whether the section should be expanded
 */
function toggleSection(headline, expanded) {
  const section = headline.closest('.footer__menu-section');
  const items = section?.querySelector('.footer__menu-items');
  if (!items) return;
  headline.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  items.hidden = !expanded;
}

/**
 * Replaces an authored heading with a styled headline, optionally as a toggle.
 * @param {Element} elem Authored heading element
 * @param {Element|null} items Menu items container
 * @param {{ toggle?: boolean }} [options] Headline options
 * @returns {Element}
 */
function decorateHeadline(elem, items, { toggle = false } = {}) {
  const className = toggle
    ? 'footer__menu-headline footer__menu-headline--toggle'
    : 'footer__menu-headline';
  const headline = fromHTML(
    `<div class="${className}">${escapeAttr(elem.textContent.trim())}</div>`,
  );
  elem.remove();

  const setHeadlineAttributes = () => {
    if (getDesktopQuery().matches) {
      headline.setAttribute('role', 'heading');
      headline.setAttribute('aria-level', '2');
      headline.removeAttribute('tabindex');
      headline.removeAttribute('aria-expanded');
      headline.removeAttribute('aria-haspopup');
      if (items) items.hidden = false;
    } else {
      headline.setAttribute('role', 'button');
      headline.setAttribute('tabindex', '0');
      headline.setAttribute('aria-expanded', 'false');
      headline.setAttribute('aria-haspopup', 'true');
      if (items) items.hidden = true;
    }
  };

  const handleActivate = (e) => {
    if (getDesktopQuery().matches) return;
    if (e.type === 'keydown' && e.code !== 'Enter' && e.code !== 'Space') return;
    if (e.type === 'keydown') e.preventDefault();
    const expanded = headline.getAttribute('aria-expanded') === 'true';
    toggleSection(headline, !expanded);
  };

  if (toggle) {
    headline.addEventListener('click', handleActivate);
    headline.addEventListener('keydown', handleActivate);
    setHeadlineAttributes();
    getDesktopQuery().addEventListener('change', setHeadlineAttributes);
  } else {
    headline.setAttribute('role', 'heading');
    headline.setAttribute('aria-level', '2');
  }

  return headline;
}

/**
 * Applies menu link styling to an anchor.
 * @param {HTMLAnchorElement} link Menu link element
 * @returns {HTMLAnchorElement}
 */
function decorateLink(link) {
  link.classList.add('footer__menu-link');
  return link;
}

/**
 * Decorates a single nav menu column with headline and links.
 * @param {Element} column Authored menu column element
 * @returns {Element}
 */
function decorateColumn(column) {
  const wrapper = fromHTML(`
    <div class="footer__menu-column footer__menu-column--nav">
      <div class="footer__menu-section">
        <div class="footer__menu-items"></div>
      </div>
    </div>
  `);

  const section = wrapper.querySelector('.footer__menu-section');
  const items = wrapper.querySelector('.footer__menu-items');
  const heading = column.querySelector('h2');

  if (heading) {
    section.prepend(decorateHeadline(heading, items, { toggle: true }));
    column.querySelectorAll('p a').forEach((link) => {
      items.append(decorateLink(link));
    });
  }

  column.replaceWith(wrapper);
  return wrapper;
}

/**
 * Builds the footer menu from newsletter and nav columns.
 * @param {Element[]} columns Decorated and authored menu columns
 * @returns {Element|null}
 */
export default function decorateMenuColumns(columns) {
  if (!columns?.length) return null;

  const menu = fromHTML('<div class="footer__menu"></div>');
  const navColumns = fromHTML('<div class="footer__menu-nav"></div>');

  columns.forEach((column) => {
    if (isNewsletterColumn(column)) {
      menu.append(column);
      return;
    }
    if (column.querySelector('h2')) {
      navColumns.append(decorateColumn(column));
    }
  });

  if (navColumns.childElementCount) {
    menu.append(navColumns);
  }

  return menu;
}
