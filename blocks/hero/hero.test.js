import { within } from '@testing-library/dom';
import decorate, {
  clearHeroIntro,
  HERO_INTRO_DURATION_MS,
  HERO_INTRO_FROST_DURATION_S,
  HERO_INTRO_FROST_ID,
  HERO_INTRO_NAV_DELAY_MS,
} from './hero.js';

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

/**
 * Places a hero in `main > .section` for first-section checks.
 *
 * @param {HTMLElement} block Hero block
 * @param {{ first?: boolean }} [options]
 * @returns {HTMLElement} The `main` wrapper (remove after the test)
 */
function placeInMain(block, { first = true } = {}) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section hero-container';
  section.append(block);
  if (first) {
    main.append(section);
  } else {
    const prior = document.createElement('div');
    prior.className = 'section';
    main.append(prior, section);
  }
  document.body.append(main);
  return main;
}

function expectPlayIcon(block) {
  const play = block.querySelector('.play-icon');
  expect(within(block).getByText('Video article')).toHaveClass('visually-hidden');
  expect(play).toHaveAttribute('aria-hidden', 'true');
  expect(play.querySelector('svg')).toBeTruthy();
  return play;
}

/**
 * Puts a hero in the first `main > .section`, which is required to start the intro.
 *
 * @param {HTMLElement} block Hero block
 * @returns {HTMLElement} The same block
 */
function mountInFirstSection(block) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section';
  section.append(block);
  main.append(section);
  document.body.append(main);
  return block;
}

afterEach(() => {
  clearHeroIntro();
  document.querySelectorAll('main').forEach((main) => main.remove());
});

