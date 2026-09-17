import { within } from '@testing-library/dom';
import decorate from './table.js';

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

  it('uses the first row as column headers when header-row is set', () => {
    const block = createBlock(WAGE_SUMMARY, 'table header-row');

    decorate(block);

    const table = within(block).getByRole('table');
    expect(table.querySelector('thead')).not.toBeNull();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(within(table).queryByRole('rowheader')).not.toBeInTheDocument();
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

  it('applies authored cell alignment attributes', () => {
    const block = createBlock([
      ['<p>Occupation</p>', '<p>Median</p>'],
      ['<p>Art Directors</p>', '<p>$114,850</p>'],
    ]);
    const authoredCell = block.children[1].children[1];
    authoredCell.setAttribute('data-align', 'right');
    authoredCell.setAttribute('data-valign', 'middle');

    decorate(block);

    const cell = within(block).getByRole('table').querySelector('tbody td:last-child');
    expect(cell).toHaveAttribute('data-align', 'right');
    expect(cell).toHaveAttribute('data-valign', 'middle');
    expect(cell).toHaveStyle({ textAlign: 'right', verticalAlign: 'middle' });
  });
});
