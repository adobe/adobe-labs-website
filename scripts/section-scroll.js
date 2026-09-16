/**
 * Slows the previous section when a rounded section covers it.
 *
 * Motion is opt-in: classes, Lenis, GSAP, and CSS load only when
 * `prefers-reduced-motion: no-preference` matches. Rounded cards pin and lag
 * as the next card covers them. A page header or default hero does not pin:
 * hero content keeps moving, just slower, while the first rounded section
 * overlaps it. The page-header wrapper sticks under the nav, sits behind the
 * hero and following cards, and quickly fades out as the page scrolls.
 * A full-screen hero pins; its headline and CTA recede at half scroll speed.
 * On touch (iOS), Lenis and GSAP y-lag/recede are skipped so native scroll is
 * not fighting a JS translate. Intro heroes still lag via a CSS scroll
 * timeline (compositor) so the first rounded card can cover them. Adjacent
 * `section-rounded-default` siblings stay one card and are skipped. A dark
 * overlay fades in on the outgoing rounded card, or on the hero only (not the
 * rest of an intro section). Hero copy fades to transparent with that dim.
 */
import { loadCSS } from './aem.js';
import { debounce } from './utils/utils.js';

const MOTION_MQ = '(prefers-reduced-motion: no-preference)';
const CLASS_SLOW = 'section-scroll-slow';
const CLASS_NEXT = 'section-scroll-next';
const CLASS_INTRO = 'section-scroll-intro';
const CLASS_OVERLAY = 'section-scroll-overlay';
const CLASS_FADE = 'section-scroll-fade';

/** Inner travel after the pin, as a fraction of the viewport. */
const SHIFT_VH = 0.2;

/** Viewport fraction where the incoming section starts the pin, lag, and dim. */
export const COVER_START_VH = 0.7;

/** Viewport fraction before the pin used to ease into the slowed parallax. */
export const COVER_EASE_VH = 0.2;

/** Peak overlay opacity when the next section has covered the previous. */
export const OVERLAY_DIM = 0.8;

/** Share of overlap scroll held back on intro sections (page header / default hero). */
export const INTRO_LAG = 0.2;

/** Viewport fraction over which the page-header wrapper fades out. */
export const HEADER_FADE_VH = 0.17;

/** Longer fade on small screens, where the stacked page header is taller. */
export const HEADER_FADE_VH_SMALL = 0.4;

/** Viewport query for a stacked page header (`< 48rem`). */
const SMALL_MQ = '(width < 48rem)';

/** Touch phones/tablets: skip Lenis/GSAP y-lag; intro lag is CSS on the compositor. */
const TOUCH_MQ = '(hover: none) and (pointer: coarse)';

/** Share of page scroll applied to full-screen hero headline and CTA. */
export const HERO_TEXT_SPEED = 0.5;

/** @type {MediaQueryList | null} */
let motionMq = null;
let started = false;
/** @type {(() => void) | null} */
let onResize = null;
/** @type {object | null} */
let lenis = null;
/** @type {object | null} */
let gsap = null;
/** @type {object | null} */
let ScrollTrigger = null;
/** @type {{ revert: () => void } | null} */
let motionCtx = null;

/**
 * @param {Element | null} el
 * @returns {boolean}
 */
function isRounded(el) {
  return Boolean(el?.classList)
    && [...el.classList].some((name) => name.startsWith('section-rounded-'));
}

/**
 * @param {Element | null} el
 * @returns {boolean}
 */
function isFullScreenHero(el) {
  return Boolean(el?.classList.contains('hero-container') && el.querySelector('.hero-full-screen'));
}

/**
 * Page header or default hero: stay in flow (do not pin the section).
 *
 * @param {Element | null} el
 * @returns {boolean}
 */
function isIntro(el) {
  return Boolean(el && !isRounded(el) && !isFullScreenHero(el));
}

/**
 * Page-header fade distance as a fraction of the viewport.
 *
 * @returns {number}
 */
export function headerFadeVh() {
  return window.matchMedia(SMALL_MQ).matches ? HEADER_FADE_VH_SMALL : HEADER_FADE_VH;
}

/**
 * True on phones and most tablets, where native scroll and a JS translate
 * on the same hero fight each other (visible jitter on iOS).
 *
 * @returns {boolean}
 */
function usesTouchScroll() {
  return window.matchMedia?.(TOUCH_MQ)?.matches === true;
}

/**
 * @param {Element} previous
 * @param {Element} next
 * @returns {boolean}
 */
function shouldSlow(previous, next) {
  if (!isRounded(next)) return false;
  return !(previous.classList.contains('section-rounded-default')
    && next.classList.contains('section-rounded-default'));
}

/**
 * Shared ScrollTrigger for cover-driven tweens.
 *
 * @param {HTMLElement} trigger
 * @param {string | (() => string)} startAt
 * @returns {object}
 */
function scrub(trigger, startAt) {
  return {
    trigger,
    start: startAt,
    end: 'top top',
    scrub: true,
    invalidateOnRefresh: true,
  };
}

