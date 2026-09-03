import decorate from './description-list.js';

function createBlock(html) {
  const block = document.createElement('div');
  block.innerHTML = html;
  return block;
}

const HEADING_AND_ITEMS = `
  <div>
    <div><h2>Coming to the Playground</h2></div>
    <div></div>
  </div>
  <div>
    <div><h3>Provenance explorer</h3></div>
    <div><p>Inspect the Content Credentials attached to a piece of media.</p></div>
  </div>
  <div>
    <div><h3>Taste vs. generation</h3></div>
    <div><p>A playable data narrative on human judgment.</p></div>
  </div>
`;

const ITEM_MISSING_DESCRIPTION = `
  <div>
    <div><h2>Heading</h2></div>
    <div></div>
  </div>
  <div>
    <div><h3>Term only</h3></div>
  </div>
`;

const ROW_WITH_NO_CELLS = `
  <div>
    <div><h2>Heading</h2></div>
    <div></div>
  </div>
  <div></div>
`;

describe('description-list block', () => {
  it('builds a heading and a list of items from the authored rows', () => {
    const block = createBlock(HEADING_AND_ITEMS);

    decorate(block);

    expect(block.querySelector('.description-list__heading')).toContainHTML('<h2>Coming to the Playground</h2>');

    const items = block.querySelectorAll('.description-list__items > .description-list__item');
    expect(items).toHaveLength(2);

    expect(items[0].querySelector('.description-list__item-heading')).toHaveTextContent('Provenance explorer');
    expect(items[0].querySelector('.description-list__item-body')).toHaveTextContent(
      'Inspect the Content Credentials attached to a piece of media.',
    );
  });

  it('preserves the authored heading level instead of forcing a specific tag', () => {
    const block = createBlock(HEADING_AND_ITEMS);

    decorate(block);

    expect(block.querySelector('.description-list__heading h2')).not.toBeNull();
    expect(block.querySelector('.description-list__item-heading h3')).not.toBeNull();
  });

  it('renders an item with only a term when the description cell is omitted', () => {
    const block = createBlock(ITEM_MISSING_DESCRIPTION);

    decorate(block);

    const item = block.querySelector('.description-list__item');
    expect(item.querySelector('.description-list__item-heading')).toHaveTextContent('Term only');
    expect(item.querySelector('.description-list__item-body')).not.toBeInTheDocument();
  });

  it('skips a row with no cells at all', () => {
    const block = createBlock(ROW_WITH_NO_CELLS);

    decorate(block);

    expect(block.querySelectorAll('.description-list__item')).toHaveLength(0);
  });
});
