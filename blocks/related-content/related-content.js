import { getMetadata, loadCSS } from '../../scripts/aem.js';
import dataStore from '../../scripts/utils/dataStore.js';
import { buildGridItem } from '../grid-item/grid-item.js';

const DEFAULT_COUNT = 3;
const SECTION_SLUGS = ['research', 'workflows', 'sneaks', 'playground'];
const DEFAULT_ASPECT_CLASS = 'aspect-3-2';
const ASPECT_CLASSES = new Set(['aspect-1-1', 'aspect-4-5', 'aspect-3-2', 'aspect-2-3']);

/**
 * @typedef {object} ContentItem
 * @property {string} [path]
 * @property {string} [title]
 * @property {string|string[]} [category]
 * @property {string} [contentType]
 * @property {string} [description]
 * @property {string} [image]
 * @property {string} [imageAspect]
 * @property {string} [publicationDate]
 * @property {string} [date]
 * @property {string} [robots]
 * @property {string|boolean} [isVideo]
 */

/**
 * Known section for a page path's first segment (the content TYPE, per
 * the per-section dataStore endpoints), or '' if unknown.
 * @param {string} [path]
 * @returns {string}
 */
function getSectionSlug(path) {
  const slug = String(path || '').split('/').filter(Boolean)[0];
  return SECTION_SLUGS.includes(slug) ? slug : '';
}

/**
 * Trim and lowercase category names from a string, comma list, or array.
 * @param {*} value
 * @returns {string[]}
 */
function normalizeCategories(value) {
  const list = Array.isArray(value) ? value : [value];
  return list
    .flatMap((item) => String(item || '').split(','))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Whether an index row shares any category with the wanted list.
 * @param {ContentItem} item
 * @param {string[]} wanted
 * @returns {boolean}
 */
function hasSharedCategory(item, wanted) {
  if (!wanted.length) return false;
  const categories = normalizeCategories(item.category);
  return wanted.some((name) => categories.includes(name));
}

/**
 * Parse a publication date without shifting ISO calendar days across timezones.
 * @param {string} [value] ISO (`YYYY-MM-DD`) or any string `Date` can parse
 * @returns {Date|null}
 */
function parseCardDate(value) {
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
function formatCardDate(value, now = new Date()) {
  const date = parseCardDate(value);
  if (!date) return '';

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Newest publication date first; undated items sort last.
 * @param {ContentItem} a
 * @param {ContentItem} b
 * @returns {number}
 */
function compareNewestFirst(a, b) {
  const aDate = parseCardDate(a.publicationDate || a.date);
  const bDate = parseCardDate(b.publicationDate || b.date);
  if (aDate && bDate) return bDate - aDate;
  if (aDate) return -1;
  if (bDate) return 1;
  return 0;
}

/**
 * Whether an index row should render as a video card.
 * Prefers an explicit isVideo flag, then falls back to contentType.
 * @param {ContentItem} item
 * @returns {boolean}
 */
function isVideoItem(item) {
  const names = ['isVideo', 'isvideo', 'is-video'];
  const name = names.find((key) => Object.prototype.hasOwnProperty.call(item, key) && item[key] !== '');
  if (name) return item[name] === true || /^(true|yes|1)$/i.test(String(item[name]).trim());
  return String(item.contentType || '').trim().toLowerCase() === 'video';
}

/**
 * Grid-item aspect class from the index `imageAspect` value.
 * Accepts `3:2`, `3/2`, `3-2`, or `aspect-3-2` (and the other known ratios).
 * @param {string} [value]
 * @returns {string}
 */
function toAspectClass(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^aspect-/, '')
    .replace(/[^0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const className = `aspect-${slug}`;
  return ASPECT_CLASSES.has(className) ? className : DEFAULT_ASPECT_CLASS;
}

/**
 * Excludes the current article and noindex rows, prefers items sharing a
 * category with the current page, and falls back to any item in the same
 * content type when no category match is found.
 * @param {ContentItem[]} data
 * @param {object} options
 * @param {string} options.currentPath
 * @param {string[]} options.categories
 * @param {number} options.count
 * @returns {ContentItem[]}
 */
function selectRelatedItems(data, {
  currentPath, categories, count,
}) {
  const candidates = data.filter((item) => item.path !== currentPath
    && !/noindex/i.test(String(item.robots || '')));
  const byCategory = categories.length
    ? candidates.filter((item) => hasSharedCategory(item, categories))
    : [];
  const items = byCategory.length ? byCategory : candidates;
  return [...items].sort(compareNewestFirst).slice(0, count);
}

/**
 * Build a grid-item card from an index row.
 * @param {ContentItem} entry
 * @returns {HTMLDivElement}
 */
function createGridItem(entry) {
  const title = entry.title || '';
  const description = entry.description || '';
  const gridItem = buildGridItem({
    title,
    href: entry.path || '',
    subhead: formatCardDate(entry.publicationDate || entry.date) || description,
    imageUrl: entry.image || '',
    imageAlt: title ? '' : (description || 'Article'),
    isVideo: isVideoItem(entry),
  });
  gridItem.classList.add(toAspectClass(entry.imageAspect));
  return gridItem;
}

/**
 * Reads the authored heading, whatever level the author chose, and applies
 * the designed typography for this block regardless of that level.
 * @param {Element} [cell] The heading cell
 * @returns {Element|null}
 */
function buildHeading(cell) {
  const heading = cell?.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('related-content__heading', 'heading-6');
    return heading;
  }
  const text = cell?.textContent.trim();
  if (!text) return null;
  const fallback = document.createElement('h2');
  fallback.className = 'related-content__heading heading-6';
  fallback.textContent = text;
  return fallback;
}

/**
 * Hides the block and its section wrapper (no data, no matches, or a fetch failure).
 * @param {Element} block
 */
function hideBlock(block) {
  block.replaceChildren();
  if (block.parentElement) block.parentElement.hidden = true;
}

/**
 * Replaces the authored heading cell with a heading + grid of related
 * articles: same content type as the current page, preferring shared
 * categories, excluding the current article. Hides the block on empty
 * results or a fetch failure.
 * @param {Element} block The related-content block element
 */
export default async function decorate(block) {
  const heading = buildHeading(block.children[0]?.children[0]);

  const currentPath = window.location.pathname;
  const sectionSlug = getSectionSlug(currentPath);
  const endpoint = sectionSlug
    ? dataStore.commonEndpoints[sectionSlug]
    : dataStore.commonEndpoints.allContent;
  const categories = normalizeCategories(getMetadata('category'));

  block.replaceChildren();

  const payload = await dataStore.getData(endpoint);
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const items = selectRelatedItems(data, { currentPath, categories, count: DEFAULT_COUNT });

  if (!items.length) {
    hideBlock(block);
    return;
  }

  const codeBasePath = window.hlx?.codeBasePath || '';
  await loadCSS(`${codeBasePath}/blocks/grid-item/grid-item.css`);

  const list = document.createElement('ul');
  list.className = 'related-content__list';
  list.setAttribute('role', 'list');
  items.forEach((entry) => {
    const item = document.createElement('li');
    item.className = 'related-content__item';
    item.append(createGridItem(entry));
    list.append(item);
  });

  const nodes = [];
  if (heading) nodes.push(heading);
  nodes.push(list);
  block.append(...nodes);
}
