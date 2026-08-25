function getDesktopQuery() {
  return window.matchMedia('(min-width: 900px)');
}

function toggleSection(headline, expanded) {
  const section = headline.closest('.footer-menu-section');
  const items = section?.querySelector('.footer-menu-items');
  if (!items) return;
  headline.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  items.hidden = !expanded;
}

function decorateHeadline(elem, items) {
  const headline = document.createElement('div');
  headline.className = 'footer-menu-headline';
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

  headline.addEventListener('click', handleActivate);
  headline.addEventListener('keydown', handleActivate);

  setHeadlineAttributes();
  getDesktopQuery().addEventListener('change', setHeadlineAttributes);

  return headline;
}

function decorateLink(link) {
  link.classList.add('footer-nav-link');
  return link;
}

function decorateColumn(column) {
  const wrapper = document.createElement('div');
  wrapper.className = 'footer-menu-column';

  const heading = column.querySelector('h2');
  if (heading) {
    const section = document.createElement('div');
    section.className = 'footer-menu-section';
    const items = document.createElement('div');
    items.className = 'footer-menu-items';
    section.append(decorateHeadline(heading, items), items);
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
  menu.className = 'footer-menu-columns';

  columns.forEach((column) => {
    if (column.classList.contains('footer-newsletter')) {
      menu.append(column);
      return;
    }
    if (column.querySelector('h2')) {
      menu.append(decorateColumn(column));
    }
  });

  return menu;
}
