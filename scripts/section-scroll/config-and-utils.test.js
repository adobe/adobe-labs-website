/**
 * Section cover predicates and geometry.
 */
import {
  COVER_START_VH,
  HEADER_FADE_VH,
  HEADER_FADE_VH_SMALL,
  INTRO_LAG,
  SHIFT_VH,
  coverPinProgress,
  coverStartPx,
  coversPrevious,
  dimCoverRange,
  FOOTER_UNCOVER_VH,
  footerCoverDistance,
  footerCoverFits,
  headerFadeVh,
  holdThenLinear,
  introHoldEase,
  introHoldPx,
  introLagPx,
  isFullScreenHero,
  isRounded,
  pinTopPx,
  pinsFlush,
  roundedParallax,
  staysInFlow,
  usesCssCover,
  usesTouchScroll,
} from './config-and-utils.js';

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

  it('does not let a plain section cover a shared page header and hero', () => {
    document.body.innerHTML = `
      <main>
        <div class="section">
          <div class="page-header"></div>
          <div class="hero"></div>
        </div>
        <div class="section"></div>
      </main>`;
    const [previous, next] = document.querySelector('main').children;

    expect(coversPrevious(previous, next)).toBe(false);
  });

  it('does not cover a page header that has no hero', () => {
    document.body.innerHTML = `
      <main>
        <div class="section"><div class="page-header"></div></div>
        <div class="section"></div>
      </main>`;
    const [previous, next] = document.querySelector('main').children;

    expect(coversPrevious(previous, next)).toBe(false);
  });

  it('does not treat a full-screen hero as that intro', () => {
    document.body.innerHTML = `
      <main>
        <div class="section hero-container">
          <div class="page-header"></div>
          <div class="hero hero-full-screen"></div>
        </div>
        <div class="section"></div>
      </main>`;
    const [previous, next] = document.querySelector('main').children;

    expect(coversPrevious(previous, next)).toBe(false);
  });
});

describe('headerFadeVh', () => {
  it('fades over a longer scroll on small screens', () => {
    expect(headerFadeVh()).toBe(HEADER_FADE_VH);

    mockMatchMedia({ small: true });
    expect(headerFadeVh()).toBe(HEADER_FADE_VH_SMALL);
  });
});

describe('usesCssCover', () => {
  const supports = () => true;

  afterEach(() => {
    delete window.CSS;
  });

  it('is only the touch path that can run scroll-driven fades', () => {
    window.CSS = { supports };
    mockMatchMedia({ touch: false });
    expect(usesCssCover()).toBe(false);

    mockMatchMedia({ touch: true });
    expect(usesCssCover()).toBe(true);

    window.CSS = { supports: () => false };
    expect(usesCssCover()).toBe(false);

    delete window.CSS;
    expect(usesCssCover()).toBe(false);
  });
});

describe('dimCoverRange', () => {
  /**
   * @param {HTMLElement} el
   * @param {number} top
   */
  function placeAt(el, top) {
    el.getBoundingClientRect = () => ({ top });
  }

  it('maps the cover line onto view-timeline cover offsets', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const rounded = section(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    placeAt(rounded.nextElementSibling, 1500);
    expect(dimCoverRange(rounded, rounded.nextElementSibling)).toEqual({ start: '320px', end: '800px' });

    const intro = section(`
      <div class="section page-header-container"></div>
      <div class="section section-rounded-default"></div>
    `);
    Object.defineProperty(intro, 'offsetHeight', { configurable: true, value: 400 });
    placeAt(intro.nextElementSibling, 1500);
    expect(dimCoverRange(intro, intro.nextElementSibling)).toEqual({ start: '400px', end: '800px' });
  });

  it('starts at scroll 0 when the next section loads above the cover line', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 915 });
    const hero = section(`
      <div class="section hero-container"><div class="hero hero-full-screen"></div></div>
      <div class="section section-rounded-default"></div>
    `);
    placeAt(hero.nextElementSibling, 519);
    expect(dimCoverRange(hero, hero.nextElementSibling)).toEqual({ start: '396px', end: '915px' });
  });
  
  it('ends when the incoming top reaches the viewport top, not when it is fully visible', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 956 });
    const hero = section(`
      <div class="section hero-container"><div class="hero hero-full-screen"></div></div>
      <div class="section section-rounded-default"></div>
    `);
    placeAt(hero.nextElementSibling, 1500);
    expect(dimCoverRange(hero, hero.nextElementSibling)).toEqual({ start: '382px', end: '956px' });
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

