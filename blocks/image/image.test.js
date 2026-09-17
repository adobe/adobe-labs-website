import { within } from '@testing-library/dom';
import decorate, { getImageData, buildImage } from './image.js';

jest.mock('../../scripts/aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
}));

function createBlock(fields) {
  const block = document.createElement('div');
  Object.entries(fields).forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  return block;
}

const PICTURE = '<picture><img src="canyon.jpg" alt="A red rock canyon"></picture>';

describe('image block', () => {
  it('renders the authored image with its alt text inside a figure', () => {
    const block = createBlock({ Image: PICTURE });

    decorate(block);

    const figure = block.querySelector('.image__figure');
    expect(figure).toBeTruthy();
    const img = within(block).getByAltText('A red rock canyon');
    expect(figure).toContainElement(img);
  });

  it('renders an optional caption below the image', () => {
    const block = createBlock({ Image: PICTURE, Caption: 'Image: Bernardo Ramoning' });

    decorate(block);

    const caption = within(block).getByText('Image: Bernardo Ramoning');
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption).toHaveClass('image__caption');
  });

  it('omits the caption element when no caption is authored', () => {
    const block = createBlock({ Image: PICTURE });

    decorate(block);

    expect(block.querySelector('.image__caption')).toBeNull();
  });

  it('leaves an authored size variant class untouched', () => {
    const block = createBlock({ Image: PICTURE });
    block.classList.add('image', 'lg');

    decorate(block);

    expect(block).toHaveClass('image', 'lg');
  });

  it('reads image and caption cells via getImageData', () => {
    const block = createBlock({ Image: PICTURE, Caption: 'A caption' });

    const data = getImageData(block);

    expect(data.image?.querySelector('img')).toHaveAttribute('alt', 'A red rock canyon');
    expect(data.caption).toBe('A caption');
  });

  it('buildImage omits the figcaption when caption data is empty', () => {
    const root = buildImage({ image: document.createElement('picture'), caption: '' });

    expect(root.querySelector('figcaption')).toBeNull();
  });
});