describe('hero block', () => {
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
    const main = placeInMain(block);

    try {
      await decorate(block);

      const view = within(block);
      const eyebrow = view.getByText('ResearchTest');
      expect(eyebrow).toHaveClass('hero__eyebrow');
      expect(eyebrow).toHaveAttribute('aria-hidden', 'true');
      const mark = eyebrow.querySelector('svg');
      expect(eyebrow.firstElementChild).toBe(mark);
      expect(mark).toHaveAttribute('viewBox', '0 0 38 38');
      expect(mark.querySelector('circle')).toHaveAttribute('fill', 'white');
      const date = view.getByText('5.24.26');
      expect(date).toHaveClass('hero__date');
      expect(date).toHaveAttribute('aria-hidden', 'true');
      expect(view.getByRole('heading', { level: 2 })).toHaveTextContent(
        'How AI is Redistributing Creative Work.',
      );
      expect(view.getByRole('link', { name: 'How AI is Redistributing Creative Work. Read' }))
        .toHaveAttribute('href', expect.stringMatching(/\/research\/example-article-1$/));
      expect(block.querySelector('.hero__cta-text')).toHaveTextContent('Read');
      expect(block.querySelector('.button')).toBeNull();
      const media = block.querySelector('.hero__media');
      expect(media).toHaveAttribute('aria-hidden', 'true');
      expect(media.querySelector('picture img')).toHaveAttribute('src', expect.stringMatching(/hero\.jpg$/));
      expect(block.querySelector('.play-icon')).toBeNull();
    } finally {
      main.remove();
    }
  });

  it.each([
    ['Show Video Icon', 'true'],
    ['show-video-icon', 'yes'],
    ['Is Video', 'true'],
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
    expectPlayIcon(block);
    expect(view.getByText('Oct 26')).toHaveClass('hero__date');
    expect(view.getByRole('heading', { level: 2 })).toHaveTextContent('Project Clean Take');
    expect(view.getByRole('link', { name: /video article/i }))
      .toHaveAttribute('href', expect.stringMatching(/\/sneaks\/project-clean-take$/));
    expect(block.querySelector('.hero__cta-text')).toHaveTextContent('Read');
  });

  it('does not add a video icon when Show Video Icon is false', async () => {
    const block = createHeroBlock([
      ['<a href="/article">Headline</a>', 'Read'],
      ['Show Video Icon', 'false'],
    ]);

    await decorate(block);

    expect(within(block).queryByText('Video article')).toBeNull();
    expect(block.querySelector('.play-icon')).toBeNull();
  });

  it('keeps the video icon when the hero is not in the first section', async () => {
    const block = createHeroBlock([
      [
        'Sneaks',
        'Oct 26',
        '<a href="/sneaks/project-clean-take">Project Clean Take</a>',
        'Read',
      ],
      ['Show Video Icon', 'true'],
    ]);
    const main = placeInMain(block, { first: false });

    try {
      await decorate(block);

      expectPlayIcon(block);
      expect(within(block).getByRole('link', { name: /video article/i })).toBeTruthy();
      expect(block.querySelector('.hero__eyebrow')).toBeNull();
    } finally {
      main.remove();
    }
  });

  it('shows the category on a first-section hero off the homepage', async () => {
    window.history.replaceState({}, '', '/sneaks/clip');
    const block = createHeroBlock([
      [
        'Sneaks',
        'Oct 26',
        '<a href="/sneaks/project-clean-take">Project Clean Take</a>',
        'Read',
      ],
    ]);
    const main = placeInMain(block);

    try {
      await decorate(block);
      expect(within(block).getByText('Sneaks')).toHaveClass('hero__eyebrow');
    } finally {
      main.remove();
      window.history.replaceState({}, '', '/');
    }
  });

  it('omits empty optional fields', async () => {
    const block = createHeroBlock([
      ['<a href="/article">Headline only</a>'],
    ]);

    await decorate(block);

    expect(block.querySelector('.hero__eyebrow')).toBeNull();
    expect(block.querySelector('.hero__date')).toBeNull();
    expect(block.querySelector('.hero__media')).toBeNull();
    expect(within(block).getByRole('heading', { level: 2 })).toHaveTextContent('Headline only');
    expect(within(block).getByRole('link', { name: 'Headline only Read' })).toBeTruthy();
    expect(block.querySelector('.hero__cta-text')).toHaveTextContent('Read');
  });

  it('keeps the hero-full-screen variant class', async () => {
    const block = createHeroBlock([
      ['<a href="/article">Headline</a>'],
    ]);
    block.classList.add('hero-full-screen');

    await decorate(block);

    expect(block).toHaveClass('hero', 'hero-full-screen');
  });

  it('overlays a full-screen hero in the first section', async () => {
    const main = document.createElement('main');
    const section = document.createElement('div');
    section.className = 'section hero-container';
    const block = createHeroBlock([
      ['<a href="/article">Headline</a>'],
    ]);
    block.classList.add('hero-full-screen');
    section.append(block);
    main.append(section);
    document.body.append(main);

    try {
      await decorate(block);
      expect(section).toHaveClass('hero-container--overlay');
    } finally {
      main.remove();
    }
  });

  it('does not overlay a full-screen hero that is not first', async () => {
    const main = document.createElement('main');
    const first = document.createElement('div');
    first.className = 'section';
    const section = document.createElement('div');
    section.className = 'section hero-container';
    const block = createHeroBlock([
      ['<a href="/article">Headline</a>'],
    ]);
    block.classList.add('hero-full-screen');
    section.append(block);
    main.append(first, section);
    document.body.append(main);

    try {
      await decorate(block);
      expect(section).not.toHaveClass('hero-container--overlay');
    } finally {
      main.remove();
    }
  });

  it('does not overlay a default hero in the first section', async () => {
    const main = document.createElement('main');
    const section = document.createElement('div');
    section.className = 'section hero-container';
    const block = createHeroBlock([
      ['<a href="/article">Headline</a>'],
    ]);
    section.append(block);
    main.append(section);
    document.body.append(main);

    try {
      await decorate(block);
      expect(section).not.toHaveClass('hero-container--overlay');
    } finally {
      main.remove();
    }
  });

  it('does not link the headline or CTA when the URL is not http(s)', async () => {
    const block = createHeroBlock([
      ['<a href="javascript:alert(1)">Unsafe headline</a>', 'Read'],
    ]);

    await decorate(block);

    expect(block.querySelector('h2 a')).toBeNull();
    expect(block.querySelector('h2')).toHaveTextContent('Unsafe headline');
    expect(block.querySelector('.hero__cta-text')).toBeNull();
  });

  describe('full-screen loading intro', () => {
    it('adds hero-intro on a first-section full-screen hero', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);

      await decorate(block);

      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();
    });

    it('does not add hero-intro on a default hero in the first section', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      mountInFirstSection(block);

      await decorate(block);

      expect(document.documentElement).not.toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--body');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
    });

    it('does not add hero-intro on a full-screen hero outside the first section', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      block.classList.add('hero-full-screen');
      const main = document.createElement('main');
      const first = document.createElement('div');
      first.className = 'section';
      const second = document.createElement('div');
      second.className = 'section';
      second.append(block);
      main.append(first, second);
      document.body.append(main);

      await decorate(block);

      expect(document.documentElement).not.toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--body');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
    });

    it('does not add hero-intro when reduced motion is preferred', async () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn((query) => ({
        matches: String(query).includes('prefers-reduced-motion'),
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      try {
        const block = createHeroBlock([
          ['<a href="/article">Headline</a>'],
        ]);
        block.classList.add('hero-full-screen');
        mountInFirstSection(block);

        await decorate(block);

        expect(document.documentElement).not.toHaveClass('hero-intro');
        expect(document.documentElement).not.toHaveClass('hero-intro--body');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    });

    it('adds hero-intro--nav after the nav delay and clears intro classes when done', async () => {
      jest.useFakeTimers();
      try {
        const block = createHeroBlock([
          ['<a href="/article">Headline</a>'],
        ]);
        block.classList.add('hero-full-screen');
        mountInFirstSection(block);

        await decorate(block);

        expect(document.documentElement).toHaveClass('hero-intro');
        expect(document.documentElement).not.toHaveClass('hero-intro--nav');
        expect(document.documentElement).not.toHaveClass('hero-intro--body');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();

        jest.advanceTimersByTime(HERO_INTRO_NAV_DELAY_MS);
        expect(document.documentElement).toHaveClass('hero-intro--nav');
        expect(document.documentElement).not.toHaveClass('hero-intro--body');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();

        jest.advanceTimersByTime(
          (HERO_INTRO_FROST_DURATION_S * 1000) - HERO_INTRO_NAV_DELAY_MS,
        );
        expect(document.documentElement).toHaveClass('hero-intro--body');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();

        jest.advanceTimersByTime(
          HERO_INTRO_DURATION_MS - (HERO_INTRO_FROST_DURATION_S * 1000),
        );
        expect(document.documentElement).not.toHaveClass('hero-intro');
        expect(document.documentElement).not.toHaveClass('hero-intro--nav');
        expect(document.documentElement).not.toHaveClass('hero-intro--body');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
