import {
  buildPlayIcon,
  getAuthoredCells,
  getAuthoredVideoCell,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  isAuthoredTrue,
  toSafeHttpUrl,
} from '../../scripts/utils/utils.js';

const REDUCED_MOTION_MQ = '(prefers-reduced-motion: reduce)';
const SVG_NS = 'http://www.w3.org/2000/svg';
const HERO_INTRO_CLASS = 'hero-intro';
const HERO_INTRO_NAV_CLASS = 'hero-intro--nav';
const HERO_INTRO_BODY_CLASS = 'hero-intro--body';

// TODO: ADBLABS-83 — confirm nav delay (storyboard step 3) against the Figma prototype.
export const HERO_INTRO_NAV_DELAY_MS = 1000;

export const HERO_INTRO_FROST_ID = 'hero-intro-frost';

// TODO: ADBLABS-83 — keep aligned with HERO_INTRO_NAV_DELAY_MS (hold until step 3).
export const HERO_INTRO_FROST_DURATION_S = 2.2;

// TODO: ADBLABS-83 — confirm total intro length (steps 0–5) against the Figma prototype.
// Must finish after frost ease-out (and the second-section slide that starts then).
export const HERO_INTRO_DURATION_MS = 3000;

// TODO: ADBLABS-83 — confirm stdDeviation, displacement scale, and baseFrequency against Figma.
const FROST_BLUR_START = 28;
const FROST_BLUR_HOLD = 24;
const FROST_DISPLACE_START = 56;
const FROST_DISPLACE_HOLD = 40;
const FROST_FREQ_START = 0.03;
const FROST_FREQ_HOLD = 0.018;
const FROST_FREQ_END = 0.008;

/** @type {number|undefined} */
let introNavTimer;
/** @type {number|undefined} */
let introBodyTimer;
/** @type {number|undefined} */
let introDoneTimer;

/** @type {number|undefined} */
let frostRaf;
/** @type {number|undefined} */
let frostStartTs;
let frostSeed = 1;

/** @type {SVGSVGElement|undefined} */
let frostSvg;
/** @type {SVGFEGaussianBlurElement|undefined} */
let frostBlur;
/** @type {SVGFETurbulenceElement|undefined} */
let frostTurbulence;
/** @type {SVGFEDisplacementMapElement|undefined} */
let frostDisplace;

/** @type {MutationObserver|undefined} */
let appearObserver;

/**
 * Whether this hero sits in the first section of `main`.
 *
 * @param {Element} block Hero block
 * @returns {Element|null} That section, or null
 */
function firstSection(block) {
  const section = block.closest('main > .section');
  if (!section || section.parentElement.querySelector(':scope > .section') !== section) {
    return null;
  }
  return section;
}

/**
 * Data used to decorate a hero. Parsed from the positional AEM table:
 * row 1 is category, date, headline link, link label; row 2 is the image.
 * An optional key/value row (`Is Video` | `true`) adds a play icon.
 * `Show Video Icon` is an alias for that flag.
 *
 * @typedef {object} HeroData
 * @property {Element|null} image `<picture>` or `<img>` from AEM (source + alt)
 * @property {string} [category]
 * @property {string} date
 * @property {string} headline
 * @property {string} href Article URL from the headline link
 * @property {string} linkLabel
 * @property {boolean} [isVideo]
 */

/**
 * Reads authored cells from a hero block.
 *
 * @param {Element} block The hero block element
 * @returns {HeroData}
 */
