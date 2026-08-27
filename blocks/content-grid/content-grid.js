import {
  decorateBlock,
  loadBlock,
  readBlockConfig,
} from '../../scripts/aem.js';
import dataStore from '../../scripts/utils/dataStore.js';
import { formatCardDate } from '../../scripts/utils/utils.js';
import { buildGridItem } from '../grid-item/grid-item.js';

const QUERY_INDEX = dataStore.commonEndpoints.queryIndex;
const DEFAULT_COUNT = 8;
const EXCLUDED_PATH_PREFIXES = ['/docs', '/fragments'];
const HOME_PATHS = new Set(['', '/', '/index']);
const CATEGORY_LABELS = {
  research: 'Research',
  workflows: 'Workflows',
  sneaks: 'Sneaks',
  playground: 'Playground',
};
const DEFAULT_ASPECT_CLASS = 'aspect-3-2';
const ASPECT_CLASSES = new Set(['aspect-1-1', 'aspect-4-5', 'aspect-3-2', 'aspect-2-3']);
const IMAGE_ASPECT_FIELDS = ['imageAspect', 'image-aspect', 'imageaspect'];

/**
 * @typedef {object} QueryIndexItem
 * @property {string} [path]
 * @property {string} [title]
 * @property {string} [category]
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
 * @typedef {object} ItemCategory
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
 * Whether a spreadsheet / metadata flag is a positive value.
 * @param {string|boolean} [value]
 * @returns {boolean}
 */
function isTruthyFlag(value) {
  if (value === true) return true;
  return /^(true|yes|1)$/i.test(String(value || '').trim());
}

/**
 * First non-empty field from an index item, trying each name in order.
 * @param {QueryIndexItem} item
 * @param {...string} names
 * @returns {string}
 */
function itemField(item, ...names) {
  return names.reduce((found, name) => found || item[name] || '', '');
}

/**
 * Lowercase kebab-case slug for a category name.
 * @param {string} [name]
 * @returns {string}
 */
function toSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Known category slug from the first path segment, or empty if unknown.
 * @param {string} [path]
 * @returns {string}
 */
function pathCategorySlug(path) {
  const segment = String(path || '').split('/').filter(Boolean)[0];
  return CATEGORY_LABELS[segment] ? segment : '';
}

/**
 * Explicit isVideo flag from the index, or null when the field is omitted.
 * @param {QueryIndexItem} item
 * @returns {boolean|null}
 */
function videoFlag(item) {
  const names = ['isVideo', 'isvideo', 'is-video'];
  const name = names.find((key) => Object.prototype.hasOwnProperty.call(item, key) && item[key] !== '');
  return name ? isTruthyFlag(item[name]) : null;
}

/**
 * Whether a query-index row should render as a video card.
 * Prefers an explicit isVideo flag, then contentType, then the /sneaks/ folder.
 * @param {QueryIndexItem} item
 * @returns {boolean}
 */
