import { within } from '@testing-library/dom';
import { createOptimizedPicture } from '../../scripts/aem.js';
import decorate, { buildGridItem } from './grid-item.js';

jest.mock('../../scripts/aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
  createOptimizedPicture: jest.fn(),
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

const PICTURE = '<picture><img src="hero.jpg" alt="original"></picture>';

beforeEach(() => {
  createOptimizedPicture.mockReset();
  createOptimizedPicture.mockImplementation((src, alt = '') => {
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    picture.append(img);
    return picture;
  });
});

describe('grid-item block', () => {
  it('renders a linked card with title, subhead, content type, and image', () => {
    const block = createBlock({
      Title: '<a href="https://labs.adobe.com/example">Lab project</a>',
      'Content Type': 'Research',
      Subhead: 'A short description',
      Image: PICTURE,
    });

    decorate(block);

    const view = within(block);
    const main = view.getByRole('link', { name: /Lab project/ });

    expect(main).toHaveClass('grid-item__main');
    expect(main).toHaveAttribute('href', 'https://labs.adobe.com/example');
    expect(view.getByText('Lab project')).toHaveClass('grid-item__title');
    expect(view.getByText('A short description')).toHaveClass('grid-item__subhead');
    expect(view.getByRole('link', { name: 'Research' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/research\/?$/),
    );
    expect(block).toHaveAttribute('data-content-type', 'research');
    expect(block.querySelector('.grid-item__image picture')).toBeTruthy();
  });

  it('accepts a legacy Category cell as the content type', () => {
    const block = createBlock({
      Title: 'Lab project',
      Category: 'Workflows',
    });

    decorate(block);

    expect(within(block).getByRole('link', { name: 'Workflows' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/workflows\/?$/),
    );
    expect(block).toHaveAttribute('data-content-type', 'workflows');
  });

  it('uses a div for main when the title is not a link', () => {
    const block = createBlock({ Title: 'Lab project' });

    decorate(block);

    expect(block.querySelector('a.grid-item__main')).toBeNull();
    expect(block.querySelector('div.grid-item__main')).toBeTruthy();
    expect(within(block).queryByRole('link')).toBeNull();
  });

  it('ignores javascript URLs on the title', () => {
    const block = createBlock({
      Title: '<a href="javascript:alert(1)">Lab project</a>',
    });

    decorate(block);

    expect(block.querySelector('.grid-item__main').tagName).toBe('DIV');
    expect(block.querySelector('.grid-item__main')).not.toHaveAttribute('href');
  });

  it('omits the content-type link for unknown values', () => {
    const block = createBlock({
      Title: 'Lab project',
      'Content Type': 'Unknown',
    });

    decorate(block);

    expect(block.querySelector('.grid-item__content-type')).toBeNull();
    expect(block.dataset.contentType).toBeUndefined();
  });

  it('omits the subhead when it is empty', () => {
    const block = createBlock({ Title: 'Lab project' });

    decorate(block);

    expect(block.querySelector('.grid-item__subhead')).toBeNull();
  });

  it('omits the title when it is empty', () => {
    const block = createBlock({ Subhead: 'A short description' });

    decorate(block);

    expect(block.querySelector('.grid-item__title')).toBeNull();
  });

  it.each([
    ['Is Video', 'true'],
    ['isvideo', 'yes'],
  ])('adds video affordances when %s is %s', (label, value) => {
    const block = createBlock({
      Title: 'Lab project',
      Image: PICTURE,
      [label]: value,
    });

    decorate(block);

    const image = block.querySelector('.grid-item__image');
    expect(within(block).getByText('Video article')).toHaveClass('visually-hidden');
    expect(image.querySelector('.grid-item__play')).toHaveAttribute('aria-hidden', 'true');
    expect(image.firstElementChild.tagName).toBe('PICTURE');
  });

  it('does not add video affordances when is-video is false', () => {
    const block = createBlock({
      Title: 'Lab project',
      'Is Video': 'false',
    });

    decorate(block);

    expect(within(block).queryByText('Video article')).toBeNull();
    expect(block.querySelector('.grid-item__play')).toBeNull();
  });

  it('preserves alt text already on the image', () => {
    const block = createBlock({
      Title: 'Lab project',
      Image: PICTURE,
    });

    decorate(block);

    expect(block.querySelector('img')).toHaveAttribute('alt', 'original');
  });
});

describe('buildGridItem', () => {
  it('builds a linked card from a plain data object', () => {
    const item = buildGridItem({
      title: 'Lab project',
      href: 'https://labs.adobe.com/example',
      subhead: 'A short description',
      contentType: 'Research',
      imageUrl: 'https://example.com/hero.jpg',
      imageAlt: 'Project thumbnail',
      isVideo: true,
    });

    const view = within(item);
    const main = view.getByRole('link', { name: /Lab project/ });

    expect(item).toHaveClass('grid-item');
    expect(item).toHaveAttribute('data-content-type', 'research');
    expect(main).toHaveClass('grid-item__main');
    expect(main).toHaveAttribute('href', 'https://labs.adobe.com/example');
    expect(view.getByText('A short description')).toHaveClass('grid-item__subhead');
    expect(view.getByRole('link', { name: 'Research' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/research\/?$/),
    );
    expect(view.getByText('Video article')).toHaveClass('visually-hidden');
    expect(createOptimizedPicture).toHaveBeenCalledWith(
      'https://example.com/hero.jpg',
      'Project thumbnail',
    );
    expect(item.querySelector('img')).toHaveAttribute('alt', 'Project thumbnail');
  });
});

describe('decorate', () => {
  it('does not rebuild a card that already has grid-item__main', () => {
    const block = createBlock({
      Title: '<a href="https://labs.adobe.com/example">Lab project</a>',
      Subhead: 'A short description',
    });
    decorate(block);
    const main = block.querySelector('.grid-item__main');
    const title = block.querySelector('.grid-item__title');

    decorate(block);

    expect(block.querySelector('.grid-item__main')).toBe(main);
    expect(block.querySelector('.grid-item__title')).toBe(title);
    expect(title).toHaveTextContent('Lab project');
  });
});