/**
 * Inner-lag endpoints for a rounded card, in px.
 *
 * @param {number} vh
 * @returns {{ prePinLag: number, postPinEnd: number }}
 */
export function roundedParallax(vh) {
  if (vh <= 0) return { prePinLag: 0, postPinEnd: 0 };
  const prePinLag = (1 - SHIFT_VH / COVER_START_VH) * vh * COVER_EASE_VH * 0.5;
  return { prePinLag, postPinEnd: prePinLag - SHIFT_VH * vh };
}

/**
 * Viewport Y where dim begins. Caps at the incoming section's rest top so a
 * short full-screen hero is not already dimmed.
 *
 * @param {HTMLElement} next
 * @param {boolean} intro
 * @param {number} introHeight
 * @returns {number}
 */
function overlayStart(next, intro, introHeight) {
  if (intro) return Math.min(introHeight, window.innerHeight);
  const restTop = next.getBoundingClientRect().top + window.scrollY;
  return restTop > 0
    ? Math.min(window.innerHeight * COVER_START_VH, restTop)
    : window.innerHeight * COVER_START_VH;
}

/**
 * Host for the dim layer: the hero card when this section has one, otherwise
 * the section (rounded cards).
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {HTMLElement}
 */
function overlayHost(section) {
  if (!isRounded(section)) {
    const hero = section.querySelector('.hero');
    if (hero instanceof HTMLElement) return hero;
  }
  return section;
}

/**
 * Dim layer on the outgoing card. A span so it is not styled as a
 * `main > .section > div` content column.
 *
 * @param {HTMLElement} section Outgoing section
 * @returns {HTMLElement}
 */
function overlayFor(section) {
  const host = overlayHost(section);
  let overlay = host.querySelector(`:scope > .${CLASS_OVERLAY}`);
  if (!(overlay instanceof HTMLElement)) {
    overlay = document.createElement('span');
    overlay.className = CLASS_OVERLAY;
    overlay.setAttribute('aria-hidden', 'true');
    host.append(overlay);
  }
  return overlay;
}

/**
 * Fades hero copy with the dim overlay.
 *
 * @param {HTMLElement} section Outgoing section
 * @param {object} scrollTrigger Shared cover trigger
 * @returns {void}
 */
function fadeHeroText(section, scrollTrigger) {
  const text = section.querySelector('.hero__content');
  if (!text) return;
  gsap.fromTo(text, { autoAlpha: 1 }, {
    autoAlpha: 0,
    ease: 'none',
    scrollTrigger,
  });
}

/**
 * Binds GSAP tweens for one outgoing/incoming pair.
 *
 * @param {HTMLElement} slow
 * @param {HTMLElement} next
 * @returns {void}
 */
