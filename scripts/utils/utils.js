/**
 * Utilities / helpers used by blocks and custom scripts.
 *
 * Note: Because there is no bundler, avoid importing files here, so
 * there are not an excessive number of network requests on the page.
 * `toClassName` comes from aem.js, which is already loaded on every page.
 */
import {
  buildBlock, getMetadata, readBlockConfig, toCamelCase, toClassName,
} from '../aem.js';

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

const COPY_LINK_LABEL = 'Copy link';
const COPIED_LABEL = 'Copied';
const COPY_LINK_REVERT_MS = 2000;

const LINK_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M4.78213 16.8732C3.84521 16.8732 2.90919 16.5164 2.19639 15.8036C0.770805 14.378 0.770805 12.0577 2.19639 10.6313L5.71113 7.11651C7.13759 5.69093 9.45703 5.6918 10.8835 7.11651C11.0786 7.3125 11.25 7.52783 11.3933 7.75547C11.5919 8.071 11.497 8.4876 11.1814 8.68623C10.8642 8.88575 10.4493 8.78907 10.2507 8.47442C10.1602 8.33027 10.0512 8.19405 9.92724 8.07012C9.02812 7.171 7.56474 7.17188 6.66563 8.071L3.15088 11.5857C2.25176 12.4857 2.25176 13.95 3.15088 14.8491C4.05176 15.75 5.51514 15.7465 6.41426 14.8491L8.1712 13.0922C8.43487 12.8285 8.86202 12.8285 9.12569 13.0922C9.38937 13.3559 9.38937 13.783 9.12569 14.0467L7.36876 15.8036C6.65597 16.5164 5.71904 16.8724 4.78213 16.8732ZM12.2889 10.8835L15.8036 7.36876C17.2292 5.94229 17.2292 3.62198 15.8036 2.1964C14.378 0.770814 12.0568 0.770814 10.6312 2.1964L8.87431 3.95333C8.61064 4.217 8.61064 4.64415 8.87431 4.90783C9.13799 5.1715 9.56514 5.1715 9.82881 4.90783L11.5857 3.15089C12.4849 2.25265 13.9482 2.25089 14.8491 3.15089C15.7482 4.05001 15.7482 5.51427 14.8491 6.41427L11.3344 9.92902C10.4353 10.8281 8.97188 10.829 8.07277 9.9299C7.94884 9.80597 7.83986 9.66974 7.74932 9.5256C7.55069 9.21095 7.13585 9.11427 6.81856 9.31379C6.50303 9.51242 6.40812 9.92902 6.60675 10.2445C6.75001 10.4722 6.9214 10.6875 7.11652 10.8835C7.83019 11.5963 8.76622 11.9531 9.70313 11.9531C10.6392 11.9531 11.5761 11.5963 12.2889 10.8835Z"/>
</svg>
`.trim();

const CHECK_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M16.2129 5.26855C16.4775 5.5332 16.4775 5.96094 16.2129 6.22559L8.15039 14.2881C8.02148 14.417 7.84961 14.4814 7.67773 14.4814C7.50586 14.4814 7.33398 14.417 7.20508 14.2881L2.78711 9.87012C2.52246 9.60547 2.52246 9.17773 2.78711 8.91309C3.05176 8.64844 3.47949 8.64844 3.74414 8.91309L7.67773 12.8467L15.2559 5.26855C15.5205 5.00391 15.9482 5.00391 16.2129 5.26855Z"/>
</svg>
`.trim();

