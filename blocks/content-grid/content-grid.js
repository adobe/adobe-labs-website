import {
  decorateBlock,
  getMetadata,
  loadBlock,
  readBlockConfig,
  toClassName,
} from '../../scripts/aem.js';
import dataStore from '../../scripts/utils/dataStore.js';
import {
  formatCardDate,
  getSection,
  getSectionFromPath,
  parseCardDate,
} from '../../scripts/utils/utils.js';
import { buildGridItem } from '../grid-item/grid-item.js';

const DEFAULT_COUNT = 8;
/** /content.json still includes `/`. */
const HOME_PATHS = new Set(['', '/', '/index']);
const DEFAULT_ASPECT_CLASS = 'aspect-1-1';
const ASPECT_CLASSES = new Set(['aspect-1-1', 'aspect-4-5', 'aspect-3-2', 'aspect-2-3']);

/**
 * @typedef {object} ContentItem
 * @property {string} [path]
 * @property {string} [title]
 * @property {string|string[]} [category]
 * @property {string} [contentType]
 * @property {string} [description]
 * @property {string} [image]
 * @property {string} [publicationDate]
 * @property {string} [date]
 * @property {string} [robots]
 * @property {string|boolean} [isVideo]
 * @property {string} [imageAspect]
 */

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
 * Consecutive sibling content-grid that can take a pager.
 * @typedef {object} StackedGrid
 * @property {Element} block
 * @property {Element} intro
 * @property {Element} heading
 * @property {Element} section
 */

/**
 * `preferred`, or `preferred-2`, `preferred-3`, … if that id is taken.
 * @param {string} preferred
 * @param {Element} [el] Node allowed to already own this id
 * @returns {string}
 */
function unusedId(preferred, el) {
  let id = preferred;
  for (let n = 2; document.getElementById(id) && document.getElementById(id) !== el; n += 1) {
    id = `${preferred}-${n}`;
  }
  return id;
}

/**
 * Section id for in-page jumps; slugs the intro heading text when none exists.
 * If the heading already owns that slug (AEM auto-ids), move it onto the section.
 * @param {Element} [section]
 * @param {Element} [heading]
 * @returns {string}
 */
function ensureSectionId(section, heading) {
  if (!section) return '';
  if (!section.id) {
    const id = toClassName(heading?.textContent || '');
    if (!id) return '';
    const occupied = document.getElementById(id);
    if (occupied && occupied === heading) {
      heading.id = unusedId(`${id}-title`, heading);
      section.id = id;
    } else if (occupied && occupied !== section) {
      section.id = unusedId(`${id}-section`, section);
    } else {
      section.id = id;
    }
  }
  return section.id;
}

/**
 * Previous or Next control that jumps to a destination section.
 * Accessible name includes the destination heading so links to different
 * sections are unique (WCAG 2.4.4).
 * @param {Element} section
 * @param {Element} heading
 * @param {string} direction "Previous" or "Next"
 * @param {string} directionClass
 * @returns {HTMLAnchorElement|null}
 */
function pagerLink(section, heading, direction, directionClass) {
  const id = ensureSectionId(section, heading);
  if (!id) return null;

  const destination = heading?.textContent?.trim() || '';
  const label = destination ? `${direction}: ${destination}` : direction;
  const a = document.createElement('a');
  a.href = `#${id}`;
  a.className = `content-grid__pager-link ${directionClass}`;
  const sr = document.createElement('span');
  sr.className = 'visually-hidden';
  sr.textContent = label;
  a.append(sr);
  const icon = document.createElement('span');
  icon.className = 'content-grid__pager-icon';
  icon.setAttribute('aria-hidden', 'true');
  a.append(icon);
  a.addEventListener('click', () => {
    if (!heading) return;
    heading.tabIndex = -1;
    queueMicrotask(() => heading.focus({ preventScroll: true }));
  });
  return a;
}

/**
 * Previous / Next nav, or null when neither neighbor has a section id.
 * Names the nav from the local intro heading when one exists.
 * @param {StackedGrid|null} prevEntry
 * @param {StackedGrid|null} nextEntry
 * @param {StackedGrid} entry
 * @returns {HTMLElement|null}
 */
function createPager(prevEntry, nextEntry, entry) {
  const prev = prevEntry
    ? pagerLink(prevEntry.section, prevEntry.heading, 'Previous', 'content-grid__pager-link--prev')
    : null;
  const next = nextEntry
    ? pagerLink(nextEntry.section, nextEntry.heading, 'Next', 'content-grid__pager-link--next')
    : null;
  if (!prev && !next) return null;

  const nav = document.createElement('nav');
  nav.className = 'content-grid__pager';
  const title = entry.heading?.textContent?.trim();
  nav.setAttribute('aria-label', title ? `${title} section` : 'Nearby sections');
  if (prev) nav.append(prev);
  if (next) nav.append(next);
  return nav;
}

