import { within } from '@testing-library/dom';
import { createOptimizedPicture } from '../../scripts/aem.js';
import decorate, {
  attachHoverMedia,
  HOVER_IMAGE_BREAKPOINTS,
} from './hover-list.js';

jest.mock('../../scripts/aem.js', () => ({
  createOptimizedPicture: jest.fn(),
}));

let mediaMatches;

function mockMatchMedia() {
  window.matchMedia = jest.fn((query) => ({
    get matches() {
      if (query.includes('prefers-reduced-motion')) return mediaMatches.reducedMotion;
      if (query.includes('hover: hover')) return mediaMatches.finePointer;
      return false;
    },
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

function createBlock(rows) {
  const block = document.createElement('div');
  block.className = 'hover-list';
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

beforeEach(() => {
  mediaMatches = { finePointer: true, reducedMotion: false };
  mockMatchMedia();
  window.requestIdleCallback = jest.fn();
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

describe('hover-list block', () => {
  it('renders a numbered list of full-row links from authored rows', () => {
    const block = createBlock([
      ['<p><a href="/child-safety">Adobe’s commitment to child safety</a></p>'],
      ['<p><a href="/creator-act">The Creator Act</a></p>'],
      ['<p><a href="/credits">Generative credits for AI features in Photoshop</a></p>'],
    ]);

    decorate(block);

    const view = within(block);
    const links = view.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveClass('hover-list__link');
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/\/child-safety$/));
    expect(view.getByRole('link', { name: 'Adobe’s commitment to child safety' })).toBe(links[0]);
    expect(view.getByRole('link', { name: 'The Creator Act' })).toBe(links[1]);

    const numbers = [...block.querySelectorAll('.hover-list__number')];
    expect(numbers.map((el) => el.textContent)).toEqual(['1', '2', '3']);
    numbers.forEach((el) => expect(el).toHaveAttribute('aria-hidden', 'true'));

    const arrows = [...block.querySelectorAll('.hover-list__arrow')];
    expect(arrows).toHaveLength(3);
    arrows.forEach((el) => {
      expect(el).toHaveAttribute('aria-hidden', 'true');
      expect(el).toHaveClass('heading-6');
      expect(el.querySelector('svg path')).toBeTruthy();
    });

    const list = view.getByRole('list');
    expect(list).toHaveClass('hover-list__list');
    expect(list).toHaveAttribute('role', 'list');
    expect(view.getAllByRole('listitem')).toHaveLength(3);
  });

  it('skips rows with javascript URLs or missing headlines', () => {
    const block = createBlock([
      ['<p><a href="javascript:alert(1)">Unsafe</a></p>'],
      ['<p><a href="/ok">Safe row</a></p>'],
      ['<p></p>'],
    ]);

    decorate(block);

    const links = within(block).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', expect.stringMatching(/\/ok$/));
    expect(block.querySelector('.hover-list__number')).toHaveTextContent('1');
  });

  it('keeps the headline wrap-friendly and stashes omitted-image rows without media', () => {
    const block = createBlock([
      ['<p><a href="/one">A wrapping headline that should grow the row</a></p>'],
      [
        '<p><a href="/two">With images</a></p>',
        '<picture><img src="front.jpg" alt="ignore"></picture>',
        '<picture><img src="back.jpg" alt="ignore"></picture>',
      ],
    ]);

    decorate(block);

    const headline = block.querySelector('.hover-list__headline');
    expect(headline).toHaveClass('heading-6');
    expect(headline).not.toHaveStyle({ whiteSpace: 'nowrap' });

    const items = [...block.querySelectorAll('.hover-list__item')];
    expect(items[0]).not.toHaveAttribute('data-hover-images');
    expect(items[1]).toHaveAttribute('data-hover-images');
    expect(JSON.parse(items[1].dataset.hoverImages)).toEqual(
      expect.arrayContaining([expect.stringMatching(/front\.jpg/), expect.stringMatching(/back\.jpg/)]),
    );
    expect(block.querySelector('.hover-list__media')).toBeNull();
  });

  it('does not optimize images during decorate', () => {
    const block = createBlock([
      [
        '<p><a href="/one">One</a></p>',
        '<picture><img src="front.jpg" alt=""></picture>',
        '<picture><img src="back.jpg" alt=""></picture>',
      ],
    ]);

    decorate(block);

    expect(createOptimizedPicture).not.toHaveBeenCalled();
    expect(window.requestIdleCallback).toHaveBeenCalled();
  });

  it('attaches decorative lazy pictures after idle on fine pointers', () => {
    const block = createBlock([
      [
        '<p><a href="/one">One</a></p>',
        '<picture><img src="front.jpg" alt="photo"></picture>',
        '<picture><img src="back.jpg" alt="photo"></picture>',
      ],
    ]);

    decorate(block);
    expect(createOptimizedPicture).not.toHaveBeenCalled();

    attachHoverMedia(block);

    expect(createOptimizedPicture).toHaveBeenCalledTimes(2);
    expect(createOptimizedPicture).toHaveBeenCalledWith(
      expect.stringMatching(/front\.jpg/),
      '',
      false,
      HOVER_IMAGE_BREAKPOINTS,
    );

    const media = block.querySelector('.hover-list__media');
    expect(media).toHaveAttribute('aria-hidden', 'true');
    expect(media).toHaveAttribute('popover', 'manual');
    expect(media.querySelectorAll('img')).toHaveLength(2);
    media.querySelectorAll('img').forEach((img) => {
      expect(img).toHaveAttribute('alt', '');
      expect(img).toHaveAttribute('decoding', 'async');
      expect(img).toHaveAttribute('fetchpriority', 'low');
    });
    expect(block.querySelector('.hover-list__item')).not.toHaveAttribute('data-hover-images');
  });

  it('does not attach hover images on touch-only devices', () => {
    mediaMatches.finePointer = false;
    const block = createBlock([
      [
        '<p><a href="/one">One</a></p>',
        '<picture><img src="front.jpg" alt=""></picture>',
      ],
    ]);

    decorate(block);
    attachHoverMedia(block);

    expect(window.requestIdleCallback).not.toHaveBeenCalled();
    expect(createOptimizedPicture).not.toHaveBeenCalled();
    expect(block.querySelector('.hover-list__media')).toBeNull();
  });

  it('does not attach hover images when reduced motion is preferred', () => {
    mediaMatches.reducedMotion = true;
    const block = createBlock([
      [
        '<p><a href="/one">One</a></p>',
        '<picture><img src="front.jpg" alt=""></picture>',
      ],
    ]);

    decorate(block);
    attachHoverMedia(block);

    expect(createOptimizedPicture).not.toHaveBeenCalled();
    expect(block.querySelector('.hover-list__media')).toBeNull();
  });
});
