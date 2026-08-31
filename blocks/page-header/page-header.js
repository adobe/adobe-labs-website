let jumpLabelCount = 0;

function isEmptyEl(el) {
  return !el || !el.textContent.replace(/\u00a0/g, ' ').trim();
}

function nextJumpLabelId() {
  jumpLabelCount += 1;
  return `page-header-jump-${jumpLabelCount}`;
}

function decorateTitle(cell) {
  if (isEmptyEl(cell)) return null;

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

function decorateSubtitle(cell) {
  if (isEmptyEl(cell)) return null;
  cell.className = 'page-header__subtitle heading-4';
  return cell;
}

function isJumpLinksList(list) {
  if (!list) return false;
  const items = [...list.children].filter((child) => child.tagName === 'LI');
  if (!items.length) return false;
  return items.every((item) => item.querySelector('a[href]'));
}

function unwrapListItemParagraphs(list) {
  list.querySelectorAll(':scope > li > p').forEach((paragraph) => {
    paragraph.replaceWith(...paragraph.childNodes);
  });
}

function decorateJump(cell) {
  const list = cell.querySelector('ul, ol');
  if (!isJumpLinksList(list)) return null;

  unwrapListItemParagraphs(list);

  const nav = document.createElement('nav');
  nav.className = 'page-header__jump';

  const label = [...cell.children].find(
    (el) => el !== list && el.matches('p, h1, h2, h3, h4, h5, h6'),
  );
  if (label) {
    const labelId = nextJumpLabelId();
    label.id = labelId;
    label.classList.add('page-header__jump-label', 'heading-6');
    nav.setAttribute('aria-labelledby', labelId);
  } else {
    nav.setAttribute('aria-label', 'On this page');
  }

  list.classList.add('page-header__jump-list', 'heading-6');
  list.setAttribute('role', 'list');
  while (cell.firstChild) nav.append(cell.firstChild);
  return nav;
}

function decorateAside(cell) {
  if (isEmptyEl(cell)) return null;
  const jump = decorateJump(cell);
  if (jump) return jump;
  cell.className = 'page-header__aside heading-6';
  return cell;
}

/**
 * @param {Element} block The page-header block element
 */
export default function decorate(block) {
  const [titleRow, contentRow] = block.children;
  const title = decorateTitle(titleRow?.children[0]);

  const contentCells = [...(contentRow?.children ?? [])];
  const subtitle = decorateSubtitle(contentCells[0]);
  const aside = decorateAside(contentCells[1]);

  const rowParts = [subtitle, aside].filter(Boolean);
  let row = null;
  if (rowParts.length) {
    row = document.createElement('div');
    row.className = 'page-header__row';
    row.append(...rowParts);
  }

  block.replaceChildren(...[title, row].filter(Boolean));
}