/**
 * Eligible stacked-grid entry, `'skip'` (hidden / no heading), or `'break'`.
 * Extra siblings after a first-child content-grid wrapper still count.
 * @param {Element} section
 * @returns {'break'|'skip'|StackedGrid}
 */
function classifySection(section) {
  const wrapper = section.children[0];
  if (!section.classList?.contains('section')
    || !wrapper?.classList.contains('content-grid-wrapper')) {
    return 'break';
  }
  if (wrapper.hidden) return 'skip';
  const block = wrapper.querySelector(':scope > .content-grid');
  const intro = block?.querySelector(':scope > .content-grid__intro');
  const heading = intro?.querySelector('h1, h2, h3, h4, h5, h6');
  if (!block || !heading || !intro) return 'skip';
  return {
    block,
    intro,
    heading,
    section,
  };
}

/**
 * Consecutive runs of eligible content grids under the same parent.
 * Hidden grids and grids with no intro heading are skipped (not a break).
 * @param {Element} parent
 * @returns {StackedGrid[][]}
 */
function collectRuns(parent) {
  const runs = [];
  let current = [];
  [...parent.children].forEach((section) => {
    const result = classifySection(section);
    if (result === 'break') {
      if (current.length) runs.push(current);
      current = [];
      return;
    }
    if (result === 'skip') return;
    current.push(result);
  });
  if (current.length) runs.push(current);
  return runs;
}

/**
 * Wire previous/next jump links for consecutive sibling content grids.
 * Call after this block finishes rendering (including empty/hidden) so later
 * grids can update neighbors that decorated first.
 * @param {Element} block
 */
export function wireStackedGridPagers(block) {
  const section = block.closest('.section');
  const parent = section?.parentElement;
  if (!parent) return;

  const wired = new Set();
  collectRuns(parent).forEach((run) => {
    if (run.length < 2) return;
    run.forEach((entry) => ensureSectionId(entry.section, entry.heading));
    run.forEach((entry, i) => {
      wired.add(entry.block);
      entry.intro.querySelector('.content-grid__pager')?.remove();
      const pager = createPager(
        i > 0 ? run[i - 1] : null,
        i < run.length - 1 ? run[i + 1] : null,
        entry,
      );
      if (pager) entry.intro.append(pager);
    });
  });

  parent.querySelectorAll('.content-grid__pager').forEach((pager) => {
    const grid = pager.closest('.content-grid');
    if (grid && !wired.has(grid)) pager.remove();
  });
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
 * Whether an index row's category list includes an authored category.
 * @param {ContentItem} item
 * @param {string} [category]
 * @returns {boolean}
 */
function matchesCategory(item, category) {
  const authored = String(category || '').trim().toLowerCase();
  // Authored `All` is a sentinel (no filter), not a topic named "all".
  if (!authored || authored === 'all') return true;
  const wanted = normalizeCategories(category);
  if (!wanted.length) return true;
  const categories = normalizeCategories(item.category);
  return wanted.some((name) => categories.includes(name));
}

/**
 * Path with trailing slashes removed, or "/" for the root.
 * @param {string} [path]
 * @returns {string}
 */
function normalizePath(path) {
  return String(path || '').replace(/\/+$/, '') || '/';
}

/**
 * Whether a path should be omitted from the grid (home and section indexes).
 * @param {string} [path]
 * @returns {boolean}
 */
function isExcludedPath(path) {
  if (!path) return true;
  const clean = normalizePath(path);
  if (HOME_PATHS.has(clean)) return true;
  const segments = clean.split('/').filter(Boolean);
  const isSectionRoot = segments.length === 1
    || (segments.length === 2 && segments[1] === 'index');
  return isSectionRoot && Boolean(getSection(segments[0]));
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
 * Filter, sort, and slice index rows for the authored config.
 * @param {ContentItem[]} data
 * @param {object} options
 * @param {string} [options.category]
 * @param {number} options.count
 * @param {string} [options.excludePath] Extra path to omit (the current page, in auto modes)
 * @returns {ContentItem[]}
 */
function selectItems(data, {
  category, count, excludePath,
}) {
  return data
    .filter((item) => !/noindex/i.test(String(item.robots || ''))
      && !isExcludedPath(item.path)
      && (!excludePath || normalizePath(item.path) !== normalizePath(excludePath))
      && matchesCategory(item, category))
    .sort(compareNewestFirst)
    .slice(0, count);
}

/**
 * Whether an index row should render as a video card.
 * Prefers an explicit isVideo flag, then contentType, then the /sneaks/ folder.
 * @param {ContentItem} item
 * @returns {boolean}
 */
function isVideoItem(item) {
  const names = ['isVideo', 'isvideo', 'is-video'];
  // Missing isVideo falls through to contentType / Sneaks; an explicit empty or false must not.
  const name = names.find((key) => Object.prototype.hasOwnProperty.call(item, key) && item[key] !== '');
  if (name) {
    const value = item[name];
    return value === true || /^(true|yes|1)$/i.test(String(value || '').trim());
  }
  const contentType = String(itemField(item, 'contentType', 'content-type')).trim().toLowerCase();
  return contentType === 'video' || getSectionFromPath(item.path)?.slug === 'sneaks';
}

/**
 * Grid-item aspect class from the index `imageAspect` value.
 * Accepts `1:1`, `4:5`, `3:2`, `2:3` (separators `:`, `/`, or `-`, optional `aspect-` prefix).
 * Missing or unknown values default to 1:1.
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
 * Build a grid-item card from an index row.
 * @param {ContentItem} entry
 * @param {object} [options]
 * @param {boolean} [options.subheadDescription] Use description instead of the date subhead
 * @param {boolean} [options.showContentType] Include the content-type (section) label
 *   (off by default)
 * @returns {HTMLDivElement}
 */
function createGridItem(entry, { subheadDescription, showContentType } = {}) {
  const section = getSectionFromPath(entry.path);
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
    contentType: showContentType && section ? section.label : '',
    imageUrl: itemField(entry, 'image'),
    imageAlt: title ? '' : (description || 'Article'),
    isVideo: isVideoItem(entry),
  });
  gridItem.classList.add(toAspectClass(itemField(entry, 'imageAspect', 'image-aspect', 'imageaspect')));
  return gridItem;
}

