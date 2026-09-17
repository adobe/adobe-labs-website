/**
 * Utilities / helpers used by blocks and custom scripts.
 *
 * Note: Because there is no bundler, avoid importing files here, so
 * there are not an excessive number of network requests on the page.
 * `toClassName` comes from aem.js, which is already loaded on every page.
 */
import { buildBlock, getMetadata, toClassName } from '../aem.js';

/**
 * Site sections shared by content-grid and grid-item.
 * @type {Object<string, {label: string, path: string}>}
 */
export const SECTIONS = {
  research: { label: 'Research', path: '/research/' },
  workflows: { label: 'Workflows', path: '/workflows/' },
  sneaks: { label: 'Sneaks', path: '/sneaks/' },
  playground: { label: 'Playground', path: '/playground/' },
};

/**
 * Known section for a slug or authored name, or null if unknown.
 * @param {string} [name]
 * @returns {{ slug: string, label: string, path: string }|null}
 */
export function getSection(name) {
  const slug = toClassName(name);
  const section = SECTIONS[slug];
  if (!section) return null;
  return { slug, label: section.label, path: section.path };
}

/**
 * Known section for a page path's first segment, or null if unknown.
 * @param {string} [path]
 * @returns {{ slug: string, label: string, path: string }|null}
 */
export function getSectionFromPath(path) {
  return getSection(String(path || '').split('/').filter(Boolean)[0]);
}

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

const DEFAULT_AUTHOR_NAME = 'Adobe Labs';
// DA-managed folder; photos uploaded there, not authored per-page.
const AUTHOR_IMAGE_DIR = '/media/authors';

/**
 * Author names from page `author` metadata (comma-separated for multiple
 * authors). Falls back to "Adobe Labs" when none is authored.
 *
 * @returns {string[]}
 */
function getAuthorNames() {
  const names = getMetadata('author')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  return names.length ? names : [DEFAULT_AUTHOR_NAME];
}

/**
 * Author photo, requested by convention from a slugified file name
 * (e.g. "Adobe Labs" → /media/authors/adobe-labs.png) rather than an
 * authored field or extra fetch. Hidden until it loads, and removed on
 * 404 so a missing photo leaves no broken-image icon or empty space.
 *
 * @param {string} name Author name
 * @returns {HTMLImageElement}
 */
function buildAuthorImage(name) {
  const img = document.createElement('img');
  img.className = 'article-meta__author-image';
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.hidden = true;
  img.addEventListener('load', () => { img.hidden = false; });
  img.addEventListener('error', () => img.remove());
  img.src = `${AUTHOR_IMAGE_DIR}/${toClassName(name)}.png`;
  return img;
}

/**
 * One author entry: an optional photo followed by the author's name.
 * Author information is not a link.
 *
 * @param {string} name Author name
 * @returns {HTMLLIElement}
 */
function buildAuthorItem(name) {
  const item = document.createElement('li');
  item.className = 'article-meta__author';
  item.append(buildAuthorImage(name));

  const label = document.createElement('span');
  label.className = 'article-meta__author-name';
  label.textContent = name;
  item.append(label);

  return item;
}

/**
 * Builds the "Words by: <author>, <author>" byline from page metadata.
 * Returns a new element on every call so it can be placed in both the
 * top and bottom meta sections of an article.
 *
 * @returns {HTMLDivElement}
 */
export function buildAuthorByline() {
  const byline = document.createElement('div');
  byline.className = 'article-meta__authors';

  const label = document.createElement('span');
  label.className = 'article-meta__authors-label';
  label.textContent = 'Words by:';
  byline.append(label);

  const list = document.createElement('ul');
  list.className = 'article-meta__author-list';
  getAuthorNames().forEach((name) => list.append(buildAuthorItem(name)));
  byline.append(list);

  return byline;
}

/**
 * Meta section container shared by the top and bottom of an article. Holds
 * the author byline today; action buttons (copy/download/feedback) join it
 * in the same container later (ADBLABS-144/ADBLABS-155).
 *
 * For ADBLABS-155: append the actions markup as a second child of the
 * returned `.article-meta` (see the `.article-meta` CSS in styles.css for
 * the alignment/width rules already in place). This function runs twice
 * per page (top and bottom byline) — hook into both by querying
 * `main.querySelectorAll('.article-meta')` rather than this function.
 *
 * Returns the `<aside class="article-meta">` wrapped in a plain, classless
 * `<div>`. Two reasons:
 *  - `<aside>`, not `<div>`, for the meta element itself: once
 *    `decorateSections` wraps it, a `<div class="article-meta">` here would
 *    land at exactly `div.section > div > div` — the same generic depth
 *    `decorateBlocks` uses to detect a block and try to load
 *    `blocks/<name>/<name>.js` — and get silently (mis)treated as a
 *    nonexistent "article-meta" block. A non-`div` tag sidesteps that
 *    selector entirely.
 *  - The outer classless `<div>` forces `decorateSections` to give this its
 *    own section-level wrapper instead of merging it into the neighboring
 *    `.default-content-wrapper` (its algorithm only starts a new wrapper on
 *    a `<div>`; an `<aside>` alone would be swept into whatever "default
 *    content" run it lands next to). Sitting inside `.default-content-wrapper`
 *    would cap the meta section to that wrapper's narrow, fixed
 *    `--article-content-inline-size-sm`, overriding the wider, breakpoint-
 *    matching width this needs to line up with the lead-in block. Being
 *    classless, the `<div>` itself has no `classList[0]`, so `decorateBlock`
 *    (which keys off exactly that) no-ops on it.
 *
 * @returns {HTMLDivElement}
 */
