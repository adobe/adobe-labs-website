/**
 * Section cover predicates and geometry.
 */
import {
  COVER_START_VH,
  HEADER_FADE_VH,
  HEADER_FADE_VH_SMALL,
  INTRO_LAG,
  SHIFT_VH,
  coverStartPx,
  coversPrevious,
  headerFadeVh,
  introLagPx,
  isFullScreenHero,
  isRounded,
  pinTopPx,
  roundedParallax,
  staysInFlow,
  usesTouchScroll,
} from './sections.js';

/**
 * @param {string} html
 * @returns {HTMLElement}
 */
function section(html) {
  document.body.innerHTML = `<main>${html}</main>`;
  return document.querySelector('main > *');
}

/**
 * @param {{ small?: boolean, touch?: boolean }} [options]
 * @returns {void}
 */
function mockMatchMedia({ small = false, touch = false } = {}) {
  window.matchMedia = jest.fn((query) => ({
    matches: (query.includes('width < 48rem') && small)
      || (query.includes('pointer: coarse') && touch),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

beforeEach(() => {
  mockMatchMedia();
  document.body.innerHTML = '';
});

describe('isRounded', () => {
  it('matches any rounded surface variant', () => {
    expect(isRounded(section('<div class="section section-rounded-blue"></div>'))).toBe(true);
    expect(isRounded(section('<div class="section section-rounded-default"></div>'))).toBe(true);
  });

  it('does not match plain or hero sections', () => {
    expect(isRounded(section('<div class="section hero-container"></div>'))).toBe(false);
    expect(isRounded(null)).toBe(false);
  });
});

describe('isFullScreenHero', () => {
  it('needs both the hero container and the full-screen block', () => {
    expect(isFullScreenHero(section(`
      <div class="section hero-container"><div class="hero hero-full-screen"></div></div>
    `))).toBe(true);
    expect(isFullScreenHero(section(`
      <div class="section hero-container"><div class="hero"></div></div>
    `))).toBe(false);
    expect(isFullScreenHero(section(`
      <div class="section"><div class="hero hero-full-screen"></div></div>
    `))).toBe(false);
  });
});

describe('staysInFlow', () => {
  it('covers page headers and default heroes only', () => {
    expect(staysInFlow(section('<div class="section page-header-container"></div>'))).toBe(true);
    expect(staysInFlow(section(`
      <div class="section hero-container"><div class="hero"></div></div>
    `))).toBe(true);
    expect(staysInFlow(section('<div class="section section-rounded-blue"></div>'))).toBe(false);
    expect(staysInFlow(section(`
      <div class="section hero-container"><div class="hero hero-full-screen"></div></div>
    `))).toBe(false);
  });
});

describe('coversPrevious', () => {
  /**
   * @param {string} previousClass
   * @param {string} nextClass
   * @returns {boolean}
   */
  function pair(previousClass, nextClass) {
    document.body.innerHTML = `
      <main>
        <div class="section ${previousClass}"></div>
        <div class="section ${nextClass}"></div>
      </main>`;
    const [previous, next] = document.querySelector('main').children;
    return coversPrevious(previous, next);
  }

  it('needs the incoming section to be rounded', () => {
    expect(pair('section-rounded-blue', 'section-rounded-default')).toBe(true);
    expect(pair('hero-container', 'section-rounded-blue')).toBe(true);
    expect(pair('section-rounded-blue', 'plain')).toBe(false);
  });

  it('treats adjacent default cards as one card', () => {
    expect(pair('section-rounded-default', 'section-rounded-default')).toBe(false);
  });
});

describe('headerFadeVh', () => {
  it('fades over a longer scroll on small screens', () => {
    expect(headerFadeVh()).toBe(HEADER_FADE_VH);

    mockMatchMedia({ small: true });
    expect(headerFadeVh()).toBe(HEADER_FADE_VH_SMALL);
  });
});

describe('usesTouchScroll', () => {
  it('is true only for a coarse pointer without hover', () => {
    expect(usesTouchScroll()).toBe(false);

    mockMatchMedia({ touch: true });
    expect(usesTouchScroll()).toBe(true);
  });

  it('is false when matchMedia is unavailable', () => {
    window.matchMedia = undefined;
    expect(usesTouchScroll()).toBe(false);
  });
});

describe('roundedParallax', () => {
  it('recedes upward by SHIFT_VH, from rest', () => {
    expect(roundedParallax(800)).toBe(-SHIFT_VH * 800);
  });

  it('is inert without a viewport', () => {
    expect(roundedParallax(0)).toBe(0);
  });
});

describe('introLagPx', () => {
  it('holds back a share of the shorter of section and viewport', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section page-header-container"></div>');

    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 400 });
    expect(introLagPx(el)).toBe(400 * INTRO_LAG);

    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 1200 });
    expect(introLagPx(el)).toBe(800 * INTRO_LAG);
  });
});

describe('coverStartPx', () => {
  it('starts a rounded card at the cover line', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section section-rounded-blue"></div>');

    expect(coverStartPx(el)).toBe(800 * COVER_START_VH);
  });

  it('starts an intro section at the bottom of the outgoing section', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section page-header-container"></div>');
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 400 });

    expect(coverStartPx(el)).toBe(400);
  });
});

describe('pinTopPx', () => {
  it('parks a rounded card at the cover line', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section section-rounded-blue"></div>');
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 1200 });

    expect(pinTopPx(el)).toBe(800 * COVER_START_VH - 1200);
  });

  it('pins a full-screen hero at the top so it is never pulled under the nav', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section(`
      <div class="section hero-container"><div class="hero hero-full-screen"></div></div>
    `);
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 1200 });

    expect(pinTopPx(el)).toBe(0);
  });
});
