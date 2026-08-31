import { decorateIcons } from '../../scripts/aem.js';
import {
  getAuthoredCells,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  isAuthoredTrue,
  toSafeHttpUrl,
} from '../../scripts/utils/utils.js';

/**
 * Data used to decorate a hero. Parsed from the positional AEM table:
 * row 1 is category, date, headline link, link label; row 2 is the image.
 * An optional key/value row (`Show Video Icon` | `true`) adds a play icon.
 *
 * @typedef {object} HeroData
 * @property {Element|null} image `<picture>` or `<img>` from AEM (source + alt)
 * @property {string} [category]
 * @property {string} date
 * @property {string} headline
 * @property {string} href Article URL from the headline link
 * @property {string} linkLabel
 * @property {boolean} [showVideoIcon]
 */

const VIDEO_ICON_HTML = `
  <span class="visually-hidden">Video article</span>
  <span class="hero__video-icon" aria-hidden="true">
    <span class="icon icon-play"></span>
  </span>
`.trim();

/**
 * Reads authored cells from a hero block.
 *
 * @param {Element} block The hero block element
 * @returns {HeroData}
 */
export function getHeroData(block) {
  const authored = getAuthoredCells(block);
  const showVideoIconCell = authored['show-video-icon'] || authored.showvideoicon;
  const showVideoIcon = isAuthoredTrue(showVideoIconCell);

  const skip = new Set();
  if (showVideoIconCell) {
    skip.add(showVideoIconCell);
    const labelCell = showVideoIconCell.previousElementSibling;
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
    showVideoIcon,
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
  const showVideoIcon = Boolean(data.showVideoIcon);
  const isHome = window.location.pathname === '/'
    || window.location.pathname === '/index.html';
  const showCategory = Boolean(category) && isHome;

  const template = document.createElement('template');
  template.innerHTML = `
    <div class="hero__media"></div>
    <div class="hero__content">
      <div class="hero__content__eyebrow">
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" fill="none">
          <circle cx="19" cy="19" r="19" fill="white"/>
        </svg>
      </div>
      <div class="hero__content__date"></div>
      <h2 class="hero__content__headline"><span></span></h2>
      <p class="hero__content__button-wrapper">
        <span class="button primary"></span>
      </p>
    </div>
  `.trim();
  const fragment = template.content;

  const media = fragment.querySelector('.hero__media');
  if (data.image) media.append(data.image);
  else media.remove();

  const eyebrow = fragment.querySelector('.hero__content__eyebrow');

  if (!showCategory) {
    eyebrow.remove();
  } else {
    eyebrow.append(document.createTextNode(category));
  }

  if (showVideoIcon) {
    const temp = document.createElement('div');
    temp.innerHTML = VIDEO_ICON_HTML;
    const iconNodes = Array.from(temp.childNodes);
    const content = fragment.querySelector('.hero__content');
    const insertBefore = content.querySelector('.hero__content__date, .hero__content__headline, .hero__content__button-wrapper');
    iconNodes.forEach((node) => {
      content.insertBefore(node, insertBefore);
    });
  }

  const dateEl = fragment.querySelector('.hero__content__date');
  if (date) dateEl.textContent = date;
  else dateEl.remove();

  const h2 = fragment.querySelector('.hero__content__headline');
  const headlineSpan = h2.querySelector('span');
  if (!headline) {
    h2.remove();
  } else {
    headlineSpan.textContent = headline;
  }

  const buttonWrapper = fragment.querySelector('.hero__content__button-wrapper');
  const cta = buttonWrapper.querySelector('.button');
  if (href && linkLabel) {
    cta.textContent = linkLabel;
  } else {
    buttonWrapper.remove();
  }

  const blockChildren = [...fragment.children];

  let wrappedContent;
  if (href) {
    const wrapperLink = document.createElement('a');
    wrapperLink.href = href;
    wrapperLink.classList.add('hero__link-wrap');
    if (headline) wrapperLink.setAttribute('aria-label', `${linkLabel}: ${headline}`);
    blockChildren.forEach((child) => wrapperLink.appendChild(child));
    wrappedContent = wrapperLink;
  } else {
    wrappedContent = document.createDocumentFragment();
    blockChildren.forEach((child) => wrappedContent.appendChild(child));
  }

  root.replaceChildren(wrappedContent);
  if (showVideoIcon) decorateIcons(root);
  return root;
}

/**
 * loads and decorates the hero
 * @param {Element} block The hero block element
 */
export default async function decorate(block) {
  buildHero(getHeroData(block), block);
}
