function buildCell(headerRow, headerColumn, rowIndex, colIndex) {
  const isColHeader = headerRow && rowIndex === 0;
  const isRowHeader = headerColumn && colIndex === 0 && !isColHeader;
  const cell = document.createElement(isColHeader || isRowHeader ? 'th' : 'td');

  if (isColHeader) cell.setAttribute('scope', 'col');
  if (isRowHeader) cell.setAttribute('scope', 'row');

  return cell;
}

// A fully bold first row is a column header row. A data first row stays row headers.
function firstRowIsColumnHeader(row) {
  const cells = [...(row?.children || [])];
  if (!cells.length) return false;

  return cells.every((cell) => {
    const text = cell.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return false;
    const boldText = [...cell.querySelectorAll('strong, b')]
      .map((el) => el.textContent)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    return boldText === text;
  });
}

// A first row with one merged cell above wider rows is an authored caption.
function isCaptionRow(rows) {
  return rows.length > 1
    && rows[0].children.length === 1
    && rows[1].children.length > 1;
}

const HEADINGS = 'h2, h3, h4, h5, h6';

// Closest heading above the table in the same section, or an empty string.
function previousHeadingText(element) {
  let sibling = element.previousElementSibling;
  while (sibling) {
    const heading = sibling.matches(HEADINGS)
      ? sibling
      : [...sibling.querySelectorAll(HEADINGS)].pop();
    if (heading) return heading.textContent.trim();
    sibling = sibling.previousElementSibling;
  }
  return '';
}

function scrollerLabel(caption, tableWrapper) {
  const name = caption || previousHeadingText(tableWrapper);
  return name ? `${name} (scrollable table)` : 'Scrollable table';
}

function isScrolledToEnd(tableWrapper) {
  return tableWrapper.scrollLeft + tableWrapper.clientWidth >= tableWrapper.scrollWidth - 1;
}

// Safari won't Tab into a scroll box on its own.
function setScrollerFocusable(tableWrapper, scrollable, label) {
  if (scrollable) {
    tableWrapper.tabIndex = 0;
    tableWrapper.setAttribute('role', 'region');
    tableWrapper.setAttribute('aria-label', label);
  } else {
    tableWrapper.removeAttribute('tabindex');
    tableWrapper.removeAttribute('role');
    tableWrapper.removeAttribute('aria-label');
  }
}

function bindOverflowUi(block, caption) {
  const tableWrapper = block.parentElement?.classList.contains('table-wrapper')
    ? block.parentElement
    : block;
  const label = scrollerLabel(caption, tableWrapper);

  const updateOverflowUi = () => {
    const table = block.querySelector('table');
    const scrollable = table.scrollWidth > tableWrapper.clientWidth;
    block.classList.toggle('table--scrollable', scrollable);
    setScrollerFocusable(tableWrapper, scrollable, label);
    block.classList.toggle('table--scrolled-end', isScrolledToEnd(tableWrapper));
  };

  tableWrapper.addEventListener('scroll', updateOverflowUi, { passive: true });
  // Column widths settle after fonts and later sections load, not only on window resize.
  const resizeObserver = new ResizeObserver(updateOverflowUi);
  resizeObserver.observe(tableWrapper);
  resizeObserver.observe(block.querySelector('table'));
  updateOverflowUi();
}

export default function decorate(block) {
  const authoredRows = [...block.children];
  const hasCaption = isCaptionRow(authoredRows);
  const caption = hasCaption ? authoredRows[0].textContent.replace(/\s+/g, ' ').trim() : '';
  const rows = hasCaption ? authoredRows.slice(1) : authoredRows;

  const headerColumn = block.classList.contains('header-column');
  const headerRow = !headerColumn
    || block.classList.contains('header-row')
    || firstRowIsColumnHeader(rows[0]);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // Hidden so an authored caption never changes the layout.
  if (caption) {
    const captionEl = document.createElement('caption');
    captionEl.className = 'visually-hidden';
    captionEl.textContent = caption;
    table.append(captionEl);
  }
  if (headerRow) table.append(thead);
  table.append(tbody);

  rows.forEach((child, rowIndex) => {
    const row = document.createElement('tr');
    if (headerRow && rowIndex === 0) thead.append(row);
    else tbody.append(row);

    [...child.children].forEach((col, colIndex) => {
      const cell = buildCell(headerRow, headerColumn, rowIndex, colIndex);
      cell.innerHTML = col.innerHTML;
      row.append(cell);
    });
  });

  block.replaceChildren(table);
  bindOverflowUi(block, caption);
}
