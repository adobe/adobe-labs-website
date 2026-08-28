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
 * Parse a publication date without shifting ISO calendar days across timezones.
 * @param {string} [value] ISO (`YYYY-MM-DD`) or any string `Date` can parse
 * @returns {Date|null}
 */
export function parseCardDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Card subhead date: "Oct 21" in the current year, "Oct 21, 2027" otherwise.
 * @param {string} [value] Publication date string
 * @param {Date} [now=new Date()] Reference date for the current-year check
 * @returns {string} Formatted label, or an empty string when unparseable
 */
export function formatCardDate(value, now = new Date()) {
  const date = parseCardDate(value);
  if (!date) return '';

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
