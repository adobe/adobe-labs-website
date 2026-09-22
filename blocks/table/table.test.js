import { within } from '@testing-library/dom';
import decorate from './table.js';

function mockScrollerWidths(wrapper, { tableScrollWidth, clientWidth }) {
  Object.defineProperty(wrapper, 'scrollWidth', { configurable: true, writable: true, value: tableScrollWidth });
  Object.defineProperty(wrapper, 'clientWidth', { configurable: true, value: clientWidth });
}

function mockTableScrollWidth(table, tableScrollWidth) {
  Object.defineProperty(table, 'scrollWidth', { configurable: true, writable: true, value: tableScrollWidth });
}

function createBlock(rows, className = 'table') {
  const block = document.createElement('div');
  block.className = className;
  rows.forEach((cells) => {
    const row = document.createElement('div');
    cells.forEach((html) => {
      const cell = document.createElement('div');
      cell.innerHTML = html;
      row.append(cell);
    });
    block.append(row);
  });
  return block;
}

function mockSitePad(wrapper, sitePad) {
  if (!sitePad) return () => {};
  const getComputedStyle = window.getComputedStyle.bind(window);
  const spy = jest.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
    const styles = getComputedStyle(el);
    if (el !== wrapper) return styles;
    return {
      getPropertyValue: (name) => (
        name === '--site-root-inline-padding' ? `${sitePad}px` : styles.getPropertyValue(name)
      ),
    };
  });
  return () => spy.mockRestore();
}

function decorateInWrapper(block, widths) {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper';
  wrapper.append(block);
  document.body.append(wrapper);
  mockScrollerWidths(wrapper, widths);
  Object.defineProperty(wrapper, 'scrollLeft', { configurable: true, writable: true, value: 0 });
  const restoreSitePad = mockSitePad(wrapper, widths.sitePad);

  const createElement = document.createElement.bind(document);
  const spy = jest.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
    const el = createElement(tagName, options);
    if (String(tagName).toLowerCase() === 'table') {
      mockTableScrollWidth(el, widths.tableScrollWidth);
    }
    return el;
  });

  decorate(block);
  spy.mockRestore();
  wrapper.restoreSitePad = restoreSitePad;
  return wrapper;
}

const WAGE_SUMMARY = [
  [
    '<p>Occupation</p>',
    '<p>SOC</p>',
    '<p>Median</p>',
    '<p>Mean</p>',
    '<p>U.S. employment</p>',
  ],
  [
    '<p>Art Directors</p>',
    '<p>27-1011</p>',
    '<p>$114,850</p>',
    '<p>$129,440</p>',
    '<p>53,070</p>',
  ],
  [
    '<p>Graphic Designers</p>',
    '<p>27-1024</p>',
    '<p>$62,960</p>',
    '<p>$70,560</p>',
    '<p>197,830</p>',
  ],
  [
    '<p>Web and Digital Interface Designers</p>',
    '<p>15-1255</p>',
    '<p>$104,000</p>',
    '<p>$117,490</p>',
    '<p>113,330</p>',
  ],
];

const HEADER_COLUMN_ROWS = [
  ['<p>Occupation</p>', '<p>Art Directors</p>', '<p>Graphic Designers</p>'],
  ['<p>Median</p>', '<p>$114,850</p>', '<p>$62,960</p>'],
];

const HTML_CELLS = [
  ['<p>Source</p>', '<p>Note</p>'],
  [
    '<p><a href="https://www.bls.gov/">BLS</a></p>',
    '<p>Includes <em>median</em> wages</p>',
  ],
];

