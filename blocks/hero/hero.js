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
const HERO_INTRO_FROST_DONE_CLASS = 'hero-intro--frost-done';

export const HERO_INTRO_FROST_ID = 'hero-intro-frost';

// Source timings. Tune these; later steps are derived so the sequence stays valid.
// TODO: ADBLABS-83 — confirm against the Figma prototype.
export const HERO_INTRO_NAV_DELAY_MS = 1000; // step 3: nav on
const HERO_INTRO_FROST_EASE_MS = 1200; // frost ease-out after the texture crawl starts
const HERO_INTRO_COPY_AFTER_NAV_MS = 400; // step 4: copy fade starts after nav
export const HERO_INTRO_COPY_DURATION_MS = 400; // copy fade length
const HERO_INTRO_MEDIA_AFTER_NAV_MS = 600; // zoom/fade still running when nav appears
const HERO_INTRO_NAV_DURATION_MS = 400; // header fade after --nav
const HERO_INTRO_SECTION_DURATION_MS = 600; // step 5: second-section slide
const HERO_INTRO_BODY_COPY_OVERLAP_MS = Math.round(HERO_INTRO_COPY_DURATION_MS / 2);

export const HERO_INTRO_MEDIA_DURATION_MS = HERO_INTRO_NAV_DELAY_MS + HERO_INTRO_MEDIA_AFTER_NAV_MS;
export const HERO_INTRO_COPY_DELAY_MS = HERO_INTRO_NAV_DELAY_MS + HERO_INTRO_COPY_AFTER_NAV_MS;

// Static frost holds until the zoom is mostly done; then the same field eases out.
const FROST_TEXTURE_START_MS = Math.round(HERO_INTRO_MEDIA_DURATION_MS * 0.6);
export const HERO_INTRO_FROST_DURATION_MS = FROST_TEXTURE_START_MS + HERO_INTRO_FROST_EASE_MS;

// Body starts in the last half of the copy fade (does not wait for frost).
export const HERO_INTRO_BODY_DELAY_MS = Math.max(
  HERO_INTRO_NAV_DELAY_MS,
  HERO_INTRO_COPY_DELAY_MS
    + HERO_INTRO_COPY_DURATION_MS
    - HERO_INTRO_BODY_COPY_OVERLAP_MS,
);

export const HERO_INTRO_DURATION_MS = Math.max(
  HERO_INTRO_BODY_DELAY_MS + HERO_INTRO_SECTION_DURATION_MS,
  HERO_INTRO_FROST_DURATION_MS,
);

/** CSS custom properties written from the derived timings. */
const INTRO_TIMING_VARS = {
  '--hero-intro-nav-duration': HERO_INTRO_NAV_DURATION_MS,
  '--hero-intro-section-duration': HERO_INTRO_SECTION_DURATION_MS,
  '--hero-intro-media-duration': HERO_INTRO_MEDIA_DURATION_MS,
  '--hero-intro-copy-delay': HERO_INTRO_COPY_DELAY_MS,
  '--hero-intro-copy-duration': HERO_INTRO_COPY_DURATION_MS,
};

/**
 * Writes derived intro durations onto `root` so CSS stays in sequence.
 *
 * @param {HTMLElement} root Usually `<html>`
 * @returns {void}
 */
function applyIntroTimingVars(root) {
  Object.entries(INTRO_TIMING_VARS).forEach(([name, ms]) => {
    root.style.setProperty(name, `${ms}ms`);
  });
}

/**
 * Removes derived intro duration custom properties from `root`.
 *
 * @param {HTMLElement} root Usually `<html>`
 * @returns {void}
 */
function clearIntroTimingVars(root) {
  Object.keys(INTRO_TIMING_VARS).forEach((name) => {
    root.style.removeProperty(name);
  });
}