const DOWNLOAD_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="m13.53027 9.42676c-.29199-.29199-.7666-.29395-1.06055 0l-1.7168 1.71411V2.75c0-.41406-.33594-.75-.75-.75s-.75.33594-.75.75v8.39941l-1.72266-1.72266c-.29297-.29297-.76758-.29297-1.06055 0s-.29297.76758 0 1.06055l2.99805 2.99805c.14648.14648.33789.21973.53027.21973.19141 0 .38379-.07324.53027-.21973l3.00195-2.99805c.29297-.29199.29297-.76758 0-1.06055Z"/>
  <path fill="currentColor" d="M15.75 18H4.25c-1.24023 0-2.25-1.00977-2.25-2.25v-2.02148c0-.41406.33594-.75.75-.75s.75.33594.75.75v2.02148c0 .41309.33691.75.75.75h11.5c.41309 0 .75-.33691.75-.75v-2.02148c0-.41406.33594-.75.75-.75s.75.33594.75.75v2.02148c0 1.24023-1.00977 2.25-2.25 2.25Z"/>
</svg>
`.trim();

/** Spectrum S2_Icon_Email_20_N, exported from the article action group. */
const FEEDBACK_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M15.0749 2.69336H2.9249C1.8087 2.69336 0.899902 3.60215 0.899902 4.71836V13.2684C0.899902 14.3846 1.8087 15.2934 2.9249 15.2934H15.0749C16.1911 15.2934 17.0999 14.3846 17.0999 13.2684V4.71836C17.0999 3.60215 16.1911 2.69336 15.0749 2.69336ZM14.6963 4.04336L9.44287 8.61807C9.1915 8.83779 8.80918 8.83779 8.55606 8.61807L3.30349 4.04336H14.6963ZM15.0749 13.9434H2.9249C2.55312 13.9434 2.2499 13.6401 2.2499 13.2684V4.91523L7.66923 9.63584C8.04893 9.96631 8.52441 10.1315 8.9999 10.1315C9.47539 10.1315 9.95088 9.96631 10.3297 9.63584L15.7499 4.91523V13.2684C15.7499 13.6401 15.4467 13.9434 15.0749 13.9434Z"/>
</svg>
`.trim();

const DA_HOSTS = new Set(['da.live', 'www.da.live', 'content.da.live']);
const DA_SITE_PREFIX = '/adobe/adobe-labs-website';
const DOWNLOAD_LABEL = 'Download';
const FEEDBACK_LABEL = 'Feedback';
const FEEDBACK_HINT = '(opens email)';
const FEEDBACK_EMAIL = 'labs@adobe.com';

/**
 * Site path for a DA authoring or content URL on this project, or empty.
 * File path is in the hash on `da.live` (`/media` there is the app, not the
 * folder) and in the pathname on `content.da.live`.
 *
 * @param {URL} url Parsed DA URL
 * @returns {string}
 */
