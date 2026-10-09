import { within } from '@testing-library/dom';
import { markExternalLink } from '../../scripts/utils/utils.js';
import decorate, {
  clearHeroIntro,
  HERO_INTRO_DURATION_MS,
  HERO_INTRO_FAST_MS,
  HERO_INTRO_FROST_ID,
  HERO_INTRO_NAV_DELAY_MS,
} from './hero.js';

/**
 * Matches `wrapTextNodes` in aem.js: plain cells become paragraphs before decorate.
 *
 * @param {HTMLElement} block Hero block
 */
function wrapPlainCells(block) {
  const valid = new Set([
    'P', 'PRE', 'UL', 'OL', 'PICTURE', 'TABLE', 'BLOCKQUOTE',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  ]);
  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    if (!cell.hasChildNodes()) return;
    const first = cell.firstElementChild;
    if (first && valid.has(first.tagName)) return;
    const paragraph = document.createElement('p');
    paragraph.append(...cell.childNodes);
    cell.append(paragraph);
  });
}

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

function flushPaintFrames() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/** jsdom does not lay out scroll, so tests set this value directly. */
let scrollYValue = 0;

function setScrollY(value) {
  scrollYValue = value;
}

Object.defineProperty(window, 'scrollY', {
  configurable: true,
  get: () => scrollYValue,
});

