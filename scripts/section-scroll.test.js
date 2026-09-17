/**
 * Section cover classification and the motion opt-in lifecycle.
 *
 * Predicates and geometry are covered in `section-scroll/sections.test.js`, the
 * garage door in `section-scroll/footer-reveal.test.js`, and the shared entry
 * math in `utils/entry-progress.test.js`. What is left here is which sections
 * get paired, and what GSAP is asked to do once motion starts.
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
  roundedParallax,
} from './section-scroll/sections.js';
import {
  classifySectionScroll,
  initSectionScroll,
  teardownSectionScroll,
} from './section-scroll.js';

jest.mock('./aem.js', () => ({
  loadCSS: jest.fn(() => Promise.resolve()),
}));

jest.mock('../deps/gsap/dist/index.js', () => {
  const motionCtx = { revert: jest.fn() };
  const mockGsap = {
    context: jest.fn((fn) => {
      fn();
      return motionCtx;
    }),
    // A fresh timeline per call, so a test can tell one cover group from another.
    timeline: jest.fn(() => ({
      fromTo: jest.fn().mockReturnThis(),
      to: jest.fn().mockReturnThis(),
    })),
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
    scroll: 0,
    scrollTo: jest.fn(),
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

/**
 * Every timeline created, paired with the config it was created from.
 *
 * @returns {Array<{ config: object, timeline: object }>}
 */
function timelines() {
  return gsap.timeline.mock.calls.map((call, index) => ({
    config: call[0],
    timeline: gsap.timeline.mock.results[index].value,
  }));
}

/**
 * The timeline that tweened `target`. Tweens sharing a scroll range share one
 * timeline, so this is how a test asserts they were grouped.
 *
 * @param {Element} target
 * @returns {{ config: object, timeline: object } | undefined}
 */
function timelineTweening(target) {
  /**
   * @param {Array<Array>} calls
   * @returns {boolean}
   */
  const hits = (calls) => calls.some(([subject]) => subject === target
    || (Array.isArray(subject) && subject.includes(target)));
  return timelines().find(({ timeline }) => (
    hits(timeline.fromTo.mock.calls) || hits(timeline.to.mock.calls)
  ));
}

/**
 * The `to` vars a timeline tweened a target with.
 *
 * @param {object} timeline
 * @param {Element} target
 * @returns {object | undefined}
 */