function getDaSiteFilePath(url) {
  const encoded = url.hostname === 'content.da.live'
    ? url.pathname
    : (url.hash.replace(/^#/, '') || url.pathname);
  let path = encoded;
  try {
    path = decodeURIComponent(encoded);
  } catch {
    return '';
  }
  if (!path.startsWith(`${DA_SITE_PREFIX}/`)) return '';
  const sitePath = path.slice(DA_SITE_PREFIX.length);
  const last = sitePath.split('/').pop();
  if (!last || !last.includes('.')) return '';
  return sitePath;
}

/**
 * Public href for the article Download action from `download-link` metadata.
 * DA media-browser URLs for this site become a same-origin file path.
 *
 * @returns {string}
 */
function getDownloadHref() {
  const raw = getMetadata('download-link').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (DA_HOSTS.has(url.hostname)) {
      const sitePath = getDaSiteFilePath(url);
      if (!sitePath) return '';
      return new URL(sitePath, window.location.href).href;
    }
    return url.href;
  } catch {
    return '';
  }
}

/**
 * Filename hint for the `download` attribute, from the URL pathname.
 *
 * @param {string} href Download href
 * @returns {string}
 */
function getDownloadFilename(href) {
  try {
    const last = new URL(href, window.location.href)
      .pathname
      .split('/')
      .filter(Boolean)
      .pop();
    return last ? decodeURIComponent(last) : '';
  } catch {
    return '';
  }
}

/**
 * Mailto for the article Feedback action. The subject is the page metadata
 * Title. AEM writes that row to `og:title`, not `meta[name="title"]`.
 * A missing title omits the query.
 *
 * @returns {string}
 */
function getFeedbackHref() {
  const title = getMetadata('og:title').trim();
  const base = `mailto:${FEEDBACK_EMAIL}`;
  if (!title) return base;
  return `${base}?subject=${encodeURIComponent(`Feedback: ${title}`)}`;
}

/**
 * Article meta action buttons. Copy link and Feedback always ship. Download
 * is gated on `download-link` metadata.
 *
 * @type {Array<{
 *   id: string,
 *   label: string,
 *   render: 'button'|'a',
 *   icon: string,
 *   isEnabled?: function(): boolean,
 *   getHref?: function(): string,
 *   download?: boolean,
 *   hint?: string,
 * }>}
 */
const META_ACTIONS = [
  {
    id: 'copy-link',
    label: COPY_LINK_LABEL,
    render: 'button',
    icon: LINK_ICON_SVG,
    isEnabled: () => true,
  },
  {
    id: 'download',
    label: DOWNLOAD_LABEL,
    render: 'a',
    icon: DOWNLOAD_ICON_SVG,
    isEnabled: () => Boolean(getDownloadHref()),
    getHref: getDownloadHref,
    download: true,
  },
  {
    id: 'feedback',
    label: FEEDBACK_LABEL,
    render: 'a',
    icon: FEEDBACK_ICON_SVG,
    isEnabled: () => true,
    getHref: getFeedbackHref,
    hint: FEEDBACK_HINT,
  },
];

/** @type {WeakMap<Element, number>} */
const copyRevertTimers = new WeakMap();

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
 * @param {'top'|'bottom'} position Which meta instance this is. Adds
 * `article-meta--top`/`article-meta--bottom` so CSS can target just one
 * (e.g. the narrow-viewport two-line byline applies to the top instance
 * only).
 * @returns {HTMLDivElement}
 */
function buildArticleMeta(position) {
  const meta = document.createElement('aside');
  meta.className = `article-meta article-meta--${position}`;
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
    sections[0]?.prepend(buildArticleMeta('top'));
    return;
  }

  const heroSection = sections.find((section) => section.contains(hero));
  if (heroSection.children.length === 1) {
    const nextSection = sections[sections.indexOf(heroSection) + 1] || heroSection;
    nextSection.prepend(buildArticleMeta('top'));
  } else {
    hero.after(buildArticleMeta('top'));
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
  sections[sections.length - 1].append(buildArticleMeta('bottom'));
}

/**
 * Reads each section's authored `Section Metadata` table into `section.dataset`
 * and removes the table so it never reaches `decorateBlocks` as a block to load.
 * Runs after `decorateSections` (needs the `.section` wrapper) and before
 * `decorateBlocks` (the table would otherwise resolve to a nonexistent
 * `section-metadata` block folder).
 *
 * The `style` key is special-cased: it adds one or more (comma-separated)
 * classes to the section instead of a dataset entry. Every other key
 * (including `toc`, read by the Table of Contents block) becomes a plain
 * `section.dataset` entry.
 *
 * @param {Element} main The container element
 */
export function decorateSectionMetadata(main) {
  main.querySelectorAll(':scope > .section > div > .section-metadata').forEach((sectionMeta) => {
    const section = sectionMeta.closest('.section');
    const config = readBlockConfig(sectionMeta);
    Object.entries(config).forEach(([key, value]) => {
      if (key === 'style') {
        value.split(',').forEach((style) => {
          const className = toClassName(style.trim());
          if (className) section.classList.add(className);
        });
        return;
      }
      section.dataset[toCamelCase(key)] = value;
    });
    sectionMeta.remove();
  });
}

/**
 * Share URL for Copy link: canonical when present, otherwise the current
 * location, with the hash stripped so in-page jumps are not part of the link.
 *
 * @returns {string}
 */
function getShareUrl() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const raw = canonical || window.location.href;
  try {
    const url = new URL(raw, window.location.href);
    url.hash = '';
    return url.href;
  } catch {
    return raw;
  }
}

