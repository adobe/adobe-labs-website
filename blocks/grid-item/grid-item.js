import { toClassName } from '../../scripts/aem.js';

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
 * Builds a lookup of authored field names to their value cells.
 * Grid-item content is a key/value table: each row is [label, value].
 * Labels are slugified so "Is Video" and "is-video" resolve the same.
 *
 * @param {Element} block The grid-item block element
 * @returns {Object<string, Element>} Map of field name to value cell
 */
function getAuthoredCells(block) {
  const cells = {};
  [...block.children].forEach((row) => {
    const [label, cell] = row.children;
    if (!label || !cell) return;
    cells[toClassName(label.textContent)] = cell;
  });
  return cells;
}

/**
 * Returns trimmed text from an authored cell, or an empty string if missing.
 *
 * @param {Element} [cell] The value cell
 * @returns {string}
 */
function getCellText(cell) {
  return cell?.textContent.trim() || '';
}

/**
 * Returns the href of the first link in an authored cell.
 *
 * @param {Element} [cell] The value cell
 * @returns {string}
 */
function getCellLinkHref(cell) {
  return cell?.querySelector('a[href]')?.href || '';
}

/**
 * Returns an absolute http(s) URL, or an empty string if the value is missing
 * or uses a non-http protocol (javascript:, data:, etc.).
 *
 * @param {string} value Candidate URL, possibly relative
 * @returns {string}
 */
function toSafeHttpUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    /* ignore invalid URLs */
  }
  return '';
}

/**
 * Returns the picture or img element from an authored media cell.
 *
 * @param {Element} [cell] The image field cell
 * @returns {Element|null}
 */
function getCellMedia(cell) {
  if (!cell) return null;
  return cell.querySelector('picture') || cell.querySelector('img');
}

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
 * Whether an authored flag cell is true (`true`, `yes`, or `1`, case-insensitive).
 *
 * @param {Element} [cell] The flag cell
 * @returns {boolean}
 */
function isAuthoredTrue(cell) {
  return /^(true|yes|1)$/i.test(getCellText(cell));
}

/**
 * Decorates a grid-item block: key/value rows become a category link and a
 * card (image, title, optional subhead). The card links when the title is a link.
 *
 * @param {Element} block The grid-item block element
 */
export default function decorate(block) {
  const cells = getAuthoredCells(block);
  const title = getCellText(cells.title);
  const href = toSafeHttpUrl(getCellLinkHref(cells.title));
  const category = resolveCategory(getCellText(cells.category));
  const subhead = getCellText(cells.subhead);
  const media = getCellMedia(cells.image);
  const isVideo = isAuthoredTrue(cells.isvideo || cells['is-video']);
  // Link the card only when the title was authored as a safe http(s) link.
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
  const root = template.content;

  const main = root.querySelector('.grid-item__main');
  if (href) main.href = href;

  // Move authored media into the card; keep the image alt from AEM.
  if (media) {
    const image = root.querySelector('.grid-item__image');
    const play = image.querySelector('.grid-item__play');
    if (play) play.before(media);
    else image.append(media);
  }

  // Assign authored copy via textContent rather than interpolating into HTML.
  if (category) {
    root.querySelector('.grid-item__category-name').textContent = category.label;
    block.dataset.category = category.slug;
  }

  if (title) root.querySelector('.grid-item__title').textContent = title;
  if (subhead) root.querySelector('.grid-item__subhead').textContent = subhead;

  block.replaceChildren(root);
}
