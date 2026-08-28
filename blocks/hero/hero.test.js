import { within } from '@testing-library/dom';
import { decorateIcons } from '../../scripts/aem.js';
import decorate from './hero.js';

jest.mock('../../scripts/aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
  decorateIcons: jest.fn(),
}));

/**
 * Builds a positional hero table (row 1 copy, row 2 image).
 *
 * @param {string[][]} rows Cells as HTML strings
 * @returns {HTMLElement}
 */
function createHeroBlock(rows) {
  const block = document.createElement('div');
  block.className = 'hero';
  rows.forEach((cells) => {
    const row = document.createElement('div');
    cells.forEach((html) => {
      const cell = document.createElement('div');
      cell.innerHTML = html;
      row.append(cell);
    });
    block.append(row);
  });
  return block;
}

describe('hero block', () => {
  beforeEach(() => {
    decorateIcons.mockClear();
  });
  it('renders category, date, linked headline, CTA, and image', async () => {
    const block = createHeroBlock([
      [
        'ResearchTest',
        '5.24.26',
        '<a href="/research/example-article-1">How AI is Redistributing Creative Work.</a>',
        'Read',
      ],
      ['<picture><img src="hero.jpg" alt="hero"></picture>'],
    ]);

    await decorate(block);

    const view = within(block);
    const eyebrow = view.getByText('ResearchTest');
    expect(eyebrow).toHaveClass('eyebrow');
    const mark = eyebrow.querySelector('svg');
    expect(eyebrow.firstElementChild).toBe(mark);
    expect(mark).toHaveAttribute('viewBox', '0 0 38 38');
    expect(mark.querySelector('circle')).toHaveAttribute('fill', 'white');
    expect(view.getByText('5.24.26')).toHaveClass('hero-date');
    expect(view.getByRole('heading', { level: 1 })).toHaveTextContent(
      'How AI is Redistributing Creative Work.',
    );
    expect(view.getByRole('link', { name: 'Read: How AI is Redistributing Creative Work.' }))
      .toHaveAttribute('href', expect.stringMatching(/\/research\/example-article-1$/));
    expect(block.querySelector('.button.primary')).toHaveTextContent('Read');
    expect(block.querySelector('.hero-media picture img')).toHaveAttribute('src', expect.stringMatching(/hero\.jpg$/));
    expect(block.querySelector('.hero-video-icon')).toBeNull();
  });

  it.each([
    ['Show Video Icon', 'true'],
    ['show-video-icon', 'yes'],
  ])('adds a video icon when %s is %s', async (label, value) => {
    const block = createHeroBlock([
      [
        '',
        'Oct 26',
        '<a href="/sneaks/project-clean-take">Project Clean Take</a>',
        'Read',
      ],
      ['<picture><img src="hero.jpg" alt="hero"></picture>'],
      [label, value],
    ]);

    await decorate(block);

    const view = within(block);
    expect(view.getByText('Video article')).toHaveClass('visually-hidden');
    expect(block.querySelector('.hero-video-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(block.querySelector('.hero-video-icon .icon-play')).toBeTruthy();
    expect(decorateIcons).toHaveBeenCalled();
    expect(view.getByText('Oct 26')).toHaveClass('hero-date');
    expect(view.getByRole('heading', { level: 1 })).toHaveTextContent('Project Clean Take');
    expect(block.querySelector('.button.primary')).toHaveTextContent('Read');
  });

  it('does not add a video icon when Show Video Icon is false', async () => {
    const block = createHeroBlock([
      ['<a href="/article">Headline</a>', 'Read'],
      ['Show Video Icon', 'false'],
    ]);

    await decorate(block);

    expect(within(block).queryByText('Video article')).toBeNull();
    expect(block.querySelector('.hero-video-icon')).toBeNull();
    expect(decorateIcons).not.toHaveBeenCalled();
  });

  it('keeps the video icon on non-home pages', async () => {
    const originalPath = window.location.pathname;
    window.history.replaceState({}, '', '/sneaks/');

    try {
      const block = createHeroBlock([
        [
          'Sneaks',
          'Oct 26',
          '<a href="/sneaks/project-clean-take">Project Clean Take</a>',
          'Read',
        ],
        ['Show Video Icon', 'true'],
      ]);

      await decorate(block);

      expect(block.querySelector('.hero-video-icon')).toBeTruthy();
      expect(block.querySelector('.hero-video-icon .icon-play')).toBeTruthy();
      expect(block.querySelector('.eyebrow')).toBeNull();
    } finally {
      window.history.replaceState({}, '', originalPath);
    }
  });

  it('omits empty optional fields', async () => {
    const block = createHeroBlock([
      ['<a href="/article">Headline only</a>'],
    ]);

    await decorate(block);

    expect(block.querySelector('.eyebrow')).toBeNull();
    expect(block.querySelector('.hero-date')).toBeNull();
    expect(block.querySelector('.hero-media')).toBeNull();
    expect(within(block).getByRole('heading', { level: 1 })).toHaveTextContent('Headline only');
    expect(within(block).getByRole('link', { name: 'Read: Headline only' })).toBeTruthy();
    expect(block.querySelector('.button.primary')).toHaveTextContent('Read');
  });

  it('keeps the hero-full-screen variant class', async () => {
    const block = createHeroBlock([
      ['<a href="/article">Headline</a>'],
    ]);
    block.classList.add('hero-full-screen');

    await decorate(block);

    expect(block).toHaveClass('hero', 'hero-full-screen');
  });

  it('does not link the headline or CTA when the URL is not http(s)', async () => {
    const block = createHeroBlock([
      ['<a href="javascript:alert(1)">Unsafe headline</a>', 'Read'],
    ]);

    await decorate(block);

    expect(block.querySelector('h1 a')).toBeNull();
    expect(block.querySelector('h1')).toHaveTextContent('Unsafe headline');
    expect(block.querySelector('.button-wrapper')).toBeNull();
  });
});
