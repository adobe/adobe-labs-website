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
const HERO_INTRO_CLASS = 'hero-intro';
const HERO_INTRO_NAV_CLASS = 'hero-intro--nav';

// TODO: ADBLABS-83 — confirm nav delay (storyboard step 3) against the Figma prototype.
export const HERO_INTRO_NAV_DELAY_MS = 1000;

// TODO: ADBLABS-83 — confirm total intro length (steps 0–5) against the Figma prototype.
// Keep this long enough for the second section to load during loadLazy and still slide.
export const HERO_INTRO_DURATION_MS = 3000;

/** @type {number|undefined} */
let introNavTimer;
/** @type {number|undefined} */
let introDoneTimer;

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
 * Removes page-level intro classes and pending timers.
 * Safe to call when no intro is running.
 *
 * @returns {void}
 */
export function clearHeroIntro() {
  window.clearTimeout(introNavTimer);
  window.clearTimeout(introDoneTimer);
  document.documentElement.classList.remove(HERO_INTRO_CLASS, HERO_INTRO_NAV_CLASS);
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
 * Adds `hero-intro` on `<html>` and schedules the nav step and cleanup.
 *
 * @returns {void}
 */
function startHeroIntro() {
  const root = document.documentElement;
  root.classList.add(HERO_INTRO_CLASS);
  window.clearTimeout(introNavTimer);
  window.clearTimeout(introDoneTimer);
  introNavTimer = window.setTimeout(() => {
    root.classList.add(HERO_INTRO_NAV_CLASS);
  }, HERO_INTRO_NAV_DELAY_MS);
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