export function getHeroData(block) {
  const authored = getAuthoredCells(block);
  const videoCell = getAuthoredVideoCell(authored);
  const isVideo = isAuthoredTrue(videoCell);

  const skip = new Set();
  if (videoCell) {
    skip.add(videoCell);
    const labelCell = videoCell.previousElementSibling;
    if (labelCell) skip.add(labelCell);
  }

  const cells = [...block.querySelectorAll(':scope > div > div')]
    .filter((cell) => !skip.has(cell));
  const imageCell = cells.find((cell) => getCellMedia(cell));
  const headlineCell = cells.find((cell) => cell.querySelector('a[href]'));
  const textCells = cells.filter((cell) => cell !== imageCell && cell !== headlineCell);
  const image = getCellMedia(imageCell);
  const category = getCellText(textCells[0]) || undefined;
  const date = getCellText(textCells[1]);
  const headline = getCellText(headlineCell);
  const href = getCellLinkHref(headlineCell);
  const linkLabel = getCellText(textCells[2]) || 'Read';

  return {
    image,
    category,
    date,
    headline,
    href,
    linkLabel,
    isVideo,
  };
}

/**
 * Builds hero markup from data and writes it into `root`.
 *
 * @param {HeroData} [data]
 * @param {Element} [root] Element to fill; a new `div` if omitted
 * @returns {Element} The filled root
 */
