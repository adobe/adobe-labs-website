function buildCell(headerRow, headerColumn, rowIndex, colIndex) {
  const isColHeader = headerRow && rowIndex === 0;
  const isRowHeader = headerColumn && colIndex === 0 && !isColHeader;
  const cell = document.createElement(isColHeader || isRowHeader ? 'th' : 'td');

  if (isColHeader) cell.setAttribute('scope', 'col');
  if (isRowHeader) cell.setAttribute('scope', 'row');

  return cell;
}

function applyCellAlignment(cell, source) {
  const align = source.getAttribute('data-align');
  const valign = source.getAttribute('data-valign');

  if (align) {
    cell.setAttribute('data-align', align);
    cell.style.textAlign = align;
  }

  if (valign) {
    cell.setAttribute('data-valign', valign);
    cell.style.verticalAlign = valign;
  }
}

function isScrolledToEnd(scroller) {
  return scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
}

function contentWidth(scroller, table) {
  return Math.max(scroller.scrollWidth, table?.scrollWidth ?? 0);
}

function availableWidth(scroller) {
  return scroller.offsetWidth || scroller.clientWidth;
}

function bindOverflowUi(block) {
  const scroller = block.parentElement?.classList.contains('table-wrapper')
    ? block.parentElement
    : block;
  const table = block.querySelector('table');

  const applyScrollable = (scrollable) => {
    block.classList.toggle('table--scrollable', scrollable);
    if (scroller.classList.contains('table-wrapper')) {
      scroller.classList.toggle('table-wrapper--scrollable', scrollable);
    }
  };

  const updateScrollable = () => {
    applyScrollable(contentWidth(scroller, table) > availableWidth(scroller));
  };

  const updateFade = () => {
    const scrollable = block.classList.contains('table--scrollable');
    block.classList.toggle('table--scrolled-end', scrollable && isScrolledToEnd(scroller));
  };

  const update = () => {
    updateScrollable();
    updateFade();
  };

  scroller.addEventListener('scroll', updateFade, { passive: true });
  window.addEventListener('resize', update);

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(block);
    if (table) observer.observe(table);
  }

  update();
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
      applyCellAlignment(cell, col);
      cell.innerHTML = col.innerHTML;
      row.append(cell);
    });
  });

  block.replaceChildren(table);
  bindOverflowUi(block);
}
