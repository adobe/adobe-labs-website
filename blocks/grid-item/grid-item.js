import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';
import {
  getAuthoredCells,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  isAuthoredTrue,
  toSafeHttpUrl,
} from '../../scripts/utils/utils.js';

/**
 * Known category labels mapped to their site paths.
 * Unknown authored names do not get a category link.
 */
const CATEGORY_PATHS = {
  research: '/research',
  workflows: '/workflows',
  sneaks: '/sneaks',
  playground: '/playground',
};

/**
 * Resolves an authored category name to a known site path.
 *
 * @param {string} name Authored category label
 * @returns {{ slug: string, path: string, label: string }|null}
 */
function resolveCategory(name) {
  if (!name) return null;
  const slug = toClassName(name);
  const path = CATEGORY_PATHS[slug];
  if (!path) return null;
  return { slug, path, label: name };
}

/**
 * Data used to build a grid item. Parsed from a key/value block, a layout row,
 * or JSON (Content Grid).
 *
 * @typedef {object} GridItemData
 * @property {string} [title]
 * @property {string} [href] Item URL; omit for a non-linked card
 * @property {string} [subhead]
 * @property {string} [category] Authored label; resolved to a known path inside buildGridItem
 * @property {Element} [mediaElement] `<picture>` or `<img>` from AEM
 * @property {string} [imageUrl] Image URL from JSON (Content Grid)
 * @property {string} [imageAlt]
 * @property {boolean} [isVideo]
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
    category: getCellText(cells.category),
    mediaElement: getCellMedia(cells.image),
    isVideo: isAuthoredTrue(cells.isvideo || cells['is-video']),
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
  const category = resolveCategory(data.category);
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
    ${category ? `<a class="grid-item__category label" href="${category.path}">
      <span class="grid-item__category-swatch" aria-hidden="true"></span>
      <span class="grid-item__category-name"></span>
    </a>` : ''}
    <${mainTag} class="grid-item__main">
      ${isVideo ? '<span class="visually-hidden">Video article</span>' : ''}
      <div class="grid-item__image">
        ${isVideo ? `<span class="grid-item__play" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" focusable="false">
            <path fill="currentColor" d="M9.95 5.079c.467.269.467.943 0 1.212L3.05 10.275C2.583 10.544 2 10.207 2 9.668V1.701c0-.539.583-.876 1.05-.606z"/>
          </svg>
        </span>` : ''}
      </div>
      <div class="grid-item__body">
        ${title ? '<p class="grid-item__title heading-6"></p>' : ''}
        ${subhead ? '<p class="grid-item__subhead body-md"></p>' : ''}
      </div>
    </${mainTag}>
  `.trim();
  const fragment = template.content;

  const main = fragment.querySelector('.grid-item__main');
  if (href) main.href = href;

  // Move authored media into the card; keep the image alt from AEM.
  if (mediaElement) {
    const image = fragment.querySelector('.grid-item__image');
    const play = image.querySelector('.grid-item__play');
    if (play) play.before(mediaElement);
    else image.append(mediaElement);
  }

  // Assign copy via textContent rather than interpolating into HTML.
  if (category) {
    fragment.querySelector('.grid-item__category-name').textContent = category.label;
    root.dataset.category = category.slug;
  }

  if (title) fragment.querySelector('.grid-item__title').textContent = title;
  if (subhead) fragment.querySelector('.grid-item__subhead').textContent = subhead;

  root.classList.add('grid-item');
  root.replaceChildren(fragment);
  return root;
}

/**
 * Decorates a grid-item block: key/value rows become a category link and a
 * card (image, title, optional subhead). The card links when the title is a link.
 *
 * @param {Element} block The grid-item block element
 */
export default function decorate(block) {
  buildGridItem(getGridItemData(block), block);
}
