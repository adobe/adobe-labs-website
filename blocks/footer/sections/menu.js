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
  const headline = document.createElement('div');
  headline.className = toggle
    ? 'footer__menu-headline footer__menu-headline--toggle'
    : 'footer__menu-headline';
  headline.textContent = elem.textContent.trim();
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
  const wrapper = document.createElement('div');
  wrapper.className = 'footer__menu-column footer__menu-column--nav';

  const heading = column.querySelector('h2');
  if (heading) {
    const section = document.createElement('div');
    section.className = 'footer__menu-section';
    const items = document.createElement('div');
    items.className = 'footer__menu-items';
    section.append(decorateHeadline(heading, items, { toggle: true }), items);
    column.querySelectorAll('p a').forEach((link) => {
      items.append(decorateLink(link));
    });
    wrapper.append(section);
  }

  column.replaceWith(wrapper);
  return wrapper;
}

export default function decorateMenuColumns(columns) {
  if (!columns?.length) return null;

  const menu = document.createElement('div');
  menu.className = 'footer__menu';

  const navColumns = document.createElement('div');
  navColumns.className = 'footer__menu-nav';

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