function buildArticleMeta() {
  const meta = document.createElement('aside');
  meta.className = 'article-meta';
  meta.append(buildAuthorByline());

  const wrapper = document.createElement('div');
  wrapper.append(meta);
  return wrapper;
}

/**
 * Inserts the top meta byline. When the hero has its own section (nothing
 * else authored alongside it), the byline goes at the top of the section
 * that follows, keeping it out of the hero's own (often full-bleed) section.
 * When authors skip that section break and the hero shares a section with
 * the rest of the content, the byline is inserted right after the hero
 * element instead, so it still renders rather than being silently dropped.
 *
 * @param {Element[]} sections `main`'s direct children
 */
function insertTopArticleMeta(sections) {
  const hero = sections.flatMap((section) => [...section.querySelectorAll('.hero')])[0];
  if (!hero) {
    sections[0]?.prepend(buildArticleMeta());
    return;
  }

  const heroSection = sections.find((section) => section.contains(hero));
  if (heroSection.children.length === 1) {
    const nextSection = sections[sections.indexOf(heroSection) + 1] || heroSection;
    nextSection.prepend(buildArticleMeta());
  } else {
    hero.after(buildArticleMeta());
  }
}

/**
 * Adds the author byline to the top and bottom of an article's content.
 * No-op when `main` is detached or the page is not an article detail.
 *
 * @param {Element} main The page's main element
 */
export function buildArticleAuthorMeta(main) {
  if (!document.body.contains(main)) return;
  if (!isArticleDetailPage()) return;

  const sections = [...main.children];
  if (!sections.length) return;

  insertTopArticleMeta(sections);
  sections[sections.length - 1].append(buildArticleMeta());
}

/**
 * Adds `section-rounded-default` to every article section that is not a hero.
 * No-op when the page is not an article detail. Runs after `decorateSections`
 * so each `main` child already has class `section`. Fragment mains also run
 * this (via `loadFragment` → `decorateMain`) so replaced pre-footer sections
 * keep the class.
 *
 * @param {Element} main The container element
 */
export function decorateArticleSections(main) {
  if (!isArticleDetailPage()) return;
  main.querySelectorAll(':scope > .section').forEach((section) => {
    if (section.querySelector('.hero')) return;
    section.classList.add('section-rounded-default');
  });
}

/**
 * Names the section-level wrapper `decorateSections` builds around each
 * author-meta byline `article-meta-section`, mirroring how `decorateBlock`
 * gives a real block's own wrapper a `<name>-wrapper` class — except this
 * isn't a block, so nothing does that for it automatically. Must run after
 * `decorateSections` (the wrapper doesn't exist before that).
 *
 * Without this, the byline's own `.article-meta` used to carry its width
 * rule directly, but `decorateSections` always inserts a wrapper around
 * whatever `buildArticleAuthorMeta` puts in a section, so `.article-meta`
 * ends up one level deeper than the wrapper that actually gets the site's
 * generic `main > .section > div` inline padding. Since the
 * `--article-content-inline-size-*` values already have that padding baked
 * into them (see `.lead-in-wrapper` in lead-in.css, which applies its width
 * rule to the exact element that owns the padding), setting the same rule
 * one level deeper double-counted the padding and threw off alignment by
 * ~24px. `.article-meta-section` is that outer element, put back in the
 * same structural position `.lead-in-wrapper` occupies, so both compute an
 * identical width and left edge at every breakpoint (see `.article-meta-
 * section` in styles.css). It's also the container the action-buttons
 * component (ADBLABS-144/ADBLABS-155) should attach to, to right-align next
 * to the byline on the same row.
 *
 * @param {Element} main The page's main element
 */
export function decorateArticleMetaSections(main) {
  main.querySelectorAll('.article-meta').forEach((meta) => {
    let wrapper = meta.parentElement;
    while (wrapper?.parentElement && !wrapper.parentElement.classList.contains('section')) {
      wrapper = wrapper.parentElement;
    }
    wrapper?.classList.add('article-meta-section');
  });
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

/**
 * First-tab-stop skip link targeting `body > main`. No-ops if one already exists.
 * @param {Document} [doc=document]
 */
export function ensureSkipLink(doc = document) {
  if (doc.querySelector('a.header__skip[href="#main"]')) return;

  const main = doc.querySelector('body > main');
  if (main) {
    if (!main.id) main.id = 'main';
    if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
  }

  const skip = doc.createElement('a');
  skip.className = 'header__skip visually-hidden';
  skip.href = '#main';
  skip.textContent = 'Skip to main content';

  const header = doc.querySelector('body > header');
  (header || doc.body).prepend(skip);
}