/**
 * Show or hide the block's section wrapper.
 * @param {Element} block
 * @param {boolean} hidden
 */
function setWrapperHidden(block, hidden) {
  if (block.parentElement) block.parentElement.hidden = hidden;
}

/**
 * Hide the block and its section wrapper when the query returns no cards.
 * @param {Element} block
 */
function hideEmptyBlock(block) {
  block.replaceChildren();
  block.classList.remove('content-grid--has-intro');
  setWrapperHidden(block, true);
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

  setWrapperHidden(block, false);

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
 *
 * A `Related content: true` row turns this into a "related content" grid
 * instead of an explicitly authored one: the content type is derived from
 * the current page's own URL section and the category from the current
 * page's `category` metadata, ignoring any authored Content Type / Category
 * rows. It also excludes the current page from its own results, and falls
 * back to any item in the same content type when the category match is
 * empty instead of coming up empty. Meant for a single shared placement
 * (e.g. the article pre-footer fragment) that renders differently per page
 * without being re-authored per page.
 * @param {Element} block The content-grid block element
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const intro = takeIntro(block);

  const config = readBlockConfig(block);
  const isRelated = /^(true|yes|1)$/i.test(String(config['related-content'] || '').trim());
  const currentPath = window.location.pathname;

  const section = isRelated
    ? getSectionFromPath(currentPath)
    : getSection(config['content-type']);
  const endpoint = section
    ? dataStore.commonEndpoints[section.slug]
    : dataStore.commonEndpoints.allContent;
  const parsedCount = Number.parseInt(String(config.count || '').trim(), 10);
  const count = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : DEFAULT_COUNT;
  const subheadDescription = block.classList.contains('subhead-description');
  const showContentType = block.classList.contains('show-content-type');
  const category = isRelated ? getMetadata('category') : config.category;
  const excludePath = isRelated ? currentPath : '';

  block.classList.toggle('content-grid--related', isRelated);
  block.replaceChildren();

  const payload = await dataStore.getData(endpoint);
  if (!payload) {
    // eslint-disable-next-line no-console
    console.error(`content-grid: failed to load ${endpoint}`);
    hideEmptyBlock(block);
    wireStackedGridPagers(block);
    return;
  }

  const data = Array.isArray(payload.data) ? payload.data : [];
  let items = selectItems(data, { category, count, excludePath });
  if (isRelated && category && !items.length) {
    items = selectItems(data, { category: '', count, excludePath });
  }
  await renderGrid(
    block,
    items.map((entry) => createGridItem(entry, { subheadDescription, showContentType })),
    intro,
  );
  wireStackedGridPagers(block);
}