/**
 * Copies text with a hidden textarea and `document.execCommand('copy')`.
 * Restores focus to `restoreFocusTo` (or the previously focused element)
 * so removing the textarea does not dump focus to `body`.
 *
 * @param {string} text Text to copy
 * @param {Element} [restoreFocusTo] Element to focus after copying
 * @returns {boolean}
 */
function copyTextFallback(text, restoreFocusTo) {
  const previouslyFocused = document.activeElement;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.tabIndex = -1;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  textarea.remove();
  const target = restoreFocusTo || previouslyFocused;
  if (target && typeof target.focus === 'function' && document.contains(target)) {
    target.focus();
  }
  return ok;
}

/**
 * Copies text via the Clipboard API, falling back to `execCommand`.
 *
 * @param {string} text Text to copy
 * @param {Element} [restoreFocusTo] Element to focus after the fallback path
 * @returns {Promise<boolean>}
 */
async function copyText(text, restoreFocusTo) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return copyTextFallback(text, restoreFocusTo);
}

/**
 * Shared polite live region for meta-action status (one per article `main`).
 * An `<output>` (not a `div`) so `decorateSections` does not treat it as a
 * section. Kept off the action group so stale status is not inside a
 * named control group.
 *
 * @param {Element} main The page's main element
 * @returns {Element}
 */
function ensureMetaActionStatus(main) {
  let status = main.querySelector(':scope > [data-meta-action-status]');
  if (status) return status;

  status = document.createElement('output');
  status.className = 'visually-hidden';
  status.dataset.metaActionStatus = '';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  main.append(status);
  return status;
}

/**
 * Announces a status message to assistive tech.
 *
 * @param {Element} main The page's main element
 * @param {string} message Status text
 */
function announceMetaAction(main, message) {
  const status = ensureMetaActionStatus(main);
  status.textContent = message;
}

/**
 * Clears the copy-success status if it is still showing.
 *
 * @param {Element} main The page's main element
 */
function clearCopiedStatus(main) {
  const status = main.querySelector(':scope > [data-meta-action-status]');
  if (status?.textContent === 'Link copied') status.textContent = '';
}

/**
 * Paints a decorative action icon. The glyph is hidden from assistive tech;
 * the visible label on the control is the accessible name (WCAG 1.1.1).
 *
 * @param {Element} iconEl `.action-button__icon` wrapper
 * @param {string} svgMarkup Inline SVG markup
 */
function setActionIcon(iconEl, svgMarkup) {
  iconEl.innerHTML = svgMarkup;
  const svg = iconEl.querySelector('svg');
  if (!svg) return;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
}

/**
 * Sets or clears the Copy link success state on one button.
 *
 * @param {Element} button Copy link button
 * @param {boolean} copied Whether to show Copied
 */
function setCopiedState(button, copied) {
  const label = button.querySelector('.action-button__label');
  const icon = button.querySelector('.action-button__icon');
  if (label) label.textContent = copied ? COPIED_LABEL : COPY_LINK_LABEL;
  if (icon) setActionIcon(icon, copied ? CHECK_ICON_SVG : LINK_ICON_SVG);
}

/**
 * Reverts a Copy link button to its default label and icon.
 *
 * @param {Element} button Copy link button
 */
function revertCopied(button) {
  const timer = copyRevertTimers.get(button);
  if (timer) window.clearTimeout(timer);
  copyRevertTimers.delete(button);
  setCopiedState(button, false);
}

/**
 * Shows Copied on the clicked button and reverts after a short delay.
 *
 * @param {Element} button Copy link button
 * @param {Element} main The page's main element
 */
