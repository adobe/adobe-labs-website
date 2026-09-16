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
  HERO_TEXT_SPEED,
  INTRO_LAG,
  OVERLAY_DIM,
  classifySectionScroll,
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
    expect(header.querySelector('.page-header-wrapper')).toHaveClass('section-scroll-fade');
    expect(blue).toHaveClass('section-scroll-next');
    expect(blue).toHaveClass('section-scroll-slow');
    expect(blue).not.toHaveClass('section-scroll-intro');
    expect(next).toHaveClass('section-scroll-next');
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
    expect(start).toBe(`top ${800 * (COVER_START_VH + COVER_EASE_VH)}px`);

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
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: 2000 });

    await initSectionScroll();

    const overlay = main.querySelector('.section-scroll-overlay');
    expect(overlay).toBeTruthy();
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
    expect(overlayStart).toBe(`top ${800 * COVER_START_VH}px`);
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
      { y: 0, opacity: 0 },
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

  it('recedes full-screen hero headline and CTA at half scroll speed', async () => {
    mockMatchMedia(true);
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
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    expect(gsap.fromTo).toHaveBeenCalledWith(
      expect.any(NodeList),
      { y: 0 },
      expect.objectContaining({
        ease: 'none',
        scrollTrigger: expect.objectContaining({
          start: 0,
          end: 'max',
          scrub: true,
        }),
      }),
    );
    const heroTween = gsap.fromTo.mock.calls.find((call) => call[1].y === 0 && call[2].scrollTrigger?.end === 'max');
    expect(heroTween[2].y()).toBe(-1000 * HERO_TEXT_SPEED);
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
    expect(main.children[0].querySelector('.section-scroll-overlay')).toBeTruthy();
  });

  it('dims a short full-screen hero only after the next section leaves rest', async () => {
    mockMatchMedia(true);
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero hero-full-screen"></div>
      </div>
      <div class="section section-rounded-default"></div>
    `);
    const restTop = 0.6 * vh;
    jest.spyOn(main.children[1], 'getBoundingClientRect').mockReturnValue({ top: restTop });

    await initSectionScroll();

    const overlayTween = gsap.fromTo.mock.calls.find((call) => call[2]?.opacity === OVERLAY_DIM);
    expect(overlayTween[2].scrollTrigger.start()).toBe(`top ${restTop}px`);
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
  });
});
