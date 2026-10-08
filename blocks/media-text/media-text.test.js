import { within } from '@testing-library/dom';
import decorate, { getMediaTextData } from './media-text.js';

jest.mock('../../scripts/aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
}));

/**
 * One authored row. Each string is one cell.
 *
 * @param {string[]} cells Cell HTML, left to right
 * @param {string} [className] Classes already on the block
 * @returns {HTMLDivElement}
 */
function createBlock(cells, className = 'media-text') {
  const block = document.createElement('div');
  block.className = className;
  const row = document.createElement('div');
  cells.forEach((html) => {
    const cell = document.createElement('div');
    cell.innerHTML = html;
    row.append(cell);
  });
  block.append(row);
  return block;
}

const PICTURE = '<picture><img src="canyon.jpg" alt="A red rock canyon"></picture>';
const WRAPPED_CAPTION = `<p>${PICTURE}Image: Bernardo Ramoning</p>`;

describe('media-text block', () => {
  it('renders the authored image with its alt text inside a figure', () => {
    const block = createBlock([
      PICTURE,
      '<h2>Lorem ipsum</h2><p>Dolor sit amet.</p>',
    ]);

    decorate(block);

    const figure = block.querySelector('.media-text__media');
    expect(figure.tagName).toBe('FIGURE');
    const img = within(block).getByAltText('A red rock canyon');
    expect(figure).toContainElement(img);
    expect(figure.compareDocumentPosition(block.querySelector('.media-text__content')))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(block).not.toHaveClass('media-right');
  });

  it('keeps authored text elements and their tags', () => {
    const block = createBlock([
      PICTURE,
      '<h2>Lorem ipsum</h2><p>Dolor sit amet.</p>',
    ]);

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
    const block = createBlock([
      PICTURE,
      'Lorem ipsum dolor sit amet.',
    ]);

    decorate(block);

    const paragraph = within(block.querySelector('.media-text__content'))
      .getByText('Lorem ipsum dolor sit amet.');
    expect(paragraph.tagName).toBe('P');
  });

  it('omits the content area when the text cell is empty', () => {
    const block = createBlock([PICTURE, '']);

    decorate(block);

    expect(block.querySelector('.media-text__content')).toBeNull();
    expect(block.querySelector('.media-text__media')).toBeTruthy();
    expect(block).not.toHaveClass('media-right');
  });

  it('omits the figure when no image is authored', () => {
    const block = createBlock(['<p>Dolor sit amet.</p>', ''], 'media-text media-right');

    decorate(block);

    expect(block.querySelector('.media-text__media')).toBeNull();
    expect(block.querySelector('.media-text__content')).toBeTruthy();
    expect(block).not.toHaveClass('media-right');
  });

  it('adds media-right and puts text before the image when the image is in cell 2', () => {
    const block = createBlock([
      '<p>Dolor sit amet.</p>',
      PICTURE,
    ]);

    decorate(block);

    expect(block).toHaveClass('media-right');
    const content = block.querySelector('.media-text__content');
    const figure = block.querySelector('.media-text__media');
    expect(content.compareDocumentPosition(figure)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('removes an authored media-right class when the image is in cell 1', () => {
    const block = createBlock([
      PICTURE,
      '<p>Dolor sit amet.</p>',
    ], 'media-text media-right');

    decorate(block);

    expect(block).not.toHaveClass('media-right');
    const figure = block.querySelector('.media-text__media');
    const content = block.querySelector('.media-text__content');
    expect(figure.compareDocumentPosition(content)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders caption text after the picture as a figcaption', () => {
    const block = createBlock([
      WRAPPED_CAPTION,
      '<p>Dolor sit amet.</p>',
    ]);

    decorate(block);

    const caption = within(block.querySelector('.media-text__media'))
      .getByText('Image: Bernardo Ramoning');
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption).toHaveClass('media-text__caption');
    expect(block.querySelector('.media-text__media img')).toHaveAttribute('alt', 'A red rock canyon');
  });

  it('omits the caption element when no caption is authored', () => {
    const block = createBlock([
      PICTURE,
      '<p>Dolor sit amet.</p>',
    ]);

    decorate(block);

    expect(block.querySelector('.media-text__caption')).toBeNull();
  });

  it('reads the wrapped caption via getMediaTextData', () => {
    const block = createBlock([
      '<p>Dolor sit amet.</p>',
      `<p>${PICTURE}A caption</p>`,
    ]);

    const data = getMediaTextData(block);

    expect(data.caption).toBe('A caption');
    expect(data.mediaRight).toBe(true);
    expect(data.image?.querySelector('img')).toHaveAttribute('alt', 'A red rock canyon');
  });

  it('keeps the small class and the image', () => {
    const block = createBlock([
      PICTURE,
      '<p>Dolor sit amet.</p>',
    ], 'media-text small');

    decorate(block);

    expect(block).toHaveClass('small');
    expect(block).not.toHaveClass('media-right');
    expect(block.querySelector('.media-text__media img')).toBeTruthy();
  });

  it('keeps the default image width when the block has no small class', () => {
    const block = createBlock([
      PICTURE,
      '<p>Dolor sit amet.</p>',
    ]);

    decorate(block);

    expect(block).not.toHaveClass('small');
  });

  it.each(['align-top', 'align-middle', 'align-bottom'])(
    'keeps %s on the block',
    (alignClass) => {
      const block = createBlock([
        PICTURE,
        '<p>Dolor sit amet.</p>',
      ], `media-text ${alignClass}`);

      decorate(block);

      expect(block).toHaveClass(alignClass);
      expect(block).not.toHaveClass('media-right');
      expect(block.querySelector('.media-text__content')).toBeTruthy();
    },
  );

  it('keeps the first and last content elements', () => {
    const block = createBlock([
      PICTURE,
      '<h2>Lorem ipsum</h2><p>Dolor sit amet.</p>',
    ]);

    decorate(block);

    const content = block.querySelector('.media-text__content');
    expect(content.firstElementChild.tagName).toBe('H2');
    expect(content.lastElementChild.tagName).toBe('P');
  });

  it('keeps a blockquote beside the image', () => {
    const block = createBlock([
      WRAPPED_CAPTION,
      '<blockquote>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</blockquote>',
    ]);

    decorate(block);

    const content = block.querySelector('.media-text__content');
    const quote = within(content).getByRole('blockquote');
    expect(quote.tagName).toBe('BLOCKQUOTE');
    expect(quote.textContent).toBe('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
    expect(content.firstElementChild).toBe(quote);
    expect(content.lastElementChild).toBe(quote);
    expect(block.querySelector('.media-text__media img')).toHaveAttribute('alt', 'A red rock canyon');
    expect(within(block).getByText('Image: Bernardo Ramoning').tagName).toBe('FIGCAPTION');
  });

  it('reads image and content elements via getMediaTextData', () => {
    const block = createBlock([
      PICTURE,
      '<h2>Lorem ipsum</h2>',
    ]);

    const data = getMediaTextData(block);

    expect(data.image?.querySelector('img')).toHaveAttribute('alt', 'A red rock canyon');
    expect(data.caption).toBe('');
    expect(data.mediaRight).toBe(false);
    expect(data.content[0].tagName).toBe('H2');
    expect(data.content[0].textContent).toBe('Lorem ipsum');
  });
});
