import { fromHTML } from '../../../scripts/utils/utils.js';
import { isNewsletterColumn } from './newsletter.js';

/**
 * Extracts menu column roots from a fragment section that contains h2 headings.
 * @param {Element} section Fragment section element
 * @returns {Element[]|null}
 */
export function parseSection(section) {
  if (!section.querySelector('h2')) return null;

  return [...section.children].map((child) => (
    child.children.length === 1 && child.firstElementChild?.tagName === 'DIV'
      ? child.firstElementChild
      : child
  ));
}

/**
 * Syncs nav headline a11y and item visibility for the current viewport.
 * @param {Element} heading Menu headline element
 * @param {Element} items Menu items container
 * @param {MediaQueryList} desktopQuery Desktop layout media query
 */
function syncHeadline(heading, items, desktopQuery) {
  if (desktopQuery.matches) {
    heading.removeAttribute('role');
    heading.removeAttribute('tabindex');
    heading.removeAttribute('aria-expanded');
    heading.removeAttribute('aria-haspopup');
    items.hidden = false;
    return;
  }

  heading.setAttribute('role', 'button');
  heading.setAttribute('tabindex', '0');
  heading.setAttribute('aria-expanded', 'false');
  heading.setAttribute('aria-haspopup', 'true');
  items.hidden = true;
}

/**
 * Makes a nav column heading an accordion toggle on mobile.
 * @param {Element} heading Authored h2 element
 * @param {Element} items Menu items container
 */
function decorateHeadline(heading, items) {
  heading.classList.add('footer__menu-headline', 'footer__menu-headline--toggle');

  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const onActivate = (e) => {
    if (desktopQuery.matches) return;
    if (e.type === 'keydown' && e.code !== 'Enter' && e.code !== 'Space') return;
    if (e.type === 'keydown') e.preventDefault();

    const expanded = heading.getAttribute('aria-expanded') === 'true';
    heading.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    items.hidden = expanded;
  };

  heading.addEventListener('click', onActivate);
  heading.addEventListener('keydown', onActivate);
  desktopQuery.addEventListener('change', () => syncHeadline(heading, items, desktopQuery));
  syncHeadline(heading, items, desktopQuery);
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
    section.prepend(heading);
    decorateHeadline(heading, items);
    column.querySelectorAll('p a').forEach((link) => {
      link.classList.add('footer__menu-link');
      items.append(link);
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
