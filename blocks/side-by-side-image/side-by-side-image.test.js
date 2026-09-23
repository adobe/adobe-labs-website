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

const TWO_IMAGES_WITH_CAPTIONS = `
  <div>
    <div><picture><img src="left.jpg" alt="Left sketch"></picture></div>
    <div><picture><img src="right.jpg" alt="Right sketch"></picture></div>
  </div>
  <div>
    <div>Image: Bernardo Henning</div>
    <div>Image: Jane Doe</div>
  </div>
`;

const ONE_CAPTION_ONLY = `
  <div>
    <div><picture><img src="left.jpg" alt="Left sketch"></picture></div>
    <div><picture><img src="right.jpg" alt="Right sketch"></picture></div>
  </div>
  <div>
    <div></div>
    <div>Image: Jane Doe</div>
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
    expect(items[0].querySelector('img')).toHaveAttribute('alt', 'Left sketch');
    expect(items[1].querySelector('img')).toHaveAttribute('src', 'right.jpg');
    expect(items[1].querySelector('img')).toHaveAttribute('alt', 'Right sketch');
  });

  it('flattens cells across multiple authored image rows', () => {
    const block = createBlock(EXTRA_ROW);

    decorate(block);

    expect(block.children).toHaveLength(3);
  });

  it('does not throw when an author omits a cell', () => {
    const block = createBlock(MISSING_CELL);

    expect(() => decorate(block)).not.toThrow();
    expect(block.children).toHaveLength(1);
  });

  it('adds a figcaption to each image when a caption row is authored', () => {
    const block = createBlock(TWO_IMAGES_WITH_CAPTIONS);

    decorate(block);

    const items = [...block.children];
    expect(items).toHaveLength(2);

    const firstCaption = items[0].querySelector('figcaption');
    expect(firstCaption).toHaveTextContent('Image: Bernardo Henning');
    expect(firstCaption).toHaveClass('side-by-side-image__caption');

    const secondCaption = items[1].querySelector('figcaption');
    expect(secondCaption).toHaveTextContent('Image: Jane Doe');
  });

  it('adds a caption to only one image when the other caption cell is empty', () => {
    const block = createBlock(ONE_CAPTION_ONLY);

    decorate(block);

    const items = [...block.children];
    expect(items[0].querySelector('figcaption')).toBeNull();
    expect(items[1].querySelector('figcaption')).toHaveTextContent('Image: Jane Doe');
  });

  it('omits the figcaption entirely when no caption row is authored', () => {
    const block = createBlock(TWO_IMAGES);

    decorate(block);

    expect(block.querySelector('figcaption')).toBeNull();
  });
});
