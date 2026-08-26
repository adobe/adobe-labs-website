import { within } from '@testing-library/dom';
import decorate from './grid-item.js';

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

describe('grid-item block', () => {
  it('renders a linked card with title, subhead, category, and image', () => {
    const block = createBlock({
      Title: '<a href="https://labs.adobe.com/example">Lab project</a>',
      Category: 'Research',
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
      expect.stringMatching(/\/research$/),
    );
    expect(block).toHaveAttribute('data-category', 'research');
    expect(block.querySelector('.grid-item__image picture')).toBeTruthy();
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

  it('omits the category link for unknown categories', () => {
    const block = createBlock({
      Title: 'Lab project',
      Category: 'Unknown',
    });

    decorate(block);

    expect(block.querySelector('.grid-item__category')).toBeNull();
    expect(block.dataset.category).toBeUndefined();
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