function isVideoItem(item) {
  const flagged = videoFlag(item);
  if (flagged !== null) return flagged;
  if (equalsIgnoreCase(itemField(item, 'contentType', 'content-type'), 'video')) return true;
  return pathCategorySlug(item.path) === 'sneaks';
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
 * Whether a name is the Image Aspect index column.
 * @param {string} [name]
 * @returns {boolean}
 */
function isImageAspectField(name) {
  return /image-?aspect/i.test(String(name || ''));
}

/**
 * Indexed Image Aspect value, or null when the column is absent on this row.
 * @param {QueryIndexItem} item
 * @returns {string|null}
 */
function indexedImageAspect(item) {
  const name = IMAGE_ASPECT_FIELDS.find((key) => Object.prototype.hasOwnProperty.call(item, key));
  return name === undefined ? null : item[name];
}

/**
 * Whether the query-index payload is configured with an Image Aspect column.
 * @param {object} [payload]
 * @returns {boolean}
 */
function indexHasImageAspectColumn(payload) {
  return Array.isArray(payload?.columns)
    && payload.columns.some((name) => isImageAspectField(name));
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
 * @param {QueryIndexItem[]} items
 * @param {object} [payload]
 * @returns {Promise<QueryIndexItem[]>}
 */
async function withImageAspect(items, payload) {
  if (indexHasImageAspectColumn(payload)) return items;
  return Promise.all(items.map(async (item) => {
    if (indexedImageAspect(item) !== null) return item;
    const imageAspect = await fetchPageImageAspect(item.path);
    return imageAspect ? { ...item, imageAspect } : item;
  }));
}

/**
 * Aspect class from index `imageAspect` / `image-aspect`, defaulting to 3:2.
 * @param {QueryIndexItem} item
 * @returns {string}
 */
function resolveImageAspect(item) {
  return toAspectClass(itemField(item, ...IMAGE_ASPECT_FIELDS));
}

/**
 * Resolve a display category from page metadata, then the first path segment.
 * @param {QueryIndexItem} item
 * @returns {ItemCategory|null}
 */
function resolveItemCategory(item) {
  const fromMeta = toSlug(itemField(item, 'category'));
  if (CATEGORY_LABELS[fromMeta]) {
    return { slug: fromMeta, label: CATEGORY_LABELS[fromMeta] };
  }
  const fromPath = pathCategorySlug(item.path);
  if (!fromPath) return null;
  return { slug: fromPath, label: CATEGORY_LABELS[fromPath] };
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
  if (isSectionRoot && CATEGORY_LABELS[segments[0]]) return true;
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
 * Publication timestamp in milliseconds, or null when unparseable.
 * @param {QueryIndexItem} item
 * @returns {number|null}
 */
function parseDate(item) {
  const raw = itemField(item, 'publicationDate', 'date');
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : null;
}

/**
 * Newest publication date first; undated items sort last.
 * @param {QueryIndexItem} a
 * @param {QueryIndexItem} b
 * @returns {number}
 */
function compareNewestFirst(a, b) {
  const aDate = parseDate(a);
  const bDate = parseDate(b);
  if (aDate !== null && bDate !== null) return bDate - aDate;
  if (aDate !== null) return -1;
  if (bDate !== null) return 1;
  return 0;
}

/**
 * Build a grid-item card from a query-index row.
 * @param {QueryIndexItem} entry
 * @param {object} [options]
 * @param {boolean} [options.subheadDescription] Use description instead of the date subhead
 * @param {boolean} [options.showCategory] Include the category (off by default)
 * @returns {HTMLDivElement}
 */
function createGridItem(entry, { subheadDescription, showCategory } = {}) {
  const category = resolveItemCategory(entry);
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
    category: showCategory && category ? category.label : '',
    imageUrl: itemField(entry, 'image'),
    imageAlt: title ? '' : (description || 'Article'),
    isVideo: isVideoItem(entry),
  });
  gridItem.classList.add(resolveImageAspect(entry));
  return gridItem;
}

/**
 * Filter, sort, and slice query-index rows for the authored config.
 * @param {QueryIndexItem[]} data
 * @param {object} options
 * @param {string} [options.contentType]
 * @param {string} [options.category]
 * @param {number} options.count
 * @returns {QueryIndexItem[]}
 */
function selectItems(data, { contentType, category, count }) {
  return data
    .filter((item) => !isNoindex(item.robots))
    .filter((item) => !isExcludedPath(item.path))
    .filter((item) => {
      if (isAll(contentType)) return true;
      if (equalsIgnoreCase(contentType, 'video')) return isVideoItem(item);
      return equalsIgnoreCase(itemField(item, 'contentType', 'content-type'), contentType);
    })
    .filter((item) => {
      if (isAll(category)) return true;
      const resolved = resolveItemCategory(item);
      return resolved && resolved.slug === toSlug(category);
    })
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
  const row = [...block.children].find((child) => toSlug(child.children[0]?.textContent) === name);
  if (!row) return null;
  const cell = row.children[1];
  row.remove();
  return cell || null;
}

/**
 * Whether the Intro cell has authored content (text, links, or media).
 * @param {Element} [cell]
 * @returns {boolean}
 */
function hasIntroContent(cell) {
  if (!cell) return false;
  if (cell.querySelector('img, picture, a')) return true;
  return Boolean(cell.textContent.trim());
}

/**
 * Pull the Intro row out of the config table and return a decorated intro node.
 * @param {Element} block
 * @returns {HTMLDivElement|null}
 */
function takeIntro(block) {
  const cell = takeConfigCell(block, 'intro');
  if (!hasIntroContent(cell)) return null;

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
 * In-page hash, or an http(s) URL. Rejects javascript: and empty fragments.
 * @param {string} [raw]
 * @param {HTMLAnchorElement} [source]
 * @returns {string}
 */
function pagerHref(raw, source) {
  const value = String(raw || '').trim();
  if (!value || /^javascript:/i.test(value)) return '';
  if (value.startsWith('#')) return value.length > 1 ? value : '';
  try {
    const url = new URL(source?.href || value, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (url.hash && url.pathname === window.location.pathname) return url.hash;
    return url.href;
  } catch {
    return '';
  }
}

/**
 * Pager control from an authored Previous or Next cell.
 * @param {Element} [cell]
 * @param {string} fallbackLabel
 * @param {string} directionClass
 * @returns {HTMLAnchorElement|null}
 */
function pagerLink(cell, fallbackLabel, directionClass) {
  if (!cell) return null;
  const source = cell.querySelector('a[href]');
  const href = pagerHref(source ? source.getAttribute('href') : cell.textContent, source);
  if (!href) return null;

  const label = source?.textContent.trim() || fallbackLabel;
  const a = document.createElement('a');
  a.href = href;
  a.className = `content-grid__pager-link ${directionClass}`;
  const sr = document.createElement('span');
  sr.className = 'visually-hidden';
  sr.textContent = label;
  a.append(sr);
  const icon = document.createElement('span');
  icon.className = 'content-grid__pager-icon';
  icon.setAttribute('aria-hidden', 'true');
  a.append(icon);
  return a;
}

/**
 * Name the pager from the intro heading when one exists.
 * @param {HTMLElement} nav
 * @param {Element} [intro]
 */
function namePager(nav, intro) {
  const heading = intro?.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) {
    nav.setAttribute('aria-label', 'Nearby sections');
    return;
  }
  if (!heading.id) {
    const id = toSlug(heading.textContent);
    if (id) heading.id = id;
  }
  if (heading.id) {
    nav.setAttribute('aria-labelledby', heading.id);
    return;
  }
  nav.setAttribute('aria-label', 'Nearby sections');
}

/**
 * Previous / Next nav, or null when neither cell has a usable href.
 * @param {Element} [prevCell]
 * @param {Element} [nextCell]
 * @param {Element} [intro]
 * @returns {HTMLElement|null}
 */
function createPager(prevCell, nextCell, intro) {
  const prev = pagerLink(prevCell, 'Previous', 'content-grid__pager-prev');
  const next = pagerLink(nextCell, 'Next', 'content-grid__pager-next');
  if (!prev && !next) return null;
  const nav = document.createElement('nav');
  nav.className = 'content-grid__pager';
  namePager(nav, intro);
  if (prev) nav.append(prev);
  if (next) nav.append(next);
  return nav;
}

/**
 * Intro node with optional pager. Creates a header cell when only pager is authored.
 * @param {HTMLDivElement|null} intro
 * @param {HTMLElement|null} pager
 * @returns {HTMLDivElement|null}
 */
function withPager(intro, pager) {
  if (!pager) return intro;
  const header = intro || Object.assign(document.createElement('div'), { className: 'content-grid__intro' });
  header.append(pager);
  return header;
}

/**
 * Replace the authored config table with a list of grid-item cards
 * from `/query-index.json`.
 * @param {Element} block The content-grid block element
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const intro = takeIntro(block);
  const prevCell = takeConfigCell(block, 'previous');
  const nextCell = takeConfigCell(block, 'next');
  const header = withPager(intro, createPager(prevCell, nextCell, intro));
  const config = readBlockConfig(block);
  const contentType = config['content-type'];
  const { category } = config;
  const count = parseCount(config.count);
  const subheadDescription = block.classList.contains('subhead-description');
  const showCategory = block.classList.contains('show-category');

  block.replaceChildren();

  const payload = await dataStore.getData(QUERY_INDEX);
  if (!payload) {
    // eslint-disable-next-line no-console
    console.error(`content-grid: failed to load ${QUERY_INDEX}`);
    if (header) {
      block.classList.add('has-intro');
      block.append(header);
    }
    return;
  }

  const data = Array.isArray(payload.data) ? payload.data : [];
  const items = await withImageAspect(
    selectItems(data, { contentType, category, count }),
    payload,
  );
  if (!items.length && !header) return;

  const nodes = [];
  if (header) {
    block.classList.add('has-intro');
    nodes.push(header);
  }

  if (items.length) {
    const list = document.createElement('ul');
    list.className = 'content-grid__list';
    list.setAttribute('role', 'list');
    items.forEach((entry) => {
      const gridItem = createGridItem(entry, { subheadDescription, showCategory });
      const item = document.createElement('li');
      item.className = 'content-grid__item';
      item.append(gridItem);
      list.append(item);
      decorateBlock(gridItem);
    });
    nodes.push(list);
  }

  block.replaceChildren(...nodes);
  await Promise.all(
    [...block.querySelectorAll('.grid-item')].map((gridItem) => loadBlock(gridItem)),
  );
}
