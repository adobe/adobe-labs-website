function buildCell(headerRow, headerColumn, rowIndex, colIndex) {
  const isColHeader = headerRow && rowIndex === 0;
  const isRowHeader = headerColumn && colIndex === 0 && !isColHeader;
  const cell = document.createElement(isColHeader || isRowHeader ? 'th' : 'td');

  if (isColHeader) cell.setAttribute('scope', 'col');
  if (isRowHeader) cell.setAttribute('scope', 'row');

  return cell;
}

function isScrolledToEnd(scroller) {
  return scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
}

function bindOverflowUi(block) {
  const scroller = block.parentElement?.classList.contains('table-wrapper')
    ? block.parentElement
    : block;

  const updateOverflowUi = () => {
    const scrollable = scroller.scrollWidth > scroller.clientWidth;
    block.classList.toggle('table--scrollable', scrollable);
    block.classList.toggle('table--fitted', !scrollable);
    block.classList.toggle('table--scrolled-end', isScrolledToEnd(scroller));
  };

  scroller.addEventListener('scroll', updateOverflowUi, { passive: true });
  window.addEventListener('resize', updateOverflowUi);
  updateOverflowUi();
  requestAnimationFrame(updateOverflowUi);
}

export default function decorate(block) {
  const headerColumn = block.classList.contains('header-column');
  const headerRow = !headerColumn || block.classList.contains('header-row');

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  if (headerRow) table.append(thead);
  table.append(tbody);

  [...block.children].forEach((child, rowIndex) => {
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
  bindOverflowUi(block);
}
