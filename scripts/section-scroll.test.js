/**
 * Section scroll classification and motion opt-in.
 */
import { loadCSS } from './aem.js';
import {
  COVER_EASE_VH,
  COVER_START_VH,
  INTRO_LAG,
  classifySectionScroll,
  initSectionScroll,
  teardownSectionScroll,
  updateSectionScrollShift,
} from './section-scroll.js';

jest.mock('./aem.js', () => ({
  loadCSS: jest.fn(() => Promise.resolve()),
}));

/**
 * Builds a main fixture on document.body.
 *
 * @param {string} mainHtml Sections inside main
 * @returns {HTMLElement}
 */
function mountMain(mainHtml) {
  document.body.innerHTML = `<main>${mainHtml}</main>`;
  return document.querySelector('main');
}

/**
 * @param {boolean} matches
 * @returns {MediaQueryList}
 */
function mockMatchMedia(matches) {
  const mq = {
    matches,
    media: '(prefers-reduced-motion: no-preference)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  window.matchMedia = jest.fn(() => mq);
  return mq;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.hlx = { codeBasePath: '' };
  document.body.innerHTML = '';
});

afterEach(() => {
  teardownSectionScroll();
  document.body.innerHTML = '';
});

describe('classifySectionScroll', () => {
  it('slows a rounded section when the next rounded section arrives', () => {
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    const [previous, next] = main.children;
    expect(previous).toHaveClass('section-scroll-slow');
    expect(previous).not.toHaveClass('section-scroll-intro');
    expect(next).toHaveClass('section-scroll-next');
    expect(next).not.toHaveClass('section-scroll-slow');
  });

  it('does not slow adjacent default sections', () => {
    const main = mountMain(`
      <div class="section section-rounded-default"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    expect(main.children[0]).not.toHaveClass('section-scroll-slow');
    expect(main.children[1]).not.toHaveClass('section-scroll-next');
  });

  it('slows a full-screen hero behind a rounded section', () => {
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero hero-full-screen"></div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    expect(main.children[0]).toHaveClass('section-scroll-slow');
    expect(main.children[0]).not.toHaveClass('section-scroll-intro');
    expect(main.children[1]).toHaveClass('section-scroll-next');
    expect(main.children[0].style.getPropertyValue('--section-scroll-slow-top')).toBe('0px');
  });

  it('pins a full-screen hero overlay at the top even when taller than the viewport', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero hero-full-screen"></div>
      </div>
      <div class="section section-rounded-default"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 1200 });

    classifySectionScroll();

    expect(main.children[0].style.getPropertyValue('--section-scroll-slow-top')).toBe('0px');
  });

  it('does not shift a full-screen hero as the next section covers it', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero hero-full-screen"></div>
      </div>
      <div class="section section-rounded-default"></div>
    `);
    classifySectionScroll();
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: 200 });

    updateSectionScrollShift();

    expect(main.children[0].style.getPropertyValue('--section-scroll-shift')).toBe('0');
  });

  it('slows a page-header behind the first rounded section without pinning', () => {
    const main = mountMain(`
      <div class="section page-header-container hero-container">
        <div class="page-header"></div>
      </div>
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    const [header, blue, next] = main.children;
    expect(header).toHaveClass('section-scroll-slow');
    expect(header).toHaveClass('section-scroll-intro');
    expect(header.style.getPropertyValue('--section-scroll-slow-top')).toBe('');
    expect(blue).toHaveClass('section-scroll-next');
    expect(blue).toHaveClass('section-scroll-slow');
    expect(blue).not.toHaveClass('section-scroll-intro');
    expect(next).toHaveClass('section-scroll-next');
  });

  it('lags page-header content while the first rounded section covers it', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section page-header-container">
        <div class="page-header"></div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 400 });
    classifySectionScroll();
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: 200 });

    updateSectionScrollShift();

    expect(main.children[0].style.getPropertyValue('--section-scroll-shift'))
      .toBe(`${200 * INTRO_LAG}px`);
  });

  it('does not lag a page-header until the first rounded section overlaps it', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section page-header-container">
        <div class="page-header"></div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 400 });
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: 400 });

    classifySectionScroll();

    expect(main.children[0].style.getPropertyValue('--section-scroll-shift')).toBe('0px');
    expect(main.children[0].style.getPropertyValue('--section-scroll-dim')).toBe('0');
  });

  it('dims a page-header as soon as the first rounded section overlaps it', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section page-header-container">
        <div class="page-header"></div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 700 });
    classifySectionScroll();
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: 500 });

    updateSectionScrollShift();

    const dim = Number(main.children[0].style.getPropertyValue('--section-scroll-dim'));
    expect(dim).toBeGreaterThan(0);
    expect(dim).toBeLessThan(0.8);
  });

  it('stacks slow/next through a color/default chain', () => {
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
      <div class="section section-rounded-pink"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    expect(main.children[0]).toHaveClass('section-scroll-slow');
    expect(main.children[1]).toHaveClass('section-scroll-next');
    expect(main.children[1]).toHaveClass('section-scroll-slow');
    expect(main.children[2]).toHaveClass('section-scroll-next');
    expect(main.children[2]).toHaveClass('section-scroll-slow');
    expect(main.children[3]).toHaveClass('section-scroll-next');
    expect(main.children[3]).not.toHaveClass('section-scroll-slow');
  });

  it('does not cover a trailing default section such as Coming Soon', () => {
    const main = mountMain(`
      <div class="section section-rounded-pink"></div>
      <div class="section section-rounded-default"></div>
      <div class="section section-rounded-default">
        <h2>Coming Soon</h2>
      </div>
    `);

    classifySectionScroll();

    const comingSoon = main.children[2];
    expect(main.children[0]).toHaveClass('section-scroll-slow');
    expect(main.children[1]).toHaveClass('section-scroll-next');
    expect(comingSoon).not.toHaveClass('section-scroll-slow');
    expect(comingSoon).not.toHaveClass('section-scroll-next');
    expect(comingSoon.style.zIndex).toBe('');
  });

  it('pins the outgoing section when the next section reaches COVER_START_VH', () => {
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 1200 });

    classifySectionScroll();

    expect(main.children[0].style.getPropertyValue('--section-scroll-slow-top'))
      .toBe(`${vh * COVER_START_VH - 1200}px`);
  });

  it('does not shift until the ease-in before COVER_START_VH', () => {
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    jest.spyOn(main.children[1], 'getBoundingClientRect')
      .mockReturnValue({ top: vh * (COVER_START_VH + COVER_EASE_VH) });

    classifySectionScroll();

    expect(main.children[0].style.getPropertyValue('--section-scroll-shift')).toBe('0px');
  });

  it('eases the outgoing shift in before the pin', () => {
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    const pinY = vh * COVER_START_VH;
    const easeY = pinY + vh * COVER_EASE_VH;
    classifySectionScroll();
    jest.spyOn(main.children[1], 'getBoundingClientRect')
      .mockReturnValue({ top: (pinY + easeY) / 2 });

    updateSectionScrollShift();

    const midEase = Number(main.children[0].style.getPropertyValue('--section-scroll-shift').replace('px', ''));
    expect(midEase).toBeGreaterThan(0);

    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: pinY });
    updateSectionScrollShift();
    const atPin = Number(main.children[0].style.getPropertyValue('--section-scroll-shift').replace('px', ''));
    expect(atPin).toBeGreaterThan(midEase);
  });

  it('continues the outgoing shift after the pin', () => {
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    const pinY = vh * COVER_START_VH;
    classifySectionScroll();
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: pinY });
    updateSectionScrollShift();
    const atPin = Number(main.children[0].style.getPropertyValue('--section-scroll-shift').replace('px', ''));

    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: pinY / 2 });
    updateSectionScrollShift();
    const afterPin = Number(main.children[0].style.getPropertyValue('--section-scroll-shift').replace('px', ''));

    expect(afterPin).toBeLessThan(atPin);
  });

  it('does not dim a rounded card until the next section reaches COVER_START_VH', () => {
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    jest.spyOn(main.children[0], 'getBoundingClientRect').mockReturnValue({ top: -800 });
    jest.spyOn(main.children[1], 'getBoundingClientRect')
      .mockReturnValue({ top: vh * COVER_START_VH });

    classifySectionScroll();

    expect(main.children[0].style.getPropertyValue('--section-scroll-dim')).toBe('0');
  });

  it('reaches peak dim once the next section is near the top of the viewport', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    classifySectionScroll();
    jest.spyOn(main.children[0], 'getBoundingClientRect').mockReturnValue({ top: -800 });
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: 0 });

    updateSectionScrollShift();

    expect(main.children[0].style.getPropertyValue('--section-scroll-dim')).toBe('0.8');
  });

  it('dims gradually as the next section covers the outgoing one', () => {
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    classifySectionScroll();
    jest.spyOn(main.children[1], 'getBoundingClientRect')
      .mockReturnValue({ top: (vh * COVER_START_VH) / 2 });

    updateSectionScrollShift();

    expect(main.children[0].style.getPropertyValue('--section-scroll-dim')).toBe('0.4');
  });
});

describe('initSectionScroll', () => {
  it('does not load CSS or classify when motion is not opted in', async () => {
    mockMatchMedia(false);
    mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    expect(loadCSS).not.toHaveBeenCalled();
    expect(document.querySelector('.section-scroll-slow')).toBeNull();
  });

  it('loads CSS and classifies when no-preference matches', async () => {
    mockMatchMedia(true);
    mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    expect(loadCSS).toHaveBeenCalledWith('/styles/section-scroll.css');
    expect(document.querySelector('.section-rounded-blue')).toHaveClass('section-scroll-slow');
  });
});
