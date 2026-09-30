import { within } from '@testing-library/dom';
import decorate, { getMediaTextData } from './media-text.js';

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

describe('media-text block', () => {
  it('renders the authored image with its alt text inside a figure', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<h2>Lorem ipsum</h2><p>Dolor sit amet.</p>',
    });

    decorate(block);

    const figure = block.querySelector('.media-text__media');
    expect(figure.tagName).toBe('FIGURE');
    const img = within(block).getByAltText('A red rock canyon');
    expect(figure).toContainElement(img);
    expect(figure.compareDocumentPosition(block.querySelector('.media-text__content')))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps authored text elements and their tags', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<h2>Lorem ipsum</h2><p>Dolor sit amet.</p>',
    });

    decorate(block);

    const content = block.querySelector('.media-text__content');
    const heading = within(content).getByRole('heading', { level: 2, name: 'Lorem ipsum' });
    const paragraph = within(content).getByText('Dolor sit amet.');
    expect(heading.tagName).toBe('H2');
    expect(paragraph.tagName).toBe('P');
    expect(content.children[0]).toBe(heading);
    expect(content.children[1]).toBe(paragraph);
  });

  it('wraps a text-only cell in one paragraph', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: 'Lorem ipsum dolor sit amet.',
    });

    decorate(block);

    const paragraph = within(block.querySelector('.media-text__content'))
      .getByText('Lorem ipsum dolor sit amet.');
    expect(paragraph.tagName).toBe('P');
  });

  it('omits the content area when the text cell is empty', () => {
    const block = createBlock({ Image: PICTURE, Text: '' });

    decorate(block);

    expect(block.querySelector('.media-text__content')).toBeNull();
    expect(block.querySelector('.media-text__media')).toBeTruthy();
  });

  it('omits the figure when no image is authored', () => {
    const block = createBlock({ Text: '<p>Dolor sit amet.</p>' });

    decorate(block);

    expect(block.querySelector('.media-text__media')).toBeNull();
    expect(block.querySelector('.media-text__content')).toBeTruthy();
  });

  it('keeps media before text in the DOM when media-right is set', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<p>Dolor sit amet.</p>',
    });
    block.classList.add('media-text', 'media-right');

    decorate(block);

    expect(block).toHaveClass('media-right');
    const figure = block.querySelector('.media-text__media');
    const content = block.querySelector('.media-text__content');
    expect(figure.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps media on the left when the block has no media-right class', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<p>Dolor sit amet.</p>',
    });
    block.classList.add('media-text');

    decorate(block);

    expect(block).not.toHaveClass('media-right');
    expect(block.querySelector('.media-text__media')).toBeTruthy();
  });

  it('renders an optional caption below the image', () => {
    const block = createBlock({
      Image: PICTURE,
      Caption: 'Image: Bernardo Ramoning',
      Text: '<p>Dolor sit amet.</p>',
    });

    decorate(block);

    const caption = within(block.querySelector('.media-text__media'))
      .getByText('Image: Bernardo Ramoning');
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption).toHaveClass('media-text__caption');
  });

  it('omits the caption element when no caption is authored', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<p>Dolor sit amet.</p>',
    });

    decorate(block);

    expect(block.querySelector('.media-text__caption')).toBeNull();
  });

  it('reads the caption via getMediaTextData', () => {
    const block = createBlock({
      Image: PICTURE,
      Caption: 'A caption',
      Text: '<p>Dolor sit amet.</p>',
    });

    expect(getMediaTextData(block).caption).toBe('A caption');
  });

  it('keeps the small class so the image column uses the small width', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<p>Dolor sit amet.</p>',
    });
    block.classList.add('media-text', 'small');

    decorate(block);

    expect(block).toHaveClass('small');
    expect(block.querySelector('.media-text__media img')).toBeTruthy();
  });

  it('keeps the default image width when the block has no small class', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<p>Dolor sit amet.</p>',
    });
    block.classList.add('media-text');

    decorate(block);

    expect(block).not.toHaveClass('small');
  });

  it('reads image and content elements via getMediaTextData', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<h2>Lorem ipsum</h2>',
    });

    const data = getMediaTextData(block);

    expect(data.image?.querySelector('img')).toHaveAttribute('alt', 'A red rock canyon');
    expect(data.caption).toBe('');
    expect(data.content[0].tagName).toBe('H2');
    expect(data.content[0].textContent).toBe('Lorem ipsum');
  });
});
