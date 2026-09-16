/**
 * Section scroll classification and GSAP motion opt-in.
 */
import { loadCSS } from './aem.js';
import { gsap, ScrollTrigger } from '../deps/gsap/dist/index.js';
import Lenis from '../deps/lenis/dist/index.js';
import {
  COVER_EASE_VH,
  COVER_START_VH,
  HEADER_FADE_VH,
  HEADER_FADE_VH_SMALL,
  HERO_TEXT_SPEED,
  INTRO_LAG,
  OVERLAY_DIM,
  classifySectionScroll,
  footerInnerProgress,
  footerLogoReady,
  initSectionScroll,
  roundedParallax,
  teardownSectionScroll,
} from './section-scroll.js';

jest.mock('./aem.js', () => ({
  loadCSS: jest.fn(() => Promise.resolve()),
}));

jest.mock('../deps/gsap/dist/index.js', () => {
  const timeline = {
    fromTo: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
  };
  const motionCtx = { revert: jest.fn() };
  const mockGsap = {
    context: jest.fn((fn) => {
      fn();
      return motionCtx;
    }),
    timeline: jest.fn(() => timeline),
    fromTo: jest.fn(),
    ticker: {
      add: jest.fn(),
      remove: jest.fn(),
      lagSmoothing: jest.fn(),
    },
  };
  const mockScrollTrigger = {
    update: jest.fn(),
    refresh: jest.fn(),
    maxScroll: jest.fn(() => 1000),
    create: jest.fn(),
  };
  return { __esModule: true, gsap: mockGsap, ScrollTrigger: mockScrollTrigger };
});

jest.mock('../deps/lenis/dist/index.js', () => {
  const instance = {
    on: jest.fn(),
    off: jest.fn(),
    resize: jest.fn(),
    destroy: jest.fn(),
    raf: jest.fn(),
  };
  const MockLenis = jest.fn(() => instance);
  return { __esModule: true, default: MockLenis };
});

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
 * Builds a main + footer fixture on document.body.
 *
 * @param {string} mainHtml Sections inside main
 * @returns {{ main: HTMLElement, footer: HTMLElement }}
 */
function mountPage(mainHtml) {
  document.body.innerHTML = `<main>${mainHtml}</main><footer><div class="footer"><div class="footer__inner"><div class="footer__content"></div></div></div></footer>`;
  return {
    main: document.querySelector('main'),
    footer: document.querySelector('body > footer'),
  };
}

/**
 * @param {boolean} motionMatches
 * @param {{ small?: boolean, touch?: boolean }} [options]
 * @returns {void}
 */
