/**
 * GSAP tweens for one outgoing/incoming section pair.
 *
 * This module statically imports GSAP, so it must only ever be reached through
 * the dynamic import in `section-scroll.js` — importing it eagerly would pull
 * the vendored bundle onto the critical path.
 *
 * Every tween is scrubbed, and tweens that share a scroll range share a single
 * ScrollTrigger via a timeline: ScrollTrigger's per-scroll cost scales with the
 * number of live instances, and a page of rounded cards creates one group per
 * pair.
 */
import { gsap, ScrollTrigger } from '../../deps/gsap/dist/index.js';
import {
  CLASS_FADE,
  COVER_START_VH,
  HERO_TEXT_SPEED,
  OVERLAY_DIM,
  headerFadeVh,
  introLagPx,
  isFullScreenHero,
  isRounded,
  roundedParallax,
  staysInFlow,
  usesTouchScroll,
} from './sections.js';

/** Dim layer on the outgoing card. */
const CLASS_OVERLAY = 'section-scroll-overlay';

/**
 * Shared ScrollTrigger for cover-driven tweens. `clamp()` keeps the start at
 * scroll 0 or later: a hero shorter than the cover line puts the incoming
 * section above that line at rest, which would otherwise leave the tween
 * part-way through before the page has scrolled.
 *
 * @param {HTMLElement} trigger
 * @param {() => string} startAt
 * @returns {object}
 */
function scrub(trigger, startAt) {
  return {
    trigger,
    start: () => `clamp(${startAt()})`,
    end: 'top top',
    scrub: true,
    invalidateOnRefresh: true,
  };
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
 * Removes what the tweens leave behind. Reverting the GSAP context restores
 * inline styles, but not appended nodes or attributes.
 *
 * @param {ParentNode} root
 * @returns {void}
 */
export function clearMotionState(root) {
  root.querySelectorAll(`.${CLASS_OVERLAY}`).forEach((el) => el.remove());
}

/**
 * A cover timeline's start line, as a fraction of the viewport.
 *
 * @param {number} fraction
 * @returns {() => string}
 */
function atVh(fraction) {
  return () => `top ${window.innerHeight * fraction}px`;
}

/**
 * Timeline scrubbed over the incoming section's approach. Dim and inner lag
 * share it so they cannot drift onto separate triggers.
 *
 * @param {HTMLElement} slow Outgoing section
 * @param {HTMLElement} next Incoming section
 * @param {() => string} startAt
 * @returns {object}
 */
function coverTimeline(slow, next, startAt) {
  return gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: scrub(next, startAt),
  });
}

/**
 * Dims the outgoing card and fades its hero copy with it, on one timeline so
 * they cannot drift apart.
 *
 * @param {object} timeline Cover timeline
 * @param {HTMLElement} overlay
 * @param {Element | null} heroText
 * @param {{ at: number, duration: number }} span Position and length on the timeline
 * @returns {void}
 */
function dim(timeline, overlay, heroText, span) {
  const { at, duration } = span;
  timeline.fromTo(overlay, { opacity: 0 }, { opacity: OVERLAY_DIM, duration }, at);
  // `opacity`, not GSAP's `autoAlpha`: autoAlpha adds `visibility: hidden` at 0,
  // which would drop the hero's heading out of the accessibility tree once the
  // page has scrolled past it. A covered control stays in the tab order;
  // `focus-reveal.js` scrolls it into view.
  if (heroText) timeline.fromTo(heroText, { opacity: 1 }, { opacity: 0, duration }, at);
}

/** A dim that spans its whole timeline. */
const FULL_SPAN = { at: 0, duration: 1 };

/**
 * Page-header wrapper fade. Its own trigger: this runs from the top of the page
 * rather than from the cover line.
 *
 * @param {Element} headerWrap
 * @returns {void}
 */
function fadeHeader(headerWrap) {
  gsap.fromTo(headerWrap, { opacity: 1 }, {
    opacity: 0,
    ease: 'none',
    scrollTrigger: {
      start: 0,
      end: () => window.innerHeight * headerFadeVh(),
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}

/**
 * Pushes the full-screen hero copy block and CTA up at half scroll speed.
 * The copy block is the category and headline together; moving only the
 * headline leaves the category behind. The pinned hero card and its art stay
 * in place.
 *
 * @param {HTMLElement} section Outgoing full-screen hero
 * @returns {void}
 */
function recedeHeroText(section) {
  const text = section.querySelectorAll('.hero__copy, .hero__cta-text');
  if (!text.length) return;
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

/**
 * Binds every tween for one outgoing/incoming pair.
 *
 * @param {HTMLElement} slow Outgoing section
 * @param {HTMLElement} next Incoming section
 * @returns {void}
 */
export function bindPair(slow, next) {
  const overlay = overlayFor(slow);
  const heroText = slow.querySelector('.hero__content');
  const touch = usesTouchScroll();

  // Page header or default hero: everything in the section lags and dims from
  // the moment the incoming card reaches its bottom edge.
  if (staysInFlow(slow)) {
    const headerWrap = slow.querySelector(`:scope > .${CLASS_FADE}`);
    if (headerWrap) fadeHeader(headerWrap);

    const cover = coverTimeline(
      slow,
      next,
      () => `top ${Math.min(slow.offsetHeight, window.innerHeight)}px`,
    );
    const lagInner = [...slow.children].filter((el) => el !== overlay && el !== headerWrap);
    if (lagInner.length && !touch) {
      cover.fromTo(lagInner, { y: 0 }, { y: () => introLagPx(slow), duration: 1 }, 0);
    }
    dim(cover, overlay, heroText, FULL_SPAN);
    return;
  }

  // Full-screen hero: the card is pinned, so only the copy moves, and it does so
  // against page scroll rather than against the incoming card.
  if (isFullScreenHero(slow)) {
    if (!touch) recedeHeroText(slow);
    dim(coverTimeline(slow, next, atVh(COVER_START_VH)), overlay, heroText, FULL_SPAN);
    return;
  }

  const cover = coverTimeline(slow, next, atVh(COVER_START_VH));
  const inner = touch ? [] : [...slow.children].filter((el) => el !== overlay);
  if (inner.length) {
    cover.fromTo(inner, { y: 0 }, {
      y: () => roundedParallax(window.innerHeight),
      duration: 1,
    });
  }
  dim(cover, overlay, heroText, FULL_SPAN);
}