export function buildHero(data = {}, root = document.createElement('div')) {
  const href = toSafeHttpUrl(data.href);
  const category = data.category || '';
  const date = data.date || '';
  const headline = data.headline || '';
  const linkLabel = data.linkLabel || '';
  const isVideo = Boolean(data.isVideo);
  const showCategory = Boolean(category) && Boolean(firstSection(root));

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="hero__media" aria-hidden="true"></div>
    <div class="hero__content">
      <div class="hero__eyebrow" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" fill="none">
          <circle cx="19" cy="19" r="19" fill="white"/>
        </svg>
      </div>
      <div class="hero__date" aria-hidden="true"></div>
      <h2 class="hero__headline"><span></span></h2>
      <p class="hero__cta-text"></p>
    </div>
  `.trim();

  const fragment = template.content;

  const media = fragment.querySelector('.hero__media');
  if (data.image) media.append(data.image);
  else media.remove();

  const eyebrow = fragment.querySelector('.hero__eyebrow');

  if (!showCategory) {
    eyebrow.remove();
  } else {
    eyebrow.append(document.createTextNode(category));
  }

  if (isVideo) {
    const { label, icon } = buildPlayIcon();
    const content = fragment.querySelector('.hero__content');
    const insertBefore = content.querySelector('.hero__date, .hero__headline, .hero__cta-text');
    content.insertBefore(label, insertBefore);
    content.insertBefore(icon, insertBefore);
  }

  const dateEl = fragment.querySelector('.hero__date');
  if (date) dateEl.textContent = date;
  else dateEl.remove();

  const h2 = fragment.querySelector('.hero__headline');
  const headlineSpan = h2.querySelector('span');
  if (!headline) {
    h2.remove();
  } else {
    headlineSpan.textContent = headline;
  }

  const ctaText = fragment.querySelector('.hero__cta-text');
  if (href && linkLabel) {
    ctaText.textContent = linkLabel;
  } else {
    ctaText.remove();
  }

  const blockChildren = [...fragment.children];

  let wrappedContent;
  if (href) {
    const wrapperLink = document.createElement('a');
    wrapperLink.href = href;
    wrapperLink.classList.add('hero__link-wrap');
    blockChildren.forEach((child) => wrapperLink.appendChild(child));
    wrappedContent = wrapperLink;
  } else {
    wrappedContent = document.createDocumentFragment();
    blockChildren.forEach((child) => wrappedContent.appendChild(child));
  }

  root.replaceChildren(wrappedContent);
  return root;
}

/**
 * Creates an SVG element in the SVG namespace.
 *
 * @param {string} name Tag name
 * @param {Record<string, string>} [attrs] Attributes to set
 * @returns {SVGElement}
 */
function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
}

/**
 * Linear interpolation.
 *
 * @param {number} start Start value
 * @param {number} end End value
 * @param {number} t Progress from 0 to 1
 * @returns {number}
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Ease-out cubic. Used to fade frost blur and displacement to 0.
 *
 * @param {number} t Progress from 0 to 1
 * @returns {number}
 */
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * Builds the frost SVG filter (blur + turbulence + displacement).
 * SMIL does not animate these primitives when the filter is applied with CSS
 * `filter: url()` on an HTML `img`, so values are driven from JavaScript.
 *
 * @returns {SVGSVGElement}
 */
function buildFrostSvg() {
  const svg = svgEl('svg', {
    class: 'hero-intro-frost',
    'aria-hidden': 'true',
    focusable: 'false',
    width: '0',
    height: '0',
  });
  const filter = svgEl('filter', {
    id: HERO_INTRO_FROST_ID,
    'color-interpolation-filters': 'sRGB',
  });
  frostBlur = svgEl('feGaussianBlur', {
    in: 'SourceGraphic',
    stdDeviation: String(FROST_BLUR_START),
    result: 'blur',
  });
  frostTurbulence = svgEl('feTurbulence', {
    type: 'fractalNoise',
    baseFrequency: String(FROST_FREQ_START),
    numOctaves: '2',
    result: 'noise',
    seed: '1',
  });
  frostDisplace = svgEl('feDisplacementMap', {
    in: 'blur',
    in2: 'noise',
    scale: String(FROST_DISPLACE_START),
    xChannelSelector: 'R',
    yChannelSelector: 'G',
  });
  filter.append(frostBlur, frostTurbulence, frostDisplace);
  svg.append(filter);
  return /** @type {SVGSVGElement} */ (svg);
}

/**
 * Drives frost primitives each frame: seed ticks during the hold, then blur
 * and displacement ease to 0. Does not remove the SVG; `clearHeroIntro` does.
 *
 * @param {DOMHighResTimeStamp} timestamp rAF time
 * @returns {void}
 */
function tickFrost(timestamp) {
  if (!frostBlur || !frostTurbulence || !frostDisplace) return;
  if (frostStartTs === undefined) frostStartTs = timestamp;
  const elapsed = timestamp - frostStartTs;
  const holdMs = HERO_INTRO_NAV_DELAY_MS;
  const totalMs = HERO_INTRO_FROST_DURATION_S * 1000;
  const holding = elapsed < holdMs;

  let blur;
  let displace;
  let freq;
  if (holding) {
    const t = holdMs === 0 ? 1 : elapsed / holdMs;
    blur = lerp(FROST_BLUR_START, FROST_BLUR_HOLD, t);
    displace = lerp(FROST_DISPLACE_START, FROST_DISPLACE_HOLD, t);
    freq = lerp(FROST_FREQ_START, FROST_FREQ_HOLD, t);
  } else {
    const easeMs = totalMs - holdMs;
    const t = easeMs <= 0 ? 1 : Math.min(1, (elapsed - holdMs) / easeMs);
    const e = easeOutCubic(t);
    blur = lerp(FROST_BLUR_HOLD, 0, e);
    displace = lerp(FROST_DISPLACE_HOLD, 0, e);
    freq = lerp(FROST_FREQ_HOLD, FROST_FREQ_END, e);
  }

  const seedInterval = holding ? 16 : 48;
  frostSeed = 1 + Math.floor(elapsed / seedInterval);
  frostTurbulence.setAttribute('seed', String(frostSeed));
  frostTurbulence.setAttribute('baseFrequency', String(freq));
  frostBlur.setAttribute('stdDeviation', String(blur));
  frostDisplace.setAttribute('scale', String(displace));

  if (elapsed < totalMs && (blur > 0.01 || displace > 0.01)) {
    frostRaf = window.requestAnimationFrame(tickFrost);
    return;
  }

  frostBlur.setAttribute('stdDeviation', '0');
  frostDisplace.setAttribute('scale', '0');
  frostRaf = undefined;
}

/**
 * Starts the frost rAF loop.
 *
 * @returns {void}
 */
function startFrostLoop() {
  if (frostRaf !== undefined) return;
  frostStartTs = undefined;
  frostRaf = window.requestAnimationFrame(tickFrost);
}

/**
 * Starts frost motion once `body.appear` is set, so it does not run while
 * the page is still `display: none`.
 *
 * @returns {void}
 */
function startFrostWhenAppeared() {
  if (document.body.classList.contains('appear')) {
    startFrostLoop();
    return;
  }

  appearObserver?.disconnect();
  appearObserver = new MutationObserver(() => {
    if (!document.body.classList.contains('appear')) return;
    appearObserver.disconnect();
    appearObserver = undefined;
    startFrostLoop();
  });
  appearObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

/**
 * Inserts the frost filter SVG once, then starts its motion on appear.
 *
 * @returns {void}
 */
function injectFrostFilter() {
  if (document.getElementById(HERO_INTRO_FROST_ID)) return;
  frostSvg = buildFrostSvg();
  document.body.append(frostSvg);
  startFrostWhenAppeared();
}

/**
 * Removes page-level intro classes, the frost SVG, rAF, and pending timers.
 * Safe to call when no intro is running.
 *
 * @returns {void}
 */
export function clearHeroIntro() {
  window.clearTimeout(introNavTimer);
  window.clearTimeout(introBodyTimer);
  window.clearTimeout(introDoneTimer);
  if (frostRaf !== undefined) {
    window.cancelAnimationFrame(frostRaf);
    frostRaf = undefined;
  }
  appearObserver?.disconnect();
  appearObserver = undefined;
  frostStartTs = undefined;
  frostSeed = 1;
  frostBlur = undefined;
  frostTurbulence = undefined;
  frostDisplace = undefined;
  frostSvg?.remove();
  frostSvg = undefined;
  document.getElementById(HERO_INTRO_FROST_ID)?.closest('svg')?.remove();
  document.documentElement.classList.remove(
    HERO_INTRO_CLASS,
    HERO_INTRO_NAV_CLASS,
    HERO_INTRO_BODY_CLASS,
  );
}

/**
 * Whether the user asked for reduced motion.
 *
 * @returns {boolean}
 */
function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_MQ).matches;
}

/**
 * Whether this block should start the page-load intro.
 *
 * @param {Element} block The hero block
 * @returns {boolean}
 */
function shouldStartHeroIntro(block) {
  return Boolean(firstSection(block))
    && block.classList.contains('hero-full-screen')
    && !prefersReducedMotion()
    && !document.documentElement.classList.contains(HERO_INTRO_CLASS);
}

/**
 * Adds `hero-intro` on `<html>` and schedules the nav step, body slide, and cleanup.
 *
 * @returns {void}
 */
function startHeroIntro() {
  const root = document.documentElement;
  root.classList.add(HERO_INTRO_CLASS);
  injectFrostFilter();
  window.clearTimeout(introNavTimer);
  window.clearTimeout(introBodyTimer);
  window.clearTimeout(introDoneTimer);
  introNavTimer = window.setTimeout(() => {
    root.classList.add(HERO_INTRO_NAV_CLASS);
  }, HERO_INTRO_NAV_DELAY_MS);
  introBodyTimer = window.setTimeout(() => {
    root.classList.add(HERO_INTRO_BODY_CLASS);
  }, Math.round(HERO_INTRO_FROST_DURATION_S * 1000));
  introDoneTimer = window.setTimeout(clearHeroIntro, HERO_INTRO_DURATION_MS);
}

/**
 * loads and decorates the hero
 * @param {Element} block The hero block element
 */
export default async function decorate(block) {
  buildHero(getHeroData(block), block);
  const section = firstSection(block);
  if (!section || !block.classList.contains('hero-full-screen')) return;
  section.classList.add('hero-container--overlay');
  if (shouldStartHeroIntro(block)) startHeroIntro();
}
