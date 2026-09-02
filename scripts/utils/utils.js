/**
 * Utilities / helpers used by blocks and custom scripts.
 *
 * Note: Because there is no bundler, avoid importing files here, so
 * there are not an excessive number of network requests on the page.
 * `toClassName` comes from aem.js, which is already loaded on every page.
 */
import { toClassName } from '../aem.js';

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
