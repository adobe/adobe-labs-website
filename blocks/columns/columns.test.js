import decorate from './columns.js';

function createBlock(html) {
  const block = document.createElement('div');
  block.innerHTML = html;
  return block;
}

const TWO_COLS_WITH_IMAGE = `
  <div>
    <div><picture><img src="hero.jpg" alt=""></picture></div>
    <div><p>Content</p></div>
  </div>
`;

const THREE_COLS = `
  <div>
    <div><p>One</p></div>
    <div><p>Two</p></div>
    <div><p>Three</p></div>
  </div>
`;

const IMAGE_WITH_SIBLINGS = `
  <div>
    <div>
      <picture><img src="hero.jpg" alt=""></picture>
      <p>Caption</p>
    </div>
    <div><p>Content</p></div>
  </div>
`;

describe('columns block', () => {
  it('adds a columns-N-cols class from the first row column count', () => {
    const block = createBlock(THREE_COLS);

    decorate(block);

    expect(block).toHaveClass('columns-3-cols');
  });

  it('adds columns-img-col when a column contains only a picture', () => {
    const block = createBlock(TWO_COLS_WITH_IMAGE);

    decorate(block);

    expect(block).toHaveClass('columns-2-cols');
    expect(block.querySelector('picture').closest('div')).toHaveClass('columns-img-col');
  });

  it('does not add columns-img-col when a picture shares its column with other content', () => {
    const block = createBlock(IMAGE_WITH_SIBLINGS);

    decorate(block);

    expect(block.querySelector('picture').closest('div')).not.toHaveClass('columns-img-col');
  });
});
