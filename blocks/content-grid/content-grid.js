import {
  decorateBlock,
  loadBlock,
  readBlockConfig,
  toClassName,
} from '../../scripts/aem.js';
import dataStore from '../../scripts/utils/dataStore.js';
import { formatCardDate, parseCardDate } from '../../scripts/utils/utils.js';
import { buildGridItem } from '../grid-item/grid-item.js';

const DEFAULT_COUNT = 8;
const EXCLUDED_PATH_PREFIXES = ['/docs', '/fragments'];
const HOME_PATHS = new Set(['', '/', '/index']);
const CONTENT_TYPE_ENDPOINTS = {
  research: 'research',
  workflows: 'workflows',
  sneaks: 'sneaks',
  playground: 'playground',
};
const SECTION_LABELS = {
  research: 'Research',
  workflows: 'Workflows',
  sneaks: 'Sneaks',
  playground: 'Playground',
};
const DEFAULT_ASPECT_CLASS = 'aspect-3-2';
const ASPECT_CLASSES = new Set(['aspect-1-1', 'aspect-4-5', 'aspect-3-2', 'aspect-2-3']);
const IMAGE_ASPECT_FIELDS = ['imageAspect', 'image-aspect', 'imageaspect'];

/**
 * @typedef {object} ContentItem
 * @property {string} [path]
 * @property {string} [title]
 * @property {string|string[]} [category]
 * @property {string} [contentType]
 * @property {string} ["content-type"]
 * @property {string} [description]
 * @property {string} [image]
 * @property {string} [publicationDate]
 * @property {string} [date]
 * @property {string} [robots]
 * @property {string|boolean} [isVideo]
 * @property {string|boolean} [isvideo]
 * @property {string|boolean} ["is-video"]
 * @property {string} [imageAspect]
 * @property {string} ["image-aspect"]
 */

/**
 * @typedef {object} ItemSection
 * @property {string} slug
 * @property {string} label
 */

/**
 * Whether an authored filter means "no filter".
 * @param {string} [value] Content Type or Category cell
 * @returns {boolean}
 */
function isAll(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'all';
}

/**
 * dataStore endpoint for an authored Content Type cell.
 * `All` / omitted → all content. Known sections use their content.json index.
 * @param {string} [contentType]
 * @returns {string}
 */
