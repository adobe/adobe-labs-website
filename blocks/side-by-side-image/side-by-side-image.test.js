import decorate from './side-by-side-image.js';

function createBlock(html) {
  const block = document.createElement('div');
  block.innerHTML = html;
  return block;
}

const TWO_IMAGES = `
  <div>
    <div><picture><img src="left.jpg" alt="Left sketch"></picture></div>
    <div><picture><img src="right.jpg" alt="Right sketch"></picture></div>
  </div>
`;

const EXTRA_ROW = `
  <div>
    <div><picture><img src="left.jpg" alt="Left sketch"></picture></div>
    <div><picture><img src="right.jpg" alt="Right sketch"></picture></div>
  </div>
  <div>
    <div><picture><img src="third.jpg" alt="Third sketch"></picture></div>
  </div>
`;

const MISSING_CELL = `
  <div>
    <div><picture><img src="left.jpg" alt="Left sketch"></picture></div>
  </div>
`;

describe('side-by-side-image block', () => {
  it('flattens each authored cell into a direct side-by-side-image__item child', () => {
    const block = createBlock(TWO_IMAGES);

    decorate(block);

    const items = [...block.children];
    expect(items).toHaveLength(2);
    items.forEach((item) => expect(item).toHaveClass('side-by-side-image__item'));
    expect(items[0].querySelector('img')).toHaveAttribute('src', 'left.jpg');
    expect(items[1].querySelector('img')).toHaveAttribute('src', 'right.jpg');
  });

  it('removes the authored row wrapper so items sit directly under the block', () => {
    const block = createBlock(TWO_IMAGES);

    decorate(block);

    expect(block.querySelectorAll(':scope > div > div')).toHaveLength(0);
  });

  it('flattens cells across multiple authored rows', () => {
    const block = createBlock(EXTRA_ROW);

    decorate(block);

    expect(block.children).toHaveLength(3);
  });

  it('does not throw when an author omits a cell', () => {
    const block = createBlock(MISSING_CELL);

    expect(() => decorate(block)).not.toThrow();
    expect(block.children).toHaveLength(1);
  });
});
