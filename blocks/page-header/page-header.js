import { getCellText } from '../../scripts/utils/utils.js';

function decorateTitle(cell) {
  if (!getCellText(cell)) return null;

  const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('page-header__title');
    return heading;
  }

  const title = document.createElement('h1');
  title.className = 'page-header__title';
  const paragraph = cell.querySelector('p');
  if (paragraph && cell.children.length === 1) {
    title.append(...paragraph.childNodes);
  } else {
    title.append(...cell.childNodes);
  }
  return title;
}

function decorateJump(cell) {
  const list = cell.querySelector('ul, ol');
  const items = list && [...list.children].filter((child) => child.tagName === 'LI');
  if (!items?.length || !items.every((item) => item.querySelector('a[href]'))) {
    return null;
  }

  list.querySelectorAll(':scope > li > p').forEach((paragraph) => {
    paragraph.replaceWith(...paragraph.childNodes);
  });

  const nav = document.createElement('nav');
  nav.className = 'page-header__jump';

  const label = [...cell.children].find(
    (el) => el !== list && el.matches('p, h1, h2, h3, h4, h5, h6'),
  );
  if (label) {
    if (!label.id) label.id = `page-header-jump-${crypto.randomUUID()}`;
    label.classList.add('page-header__jump-label', 'heading-6');
    nav.setAttribute('aria-labelledby', label.id);
  } else {
    nav.setAttribute('aria-label', 'On this page');
  }

  list.classList.add('page-header__jump-list', 'heading-6');
  list.setAttribute('role', 'list');
  while (cell.firstChild) nav.append(cell.firstChild);
  return nav;
}

/**
 * @param {Element} block The page-header block element
 */
export default function decorate(block) {
  const [titleRow, contentRow] = block.children;
  const [subtitleCell, asideCell] = contentRow?.children ?? [];

  const title = decorateTitle(titleRow?.children[0]);

  const subtitle = getCellText(subtitleCell) ? subtitleCell : null;
  if (subtitle) subtitle.className = 'page-header__subtitle heading-4';

  let aside = null;
  if (getCellText(asideCell)) {
    aside = decorateJump(asideCell) ?? asideCell;
    if (aside === asideCell) aside.className = 'page-header__aside heading-6';
  }

  const rowParts = [subtitle, aside].filter(Boolean);
  const row = rowParts.length ? document.createElement('div') : null;
  if (row) {
    row.className = 'page-header__row';
    row.append(...rowParts);
  }

  block.replaceChildren(...[title, row].filter(Boolean));
}