function mockMatchMedia(motionMatches, { small = false, touch = false } = {}) {
  window.matchMedia = jest.fn((query) => {
    let matches = false;
    if (query.includes('prefers-reduced-motion')) matches = motionMatches;
    else if (query.includes('width < 48rem')) matches = small;
    else if (query.includes('pointer: coarse')) matches = touch;
    return {
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMatchMedia(false);
  window.hlx = { codeBasePath: '' };
  document.body.innerHTML = '';
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
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

  it('slows a page-header behind the first rounded section without pinning', () => {
    const main = mountMain(`
      <div class="section page-header-container hero-container">
        <div class="page-header-wrapper">
          <div class="page-header"></div>
        </div>
      </div>
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    const [header, blue, next] = main.children;
    expect(header).toHaveClass('section-scroll-slow');
    expect(header).toHaveClass('section-scroll-intro');
    expect(header.style.getPropertyValue('--section-scroll-slow-top')).toBe('');
    expect(header.style.getPropertyValue('--section-scroll-intro-lag')).toBe('');
    expect(header.querySelector('.page-header-wrapper')).toHaveClass('section-scroll-fade');
    expect(blue).toHaveClass('section-scroll-next');
    expect(blue).toHaveClass('section-scroll-slow');
    expect(blue).not.toHaveClass('section-scroll-intro');
    expect(next).toHaveClass('section-scroll-next');
  });

  it('lags an intro hero with a CSS var on a coarse pointer instead of pinning', () => {
    mockMatchMedia(true, { touch: true });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section page-header-container hero-container">
        <div class="page-header-wrapper">
          <div class="page-header"></div>
        </div>
        <div class="hero-wrapper">
          <div class="hero"></div>
        </div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 400 });

    classifySectionScroll();

    const header = main.children[0];
    expect(header).toHaveClass('section-scroll-intro');
    expect(header.style.getPropertyValue('--section-scroll-slow-top')).toBe('');
    expect(header.style.getPropertyValue('--section-scroll-intro-lag')).toBe(`${400 * INTRO_LAG}px`);
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
    const { main } = mountPage(`
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
    expect(comingSoon).toHaveClass('section-scroll-reveal');
    expect(main).toHaveClass('section-scroll-reveal-main');
    expect(document.querySelector('body > footer')).toHaveClass('section-scroll-under');
  });

  it('garage-doors the footer behind the last rounded section', () => {
    const { main, footer } = mountPage(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    expect(main).toHaveClass('section-scroll-reveal-main');
    expect(main.children[0]).not.toHaveClass('section-scroll-reveal');
    expect(main.children[1]).toHaveClass('section-scroll-reveal');
    expect(main.children[1]).not.toHaveClass('section-scroll-slow');
    expect(footer).toHaveClass('section-scroll-under');
  });

  it('sets inner entry progress from the last card like the Adobe logo', () => {
    const { main, footer } = mountPage(`
      <div class="section section-rounded-default"></div>
    `);
    const last = main.children[0];
    const inner = footer.querySelector('.footer__inner');
    last.getBoundingClientRect = () => ({ bottom: 680 });
    Object.defineProperty(inner, 'offsetHeight', { configurable: true, value: 240 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    classifySectionScroll();

    expect(inner.style.getPropertyValue('--section-scroll-inner-progress')).toBe('-50');
    expect(footer).not.toHaveClass('section-scroll-logo');
  });

  it('garage-doors the footer on a page with one rounded section', () => {
    const { main, footer } = mountPage(`
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    expect(main.children[0]).toHaveClass('section-scroll-reveal');
    expect(footer).toHaveClass('section-scroll-under');
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
  });

  it('does not mark the footer when there is no rounded section', () => {
    const { footer } = mountPage(`
      <div class="section hero-container">
        <div class="hero hero-full-screen"></div>
      </div>
    `);

    classifySectionScroll();

    expect(footer).not.toHaveClass('section-scroll-under');
    expect(document.querySelector('.section-scroll-reveal')).toBeNull();
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

  it('does not bind GSAP until motion has started', () => {
    mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    expect(gsap.context).not.toHaveBeenCalled();
  });
});

describe('footerInnerProgress', () => {
  it('matches the Adobe logo entry math against the last card, flipped negative', () => {
    const last = document.createElement('div');
    const inner = document.createElement('div');
    last.getBoundingClientRect = () => ({ bottom: 800 });
    Object.defineProperty(inner, 'offsetHeight', { configurable: true, value: 240 });
    expect(footerInnerProgress(last, inner, 800)).toBe(-100);

    last.getBoundingClientRect = () => ({ bottom: 680 });
    expect(footerInnerProgress(last, inner, 800)).toBe(-50);

    last.getBoundingClientRect = () => ({ bottom: 560 });
    expect(footerInnerProgress(last, inner, 800)).toBe(0);
  });

  it('clamps progress to -100–0', () => {
    const last = document.createElement('div');
    const inner = document.createElement('div');
    last.getBoundingClientRect = () => ({ bottom: 900 });
    Object.defineProperty(inner, 'offsetHeight', { configurable: true, value: 240 });
    expect(footerInnerProgress(last, inner, 800)).toBe(-100);

    last.getBoundingClientRect = () => ({ bottom: 0 });
    expect(footerInnerProgress(last, inner, 800)).toBe(0);
  });
});

describe('footerLogoReady', () => {
  it('keeps the logo unstuck while the last card still covers the menu', () => {
    const last = document.createElement('div');
    const footer = document.createElement('footer');
    footer.innerHTML = '<div class="footer"><div class="footer__inner"></div></div>';
    last.getBoundingClientRect = () => ({ bottom: 700 });
    Object.defineProperty(footer.querySelector('.footer__inner'), 'offsetHeight', {
      configurable: true,
      value: 240,
    });
    expect(footerLogoReady(last, footer, 800)).toBe(false);
  });

  it('lets the logo stick once the last card has lifted past the menu', () => {
    const last = document.createElement('div');
    const footer = document.createElement('footer');
    footer.innerHTML = '<div class="footer"><div class="footer__inner"></div></div>';
    last.getBoundingClientRect = () => ({ bottom: 500 });
    Object.defineProperty(footer.querySelector('.footer__inner'), 'offsetHeight', {
      configurable: true,
      value: 240,
    });
    expect(footerLogoReady(last, footer, 800)).toBe(true);
  });

  it('returns false when the footer menu is missing', () => {
    expect(footerLogoReady(document.createElement('div'), document.createElement('footer'))).toBe(false);
  });
});

describe('roundedParallax', () => {
  it('eases in a downward lag before the pin, then recedes after', () => {
    const vh = 800;
    const { prePinLag, postPinEnd } = roundedParallax(vh);

    expect(prePinLag).toBeGreaterThan(0);
    expect(postPinEnd).toBeLessThan(prePinLag);
    expect(postPinEnd).toBe(prePinLag - 0.2 * vh);
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
    expect(Lenis).not.toHaveBeenCalled();
    expect(gsap.context).not.toHaveBeenCalled();
    expect(document.querySelector('.section-scroll-slow')).toBeNull();
  });

  it('loads CSS, starts GSAP and Lenis, and classifies when no-preference matches', async () => {
    mockMatchMedia(true);
    mountMain(`
      <div class="section section-rounded-blue">
        <div class="inner">Card</div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    expect(loadCSS).toHaveBeenCalledWith('/styles/section-scroll.css');
    expect(loadCSS).toHaveBeenCalledWith('/deps/lenis/dist/lenis.css');
    expect(Lenis).toHaveBeenCalledWith({ autoRaf: false });
    expect(Lenis.mock.results[0].value.on).toHaveBeenCalledWith('scroll', ScrollTrigger.update);
    expect(gsap.ticker.add).toHaveBeenCalled();
    expect(gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0);
    expect(gsap.context).toHaveBeenCalled();
    expect(document.querySelector('.section-rounded-blue')).toHaveClass('section-scroll-slow');
  });

  it('binds a rounded parallax timeline that eases in then recedes', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    mountMain(`
      <div class="section section-rounded-blue">
        <div class="inner">Card</div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    expect(gsap.timeline).toHaveBeenCalledWith(expect.objectContaining({
      defaults: { ease: 'none' },
      scrollTrigger: expect.objectContaining({
        scrub: true,
        end: 'top top',
        invalidateOnRefresh: true,
      }),
    }));
    const start = gsap.timeline.mock.calls[0][0].scrollTrigger.start();
    expect(start).toBe(`clamp(top ${800 * (COVER_START_VH + COVER_EASE_VH)}px)`);

    const tl = gsap.timeline.mock.results[0].value;
    expect(tl.fromTo).toHaveBeenCalledWith(
      expect.any(Array),
      { y: 0 },
      expect.objectContaining({
        ease: 'power2.in',
        duration: COVER_EASE_VH,
      }),
    );
    expect(tl.fromTo.mock.calls[0][2].y()).toBe(roundedParallax(800).prePinLag);

    expect(tl.to).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ duration: COVER_START_VH }),
    );
    expect(tl.to.mock.calls[0][1].y()).toBe(roundedParallax(800).postPinEnd);
  });

  it('fades a rounded-card overlay from the cover line', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section section-rounded-blue">
        <div class="inner">Card</div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const overlay = main.querySelector('.section-scroll-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.parentElement).toBe(main.children[0]);
    expect(overlay.tagName).toBe('SPAN');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(gsap.fromTo).toHaveBeenCalledWith(
      overlay,
      { opacity: 0 },
      expect.objectContaining({
        opacity: OVERLAY_DIM,
        ease: 'none',
        scrollTrigger: expect.objectContaining({
          trigger: main.children[1],
          end: 'top top',
          scrub: true,
        }),
      }),
    );
    const overlayStart = gsap.fromTo.mock.calls[0][2].scrollTrigger.start();
    expect(overlayStart).toBe(`clamp(top ${800 * COVER_START_VH}px)`);
  });

  it('quickly fades the page-header wrapper and lags remaining intro content', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section page-header-container hero-container">
        <div class="page-header-wrapper">
          <div class="page-header"></div>
        </div>
        <div class="hero-wrapper">
          <div class="hero">
            <div class="hero__content">
              <h2 class="hero__headline">Headline</h2>
            </div>
          </div>
        </div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 400 });

    await initSectionScroll();

    const header = main.children[0];
    const headerWrap = header.querySelector('.page-header-wrapper');
    const heroWrap = header.querySelector('.hero-wrapper');
    const overlay = header.querySelector('.section-scroll-overlay');
    expect(headerWrap).toHaveClass('section-scroll-fade');
    expect(overlay).toBeTruthy();
    expect(overlay.parentElement).toHaveClass('hero');
    expect(header.querySelector(':scope > .section-scroll-overlay')).toBeNull();
    expect(gsap.fromTo).toHaveBeenCalledWith(
      headerWrap,
      { autoAlpha: 1 },
      expect.objectContaining({
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: expect.objectContaining({
          start: 0,
          scrub: true,
        }),
      }),
    );
    const fadeTween = gsap.fromTo.mock.calls.find((call) => call[0] === headerWrap);
    expect(fadeTween[2].scrollTrigger.end()).toBe(800 * HEADER_FADE_VH);
    expect(gsap.fromTo).toHaveBeenCalledWith(
      expect.arrayContaining([heroWrap]),
      { y: 0 },
      expect.objectContaining({ ease: 'none' }),
    );
    const innerTween = gsap.fromTo.mock.calls.find((call) => (
      Array.isArray(call[0]) && call[0].includes(heroWrap)
    ));
    expect(innerTween[0]).not.toContain(headerWrap);
    expect(innerTween[2].y()).toBe(400 * INTRO_LAG);
    expect(gsap.fromTo).toHaveBeenCalledWith(
      overlay,
      { opacity: 0 },
      expect.objectContaining({
        opacity: OVERLAY_DIM,
        ease: 'none',
      }),
    );
    expect(gsap.fromTo).toHaveBeenCalledWith(
      header.querySelector('.hero__content'),
      { autoAlpha: 1 },
      expect.objectContaining({
        autoAlpha: 0,
        ease: 'none',
      }),
    );
  });

  it('uses a CSS intro lag instead of GSAP y on a coarse pointer', async () => {
    mockMatchMedia(true, { touch: true });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section page-header-container hero-container">
        <div class="page-header-wrapper">
          <div class="page-header"></div>
        </div>
        <div class="hero-wrapper">
          <div class="hero">
            <div class="hero__content">
              <h2 class="hero__headline">Headline</h2>
            </div>
          </div>
        </div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);

    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 400 });

    await initSectionScroll();

    const heroWrap = main.querySelector('.hero-wrapper');
    const overlay = main.querySelector('.section-scroll-overlay');
    const innerTween = gsap.fromTo.mock.calls.find((call) => (
      Array.isArray(call[0]) && call[0].includes(heroWrap)
    ));
    expect(innerTween).toBeUndefined();
    expect(Lenis).not.toHaveBeenCalled();
    expect(gsap.ticker.add).not.toHaveBeenCalled();
    expect(loadCSS).toHaveBeenCalledWith('/styles/section-scroll.css');
    expect(loadCSS).not.toHaveBeenCalledWith('/deps/lenis/dist/lenis.css');
    expect(main.children[0].style.getPropertyValue('--section-scroll-intro-lag')).toBe(`${400 * INTRO_LAG}px`);
    expect(gsap.fromTo).toHaveBeenCalledWith(
      overlay,
      { opacity: 0 },
      expect.objectContaining({ opacity: OVERLAY_DIM }),
    );
    expect(gsap.fromTo).toHaveBeenCalledWith(
      main.querySelector('.hero__content'),
      { autoAlpha: 1 },
      expect.objectContaining({ autoAlpha: 0 }),
    );
  });

  it('does not recede full-screen hero text or lag rounded cards on a coarse pointer', async () => {
    mockMatchMedia(true, { touch: true });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero hero-full-screen">
          <div class="hero__content">
            <h2 class="hero__headline">Headline</h2>
            <p class="hero__cta-text">Read</p>
          </div>
        </div>
      </div>
      <div class="section section-rounded-blue">
        <div class="inner">Card</div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const heroY = gsap.fromTo.mock.calls.find((call) => (
      call[1]?.y === 0 && call[2]?.scrollTrigger?.end === 'max'
    ));
    expect(heroY).toBeUndefined();
    expect(gsap.timeline).not.toHaveBeenCalled();
    expect(Lenis).not.toHaveBeenCalled();
    expect(gsap.fromTo).toHaveBeenCalledWith(
      main.children[0].querySelector('.hero__content'),
      { autoAlpha: 1 },
      expect.objectContaining({ autoAlpha: 0 }),
    );
    expect(main.querySelector('.section-rounded-blue > .section-scroll-overlay')).toBeTruthy();
  });

  it('fades the page-header wrapper over a longer scroll on small screens', async () => {
    mockMatchMedia(true, { small: true });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    mountMain(`
      <div class="section page-header-container">
        <div class="page-header-wrapper">
          <div class="page-header"></div>
        </div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);

    await initSectionScroll();

    const headerWrap = document.querySelector('.page-header-wrapper');
    const fadeTween = gsap.fromTo.mock.calls.find((call) => call[0] === headerWrap);
    expect(fadeTween[2].scrollTrigger.end()).toBe(800 * HEADER_FADE_VH_SMALL);
  });

  it('dims a full-screen hero and recedes its copy without shifting the card', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero-wrapper">
          <div class="hero hero-full-screen">
            <div class="hero__content">
              <h2 class="hero__headline">Headline</h2>
              <p class="hero__cta-text">Read</p>
            </div>
          </div>
        </div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    expect(gsap.timeline).not.toHaveBeenCalled();
    const heroY = gsap.fromTo.mock.calls.find((call) => (
      call[1]?.y === 0 && call[2]?.scrollTrigger?.end === 'max'
    ));
    expect([...heroY[0]]).toEqual([
      main.querySelector('.hero__headline'),
      main.querySelector('.hero__cta-text'),
    ]);
    expect(heroY[2].y()).toBe(-1000 * HERO_TEXT_SPEED);
    expect(gsap.fromTo).toHaveBeenCalledWith(
      main.children[0].querySelector('.hero__content'),
      { autoAlpha: 1 },
      expect.objectContaining({
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: expect.objectContaining({
          trigger: main.children[1],
          end: 'top top',
          scrub: true,
        }),
      }),
    );
    expect(main.children[0].querySelector('.hero > .section-scroll-overlay')).toBeTruthy();
    expect(main.children[0].querySelector(':scope > .section-scroll-overlay')).toBeNull();
  });

  it('clamps the cover start so a short hero rests undimmed and unshifted', async () => {
    mockMatchMedia(true);
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    mountMain(`
      <div class="section hero-container">
        <div class="hero-wrapper">
          <div class="hero hero-full-screen"></div>
        </div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const overlayTween = gsap.fromTo.mock.calls.find((call) => call[2]?.opacity === OVERLAY_DIM);
    expect(overlayTween[2].scrollTrigger.start()).toBe(`clamp(top ${vh * COVER_START_VH}px)`);
  });

  it('destroys Lenis and reverts GSAP on teardown', async () => {
    mockMatchMedia(true);
    mountMain(`
      <div class="section section-rounded-blue">
        <div class="inner">Card</div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();
    const instance = Lenis.mock.results[0].value;
    teardownSectionScroll();

    expect(gsap.context.mock.results[0].value.revert).toHaveBeenCalled();
    expect(gsap.ticker.remove).toHaveBeenCalled();
    expect(instance.off).toHaveBeenCalledWith('scroll', ScrollTrigger.update);
    expect(instance.destroy).toHaveBeenCalled();
    expect(document.querySelector('.section-scroll-overlay')).toBeNull();
    expect(document.querySelector('.section-scroll-reveal')).toBeNull();
    expect(document.querySelector('.section-scroll-under')).toBeNull();
    expect(document.querySelector('.section-scroll-reveal-main')).toBeNull();
  });

  it('strips footer reveal classes on teardown', async () => {
    mockMatchMedia(true);
    const { main, footer } = mountPage(`
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();
    expect(footer).toHaveClass('section-scroll-under');

    teardownSectionScroll();

    expect(footer).not.toHaveClass('section-scroll-under');
    expect(footer).not.toHaveClass('section-scroll-logo');
    expect(main).not.toHaveClass('section-scroll-reveal-main');
    expect(main.children[0]).not.toHaveClass('section-scroll-reveal');
    expect(footer.querySelector('.footer__inner').style.getPropertyValue('--section-scroll-inner-progress')).toBe('');
  });

  it('does not pin or tween the footer', async () => {
    mockMatchMedia(true);
    mountPage(`
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(gsap.fromTo).not.toHaveBeenCalled();
  });
});
