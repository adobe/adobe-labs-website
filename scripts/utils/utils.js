/**
 * Utilities / helpers used by blocks and custom scripts.
 *
 * Note: Because there is no bundler, avoid importing files here, so
 * there are not an excessive number of network requests on the page.
 * `toClassName` comes from aem.js, which is already loaded on every page.
 */
import { buildBlock, getMetadata, toClassName } from '../aem.js';

/**
 * Returns an absolute http(s) URL, or an empty string if the value is missing
 * or uses a non-http protocol (javascript:, data:, etc.).
 *
 * @param {string} value Candidate URL, possibly relative
 * @returns {string}
 */
export function toSafeHttpUrl(value) {
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
 * Builds a lookup of authored field names to their value cells.
 * Key/value block content is a table: each row is [label, value].
 * Labels are slugified so "Is Video" and "is-video" resolve the same.
 *
 * @param {Element} block The block element
 * @returns {Object<string, Element>} Map of field name to value cell
 */
export function getAuthoredCells(block) {
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
export function getCellText(cell) {
  return cell?.textContent.trim() || '';
}

/**
 * Returns the href of the first link in an authored cell.
 *
 * @param {Element} [cell] The value cell
 * @returns {string}
 */
export function getCellLinkHref(cell) {
  return cell?.querySelector('a[href]')?.href || '';
}

/**
 * Returns the picture or img element from an authored media cell.
 *
 * @param {Element} [cell] The image field cell
 * @returns {Element|null}
 */
export function getCellMedia(cell) {
  if (!cell) return null;
  return cell.querySelector('picture') || cell.querySelector('img');
}

/**
 * Whether an authored flag cell is true (`true`, `yes`, or `1`, case-insensitive).
 *
 * @param {Element} [cell] The flag cell
 * @returns {boolean}
 */
export function isAuthoredTrue(cell) {
  return /^(true|yes|1)$/i.test(getCellText(cell));
}

const DEFAULT_ARTICLE_PRE_FOOTER = '/fragments/article-pre-footer';

/**
 * Whether a page is an article detail.
 * True when bulk or page-level `template` metadata includes `article`.
 *
 * @returns {boolean}
 */
export function isArticleDetailPage() {
  const templates = getMetadata('template')
    .split(',')
    .map((value) => toClassName(value.trim()))
    .filter(Boolean);
  return templates.includes('article');
}

/**
 * Appends a synthetic fragment block for the shared article pre-footer.
 * The block is wrapped in a `div` so `decorateSections` treats it as its own
 * section (a bare block as a `main` child would be misread as the section).
 * No-op when `main` is detached (`loadFragment` also runs `decorateMain`)
 * or the page is not an article detail.
 *
 * @param {Element} main The page's main element
 */
export function buildArticlePreFooter(main) {
  if (!document.body.contains(main)) return;
  if (!isArticleDetailPage()) return;

  const preFooterMeta = getMetadata('article-pre-footer');
  const fragmentPath = preFooterMeta
    ? new URL(preFooterMeta, window.location).pathname
    : DEFAULT_ARTICLE_PRE_FOOTER;

  const link = document.createElement('a');
  link.setAttribute('href', fragmentPath);
  link.textContent = fragmentPath;
  // Keep href for fragment.js; hide until the fragment replaces this shell.
  link.hidden = true;
  const section = document.createElement('div');
  section.append(buildBlock('fragment', { elems: [link] }));
  main.append(section);
}

/**
 * Authored cell that flags a video article.
 * Canonical authoring name is **Is Video**; **Show Video Icon** is an alias.
 *
 * @param {Object<string, Element>} cells Map from getAuthoredCells
 * @returns {Element|undefined}
 */
export function getAuthoredVideoCell(cells) {
  return cells['is-video']
    || cells.isvideo
    || cells['show-video-icon']
    || cells.showvideoicon;
}

/**
 * Whether authored cells mark this item as a video article (`true`, `yes`, or `1`).
 *
 * @param {Object<string, Element>} cells Map from getAuthoredCells
 * @returns {boolean}
 */
export function isAuthoredVideo(cells) {
  return isAuthoredTrue(getAuthoredVideoCell(cells));
}

const PLAY_ICON_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" focusable="false">
    <path fill="currentColor" d="M9.95 5.079c.467.269.467.943 0 1.212L3.05 10.275C2.583 10.544 2 10.207 2 9.668V1.701c0-.539.583-.876 1.05-.606z"/>
  </svg>
`.trim();

/**
 * Builds the decorative play icon used on video articles in Hero and Grid Item.
 * Returns two nodes so callers can place the accessible label and the visual
 * icon independently. Authors set **Is Video** to `true`, `yes`, or `1`;
 * **Show Video Icon** is an alias.
 *
 * @returns {{ label: HTMLSpanElement, icon: HTMLSpanElement }}
 */
export function buildPlayIcon() {
  const label = document.createElement('span');
  label.className = 'visually-hidden';
  label.textContent = 'Video article';

  const icon = document.createElement('span');
  icon.className = 'play-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = PLAY_ICON_SVG;

  return { label, icon };
}

/**
 * Creates a delay of the provided function, waiting for a delay
 * before calling the function again.
 * @function
 * @param {Function} trigger - The function to delay.
 * @param {Number} timeout - The number of milliseconds to wait prior to rerun.
 * @returns {Function}
 */
export const debounce = (trigger, timeout = 200) => {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      trigger(...args);
    }, timeout);
  };
};

/**
 * Escapes a value for safe use in an HTML attribute.
 * @param {*} value Value to escape
 * @returns {string}
 */
export function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parses an HTML string and returns its first element child.
 * @param {string} markup HTML markup
 * @returns {Element|null}
 */
export function fromHTML(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}