describe('coverPinProgress', () => {
  it('is the overlap as a share of the cover scroll', () => {
    expect(coverPinProgress(30, 540)).toBeCloseTo(30 / 540);
  });

  it('stays at the start when the next card does not overlap', () => {
    expect(coverPinProgress(0, 540)).toBe(0);
    expect(coverPinProgress(-10, 540)).toBe(0);
    expect(coverPinProgress(30, 0)).toBe(0);
  });

  it('does not run past the end of the cover', () => {
    expect(coverPinProgress(800, 540)).toBe(1);
  });
});

describe('holdThenLinear', () => {
  it('is linear when the card is already pinned', () => {
    expect(holdThenLinear(0.4, 0)).toBe(0.4);
  });

  it('stays at rest until the pin, then catches up', () => {
    expect(holdThenLinear(0.25, 0.5)).toBe(0);
    expect(holdThenLinear(0.5, 0.5)).toBe(0);
    expect(holdThenLinear(0.75, 0.5)).toBe(0.5);
    expect(holdThenLinear(1, 0.5)).toBe(1);
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

describe('footerCoverDistance', () => {
  it('uses the menu height when the footer is a row', () => {
    expect(footerCoverDistance(700, 800, false)).toBe(700);
  });

  it('caps a tall stacked menu at half the viewport', () => {
    expect(footerCoverDistance(700, 800, true)).toBe(800 * FOOTER_UNCOVER_VH);
  });

  it('keeps a short stacked menu on its own height', () => {
    expect(footerCoverDistance(200, 800, true)).toBe(200);
  });
});

describe('footerCoverFits', () => {
  /**
   * @param {number} top Document position of the footer
   * @returns {HTMLElement}
   */
  function placed(top) {
    const el = document.createElement('div');
    el.getBoundingClientRect = () => ({ top, bottom: top, height: 0 });
    return el;
  }

  it('keeps the door while the footer starts below the fold', () => {
    expect(footerCoverFits(placed(1600), 900)).toBe(true);
  });

  it('drops the door when the viewport is tall enough to show the footer', () => {
    expect(footerCoverFits(placed(1800), 3440)).toBe(false);
  });

  it('stays eligible until the footer has a document position', () => {
    expect(footerCoverFits(placed(0), 800)).toBe(true);
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

describe('introHoldPx', () => {
  it('measures the gap to the next section, never negative', () => {
    document.body.innerHTML = '<main><div class="section"></div><div class="section"></div></main>';
    const [el, next] = document.querySelectorAll('.section');
    Object.defineProperty(el, 'offsetTop', { configurable: true, value: 100 });
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 400 });
    Object.defineProperty(next, 'offsetTop', { configurable: true, value: 564 });
    expect(introHoldPx(el)).toBe(64);

    Object.defineProperty(next, 'offsetTop', { configurable: true, value: 470 });
    expect(introHoldPx(el)).toBe(0);
    expect(introHoldPx(next)).toBe(0);
  });
});

describe('introHoldEase', () => {
  it('is linear without a hold', () => {
    expect(introHoldEase(0.3, { hold: 0, lag: 160, span: 800 })).toBe(0.3);
  });

  it('holds still for the gap, then lags over the rest of the span', () => {
    const geometry = { hold: 80, lag: 160, span: 800 };
    // Holding still means moving down as fast as the page scrolls up.
    expect(introHoldEase(0.05, geometry) * 240).toBeCloseTo(40);
    expect(introHoldEase(0.1, geometry) * 240).toBeCloseTo(80);
    expect(introHoldEase(0.55, geometry) * 240).toBeCloseTo(160);
    expect(introHoldEase(1, geometry)).toBe(1);
  });
});

describe('coverStartPx', () => {
  it('starts a rounded card at the cover line', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section section-rounded-blue"></div>');

    expect(coverStartPx(el)).toBe(800 * COVER_START_VH);
  });

  it('starts a short rounded card at its own bottom', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section section-rounded-blue"></div>');
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 400 });

    expect(coverStartPx(el)).toBe(400);
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

  it('pins a short rounded card at the top of a tall viewport', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section section-rounded-blue"></div>');
    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 400 });

    expect(pinTopPx(el)).toBe(0);
  });

  it('asks the next card to cover a flush pin', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const el = section('<div class="section section-rounded-blue"></div>');

    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 400 });
    expect(pinsFlush(el)).toBe(true);

    Object.defineProperty(el, 'offsetHeight', { configurable: true, value: 1200 });
    expect(pinsFlush(el)).toBe(false);
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