// TODO: ADBLABS-83 — confirm stdDeviation, displacement scale, and baseFrequency against Figma.
const FROST_BLUR_START = 3; // feGaussianBlur stdDeviation while frost is held
const FROST_DISPLACE_START = 22; // feDisplacementMap scale while frost is held
// Higher = larger frost crystals. baseFrequency is 1 / this (stays locked to the image).
const FROST_GRAIN_SIZE = 160;
const FROST_FREQ = 10 / FROST_GRAIN_SIZE;

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
 * Ease-in-out cubic. Leaves the hold and arrives at 0 without a snap.
 *
 * @param {number} t Progress from 0 to 1
 * @returns {number}
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
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
    // Object box so the noise maps to the image, not the viewport origin.
    filterUnits: 'objectBoundingBox',
    primitiveUnits: 'userSpaceOnUse',
    x: '-0.2',
    y: '-0.2',
    width: '1.4',
    height: '1.4',
  });
  frostBlur = svgEl('feGaussianBlur', {
    in: 'SourceGraphic',
    stdDeviation: String(FROST_BLUR_START),
    result: 'blur',
  });
  frostTurbulence = svgEl('feTurbulence', {
    type: 'fractalNoise',
    baseFrequency: String(FROST_FREQ),
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
 * Drives frost primitives each frame: holds the same noise field, then eases
 * blur and displacement to 0 and keeps them there. Does not remove the SVG.
 *
 * @param {DOMHighResTimeStamp} timestamp rAF time
 * @returns {void}
 */
function tickFrost(timestamp) {
  if (!frostBlur || !frostTurbulence || !frostDisplace) return;
  if (frostStartTs === undefined) frostStartTs = timestamp;
  const elapsed = timestamp - frostStartTs;
  const holdMs = FROST_TEXTURE_START_MS;
  const totalMs = HERO_INTRO_FROST_DURATION_MS;
  const holding = elapsed < holdMs;

  let blur;
  let displace;
  if (holding) {
    blur = FROST_BLUR_START;
    displace = FROST_DISPLACE_START;
  } else {
    const easeMs = totalMs - holdMs;
    const t = easeMs <= 0 ? 1 : Math.min(1, (elapsed - holdMs) / easeMs);
    const e = easeInOutCubic(t);
    blur = lerp(FROST_BLUR_START, 0, e);
    displace = lerp(FROST_DISPLACE_START, 0, e);
  }

  frostTurbulence.setAttribute('baseFrequency', String(FROST_FREQ));
  frostBlur.setAttribute('stdDeviation', String(blur));
  frostDisplace.setAttribute('scale', String(displace));

  if (elapsed < totalMs && (blur > 0.01 || displace > 0.01)) {
    frostRaf = window.requestAnimationFrame(tickFrost);
    return;
  }

  frostBlur.setAttribute('stdDeviation', '0');
  frostDisplace.setAttribute('scale', '0');
  frostRaf = undefined;
  document.documentElement.classList.add(HERO_INTRO_FROST_DONE_CLASS);
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
  const root = document.documentElement;
  root.classList.remove(
    HERO_INTRO_CLASS,
    HERO_INTRO_NAV_CLASS,
    HERO_INTRO_BODY_CLASS,
    HERO_INTRO_FROST_DONE_CLASS,
  );
  clearIntroTimingVars(root);
  frostBlur = undefined;
  frostTurbulence = undefined;
  frostDisplace = undefined;
  frostSvg?.remove();
  frostSvg = undefined;
  document.getElementById(HERO_INTRO_FROST_ID)?.closest('svg')?.remove();
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
  applyIntroTimingVars(root);
  injectFrostFilter();
  window.clearTimeout(introNavTimer);
  window.clearTimeout(introBodyTimer);
  window.clearTimeout(introDoneTimer);
  introNavTimer = window.setTimeout(() => {
    root.classList.add(HERO_INTRO_NAV_CLASS);
  }, HERO_INTRO_NAV_DELAY_MS);
  introBodyTimer = window.setTimeout(() => {
    root.classList.add(HERO_INTRO_BODY_CLASS);
  }, HERO_INTRO_BODY_DELAY_MS);
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