function showCopied(button, main) {
  revertCopied(button);
  setCopiedState(button, true);
  const timer = window.setTimeout(() => {
    copyRevertTimers.delete(button);
    setCopiedState(button, false);
    clearCopiedStatus(main);
  }, COPY_LINK_REVERT_MS);
  copyRevertTimers.set(button, timer);
}

/**
 * Copies the article URL and updates the clicked button plus live region.
 *
 * @param {Element} main The page's main element
 * @param {Element} button Copy link button
 * @returns {Promise<void>}
 */
async function handleCopyLink(main, button) {
  const ok = await copyText(getShareUrl(), button);
  if (ok) {
    showCopied(button, main);
    announceMetaAction(main, 'Link copied');
    return;
  }
  announceMetaAction(main, 'Unable to copy link');
}

/**
 * One control in a meta-action group (`button` or `a`).
 *
 * @param {{
 *   id: string,
 *   label: string,
 *   render: 'button'|'a',
 *   icon: string,
 *   getHref?: function(): string,
 *   download?: boolean,
 *   hint?: string,
 * }} action
 * @returns {HTMLButtonElement|HTMLAnchorElement}
 */
function createMetaActionControl(action) {
  const el = document.createElement(action.render === 'a' ? 'a' : 'button');
  el.className = 'action-button';
  el.dataset.metaAction = action.id;
  if (el.tagName === 'BUTTON') el.type = 'button';
  if (el.tagName === 'A' && typeof action.getHref === 'function') {
    const href = action.getHref();
    if (href) {
      el.href = href;
      if (action.download) {
        const filename = getDownloadFilename(href);
        if (filename) el.setAttribute('download', filename);
      }
    }
  }

  const icon = document.createElement('span');
  icon.className = 'action-button__icon';
  icon.setAttribute('aria-hidden', 'true');
  setActionIcon(icon, action.icon);

  const label = document.createElement('span');
  label.className = 'action-button__label';
  label.textContent = action.label;

  el.append(icon, label);
  if (action.hint) {
    const hint = document.createElement('span');
    hint.className = 'visually-hidden';
    hint.textContent = ` ${action.hint}`;
    el.append(hint);
  }
  return el;
}

/**
 * Builds one article meta-action group from enabled `META_ACTIONS`.
 * A named `group`, not a `nav` landmark — these are actions, not navigation,
 * and the control appears twice on the page.
 *
 * @param {'top'|'bottom'} position Which instance this is
 * @returns {HTMLElement|null}
 */
function createMetaActionGroup(position) {
  const group = document.createElement('div');
  group.className = 'article-meta__actions';
  group.setAttribute('role', 'group');
  group.setAttribute(
    'aria-label',
    position === 'bottom' ? 'Article actions, bottom of article' : 'Article actions',
  );

  META_ACTIONS.forEach((action) => {
    if (action.isEnabled && !action.isEnabled()) return;
    group.append(createMetaActionControl(action));
  });

  return group.children.length ? group : null;
}

/**
 * Delegated click handling for meta actions. Idempotent per `main`.
 *
 * @param {Element} main The page's main element
 */
function bindArticleMetaActions(main) {
  if (main.dataset.metaActionsBound === 'true') return;
  main.dataset.metaActionsBound = 'true';
  main.addEventListener('click', (event) => {
    const button = event.target.closest('[data-meta-action="copy-link"]');
    if (!button || !main.contains(button)) return;
    handleCopyLink(main, button);
  });
}

/**
 * Accessible name for a complementary landmark. Distinguishes the duplicate
 * top/bottom asides for screen reader landmark lists.
 *
 * @param {Element} meta `.article-meta` element
 * @param {'top'|'bottom'} position Which instance this is
 */
function nameArticleMeta(meta, position) {
  if (meta.hasAttribute('aria-label')) return;
  meta.setAttribute(
    'aria-label',
    position === 'bottom' ? 'Article details, bottom of article' : 'Article details',
  );
}