describe('table block', () => {
  afterEach(() => {
    document.body.replaceChildren();
    jest.restoreAllMocks();
  });

  it('renders any number of rows and columns from the wage-summary grid', () => {
    const block = createBlock(WAGE_SUMMARY);

    decorate(block);

    const table = within(block).getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    rows.forEach((row) => {
      expect(row.children).toHaveLength(5);
    });
    expect(table).toHaveTextContent('Art Directors');
    expect(table).toHaveTextContent('113,330');
  });

  it('uses the first row as column headers by default', () => {
    const block = createBlock(WAGE_SUMMARY);

    decorate(block);

    const table = within(block).getByRole('table');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
    expect(within(table).getAllByRole('columnheader').map((el) => el.textContent))
      .toEqual(['Occupation', 'SOC', 'Median', 'Mean', 'U.S. employment']);
    expect(within(table).queryByRole('rowheader')).not.toBeInTheDocument();
    expect(table.querySelectorAll('tbody td')).toHaveLength(15);
  });

  it('uses the first cell of each row as a row header when header-column is set', () => {
    const block = createBlock(HEADER_COLUMN_ROWS, 'table header-column');

    decorate(block);

    const table = within(block).getByRole('table');
    expect(table.querySelector('thead')).toBeNull();
    expect(within(table).queryByRole('columnheader')).not.toBeInTheDocument();
    expect(within(table).getAllByRole('rowheader').map((el) => el.textContent))
      .toEqual(['Occupation', 'Median']);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2);
    expect(table.querySelectorAll('tbody td')).toHaveLength(4);
  });

  it('renders column headers and row headers when both options are set', () => {
    const block = createBlock(WAGE_SUMMARY, 'table header-row header-column');

    decorate(block);

    const table = within(block).getByRole('table');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(table).getAllByRole('rowheader').map((el) => el.textContent))
      .toEqual([
        'Art Directors',
        'Graphic Designers',
        'Web and Digital Interface Designers',
      ]);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(3);
    expect(table.querySelectorAll('tbody td')).toHaveLength(12);
  });

  it('keeps cell HTML such as links and emphasis', () => {
    const block = createBlock(HTML_CELLS);

    decorate(block);

    const table = within(block).getByRole('table');
    const link = within(table).getByRole('link', { name: 'BLS' });
    expect(link).toHaveAttribute('href', 'https://www.bls.gov/');
    expect(table.querySelector('em')).toHaveTextContent('median');
  });

  it('keeps empty cells as th or td', () => {
    const block = createBlock([
      ['<p>Occupation</p>', '<p>SOC</p>'],
      ['<p>Art Directors</p>', ''],
    ]);

    decorate(block);

    const table = within(block).getByRole('table');
    const bodyCells = table.querySelectorAll('tbody td');
    expect(bodyCells).toHaveLength(2);
    expect(bodyCells[1]).toBeEmptyDOMElement();
  });

  it('hides the end fade when the wrapper is scrolled to the right', () => {
    const block = createBlock(WAGE_SUMMARY);
    const wrapper = decorateInWrapper(block, { tableScrollWidth: 500, clientWidth: 200 });

    expect(block).toHaveClass('table--scrollable');
    expect(block).not.toHaveClass('table--fitted');
    expect(block).not.toHaveClass('table--scrolled-end');

    wrapper.scrollLeft = 300;
    wrapper.dispatchEvent(new Event('scroll'));

    expect(block).toHaveClass('table--scrollable');
    expect(block).toHaveClass('table--scrolled-end');

    wrapper.remove();
  });

  it('hides the end fade after resize when the table fits', () => {
    const block = createBlock(WAGE_SUMMARY);
    const wrapper = decorateInWrapper(block, { tableScrollWidth: 900, clientWidth: 400 });

    expect(block).toHaveClass('table--scrollable');
    expect(block).not.toHaveClass('table--fitted');
    expect(block).not.toHaveClass('table--scrolled-end');

    const table = block.querySelector('table');
    table.scrollWidth = 300;
    wrapper.scrollWidth = 300;
    window.dispatchEvent(new Event('resize'));

    expect(block).not.toHaveClass('table--scrollable');
    expect(block).not.toHaveClass('table--fitted');
    expect(block).toHaveClass('table--scrolled-end');

    wrapper.remove();
  });

  it('keeps a table fitted when it only fills the padded column', () => {
    const block = createBlock(WAGE_SUMMARY);
    const wrapper = decorateInWrapper(block, {
      tableScrollWidth: 400,
      clientWidth: 400,
      sitePad: 16,
    });

    expect(block).not.toHaveClass('table--scrollable');
    expect(block).not.toHaveClass('table--fitted');

    wrapper.remove();
  });
});
