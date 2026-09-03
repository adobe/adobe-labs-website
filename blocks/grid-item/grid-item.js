import { createOptimizedPicture } from '../../scripts/aem.js';
import {
  buildPlayIcon,
  getAuthoredCells,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  getSection,
  isAuthoredVideo,
  toSafeHttpUrl,
} from '../../scripts/utils/utils.js';

/**
 * Data used to build a grid item. Parsed from a key/value block, a layout row,
 * or JSON (Content Grid).
 *
 * @typedef {object} GridItemData
 * @property {string} [title]
 * @property {string} [href] Item URL; omit for a non-linked card
 * @property {string} [subhead]
 * @property {string} [contentType] Authored section label; resolved to a known
 *   path inside buildGridItem
 * @property {Element} [mediaElement] `<picture>` or `<img>` from AEM
 * @property {string} [imageUrl] Image URL from JSON (Content Grid)
 * @property {string} [imageAlt]
 * @property {boolean} [isVideo] True when authors set Is Video (Show Video Icon is an alias)
 */

/**
 * Reads authored key/value rows from a grid-item block.
 *
 * @param {Element} block The grid-item block element
 * @returns {GridItemData}
 */
export function getGridItemData(block) {
  const cells = getAuthoredCells(block);
  return {
    title: getCellText(cells.title),
    href: getCellLinkHref(cells.title),
    subhead: getCellText(cells.subhead),
    // Prefer Content Type; fall back to legacy Category for existing draft tables.
    contentType: getCellText(cells['content-type'] || cells.category),
    mediaElement: getCellMedia(cells.image),
    isVideo: isAuthoredVideo(cells),
  };
}

/**
 * Builds grid-item markup from data and writes it into `root`.
 *
 * @param {GridItemData} [data]
 * @param {Element} [root] Element to fill; a new `div.grid-item` if omitted
 * @returns {Element} The filled root
 */
export function buildGridItem(data = {}, root = document.createElement('div')) {
  const title = data.title || '';
  const href = toSafeHttpUrl(data.href);
  const contentType = getSection(data.contentType);
  const subhead = data.subhead || '';
  const isVideo = Boolean(data.isVideo);
  let mediaElement = data.mediaElement || null;
  if (!mediaElement && data.imageUrl) {
    mediaElement = createOptimizedPicture(data.imageUrl, data.imageAlt || '');
  }
  // Link the card only when a safe http(s) URL was provided.
  const mainTag = href ? 'a' : 'div';

  const template = document.createElement('template');
  template.innerHTML = `
    ${contentType ? `<a class="grid-item__content-type label" href="${contentType.path}">
      <span class="grid-item__content-type-swatch" aria-hidden="true"></span>
      <span class="grid-item__content-type-name"></span>
    </a>` : ''}
    <${mainTag} class="grid-item__main">
      <div class="grid-item__image"></div>
      <div class="grid-item__body">
        ${title ? '<p class="grid-item__title heading-6"></p>' : ''}
        ${subhead ? '<p class="grid-item__subhead body-md"></p>' : ''}
      </div>
    </${mainTag}>
  `.trim();
  const fragment = template.content;

  const main = fragment.querySelector('.grid-item__main');
  if (href) main.href = href;

  const image = fragment.querySelector('.grid-item__image');
  let playIcon;
  if (isVideo) {
    const { label, icon } = buildPlayIcon();
    main.prepend(label);
    image.append(icon);
    playIcon = icon;
  }

  // Move authored media into the card; keep the image alt from AEM.
  if (mediaElement) {
    if (playIcon) playIcon.before(mediaElement);
    else image.append(mediaElement);
  }

  // Assign copy via textContent rather than interpolating into HTML.
  if (contentType) {
    fragment.querySelector('.grid-item__content-type-name').textContent = contentType.label;
    root.dataset.contentType = contentType.slug;
  }

  if (title) fragment.querySelector('.grid-item__title').textContent = title;
  if (subhead) fragment.querySelector('.grid-item__subhead').textContent = subhead;

  root.classList.add('grid-item');
  root.replaceChildren(fragment);
  return root;
}

/**
 * Decorates a grid-item block: key/value rows become a content-type link and a
 * card (image, title, optional subhead). The card links when the title is a link.
 * Already-built cards (`.grid-item__main` present) are left as-is so nested
 * `loadBlock` from content-grid does not wipe `buildGridItem` output.
 *
 * @param {Element} block The grid-item block element
 */
export default function decorate(block) {
  if (block.querySelector('.grid-item__main')) return;
  buildGridItem(getGridItemData(block), block);
}
