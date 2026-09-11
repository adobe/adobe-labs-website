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

export const HERO_INTRO_FROST_ID = 'hero-intro-frost';

// Source timings. Later steps are derived so the sequence stays valid.
// TODO: ADBLABS-83 — confirm against the Figma prototype.
export const HERO_INTRO_NAV_DELAY_MS = 1000;
export const HERO_INTRO_COPY_DURATION_MS = 400;
const NAV_FADE_MS = 400;
const COPY_AFTER_NAV_MS = 400;
const MEDIA_AFTER_NAV_MS = 600;
const SECTION_MS = 600;
const FROST_EASE_MS = 1200;
const FROST_BLUR = 3;
const FROST_DISPLACE = 22;
const FROST_GRAIN_SIZE = 160; // higher = larger crystals
const FROST_FREQ = 10 / FROST_GRAIN_SIZE;

export const HERO_INTRO_MEDIA_DURATION_MS = HERO_INTRO_NAV_DELAY_MS + MEDIA_AFTER_NAV_MS;
export const HERO_INTRO_COPY_DELAY_MS = HERO_INTRO_NAV_DELAY_MS + COPY_AFTER_NAV_MS;
const FROST_HOLD_MS = Math.round(HERO_INTRO_MEDIA_DURATION_MS * 0.6);
export const HERO_INTRO_FROST_DURATION_MS = FROST_HOLD_MS + FROST_EASE_MS;
export const HERO_INTRO_BODY_DELAY_MS = Math.max(
  HERO_INTRO_NAV_DELAY_MS,
  HERO_INTRO_COPY_DELAY_MS + (HERO_INTRO_COPY_DURATION_MS / 2),
);
export const HERO_INTRO_DURATION_MS = Math.max(
  HERO_INTRO_BODY_DELAY_MS + SECTION_MS,
  HERO_INTRO_FROST_DURATION_MS,
);

const INTRO_CSS_VARS = {
  '--hero-intro-nav-duration': NAV_FADE_MS,
  '--hero-intro-section-duration': SECTION_MS,
  '--hero-intro-media-duration': HERO_INTRO_MEDIA_DURATION_MS,
  '--hero-intro-copy-delay': HERO_INTRO_COPY_DELAY_MS,
  '--hero-intro-copy-duration': HERO_INTRO_COPY_DURATION_MS,
};

/** @type {number[]} */
let introTimers = [];
/** @type {number|undefined} */
let frostRaf;
/** @type {number|undefined} */
let frostStartTs;
/** @type {SVGSVGElement|undefined} */
let frostSvg;
/** @type {SVGElement|undefined} */
let frostBlur;
/** @type {SVGElement|undefined} */
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

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

function setIntroVars(root, on) {
  Object.entries(INTRO_CSS_VARS).forEach(([name, ms]) => {
    if (on) root.style.setProperty(name, `${ms}ms`);
    else root.style.removeProperty(name);
  });
}

/** Holds frost, then eases blur and displacement to 0. Starts after `body.appear`. */
function tickFrost(now) {
  if (!frostBlur || !frostDisplace) return;
  if (frostStartTs === undefined) frostStartTs = now;
  const t = Math.min(1, Math.max(0, (now - frostStartTs - FROST_HOLD_MS) / FROST_EASE_MS));
  const k = 1 - (t === 0 ? 0 : easeInOutCubic(t));
  frostBlur.setAttribute('stdDeviation', String(FROST_BLUR * k));
  frostDisplace.setAttribute('scale', String(FROST_DISPLACE * k));
  if (t < 1) {
    frostRaf = window.requestAnimationFrame(tickFrost);
    return;
  }
  frostRaf = undefined;
}

function startFrost() {
  if (frostRaf !== undefined) return;
  frostStartTs = undefined;
  const run = () => {
    frostRaf = window.requestAnimationFrame(tickFrost);
  };
  if (document.body.classList.contains('appear')) {
    run();
    return;
  }
  appearObserver?.disconnect();
  appearObserver = new MutationObserver(() => {
    if (!document.body.classList.contains('appear')) return;
    appearObserver.disconnect();
    appearObserver = undefined;
    run();
  });
  appearObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function injectFrost() {
  if (document.getElementById(HERO_INTRO_FROST_ID)) return;
  frostSvg = svgEl('svg', {
    class: 'hero-intro-frost',
    'aria-hidden': 'true',
    focusable: 'false',
    width: '0',
    height: '0',
  });
  const filter = svgEl('filter', {
    id: HERO_INTRO_FROST_ID,
    'color-interpolation-filters': 'sRGB',
    filterUnits: 'objectBoundingBox',
    primitiveUnits: 'userSpaceOnUse',
    x: '-0.2',
    y: '-0.2',
    width: '1.4',
    height: '1.4',
  });
  frostBlur = svgEl('feGaussianBlur', {
    in: 'SourceGraphic',
    stdDeviation: String(FROST_BLUR),
    result: 'blur',
  });
  frostDisplace = svgEl('feDisplacementMap', {
    in: 'blur',
    in2: 'noise',
    scale: String(FROST_DISPLACE),
    xChannelSelector: 'R',
    yChannelSelector: 'G',
  });
  filter.append(
    frostBlur,
    svgEl('feTurbulence', {
      type: 'fractalNoise',
      baseFrequency: String(FROST_FREQ),
      numOctaves: '2',
      result: 'noise',
      seed: '1',
    }),
    frostDisplace,
  );
  frostSvg.append(filter);
  document.body.append(frostSvg);
  startFrost();
}

/** Removes intro classes, the frost SVG, rAF, and timers. Safe if no intro is running. */
export function clearHeroIntro() {
  introTimers.forEach((id) => window.clearTimeout(id));
  introTimers = [];
  if (frostRaf !== undefined) {
    window.cancelAnimationFrame(frostRaf);
    frostRaf = undefined;
  }
  appearObserver?.disconnect();
  appearObserver = undefined;
  frostStartTs = undefined;
  frostBlur = undefined;
  frostDisplace = undefined;
  const root = document.documentElement;
  root.classList.remove('hero-intro', 'hero-intro--nav', 'hero-intro--body');
  setIntroVars(root, false);
  frostSvg?.remove();
  frostSvg = undefined;
  document.getElementById(HERO_INTRO_FROST_ID)?.closest('svg')?.remove();
}

function shouldStartHeroIntro(block) {
  const reduce = typeof window.matchMedia === 'function'
    && window.matchMedia(REDUCED_MOTION_MQ).matches;
  return Boolean(firstSection(block))
    && block.classList.contains('hero-full-screen')
    && !reduce
    && !document.documentElement.classList.contains('hero-intro');
}

function startHeroIntro() {
  const root = document.documentElement;
  root.classList.add('hero-intro');
  setIntroVars(root, true);
  injectFrost();
  introTimers.forEach((id) => window.clearTimeout(id));
  introTimers = [
    window.setTimeout(() => root.classList.add('hero-intro--nav'), HERO_INTRO_NAV_DELAY_MS),
    window.setTimeout(() => root.classList.add('hero-intro--body'), HERO_INTRO_BODY_DELAY_MS),
    window.setTimeout(clearHeroIntro, HERO_INTRO_DURATION_MS),
  ];
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