afterEach(() => {
  clearHeroIntro();
  setScrollY(0);
  document.body.classList.remove('appear');
  document.querySelector('a.header__skip')?.remove();
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
      const eyebrowText = view.getByText('ResearchTest');
      expect(eyebrowText).toHaveClass('hero__content-type');
      const eyebrow = eyebrowText.closest('.hero__eyebrow');
      expect(eyebrow).toHaveAttribute('aria-hidden', 'true');
      const mark = eyebrow.querySelector('svg');
      expect(eyebrow.firstElementChild).toBe(mark);
      expect(mark).toHaveAttribute('viewBox', '0 0 38 38');
      expect(mark.querySelector('circle')).toHaveAttribute('fill', 'white');
      const date = view.getByText('5.24.26');
      expect(date).toHaveClass('hero__date');
      expect(date).toHaveAttribute('aria-hidden', 'true');
      const headline = block.querySelector('.hero__headline');
      expect(headline.tagName).toBe('P');
      expect(headline).toHaveTextContent('How AI is Redistributing Creative Work.');
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
    const headline = block.querySelector('.hero__headline');
    expect(headline.tagName).toBe('P');
    expect(headline).toHaveTextContent('Project Clean Take');
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
      expect(within(block).getByText('Sneaks')).toHaveClass('hero__content-type');
    } finally {
      main.remove();
      window.history.replaceState({}, '', '/');
    }
  });

  it('prints article category metadata above the headline as-is', async () => {
    const template = document.createElement('meta');
    template.setAttribute('name', 'template');
    template.content = 'article';
    const category = document.createElement('meta');
    category.setAttribute('name', 'category');
    category.content = 'Future of Creative Work, Standards & Practices';
    document.head.append(template, category);

    const block = createHeroBlock([
      [
        'Research',
        'Oct 26',
        '<h1>How Creatives are thinking about AI</h1>',
        '',
      ],
    ]);
    const main = placeInMain(block);

    try {
      await decorate(block);

      const kicker = within(block).getByText('Future of Creative Work, Standards & Practices');
      expect(kicker).toHaveClass('hero__category');
      expect(kicker.nextElementSibling.tagName).toBe('H1');
      expect(kicker.nextElementSibling).toHaveClass('hero__headline');
      expect(kicker.nextElementSibling.querySelector('span')).toHaveTextContent(
        'How Creatives are thinking about AI',
      );
    } finally {
      main.remove();
      document.head.querySelectorAll('meta[name="template"], meta[name="category"]').forEach((el) => el.remove());
    }
  });

  it('keeps category, date, and the link when plain cells are wrapped in paragraphs', async () => {
    const block = createHeroBlock([
      [
        'Research',
        '5.24.26',
        '<a href="/research/example-article-1">How AI is redistributing creative work.</a>',
        'Read',
      ],
      ['<picture><img src="hero.jpg" alt="hero"></picture>'],
    ]);
    wrapPlainCells(block);
    const main = placeInMain(block);

    try {
      await decorate(block);

      const view = within(block);
      expect(view.getByText('Research')).toHaveClass('hero__content-type');
      expect(view.getByText('5.24.26')).toHaveClass('hero__date');
      const headline = block.querySelector('.hero__headline');
      expect(headline.tagName).toBe('P');
      expect(headline).toHaveTextContent('How AI is redistributing creative work.');
      expect(block.querySelector('.hero__cta-text')).toHaveTextContent('Read');
      expect(block.querySelector('.hero__link-wrap'))
        .toHaveAttribute('href', expect.stringMatching(/\/research\/example-article-1$/));
    } finally {
      main.remove();
    }
  });

  it('uses the third cell as the headline when every copy cell is a paragraph', async () => {
    const block = createHeroBlock([
      ['Research', 'Oct 26', '<p>Default title</p>', ''],
    ]);
    wrapPlainCells(block);
    const main = placeInMain(block);

    try {
      await decorate(block);

      expect(within(block).getByText('Research')).toHaveClass('hero__content-type');
      expect(within(block).getByText('Oct 26')).toHaveClass('hero__date');
      const headline = block.querySelector('.hero__headline');
      expect(headline.tagName).toBe('P');
      expect(headline).toHaveTextContent('Default title');
    } finally {
      main.remove();
    }
  });

  it.each([
    ['h1', 'Article title'],
    ['h2', 'Section title'],
    ['p', 'Default title'],
  ])('renders an authored %s headline as that element', async (tag, text) => {
    const block = createHeroBlock([
      ['Research', 'Oct 26', `<${tag}>${text}</${tag}>`, ''],
    ]);

    await decorate(block);

    const headline = block.querySelector('.hero__headline');
    expect(headline.tagName).toBe(tag.toUpperCase());
    expect(headline.querySelector('span')).toHaveTextContent(text);
    expect(block.querySelector('.hero__link-wrap')).toBeNull();
  });

  it('keeps a linked headline inside the block link at the authored level', async () => {
    const block = createHeroBlock([
      ['<h2><a href="/research/story">Linked title</a></h2>', 'Read'],
    ]);

    await decorate(block);

    const headline = block.querySelector('.hero__headline');
    expect(headline.tagName).toBe('H2');
    expect(headline).toHaveTextContent('Linked title');
    expect(headline.closest('.hero__link-wrap'))
      .toHaveAttribute('href', expect.stringMatching(/\/research\/story$/));
  });

  it('omits empty optional fields', async () => {
    const block = createHeroBlock([
      ['<a href="/article">Headline only</a>'],
    ]);

    await decorate(block);

    expect(block.querySelector('.hero__eyebrow')).toBeNull();
    expect(block.querySelector('.hero__date')).toBeNull();
    expect(block.querySelector('.hero__media')).toBeNull();
    const headline = block.querySelector('.hero__headline');
    expect(headline.tagName).toBe('P');
    expect(headline).toHaveTextContent('Headline only');
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

  it('leaves the image as the only visual on a device without a fine pointer', async () => {
    const block = createHeroBlock([
      ['<a href="/research/example">Headline</a>'],
      ['<picture><img src="hero.jpg" alt="hero"></picture>'],
    ]);

    await decorate(block);

    // jsdom has no fine-pointer match and no WebGL, so the chromatic hover
    // never mounts; this guards against it ever touching the real <img>.
    expect(block.querySelector('canvas')).toBeNull();
    expect(block.querySelector('.hero__media img')).toHaveAttribute('alt', 'hero');
  });

  it('keeps a new-tab hint out of the visible headline', async () => {
    const block = createHeroBlock([
      [
        'ResearchTest',
        '5.24.26',
        '<a href="https://www.adobe.com/">External link test<span class="visually-hidden"> (opens in a new tab)</span>s</a>',
        'Read',
      ],
      ['<picture><img src="hero.jpg" alt="hero"></picture>'],
    ]);

    await decorate(block);

    const link = block.querySelector('.hero__link-wrap');
    markExternalLink(link);

    expect(block.querySelector('.hero__headline-text')).toHaveTextContent(/^External link tests$/);
    expect(block.querySelector('.hero__headline-underline')).toHaveTextContent(/^External link tests$/);
    expect(link).toHaveAttribute('aria-label', 'External link tests • Read (opens in a new tab)');
    expect(link.querySelector('.visually-hidden')).toBeNull();
    expect(within(block).getByRole('link', { name: 'External link tests • Read (opens in a new tab)' }))
      .toBe(link);
  });

  it('does not link the headline or CTA when the URL is not http(s)', async () => {
    const block = createHeroBlock([
      ['<a href="javascript:alert(1)">Unsafe headline</a>', 'Read'],
    ]);

    await decorate(block);

    expect(block.querySelector('.hero__headline a')).toBeNull();
    expect(block.querySelector('.hero__headline').tagName).toBe('P');
    expect(block.querySelector('.hero__headline')).toHaveTextContent('Unsafe headline');
    expect(block.querySelector('.hero__cta-text')).toBeNull();
  });

  describe('full-screen loading intro', () => {
    /** @type {jest.SpyInstance} */
    let vendor;

    beforeEach(() => {
      document.body.classList.add('appear');
      // This Mac's jsdom reports the Apple vendor. Frost tests need a non-WebKit vendor.
      vendor = jest.spyOn(navigator, 'vendor', 'get').mockReturnValue('Google Inc.');
    });

    afterEach(() => {
      vendor.mockRestore();
    });

    it('adds hero-intro immediately and hero-intro--body after paint', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);

      await decorate(block);

      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--body');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();

      await flushPaintFrames();

      expect(document.documentElement).toHaveClass('hero-intro--body');
    });

    it('shows a hidden second section so the rise can run with the image', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);
      const second = document.createElement('div');
      second.className = 'section';
      second.style.display = 'none';
      second.dataset.sectionStatus = 'initialized';
      block.closest('main').append(second);

      await decorate(block);

      expect(second.style.display).toBe('');
      expect(second.dataset.sectionStatus).toBe('initialized');
    });

    it('does not show the second section while the hero section is hidden', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);
      const first = block.closest('.section');
      first.style.display = 'none';
      const second = document.createElement('div');
      second.className = 'section';
      second.style.display = 'none';
      second.dataset.sectionStatus = 'initialized';
      block.closest('main').append(second);

      await decorate(block);
      await flushPaintFrames();

      expect(second.style.display).toBe('none');
      expect(second.dataset.sectionStatus).toBe('initialized');
      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--body');

      first.style.display = '';
      await flushPaintFrames();
      await flushPaintFrames();

      expect(second.style.display).toBe('');
      expect(second.dataset.sectionStatus).toBe('initialized');
      expect(document.documentElement).toHaveClass('hero-intro--body');
    });

    it('clears the intro when the skip link is clicked', async () => {
      const skip = document.createElement('a');
      skip.className = 'header__skip';
      skip.href = '#main';
      document.body.prepend(skip);

      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
        ['<picture><img src="hero.jpg" alt="hero"></picture>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);

      await decorate(block);
      await flushPaintFrames();

      const img = block.querySelector('.hero__media img');
      expect(document.documentElement).toHaveClass('hero-intro--body');
      expect(img.style.filter).toContain('blur');

      skip.click();

      expect(document.documentElement).not.toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--body');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
      expect(img.style.filter).toBe('');
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

    it('adds hero-intro when the URL has a hash and the page is at the top', async () => {
      window.history.replaceState({}, '', '/#section');
      try {
        setScrollY(0);
        const block = createHeroBlock([
          ['<a href="/article">Headline</a>'],
        ]);
        block.classList.add('hero-full-screen');
        mountInFirstSection(block);

        await decorate(block);

        expect(document.documentElement).toHaveClass('hero-intro');
        expect(document.documentElement).not.toHaveClass('hero-intro--scrolled');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();
      } finally {
        window.history.replaceState({}, '', '/');
      }
    });

    it('does not add hero-intro when the page is not at the top', async () => {
      setScrollY(120);
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);

      await decorate(block);

      expect(block.closest('.section')).toHaveClass('hero-container--overlay');
      expect(document.documentElement).not.toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--body');
      expect(document.documentElement).not.toHaveClass('hero-intro--scrolled');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
    });

    it('settles the next section when the user scrolls during the intro', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
        ['<picture><img src="hero.jpg" alt="hero"></picture>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);

      await decorate(block);

      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--scrolled');

      setScrollY(80);
      window.dispatchEvent(new Event('scroll'));

      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).toHaveClass('hero-intro--scrolled');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();

      setScrollY(0);
      window.dispatchEvent(new Event('scroll'));

      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).toHaveClass('hero-intro--scrolled');

      clearHeroIntro();

      expect(document.documentElement).not.toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--scrolled');
    });

    it('fast-tracks the section after the hero when the user scrolls', async () => {
      jest.useFakeTimers();
      const originalGetAnimations = document.getAnimations;
      const rise = {
        animationName: 'hero-intro-section-rise',
        currentTime: 0,
        playbackRate: 1,
        effect: { getComputedTiming: () => ({ endTime: 2300 }) },
      };
      const heroZoom = {
        animationName: 'hero-intro-media-zoom',
        currentTime: 0,
        playbackRate: 1,
        effect: { getComputedTiming: () => ({ endTime: 2300 }) },
      };
      document.getAnimations = () => {
        throw new Error('document.getAnimations');
      };

      try {
        const block = createHeroBlock([
          ['<a href="/article">Headline</a>'],
          ['<picture><img src="hero.jpg" alt="hero"></picture>'],
        ]);
        block.classList.add('hero-full-screen');
        mountInFirstSection(block);
        const heroSection = block.closest('.section');
        heroSection.classList.add('hero-container');
        heroSection.getAnimations = () => [heroZoom];
        const next = document.createElement('div');
        next.className = 'section';
        next.getAnimations = () => [rise];
        heroSection.after(next);

        await decorate(block);
        await jest.advanceTimersByTimeAsync(32);

        expect(document.documentElement).toHaveClass('hero-intro--body');
        expect(document.documentElement).not.toHaveClass('hero-intro--scrolled');

        setScrollY(80);
        window.dispatchEvent(new Event('scroll'));
        expect(rise.playbackRate).toBe(1);

        await jest.advanceTimersByTimeAsync(16);

        expect(rise.playbackRate).toBe(2300 / HERO_INTRO_FAST_MS);
        expect(heroZoom.playbackRate).toBe(1);
        expect(document.documentElement).toHaveClass('hero-intro');
        expect(document.documentElement).toHaveClass('hero-intro--scrolled');
        expect(document.documentElement).not.toHaveClass('hero-intro--nav');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();

        await jest.advanceTimersByTimeAsync(HERO_INTRO_DURATION_MS - 16 - 1);
        expect(document.documentElement).toHaveClass('hero-intro');
        expect(document.documentElement).toHaveClass('hero-intro--body');

        await jest.advanceTimersByTimeAsync(1);
        expect(document.documentElement).not.toHaveClass('hero-intro');
        expect(document.documentElement).not.toHaveClass('hero-intro--body');
        expect(document.documentElement).not.toHaveClass('hero-intro--scrolled');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
      } finally {
        document.getAnimations = originalGetAnimations;
        jest.useRealTimers();
      }
    });

    it('settles the next section when the page leaves the top before the body step', async () => {
      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);

      await decorate(block);

      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--body');

      setScrollY(40);
      await flushPaintFrames();

      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).toHaveClass('hero-intro--body');
      expect(document.documentElement).toHaveClass('hero-intro--scrolled');
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

    it('skips the frost filter on WebKit and clears the no-frost class', async () => {
      vendor.mockReturnValue('Apple Computer, Inc.');

      const block = createHeroBlock([
        ['<a href="/article">Headline</a>'],
        ['<picture><img src="hero.jpg" alt="hero"></picture>'],
      ]);
      block.classList.add('hero-full-screen');
      mountInFirstSection(block);

      await decorate(block);

      const img = block.querySelector('.hero__media img');
      expect(document.documentElement).toHaveClass('hero-intro');
      expect(document.documentElement).toHaveClass('hero-intro--no-frost');
      expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
      expect(img.style.filter).toBe('');

      clearHeroIntro();

      expect(document.documentElement).not.toHaveClass('hero-intro');
      expect(document.documentElement).not.toHaveClass('hero-intro--no-frost');
    });

    it('adds hero-intro--nav after the nav delay and clears intro classes when done', async () => {
      jest.useFakeTimers();
      try {
        const block = createHeroBlock([
          ['<a href="/article">Headline</a>'],
          ['<picture><img src="hero.jpg" alt="hero"></picture>'],
        ]);
        block.classList.add('hero-full-screen');
        mountInFirstSection(block);

        await decorate(block);

        const media = block.querySelector('.hero__media');
        const img = media.querySelector('img');
        expect(document.documentElement).toHaveClass('hero-intro');
        expect(document.documentElement).not.toHaveClass('hero-intro--body');
        expect(document.documentElement).not.toHaveClass('hero-intro--nav');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();
        expect(img.style.filter).toContain('blur');
        expect(media.style.filter).toBe('');

        await jest.advanceTimersByTimeAsync(32);

        expect(document.documentElement).toHaveClass('hero-intro--body');
        expect(document.documentElement).not.toHaveClass('hero-intro--nav');

        jest.advanceTimersByTime(HERO_INTRO_NAV_DELAY_MS);
        expect(document.documentElement).toHaveClass('hero-intro--nav');
        expect(document.documentElement).toHaveClass('hero-intro--body');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeTruthy();

        jest.advanceTimersByTime(HERO_INTRO_DURATION_MS - HERO_INTRO_NAV_DELAY_MS);
        expect(document.documentElement).not.toHaveClass('hero-intro');
        expect(document.documentElement).not.toHaveClass('hero-intro--nav');
        expect(document.documentElement).not.toHaveClass('hero-intro--body');
        expect(document.getElementById(HERO_INTRO_FROST_ID)).toBeNull();
        expect(img.style.filter).toBe('');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