function endpointForContentType(contentType) {
  if (isAll(contentType)) return dataStore.commonEndpoints.allContent;
  const key = CONTENT_TYPE_ENDPOINTS[toClassName(contentType)];
  return dataStore.commonEndpoints[key] || dataStore.commonEndpoints.allContent;
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
 * Parse the authored card count, falling back to {@link DEFAULT_COUNT}.
 * @param {string|number} [value]
 * @returns {number}
 */
function parseCount(value) {
  const count = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(count) && count > 0 ? count : DEFAULT_COUNT;
}

/**
 * Case-insensitive string equality after trimming.
 * @param {*} left
 * @param {*} right
 * @returns {boolean}
 */
function equalsIgnoreCase(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

/**
 * First non-empty field from an index item, trying each name in order.
 * @param {ContentItem} item
 * @param {...string} names
 * @returns {string}
 */
function itemField(item, ...names) {
  return names.reduce((found, name) => found || item[name] || '', '');
}

/**
 * Known section slug from the first path segment, or empty if unknown.
 * @param {string} [path]
 * @returns {string}
 */
function pathSectionSlug(path) {
  const segment = String(path || '').split('/').filter(Boolean)[0];
  return SECTION_LABELS[segment] ? segment : '';
}

/**
 * Whether an index row should render as a video card.
 * Prefers an explicit isVideo flag, then contentType, then the /sneaks/ folder.
 * @param {ContentItem} item
 * @returns {boolean}
 */
function isVideoItem(item) {
  const names = ['isVideo', 'isvideo', 'is-video'];
  const name = names.find((key) => Object.prototype.hasOwnProperty.call(item, key) && item[key] !== '');
  if (name) {
    const value = item[name];
    return value === true || /^(true|yes|1)$/i.test(String(value || '').trim());
  }
  if (equalsIgnoreCase(itemField(item, 'contentType', 'content-type'), 'video')) return true;
  return pathSectionSlug(item.path) === 'sneaks';
}

/**
 * Grid-item aspect class from page metadata `Image Aspect`.
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
 * `Image Aspect` from the article page `<meta name="image-aspect">`.
 * @param {string} [path]
 * @returns {Promise<string>}
 */
async function fetchPageImageAspect(path) {
  if (!path) return '';
  try {
    const response = await fetch(path);
    if (!response.ok) return '';
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelector('meta[name="image-aspect"]')?.getAttribute('content')?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Use indexed Image Aspect when present; otherwise read each selected article.
 * @param {ContentItem[]} items
 * @param {object} [payload]
 * @returns {Promise<ContentItem[]>}
 */
async function withImageAspect(items, payload) {
  const hasAspectColumn = Array.isArray(payload?.columns)
    && payload.columns.some((name) => /image-?aspect/i.test(String(name || '')));
  if (hasAspectColumn) return items;
  return Promise.all(items.map(async (item) => {
    const hasIndexedAspect = IMAGE_ASPECT_FIELDS.some(
      (key) => Object.prototype.hasOwnProperty.call(item, key),
    );
    if (hasIndexedAspect) return item;
    const imageAspect = await fetchPageImageAspect(item.path);
    return imageAspect ? { ...item, imageAspect } : item;
  }));
}

/**
 * Resolve a display section from page metadata, then the first path segment.
 * @param {ContentItem} item
 * @returns {ItemSection|null}
 */
function resolveItemSection(item) {
  const fromMeta = toClassName(itemField(item, 'category'));
  if (SECTION_LABELS[fromMeta]) {
    return { slug: fromMeta, label: SECTION_LABELS[fromMeta] };
  }
  const fromPath = pathSectionSlug(item.path);
  if (!fromPath) return null;
  return { slug: fromPath, label: SECTION_LABELS[fromPath] };
}

/**
 * Whether a path should be omitted from the grid (home, section indexes, docs, fragments).
 * @param {string} [path]
 * @returns {boolean}
 */
function isExcludedPath(path) {
  if (!path) return true;
  const clean = path.replace(/\/+$/, '') || '/';
  if (HOME_PATHS.has(clean)) return true;
  const segments = clean.split('/').filter(Boolean);
  const isSectionRoot = segments.length === 1
    || (segments.length === 2 && segments[1] === 'index');
  if (isSectionRoot && SECTION_LABELS[segments[0]]) return true;
  return EXCLUDED_PATH_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}

/**
 * Whether robots metadata includes noindex.
 * @param {string} [robots]
 * @returns {boolean}
 */
function isNoindex(robots) {
  return /noindex/i.test(String(robots || ''));
}

/**
 * Newest publication date first; undated items sort last.
 * @param {ContentItem} a
 * @param {ContentItem} b
 * @returns {number}
 */
function compareNewestFirst(a, b) {
  const aDate = parseCardDate(itemField(a, 'publicationDate', 'date'));
  const bDate = parseCardDate(itemField(b, 'publicationDate', 'date'));
  if (aDate && bDate) return bDate - aDate;
  if (aDate) return -1;
  if (bDate) return 1;
  return 0;
}

/**
 * Build a grid-item card from an index row.
 * @param {ContentItem} entry
 * @param {object} [options]
 * @param {boolean} [options.subheadDescription] Use description instead of the date subhead
 * @param {boolean} [options.showCategory] Include the section label (off by default)
 * @returns {HTMLDivElement}
 */
function createGridItem(entry, { subheadDescription, showCategory } = {}) {
  const section = resolveItemSection(entry);
  const title = itemField(entry, 'title');
  const publicationDate = itemField(entry, 'publicationDate', 'date');
  const description = itemField(entry, 'description');
  const subhead = subheadDescription
    ? description
    : (formatCardDate(publicationDate) || description);

  const gridItem = buildGridItem({
    title,
    href: itemField(entry, 'path'),
    subhead,
    category: showCategory && section ? section.label : '',
    imageUrl: itemField(entry, 'image'),
    imageAlt: title ? '' : (description || 'Article'),
    isVideo: isVideoItem(entry),
  });
  gridItem.classList.add(toAspectClass(itemField(entry, ...IMAGE_ASPECT_FIELDS)));
  return gridItem;
}

/**
 * Whether an index row's category list includes an authored category.
 * Compares trim + lowercase only.
 * @param {ContentItem} item
 * @param {string} [category]
 * @returns {boolean}
 */
function matchesCategory(item, category) {
  if (isAll(category)) return true;
  const wanted = normalizeCategories(category);
  if (!wanted.length) return true;
  const categories = normalizeCategories(item.category);
  return wanted.some((name) => categories.includes(name));
}

/**
 * Filter, sort, and slice index rows for the authored config.
 * @param {ContentItem[]} data
 * @param {object} options
 * @param {string} [options.category]
 * @param {number} options.count
 * @returns {ContentItem[]}
 */
function selectItems(data, { category, count }) {
  return data
    .filter((item) => !isNoindex(item.robots))
    .filter((item) => !isExcludedPath(item.path))
    .filter((item) => matchesCategory(item, category))
    .sort(compareNewestFirst)
    .slice(0, count);
}

/**
 * Config-table row whose label slugs to `name`, or null.
 * Removes the row so {@link readBlockConfig} does not treat it as a filter.
 * @param {Element} block
 * @param {string} name
 * @returns {Element|null}
 */
function takeConfigCell(block, name) {
  const row = [...block.children].find(
    (child) => toClassName(child.children[0]?.textContent) === name,
  );
  if (!row) return null;
  const cell = row.children[1];
  row.remove();
  return cell || null;
}

/**
 * Pull the Intro row out of the config table and return a decorated intro node.
 * @param {Element} block
 * @returns {HTMLDivElement|null}
 */
function takeIntro(block) {
  const cell = takeConfigCell(block, 'intro');
  if (!cell || !(cell.querySelector('img, picture, a') || cell.textContent.trim())) return null;

  const intro = document.createElement('div');
  intro.className = 'content-grid__intro';
  const copy = document.createElement('div');
  copy.className = 'content-grid__intro-copy';
  copy.append(...cell.childNodes);
  copy.querySelectorAll('p').forEach((p) => p.classList.add('body-lg'));
  intro.append(copy);
  return intro;
}

/**
 * Hide the block and its section wrapper when the query returns no cards.
 * @param {Element} block
 */
function hideEmptyBlock(block) {
  block.replaceChildren();
  block.classList.remove('content-grid--has-intro');
  const wrapper = block.parentElement;
  if (wrapper) wrapper.hidden = true;
}

/**
 * Replace the block with an optional intro header and a list of cards.
 * @param {Element} block
 * @param {Element[]} gridItems
 * @param {Element|null} header
 * @returns {Promise<void>}
 */
async function renderGrid(block, gridItems, header) {
  if (!gridItems.length) {
    hideEmptyBlock(block);
    return;
  }

  const wrapper = block.parentElement;
  if (wrapper) wrapper.hidden = false;

  const nodes = [];
  if (header) {
    block.classList.add('content-grid--has-intro');
    nodes.push(header);
  }

  const list = document.createElement('ul');
  list.className = 'content-grid__list';
  list.setAttribute('role', 'list');
  gridItems.forEach((gridItem) => {
    const item = document.createElement('li');
    item.className = 'content-grid__item';
    item.append(gridItem);
    list.append(item);
    decorateBlock(gridItem);
  });
  nodes.push(list);

  block.replaceChildren(...nodes);
  await Promise.all(
    [...block.querySelectorAll('.grid-item')].map((gridItem) => loadBlock(gridItem)),
  );
}

/**
 * Replace the authored config table with a list of grid-item cards
 * from the content-type's dataStore endpoint.
 * @param {Element} block The content-grid block element
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const intro = takeIntro(block);
  takeConfigCell(block, 'previous');
  takeConfigCell(block, 'next');

  const config = readBlockConfig(block);
  const contentType = config['content-type'];
  const { category } = config;
  const count = parseCount(config.count);
  const subheadDescription = block.classList.contains('subhead-description');
  const showCategory = block.classList.contains('show-category');
  const endpoint = endpointForContentType(contentType);

  block.replaceChildren();

  const payload = await dataStore.getData(endpoint);
  if (!payload) {
    // eslint-disable-next-line no-console
    console.error(`content-grid: failed to load ${endpoint}`);
    hideEmptyBlock(block);
    return;
  }

  const data = Array.isArray(payload.data) ? payload.data : [];
  const items = await withImageAspect(
    selectItems(data, { category, count }),
    payload,
  );
  await renderGrid(
    block,
    items.map((entry) => createGridItem(entry, { subheadDescription, showCategory })),
    intro,
  );
}