function bindPair(slow, next) {
  const intro = isIntro(slow);
  const overlay = overlayFor(slow);
  const inner = [...slow.children].filter((el) => el !== overlay);
  const touch = usesTouchScroll();

  if (isFullScreenHero(slow)) {
    const text = slow.querySelectorAll('.hero__headline, .hero__cta-text');
    if (text.length && !touch) {
      gsap.fromTo(text, { y: 0 }, {
        y: () => -ScrollTrigger.maxScroll(window) * HERO_TEXT_SPEED,
        ease: 'none',
        scrollTrigger: {
          start: 0,
          end: 'max',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }
  } else if (intro) {
    const coverStart = () => `top ${Math.min(slow.offsetHeight, window.innerHeight)}px`;
    const lag = () => Math.min(slow.offsetHeight, window.innerHeight) * INTRO_LAG;
    const headerWrap = inner.find((el) => el.classList.contains(CLASS_FADE));
    const lagInner = inner.filter((el) => el !== headerWrap);
    if (headerWrap) {
      gsap.fromTo(headerWrap, { autoAlpha: 1 }, {
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: {
          start: 0,
          end: () => window.innerHeight * headerFadeVh(),
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    }
    if (lagInner.length && !touch) {
      gsap.fromTo(lagInner, { y: 0 }, {
        y: lag,
        ease: 'none',
        scrollTrigger: scrub(next, coverStart),
      });
    }
    gsap.fromTo(overlay, { opacity: 0 }, {
      opacity: OVERLAY_DIM,
      ease: 'none',
      scrollTrigger: scrub(next, coverStart),
    });
    fadeHeroText(slow, scrub(next, coverStart));
    return;
  } else if (inner.length && !touch) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: scrub(
        next,
        () => `top ${window.innerHeight * (COVER_START_VH + COVER_EASE_VH)}px`,
      ),
    });
    tl.fromTo(inner, { y: 0 }, {
      y: () => roundedParallax(window.innerHeight).prePinLag,
      ease: 'power2.in',
      duration: COVER_EASE_VH,
    });
    tl.to(inner, {
      y: () => roundedParallax(window.innerHeight).postPinEnd,
      duration: COVER_START_VH,
    });
  }

  const from = overlayStart(next, intro, slow.offsetHeight);
  if (from > 0) {
    const startAt = () => `top ${from}px`;
    gsap.fromTo(overlay, { opacity: 0 }, {
      opacity: OVERLAY_DIM,
      ease: 'none',
      scrollTrigger: scrub(next, startAt),
    });
    fadeHeroText(slow, scrub(next, startAt));
  }
}

/**
 * Reverts tweens and strips classification from a tree.
 *
 * @param {ParentNode} [root=document]
 * @returns {void}
 */
function clear(root = document) {
  motionCtx?.revert();
  motionCtx = null;
  root.querySelectorAll(`.${CLASS_OVERLAY}`).forEach((el) => el.remove());
  root.querySelectorAll(`.${CLASS_SLOW}, .${CLASS_NEXT}, .${CLASS_INTRO}, .${CLASS_FADE}`).forEach((el) => {
    el.classList.remove(CLASS_SLOW, CLASS_NEXT, CLASS_INTRO, CLASS_FADE);
    if (el instanceof HTMLElement) {
      el.style.removeProperty('--section-scroll-slow-top');
      el.style.removeProperty('--section-scroll-intro-lag');
    }
  });
}

/**
 * Marks cover pairs and binds motion when GSAP is running.
 *
 * @param {ParentNode} [root=document]
 * @returns {void}
 */
export function classifySectionScroll(root = document) {
  clear(root);
  const main = root.querySelector('main');
  if (!main) return;

  const decorate = () => {
    [...main.querySelectorAll(':scope > .section')].forEach((section, index, sections) => {
      const next = sections[index + 1];
      if (!next || !shouldSlow(section, next)) return;
      section.classList.add(CLASS_SLOW);
      next.classList.add(CLASS_NEXT);
      if (isIntro(section)) {
        section.classList.add(CLASS_INTRO);
        section.querySelector(':scope > .page-header-wrapper')?.classList.add(CLASS_FADE);
        if (usesTouchScroll()) {
          const lag = Math.min(section.offsetHeight, window.innerHeight) * INTRO_LAG;
          section.style.setProperty('--section-scroll-intro-lag', `${lag}px`);
        }
      } else {
        const top = isFullScreenHero(section)
          ? 0
          : window.innerHeight * COVER_START_VH - section.offsetHeight;
        section.style.setProperty('--section-scroll-slow-top', `${top}px`);
      }
      if (started && gsap) bindPair(section, next);
    });
  };

  if (started && gsap) motionCtx = gsap.context(decorate, main);
  else decorate();
}

/**
 * @returns {boolean}
 */
function prefersMotion() {
  return window.matchMedia(MOTION_MQ).matches;
}

/**
 * @param {number} time Seconds from the GSAP ticker
 * @returns {void}
 */
function tickLenis(time) {
  lenis?.raf(time * 1000);
}

/**
 * @returns {Promise<void>}
 */
async function attach() {
  if (!gsap) {
    const mod = await import('../deps/gsap/dist/index.js');
    gsap = mod.gsap;
    ScrollTrigger = mod.ScrollTrigger;
  }
  if (usesTouchScroll() || lenis) return;
  const { default: Lenis } = await import('../deps/lenis/dist/index.js');
  lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tickLenis);
  gsap.ticker.lagSmoothing(0);
}

/**
 * @returns {void}
 */
function stop() {
  if (!started) return;
  started = false;
  if (gsap) gsap.ticker.remove(tickLenis);
  if (lenis) {
    if (ScrollTrigger) lenis.off('scroll', ScrollTrigger.update);
    lenis.destroy();
    lenis = null;
  }
  if (onResize) {
    window.removeEventListener('resize', onResize);
    onResize = null;
  }
  clear();
}

/**
 * @returns {Promise<void>}
 */
async function start() {
  if (started || !prefersMotion()) return;
  started = true;
  const base = window.hlx?.codeBasePath || '';
  const assets = [
    loadCSS(`${base}/styles/section-scroll.css`),
    attach(),
  ];
  if (!usesTouchScroll()) {
    assets.push(loadCSS(`${base}/deps/lenis/dist/lenis.css`));
  }
  await Promise.all(assets);
  classifySectionScroll();
  onResize = debounce(() => {
    lenis?.resize();
    classifySectionScroll();
  });
  window.addEventListener('resize', onResize);
}

/**
 * @returns {void}
 */
function onMotionChange() {
  if (prefersMotion()) start();
  else stop();
}

/**
 * @returns {void}
 */
export function teardownSectionScroll() {
  stop();
  if (motionMq) {
    motionMq.removeEventListener('change', onMotionChange);
    motionMq = null;
  }
}

/**
 * @returns {Promise<void>}
 */
export async function initSectionScroll() {
  if (!motionMq) {
    motionMq = window.matchMedia(MOTION_MQ);
    motionMq.addEventListener('change', onMotionChange);
  }
  if (prefersMotion()) await start();
}
