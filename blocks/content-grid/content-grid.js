import {
  buildBlock,
  createOptimizedPicture,
  decorateBlock,
  loadBlock,
  readBlockConfig,
} from '../../scripts/aem.js';
import dataStore from '../../scripts/utils/dataStore.js';

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

function isAll(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || normalized === 'all';
}

function parseCount(value) {
  const count = Number.parseInt(String(value || '').trim(), 10);
  return Number.isFinite(count) && count > 0 ? count : DEFAULT_COUNT;
}

function equalsIgnoreCase(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function isTruthyFlag(value) {
  if (value === true) return true;
  return /^(true|yes|1)$/i.test(String(value || '').trim());
}

function itemField(item, ...names) {
  return names.reduce((found, name) => found || item[name] || '', '');
}

function toSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pathCategorySlug(path) {
  const segment = String(path || '').split('/').filter(Boolean)[0];
  return CATEGORY_LABELS[segment] ? segment : '';
}

function videoFlag(item) {
  const names = ['isVideo', 'isvideo', 'is-video'];
  const name = names.find((key) => Object.prototype.hasOwnProperty.call(item, key) && item[key] !== '');
  return name ? isTruthyFlag(item[name]) : null;
}

function isVideoItem(item) {
  const flagged = videoFlag(item);
  if (flagged !== null) return flagged;
  if (equalsIgnoreCase(itemField(item, 'contentType', 'content-type'), 'video')) return true;
  return pathCategorySlug(item.path) === 'sneaks';
}

function resolveItemCategory(item) {
  const fromMeta = toSlug(itemField(item, 'category'));
  if (CATEGORY_LABELS[fromMeta]) {
    return { slug: fromMeta, label: CATEGORY_LABELS[fromMeta] };
  }
  const fromPath = pathCategorySlug(item.path);
  if (!fromPath) return null;
  return { slug: fromPath, label: CATEGORY_LABELS[fromPath] };
}

function isExcludedPath(path) {
  if (!path) return true;
  const clean = path.replace(/\/+$/, '') || '/';
  if (HOME_PATHS.has(clean)) return true;
  return EXCLUDED_PATH_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}

function isNoindex(robots) {
  return /noindex/i.test(String(robots || ''));
}

function parseDate(item) {
  const raw = itemField(item, 'publicationDate', 'date');
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : null;
}

function compareNewestFirst(a, b) {
  const aDate = parseDate(a);
  const bDate = parseDate(b);
  if (aDate !== null && bDate !== null) return bDate - aDate;
  if (aDate !== null) return -1;
  if (bDate !== null) return 1;
  return 0;
}

function pathLink(path) {
  const link = document.createElement('a');
  link.href = path;
  link.textContent = path;
  return link;
}

function createGridItem(entry, { subheadDescription } = {}) {
  const title = itemField(entry, 'title');
  const path = itemField(entry, 'path');
  const category = resolveItemCategory(entry);
  const description = itemField(entry, 'description');
  const image = itemField(entry, 'image');
  const publicationDate = itemField(entry, 'publicationDate', 'date');
  const isVideo = isVideoItem(entry);

  const rows = [['Title', title]];
  if (path) rows.push(['URL', pathLink(path)]);
  if (category) rows.push(['Category', category.label]);
  if (subheadDescription) {
    if (description) rows.push(['Subhead', description]);
  } else if (publicationDate) {
    rows.push(['Date', publicationDate]);
  } else if (description) {
    rows.push(['Subhead', description]);
  }
  if (image) rows.push(['Image', createOptimizedPicture(image, '', false)]);
  if (isVideo) rows.push(['Is Video', 'true']);

  const gridItem = buildBlock('grid-item', rows);
  gridItem.classList.add('aspect-3-2');
  if (subheadDescription) gridItem.classList.add('subhead-description');
  return gridItem;
}

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

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const contentType = config['content-type'];
  const { category } = config;
  const count = parseCount(config.count);
  const subheadDescription = block.classList.contains('subhead-description');

  block.replaceChildren();

  const payload = await dataStore.getData(QUERY_INDEX);
  if (!payload) {
    // eslint-disable-next-line no-console
    console.error(`content-grid: failed to load ${QUERY_INDEX}`);
    return;
  }

  const data = Array.isArray(payload.data) ? payload.data : [];
  const items = selectItems(data, { contentType, category, count });
  if (!items.length) return;

  const list = document.createElement('ul');
  items.forEach((entry) => {
    const gridItem = createGridItem(entry, { subheadDescription });
    const item = document.createElement('li');
    item.append(gridItem);
    list.append(item);
    decorateBlock(gridItem);
  });

  block.replaceChildren(list);
  await Promise.all(
    [...list.querySelectorAll('.grid-item')].map((gridItem) => loadBlock(gridItem)),
  );
}
