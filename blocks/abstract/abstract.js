const DEFAULT_TITLE = 'Key findings';
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

function isNumbered(block) {
  return block.classList.contains('numbered') || block.classList.contains('ordered');
}

function decorateTitle(headingRow) {
  const cell = headingRow?.firstElementChild || document.createElement('div');
  cell.className = 'abstract__title';

  const heading = cell.querySelector(HEADING_SELECTOR);
  if (heading) {
    if (!heading.textContent.trim()) heading.textContent = DEFAULT_TITLE;
    return cell;
  }

  const h2 = document.createElement('h2');
  h2.textContent = cell.textContent.trim() || DEFAULT_TITLE;
  cell.replaceChildren(h2);
  return cell;
}

function hasItemContent(row) {
  return Boolean(row.firstElementChild?.textContent.trim());
}

function buildItem(row, number, numbered) {
  const cell = row.firstElementChild;
  const item = document.createElement('li');
  item.className = 'abstract__item';

  if (numbered) {
    const marker = document.createElement('span');
    marker.className = 'abstract__number';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = String(number);
    item.append(marker);
  }

  cell.className = 'abstract__body';
  item.append(cell);
  return item;
}

export default function decorate(block) {
  const [headingRow, ...itemRows] = [...block.children];
  const numbered = isNumbered(block);
  const title = decorateTitle(headingRow);

  const list = document.createElement(numbered ? 'ol' : 'ul');
  list.className = 'abstract__items';

  itemRows.forEach((row) => {
    if (!hasItemContent(row)) return;
    list.append(buildItem(row, list.children.length + 1, numbered));
  });

  block.replaceChildren(title, list);
}
