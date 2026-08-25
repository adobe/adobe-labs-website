/**
 * Utilities / helpers used by blocks and custom scripts.
 *
 * Note: Because there is no bundler, avoid importing files here, so
 * there are not an excessive number of network requests on the page.
 */

/**
 * Parse a publication date without shifting ISO calendar days across timezones.
 * @param {string} value
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
 * @param {string} value
 * @param {Date} [now]
 * @returns {string}
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
