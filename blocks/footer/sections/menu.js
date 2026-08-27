import { escapeAttr, fromHTML } from '../../../scripts/utils/utils.js';

function unwrapSectionColumn(node) {
  if (node.children.length === 1 && node.firstElementChild?.tagName === 'DIV') {
    return node.firstElementChild;
  }
  return node;
}

export function parseSection(section) {
  if (!section.querySelector('h2')) return null;

  return [...section.children]
    .map((wrapper) => unwrapSectionColumn(wrapper))
    .flatMap((root) => {
      const nested = [...root.children].filter((child) => child.tagName === 'DIV' && child.querySelector('h2'));
      return nested.length > 1 ? nested : [root];
    });
}

function getDesktopQuery() {
  return window.matchMedia('(min-width: 1024px)');
}

function isNewsletterColumn(column) {
  return column.classList.contains('footer__menu-column--newsletter')
    || column.classList.contains('footer-newsletter');
}

function toggleSection(headline, expanded) {
  const section = headline.closest('.footer__menu-section');
  const items = section?.querySelector('.footer__menu-items');
  if (!items) return;
  headline.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  items.hidden = !expanded;
}

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

function decorateLink(link) {
  link.classList.add('footer__menu-link');
  return link;
}

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