function tweenVars(timeline, target) {
  const call = timeline.fromTo.mock.calls.find(([subject]) => subject === target
    || (Array.isArray(subject) && subject.includes(target)));
  return call?.[2];
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
  });

  it('garage-doors the footer behind the last rounded section', () => {
    const { main, footer } = mountPage(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    classifySectionScroll();

    expect(main).toHaveClass('section-scroll-reveal-main');
    expect(main.children[1]).toHaveClass('section-scroll-reveal');
    expect(footer).toHaveClass('section-scroll-under');
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
    expect(document.querySelector('.section-scroll-overlay')).toBeNull();
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
    const main = mountMain(`
      <div class="section section-rounded-blue">
        <div class="inner">Card</div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const inner = main.querySelector('.inner');
    const { config, timeline } = timelineTweening(inner);
    expect(config).toMatchObject({
      defaults: { ease: 'none' },
      scrollTrigger: expect.objectContaining({
        trigger: main.children[1],
        scrub: true,
        end: 'top top',
        invalidateOnRefresh: true,
      }),
    });
    // Starts COVER_EASE_VH earlier than the dim, so it keeps its own trigger.
    expect(config.scrollTrigger.start())
      .toBe(`clamp(top ${800 * (COVER_START_VH + COVER_EASE_VH)}px)`);

    expect(timeline.fromTo).toHaveBeenCalledWith(
      expect.arrayContaining([inner]),
      { y: 0 },
      expect.objectContaining({ ease: 'power2.in', duration: COVER_EASE_VH }),
    );
    expect(timeline.fromTo.mock.calls[0][2].y()).toBe(roundedParallax(800).prePinLag);
    expect(timeline.to).toHaveBeenCalledWith(
      expect.arrayContaining([inner]),
      expect.objectContaining({ duration: COVER_START_VH }),
    );
    expect(timeline.to.mock.calls[0][1].y()).toBe(roundedParallax(800).postPinEnd);
  });

  it('dims the outgoing card from the cover line, on the parallax timeline', async () => {
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
    expect(overlay.parentElement).toBe(main.children[0]);
    expect(overlay.tagName).toBe('SPAN');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');

    // One trigger for the pair: the dim rides the inner-lag timeline, offset to
    // the cover line rather than to the earlier ease-in.
    expect(timelineTweening(overlay).timeline)
      .toBe(timelineTweening(main.querySelector('.inner')).timeline);
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
    expect(timelineTweening(overlay).timeline.fromTo).toHaveBeenCalledWith(
      overlay,
      { opacity: 0 },
      { opacity: OVERLAY_DIM, duration: COVER_START_VH },
      COVER_EASE_VH,
    );
  });

  it('gives the dim its own trigger when there is no inner content to lag', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const overlay = main.querySelector('.section-scroll-overlay');
    const { config, timeline } = timelineTweening(overlay);
    expect(config.scrollTrigger).toMatchObject({
      trigger: main.children[1],
      end: 'top top',
      scrub: true,
    });
    expect(config.scrollTrigger.start()).toBe(`clamp(top ${800 * COVER_START_VH}px)`);
    expect(timeline.fromTo).toHaveBeenCalledWith(
      overlay,
      { opacity: 0 },
      { opacity: OVERLAY_DIM, duration: 1 },
      0,
    );
  });

  it('fades hero copy on the same timeline as the dim', async () => {
    mockMatchMedia(true);
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero hero-full-screen">
          <div class="hero__content"><h2 class="hero__headline">Headline</h2></div>
        </div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const overlay = main.querySelector('.section-scroll-overlay');
    const heroText = main.querySelector('.hero__content');
    const { timeline } = timelineTweening(heroText);
    expect(timeline).toBe(timelineTweening(overlay).timeline);
    expect(timeline.fromTo).toHaveBeenCalledWith(
      heroText,
      { opacity: 1 },
      { opacity: 0, duration: 1 },
      0,
    );
    // Not autoAlpha: that adds visibility: hidden and would drop the hero's
    // heading out of the accessibility tree once the page scrolls past it.
    expect(timeline.fromTo.mock.calls.some(([, from]) => 'autoAlpha' in from)).toBe(false);
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
    expect(overlay.parentElement).toHaveClass('hero');
    expect(header.querySelector(':scope > .section-scroll-overlay')).toBeNull();

    // The wrapper fade runs from the top of the page, so it is not on the cover
    // timeline.
    expect(gsap.fromTo).toHaveBeenCalledWith(
      headerWrap,
      { opacity: 1 },
      expect.objectContaining({
        opacity: 0,
        ease: 'none',
        scrollTrigger: expect.objectContaining({ start: 0, scrub: true }),
      }),
    );
    const fadeTween = gsap.fromTo.mock.calls.find(([subject]) => subject === headerWrap);
    expect(fadeTween[2].scrollTrigger.end()).toBe(800 * HEADER_FADE_VH);

    // Everything else in the section lags and dims together.
    const cover = timelineTweening(heroWrap);
    expect(cover.timeline).toBe(timelineTweening(overlay).timeline);
    expect(cover.config.scrollTrigger.start()).toBe('clamp(top 400px)');
    expect(tweenVars(cover.timeline, heroWrap).y()).toBe(400 * INTRO_LAG);
    expect(timelineTweening(headerWrap)).toBeUndefined();
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
    expect(timelineTweening(heroWrap)).toBeUndefined();
    expect(Lenis).not.toHaveBeenCalled();
    expect(gsap.ticker.add).not.toHaveBeenCalled();
    expect(loadCSS).toHaveBeenCalledWith('/styles/section-scroll.css');
    expect(loadCSS).not.toHaveBeenCalledWith('/deps/lenis/dist/lenis.css');
    expect(main.children[0].style.getPropertyValue('--section-scroll-intro-lag')).toBe(`${400 * INTRO_LAG}px`);

    // The dim still runs: it is opacity, not a translate fighting native scroll.
    expect(timelineTweening(overlay)).toBeDefined();
    expect(timelineTweening(main.querySelector('.hero__content'))).toBeDefined();
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

    expect(gsap.fromTo).not.toHaveBeenCalled();
    expect(timelineTweening(main.querySelector('.inner'))).toBeUndefined();
    expect(Lenis).not.toHaveBeenCalled();
    expect(timelineTweening(main.children[0].querySelector('.hero__content'))).toBeDefined();
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
    const fadeTween = gsap.fromTo.mock.calls.find(([subject]) => subject === headerWrap);
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

    // No inner shift: the card itself stays put, only the copy recedes.
    expect(timelineTweening(main.querySelector('.hero-wrapper'))).toBeUndefined();
    const heroY = gsap.fromTo.mock.calls.find(([, from, to]) => (
      from?.y === 0 && to?.scrollTrigger?.end === 'max'
    ));
    expect([...heroY[0]]).toEqual([
      main.querySelector('.hero__headline'),
      main.querySelector('.hero__cta-text'),
    ]);
    expect(heroY[2].y()).toBe(-1000 * HERO_TEXT_SPEED);

    const overlay = main.querySelector('.section-scroll-overlay');
    expect(overlay.parentElement).toHaveClass('hero');
    expect(main.children[0].querySelector(':scope > .section-scroll-overlay')).toBeNull();
    expect(timelineTweening(overlay).config.scrollTrigger)
      .toMatchObject({ trigger: main.children[1], end: 'top top', scrub: true });
  });

  it('clamps the cover start so a short hero rests undimmed and unshifted', async () => {
    mockMatchMedia(true);
    const vh = 800;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: vh });
    const main = mountMain(`
      <div class="section hero-container">
        <div class="hero-wrapper">
          <div class="hero hero-full-screen"></div>
        </div>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const overlay = main.querySelector('.section-scroll-overlay');
    expect(timelineTweening(overlay).config.scrollTrigger.start())
      .toBe(`clamp(top ${vh * COVER_START_VH}px)`);
  });

  it('does not pin or tween the footer', async () => {
    mockMatchMedia(true);
    mountPage('<div class="section section-rounded-default"></div>');

    await initSectionScroll();

    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(gsap.fromTo).not.toHaveBeenCalled();
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it('destroys Lenis and reverts GSAP on teardown', async () => {
    mockMatchMedia(true);
    mountPage(`
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
    // Lag smoothing is global to GSAP's ticker, so a teardown that left it off
    // would follow the visitor into every other animation on the page.
    expect(gsap.ticker.lagSmoothing).toHaveBeenLastCalledWith(500, 33);
    expect(document.querySelector('.section-scroll-overlay')).toBeNull();
    expect(document.querySelector('.section-scroll-slow')).toBeNull();
  });

  it('takes a fully covered card out of the tab order without hiding it', async () => {
    mockMatchMedia(true);
    const main = mountMain(`
      <div class="section section-rounded-blue">
        <h2>Covered heading</h2>
        <a href="/x">Buried link</a>
      </div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const slow = main.children[0];
    const link = main.querySelector('a');
    const { scrollTrigger } = timelineTweening(link).config;

    // Partly covered: still visible, so it stays reachable.
    scrollTrigger.onRefresh({ progress: 0.9 });
    expect(link).not.toHaveAttribute('tabindex');

    // Fully covered, and a pinned card stays parked in the viewport from here on.
    scrollTrigger.onLeave({ progress: 1 });
    expect(link).toHaveAttribute('tabindex', '-1');
    // Still readable by assistive technology: nothing is inert or visibility-hidden.
    expect(slow).not.toHaveAttribute('inert');
    expect(main.querySelector('h2')).toBeInTheDocument();

    // Scrolling back up restores it.
    scrollTrigger.onEnterBack({ progress: 0.5 });
    expect(link).not.toHaveAttribute('tabindex');
  });

  it('restores a control that had its own tabindex', async () => {
    mockMatchMedia(true);
    const main = mountMain(`
      <div class="section section-rounded-blue"><div tabindex="0">Widget</div></div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();

    const widget = main.querySelector('[tabindex]');
    const { scrollTrigger } = timelineTweening(widget).config;

    scrollTrigger.onLeave({ progress: 1 });
    expect(widget).toHaveAttribute('tabindex', '-1');

    scrollTrigger.onEnterBack({ progress: 0 });
    expect(widget).toHaveAttribute('tabindex', '0');
  });

  it('suppresses the page-header wrapper tab order once it has faded out', async () => {
    mockMatchMedia(true);
    mountMain(`
      <div class="section page-header-container">
        <div class="page-header-wrapper">
          <h1>Page title</h1>
          <a href="/y">Header link</a>
        </div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);

    await initSectionScroll();

    const headerWrap = document.querySelector('.page-header-wrapper');
    const link = headerWrap.querySelector('a');
    const fade = gsap.fromTo.mock.calls.find(([subject]) => subject === headerWrap);
    expect(fade[1]).toEqual({ opacity: 1 });

    // The wrapper is sticky, so it stays on screen invisible rather than leaving.
    fade[2].scrollTrigger.onLeave({ progress: 1 });
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(headerWrap.querySelector('h1')).toBeInTheDocument();

    fade[2].scrollTrigger.onEnterBack({ progress: 0.2 });
    expect(link).not.toHaveAttribute('tabindex');
  });

  it('restores tab order on teardown', async () => {
    mockMatchMedia(true);
    const main = mountMain(`
      <div class="section section-rounded-blue"><a href="/x">Buried link</a></div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();
    const link = main.querySelector('a');
    timelineTweening(link).config.scrollTrigger.onLeave({ progress: 1 });
    expect(link).toHaveAttribute('tabindex', '-1');

    teardownSectionScroll();

    expect(link).not.toHaveAttribute('tabindex');
    expect(document.querySelector('[data-section-scroll-unfocusable]')).toBeNull();
  });

  it('rewires Lenis when motion is opted back in after a teardown', async () => {
    mockMatchMedia(true);
    mountMain(`
      <div class="section section-rounded-blue"><div class="inner">Card</div></div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();
    teardownSectionScroll();
    await initSectionScroll();

    // GSAP and the tweens are already in the module cache; Lenis was destroyed,
    // so a fresh instance has to be built and rewired to the ticker.
    expect(Lenis).toHaveBeenCalledTimes(2);
    expect(Lenis.mock.results[1].value.on).toHaveBeenCalledWith('scroll', ScrollTrigger.update);
    expect(gsap.ticker.add).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.section-rounded-blue')).toHaveClass('section-scroll-slow');
  });

  it('does not build Lenis on touch even once GSAP is cached', async () => {
    mockMatchMedia(true);
    mountMain(`
      <div class="section section-rounded-blue"><div class="inner">Card</div></div>
      <div class="section section-rounded-default"></div>
    `);

    await initSectionScroll();
    expect(Lenis).toHaveBeenCalledTimes(1);
    teardownSectionScroll();

    mockMatchMedia(true, { touch: true });
    await initSectionScroll();

    expect(Lenis).toHaveBeenCalledTimes(1);
  });

  it('strips footer reveal classes on teardown', async () => {
    mockMatchMedia(true);
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');

    await initSectionScroll();
    expect(footer).toHaveClass('section-scroll-under');

    teardownSectionScroll();

    expect(footer).not.toHaveClass('section-scroll-under');
    expect(footer).not.toHaveClass('section-scroll-logo');
    expect(main).not.toHaveClass('section-scroll-reveal-main');
    expect(main.children[0]).not.toHaveClass('section-scroll-reveal');
    expect(footer.querySelector('.footer__inner').style.getPropertyValue('--section-scroll-inner-progress')).toBe('');
  });
});

describe('resize', () => {
  /**
   * @returns {void}
   */
  function resize() {
    jest.useFakeTimers();
    window.dispatchEvent(new Event('resize'));
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  }

  it('refreshes triggers and re-measures instead of rebuilding them', async () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const main = mountMain(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);
    Object.defineProperty(main.children[0], 'offsetHeight', { configurable: true, value: 1200 });

    await initSectionScroll();
    const timelinesBefore = gsap.timeline.mock.calls.length;
    const overlay = main.querySelector('.section-scroll-overlay');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    resize();

    expect(ScrollTrigger.refresh).toHaveBeenCalled();
    expect(Lenis.mock.results[0].value.resize).toHaveBeenCalled();
    // Tweens are untouched, and the overlay node survives.
    expect(gsap.timeline.mock.calls).toHaveLength(timelinesBefore);
    expect(gsap.context).toHaveBeenCalledTimes(1);
    expect(main.querySelector('.section-scroll-overlay')).toBe(overlay);
    // Geometry CSS reads is recomputed for the new viewport.
    expect(main.children[0].style.getPropertyValue('--section-scroll-slow-top'))
      .toBe(`${1000 * COVER_START_VH - 1200}px`);
  });

  it('rebuilds when touch scrolling changes, because work moves to CSS', async () => {
    mockMatchMedia(true);
    mountMain(`
      <div class="section page-header-container">
        <div class="page-header-wrapper"><div class="page-header"></div></div>
      </div>
      <div class="section section-rounded-blue"></div>
    `);

    await initSectionScroll();
    expect(gsap.context).toHaveBeenCalledTimes(1);

    mockMatchMedia(true, { touch: true });
    resize();

    expect(gsap.context).toHaveBeenCalledTimes(2);
    expect(ScrollTrigger.refresh).not.toHaveBeenCalled();
  });
});