/**
 * Top vs bottom from the byline modifier class, or from document order.
 *
 * @param {Element} meta `.article-meta` element
 * @param {number} index Index among `.article-meta` nodes
 * @param {number} total Number of `.article-meta` nodes
 * @returns {'top'|'bottom'}
 */
function articleMetaPosition(meta, index, total) {
  if (meta.classList.contains('article-meta--bottom')) return 'bottom';
  if (meta.classList.contains('article-meta--top')) return 'top';
  return index === total - 1 && total > 1 ? 'bottom' : 'top';
}

/**
 * Empty `.article-meta` shell matching ADBLABS-130: an `<aside>` (so
 * `decorateBlocks` does not treat it as a block) inside a classless `<div>`
 * (so `decorateSections` gives it its own wrapper instead of folding it into
 * `.default-content-wrapper`). Width/centering of that wrapper is owned by
 * `.article-meta-section` on the byline PR — do not add a second centered
 * wrapper here.
 *
 * @param {'top'|'bottom'} position Which instance this is
 * @returns {{ wrapper: HTMLDivElement, meta: HTMLElement }}
 */
function createArticleMetaWrapper(position) {
  const meta = document.createElement('aside');
  meta.className = `article-meta article-meta--${position}`;
  nameArticleMeta(meta, position);
  const wrapper = document.createElement('div');
  wrapper.append(meta);
  return { wrapper, meta };
}

/**
 * Places the top meta wrapper the same way ADBLABS-130 does: after a
 * standalone hero's section, or immediately after a hero that shares its
 * section with other content.
 *
 * @param {Element[]} sections `main`'s direct children
 * @param {Element} wrapper Classless wrapper around `.article-meta`
 */
function insertTopArticleMetaWrapper(sections, wrapper) {
  const hero = sections.flatMap((section) => [...section.querySelectorAll('.hero')])[0];
  if (!hero) {
    sections[0]?.prepend(wrapper);
    return;
  }

  const heroSection = sections.find((section) => section.contains(hero));
  if (heroSection.children.length === 1) {
    const nextSection = sections[sections.indexOf(heroSection) + 1] || heroSection;
    nextSection.prepend(wrapper);
  } else {
    hero.after(wrapper);
  }
}

/**
 * Existing `.article-meta` nodes (from the author byline), or a top/bottom
 * fallback pair so this ticket is not blocked on ADBLABS-130 merging.
 *
 * @param {Element} main The page's main element
 * @returns {Element[]}
 */
function ensureArticleMetaElements(main) {
  const existing = [...main.querySelectorAll('.article-meta')];
  if (existing.length) return existing;

  const sections = [...main.children];
  if (!sections.length) return [];

  const top = createArticleMetaWrapper('top');
  insertTopArticleMetaWrapper(sections, top.wrapper);

  const bottom = createArticleMetaWrapper('bottom');
  sections[sections.length - 1].append(bottom.wrapper);

  return [top.meta, bottom.meta];
}

/**
 * Injects Copy link, a metadata-gated Download, and Feedback into each `.article-meta`
 * on the article (top and bottom). If the byline has not created those
 * containers yet, builds the same aside+wrapper fallback. No-op on
 * non-article pages or fragment mains.
 *
 * @param {Element} main The page's main element
 */
export function buildArticleMetaActions(main) {
  if (main.parentElement !== document.body) return;
  if (!isArticleDetailPage()) return;

  const metas = ensureArticleMetaElements(main);
  if (!metas.length) return;

  metas.forEach((meta, index) => {
    const position = articleMetaPosition(meta, index, metas.length);
    nameArticleMeta(meta, position);
    if (meta.querySelector('.article-meta__actions')) return;
    const group = createMetaActionGroup(position);
    if (group) meta.append(group);
  });

  ensureMetaActionStatus(main);
  bindArticleMetaActions(main);
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
 * Names the byline's section-level wrapper `article-meta-section`, matching
 * `.lead-in-wrapper`'s structural position. Must run after `decorateSections`.
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
