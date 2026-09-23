import decorate from './abstract.js';

function createBlock(html, className = 'abstract') {
  const block = document.createElement('div');
  block.className = className;
  block.innerHTML = html;
  return block;
}

const TITLE_AND_ITEMS = `
  <div>
    <div><h3>Custom findings</h3></div>
  </div>
  <div>
    <div><p>First finding</p></div>
  </div>
  <div>
    <div><p>Second finding</p></div>
  </div>
  <div>
    <div><p>Third finding</p></div>
  </div>
`;

const EMPTY_TITLE = `
  <div>
    <div></div>
  </div>
  <div>
    <div><p>Only finding</p></div>
  </div>
`;

const EMPTY_HEADING = `
  <div>
    <div><h2>   </h2></div>
  </div>
  <div>
    <div><p>Only finding</p></div>
  </div>
`;

const PARAGRAPH_TITLE = `
  <div>
    <div><p>Plain title</p></div>
  </div>
  <div>
    <div><p>Only finding</p></div>
  </div>
`;

const EMPTY_ITEM_ROW = `
  <div>
    <div><h2>Key findings</h2></div>
  </div>
  <div></div>
  <div>
    <div><p>Kept finding</p></div>
  </div>
  <div>
    <div>   </div>
  </div>
`;

describe('abstract block', () => {
  it('uses Key findings as the title when the first row is empty', () => {
    const block = createBlock(EMPTY_TITLE);

    decorate(block);

    expect(block.querySelector('.abstract__title h2')).toHaveTextContent('Key findings');
    expect(block.querySelector('.abstract__body')).toHaveTextContent('Only finding');
  });

  it('uses Key findings when the authored heading has no text', () => {
    const block = createBlock(EMPTY_HEADING);

    decorate(block);

    expect(block.querySelector('.abstract__title h2')).toHaveTextContent('Key findings');
  });

  it('preserves the authored heading level instead of forcing a specific tag', () => {
    const block = createBlock(TITLE_AND_ITEMS);

    decorate(block);

    expect(block.querySelector('.abstract__title h3')).toHaveTextContent('Custom findings');
    expect(block.querySelector('.abstract__title h2')).not.toBeInTheDocument();
  });

  it('wraps non-heading title text in an h2', () => {
    const block = createBlock(PARAGRAPH_TITLE);

    decorate(block);

    expect(block.querySelector('.abstract__title h2')).toHaveTextContent('Plain title');
  });

  it('renders three or more item rows', () => {
    const block = createBlock(TITLE_AND_ITEMS);

    decorate(block);

    const items = block.querySelectorAll('.abstract__items > .abstract__item');
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('.abstract__body')).toHaveTextContent('First finding');
    expect(items[1].querySelector('.abstract__body')).toHaveTextContent('Second finding');
    expect(items[2].querySelector('.abstract__body')).toHaveTextContent('Third finding');
  });

  it('skips item rows with no cells or only whitespace', () => {
    const block = createBlock(EMPTY_ITEM_ROW);

    decorate(block);

    const items = block.querySelectorAll('.abstract__item');
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('.abstract__body')).toHaveTextContent('Kept finding');
  });

  it('renders an ordered list with visual numbers when numbered', () => {
    const block = createBlock(TITLE_AND_ITEMS, 'abstract numbered');

    decorate(block);

    const list = block.querySelector('.abstract__items');
    expect(list.tagName).toBe('OL');

    const numbers = [...block.querySelectorAll('.abstract__number')];
    expect(numbers.map((el) => el.textContent)).toEqual(['1', '2', '3']);
    numbers.forEach((el) => {
      expect(el).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('renders an ordered list with visual numbers when ordered', () => {
    const block = createBlock(TITLE_AND_ITEMS, 'abstract ordered');

    decorate(block);

    expect(block.querySelector('.abstract__items').tagName).toBe('OL');
    expect(block.querySelectorAll('.abstract__number')).toHaveLength(3);
  });

  it('renders an unordered list without numbers when the numbered option is absent', () => {
    const block = createBlock(TITLE_AND_ITEMS);

    decorate(block);

    expect(block.querySelector('.abstract__items').tagName).toBe('UL');
    expect(block.querySelector('.abstract__number')).not.toBeInTheDocument();
  });
});
