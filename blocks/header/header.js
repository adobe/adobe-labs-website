import { getMetadata } from '../../scripts/aem.js';
import {
  ensureSkipLink,
  escapeAttr,
  fromHTML,
  toSafeHttpUrl,
} from '../../scripts/utils/utils.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * @file Header block. Loads the nav fragment and paints Labs global navigation:
 * brand logo, primary links, optional mega panels, and a Subscribe CTA.
 * Content path: `nav` metadata, or `/fragments/nav` by default.
 *
 * Authored fragment shape: a list whose first item is the brand (nav nested
 * under it, optional mega under an item) and a sibling Subscribe link; or a
 * brand paragraph, sibling list, and `.button` CTA.
 */

/**
 * Viewport query for the desktop nav (`>= 48rem`).
 * @type {string}
 */
const DESKTOP_MQ = '(width >= 48rem)';

/**
 * Default CTA label, and the text used to detect an unstyled Subscribe link.
 * @type {string}
 */
const CTA_LABEL = 'Subscribe';

/**
 * Listener abort controllers keyed by header block, so re-decorate does not leak.
 * @type {WeakMap<Element, AbortController>}
 */
const headerAborts = new WeakMap();

/**
 * One mega-panel column parsed from a nested list.
 *
 * @typedef {object} HeaderNavColumn
 * @property {Element[]} links Safe column links
 */

/**
 * One primary nav item.
 *
 * @typedef {object} HeaderNavItem
 * @property {string} label Visible label
 * @property {string} href Primary href, or empty for menu-only items
 * @property {HeaderNavColumn[]} columns Mega-menu columns
 */

/**
 * Brand logo parsed from the nav fragment.
 *
 * @typedef {object} HeaderBrand
 * @property {string} href Brand home href
 * @property {Element|null} image Authored logo, if any
 * @property {string} label Accessible brand name
 */

/**
 * Subscribe / utility CTA parsed from the nav fragment.
 *
 * @typedef {object} HeaderCta
 * @property {string} href CTA href
 * @property {string} label CTA label
 */

/**
 * Parsed nav fragment used to decorate the header.
 *
 * @typedef {object} HeaderNavData
 * @property {HeaderBrand} brand
 * @property {HeaderNavItem[]} items
 * @property {HeaderCta|null} cta
 */

/**
 * Inlined header icons used to paint the bar.
 *
 * @typedef {object} HeaderIcons
 * @property {string} logoDesktopSvg Desktop logo markup
 * @property {string} logoMobileSvg Mobile logo markup
 * @property {string} menuSvg Menu toggle markup
 * @property {string} chevronSvg Mega-menu chevron markup
 */

/**
 * ==================================================================
 * UTILS
 * ==================================================================
 */

/**
 * URL for an asset under this block.
 *
 * @param {string} path Path relative to `blocks/header/`
 * @returns {string}
 */
function getHeaderAsset(path) {
  const base = window.hlx?.codeBasePath || '';
  return `${base}/blocks/header/${path}`;
}

/**
 * Turns fetched SVG markup into an inline decorative icon.
 *
 * @param {string} markup SVG document
 * @param {string} className Class to add
 * @returns {string} Inlined SVG markup, or empty if none was found
 */
function inlineHeaderSvg(markup, className) {
  const wrap = document.createElement('div');
  wrap.innerHTML = markup.trim();
  const svg = wrap.querySelector('svg');
  if (!svg) return '';
  svg.classList.add(className);
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('aria-hidden', 'true');
  return svg.outerHTML;
}

/**
 * Fetches a block SVG and inlines it as a decorative icon.
 *
 * @param {string} path Path relative to `blocks/header/`
 * @param {string} className Class to add
 * @returns {Promise<string>} Inlined SVG markup, or empty on failure
 */
async function loadHeaderIcon(path, className) {
  try {
    const resp = await fetch(getHeaderAsset(path));
    if (!resp.ok) return '';
    return inlineHeaderSvg(await resp.text(), className);
  } catch {
    return '';
  }
}

/**
 * Same-origin relative href, or an absolute http(s) URL. Rejects javascript:/data:.
 *
 * @param {string} value Candidate URL
 * @returns {string} Safe href, or empty if rejected
 */
function toNavHref(value) {
  const abs = toSafeHttpUrl(value);
  if (!abs) return '';
  try {
    const url = new URL(abs);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}` || '/';
    }
    return abs;
  } catch {
    return '';
  }
}

/**
 * Whether `href` is the current page (or an ancestor path).
 *
 * @param {string} href Link href
 * @returns {boolean}
 */
function pathMatches(href) {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    const target = url.pathname.replace(/\/$/, '') || '/';
    const current = window.location.pathname.replace(/\/$/, '') || '/';
    if (target === current) return true;
    return target !== '/' && current.startsWith(`${target}/`);
  } catch {
    return false;
  }
}

/**
 * Safe http(s) links inside `root`.
 *
 * @param {Element} root Tree to search
 * @returns {Element[]}
 */
function collectLinks(root) {
  return [...root.querySelectorAll('a[href]')].filter((link) => (
    Boolean(toSafeHttpUrl(link.getAttribute('href')))
  ));
}

/**
 * Fragment path from `nav` metadata, or the default nav fragment.
 *
 * @returns {string}
 */
function getNavPath() {
  const navMeta = getMetadata('nav');
  if (!navMeta) return '/fragments/nav';
  try {
    return new URL(navMeta, window.location.href).pathname;
  } catch {
    return navMeta;
  }
}

/**
 * ==================================================================
 * PARSE
 * ==================================================================
 */

/**
 * Whether a link is the Subscribe / utility CTA.
 *
 * @param {Element} link Anchor
 * @returns {boolean}
 */
function isCtaLink(link) {
  if (link.classList.contains('button')) return true;
  return link.textContent.trim().toLowerCase() === CTA_LABEL.toLowerCase();
}

/**
 * Whether a link is the brand / home logo.
 *
 * @param {Element} link Anchor
 * @returns {boolean}
 */
function isBrandLink(link) {
  if (link.querySelector('img, picture')) return true;
  try {
    if (new URL(link.getAttribute('href') || '', window.location.href).pathname === '/') {
      return true;
    }
  } catch { /* not a URL */ }
  const item = link.closest('li');
  const topList = item?.parentElement;
  if (topList?.tagName !== 'UL' || topList.parentElement?.closest('ul')) return false;
  return item === topList.children[0]
    && item.querySelector(':scope > a[href], :scope > p > a[href]') === link
    && Boolean(item.querySelector(':scope > ul'));
}

/**
 * Nested list under a list item, as one unlabeled mega column.
 *
 * @param {Element} itemEl `li` element
 * @returns {HeaderNavColumn[]}
 */
function nestedMegaColumn(itemEl) {
  const nested = itemEl.querySelector(':scope > ul');
  if (!nested) return [];
  const links = collectLinks(nested);
  return links.length ? [{ links }] : [];
}

/**
 * List of primary items: nested under the brand when DA nests the menu there,
 * otherwise the first top-level list.
 *
 * @param {Element|undefined} list First top-level `ul`
 * @param {Element|undefined} brandLink Brand anchor
 * @returns {Element|undefined}
 */
function primaryNavList(list, brandLink) {
  if (!list) return undefined;
  const brandItem = brandLink?.closest('li');
  if (brandItem && list.contains(brandItem)) {
    const nested = brandItem.querySelector(':scope > ul');
    if (nested) return nested;
  }
  return list;
}

/**
 * Primary nav items from a list of `li`s.
 *
 * @param {Element|undefined} list `ul` element
 * @param {Set<Element>} skip Brand and CTA links
 * @returns {HeaderNavItem[]}
 */
function itemsFromList(list, skip) {
  if (!list) return [];
  return [...list.children].flatMap((itemEl) => {
    const trigger = itemEl.querySelector(':scope > a[href], :scope > p > a[href]');
    if (!trigger || skip.has(trigger)) return [];
    const columns = nestedMegaColumn(itemEl);
    const href = toNavHref(trigger.getAttribute('href'));
    const label = trigger.textContent.trim();
    if (!label || (!href && !columns.length)) return [];
    return [{ label, href, columns }];
  });
}

/**
 * Parses the nav fragment into brand, items, and CTA.
 *
 * @param {Element} fragment Loaded fragment root
 * @returns {HeaderNavData}
 */
function parseNavFragment(fragment) {
  const allLinks = collectLinks(fragment);
  const brandLink = allLinks.find(isBrandLink);
  const ctaLink = [...allLinks].reverse().find((link) => link !== brandLink && isCtaLink(link));
  const list = [...fragment.querySelectorAll('ul')].find((ul) => !ul.parentElement?.closest('ul'));
  const skip = new Set([brandLink, ctaLink].filter(Boolean));
  const items = itemsFromList(primaryNavList(list, brandLink), skip);

  const brandImage = brandLink?.querySelector('img, picture') || null;
  const brandLabel = brandLink?.textContent.trim()
    || brandImage?.querySelector?.('img')?.alt
    || brandImage?.alt
    || 'Adobe Labs';

  return {
    brand: brandLink ? {
      href: toNavHref(brandLink.getAttribute('href')) || '/',
      image: brandImage,
      label: brandLabel || 'Adobe Labs',
    } : {
      href: '/',
      image: null,
      label: 'Adobe Labs',
    },
    items: items.filter((item) => item.href || item.columns.length),
    cta: ctaLink ? {
      href: toNavHref(ctaLink.getAttribute('href')),
      label: ctaLink.textContent.trim() || CTA_LABEL,
    } : null,
  };
}

/**
 * ==================================================================
 * MARKUP
 * ==================================================================
 */

/**
 * Markup for a mega-panel column.
 *
 * @param {HeaderNavColumn} column Column data
 * @returns {string} Column HTML
 */
function columnMarkup(column) {
  const links = column.links.map((link) => {
    const href = escapeAttr(toNavHref(link.getAttribute('href')));
    const label = escapeAttr(link.textContent.trim());
    const current = pathMatches(link.getAttribute('href')) ? ' aria-current="page"' : '';
    return `<li><a class="header__panel-link" href="${href}"${current}>${label}</a></li>`;
  }).join('');
  return `
    <div class="header__column">
      <ul class="header__column-list">${links}</ul>
    </div>
  `;
}

/**
 * Markup for one primary nav item.
 *
 * @param {HeaderNavItem} item Item data
 * @param {number} index Item index
 * @param {string} chevronSvg Inlined decorative chevron, or empty
 * @returns {string} List-item HTML
 */
function itemMarkup(item, index, chevronSvg) {
  const label = escapeAttr(item.label);
  const hasMenu = item.columns.length > 0;
  const current = item.href && pathMatches(item.href) ? ' aria-current="page"' : '';
  if (!hasMenu) {
    const href = escapeAttr(item.href || '#');
    return `
      <li class="header__item">
        <a class="header__link" href="${href}"${current}>${label}</a>
      </li>
    `;
  }
  const panelId = `header-panel-${index}`;
  const columns = item.columns.map((column) => columnMarkup(column)).join('');
  return `
    <li class="header__item header__item--has-menu">
      <button
        type="button"
        class="header__link"
        aria-expanded="false"
        aria-controls="${panelId}"
      >${label}${chevronSvg}</button>
      <div class="header__panel" id="${panelId}" hidden>
        ${columns}
      </div>
    </li>
  `;
}

/**
 * Brand logo markup: authored image when safe, otherwise inlined SVGs.
 *
 * @param {HeaderBrand} brand Parsed brand
 * @param {string} logoDesktopSvg Desktop logo SVG
 * @param {string} logoMobileSvg Mobile logo SVG
 * @returns {string}
 */
function brandMediaMarkup(brand, logoDesktopSvg, logoMobileSvg) {
  const fallback = `${logoDesktopSvg}${logoMobileSvg}`;
  const authoredImage = brand.image;
  if (!authoredImage) return fallback;
  const img = authoredImage.tagName === 'PICTURE'
    ? authoredImage.querySelector('img')
    : authoredImage;
  const src = toSafeHttpUrl(img?.getAttribute('src'));
  if (!src) return fallback;
  return `
    <img class="header__logo-desktop" src="${escapeAttr(src)}" alt="">
    ${logoMobileSvg}
  `;
}

/**
 * Builds the header bar from parsed nav data and inlined icons.
 *
 * @param {HeaderNavData} data Parsed fragment
 * @param {HeaderIcons} icons Inlined SVGs
 * @returns {Element}
 */
function buildHeaderBar(data, icons) {
  const brandName = escapeAttr(data.brand.label || 'Adobe Labs');
  const brandHref = escapeAttr(data.brand.href || '/');
  const brandMedia = brandMediaMarkup(data.brand, icons.logoDesktopSvg, icons.logoMobileSvg);
  const items = data.items.map((item, index) => itemMarkup(item, index, icons.chevronSvg)).join('');
  const cta = data.cta?.href
    ? `<a class="header__cta button" href="${escapeAttr(data.cta.href)}">${escapeAttr(data.cta.label)}</a>`
    : '';

  return fromHTML(`
    <div class="header__bar">
      <a class="header__brand" href="${brandHref}" aria-label="${brandName}">
        ${brandMedia}
      </a>
      <button type="button" class="header__toggle" aria-expanded="false" aria-controls="header-nav">
        ${icons.menuSvg}
        <span class="visually-hidden">Menu</span>
      </button>
      <nav class="header__nav" id="header-nav" aria-label="Main">
        <ul class="header__list">${items}</ul>
      </nav>
      ${cta}
    </div>
  `);
}

/**
 * ==================================================================
 * BEHAVIOR
 * ==================================================================
 */

/**
 * Whether the viewport is the desktop nav breakpoint.
 *
 * @returns {boolean}
 */
function isDesktop() {
  return window.matchMedia(DESKTOP_MQ).matches;
}

/**
 * Closes every open mega panel in the header.
 *
 * @param {Element} block Header block
 * @param {Element} [exceptTrigger] Trigger to leave open
 * @returns {void}
 */
function closePanels(block, exceptTrigger) {
  block.querySelectorAll('.header__item--has-menu').forEach((item) => {
    const trigger = item.querySelector(':scope > button.header__link');
    const panel = item.querySelector('.header__panel');
    if (!trigger || !panel || trigger === exceptTrigger) return;
    trigger.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    item.classList.remove('header__item--open');
  });
}

/**
 * Opens or closes one mega panel.
 *
 * @param {Element} block Header block
 * @param {Element} trigger Menu button
 * @param {boolean} [forceOpen] Explicit open/close
 * @returns {void}
 */
function setPanelOpen(block, trigger, forceOpen) {
  const item = trigger.closest('.header__item');
  const panel = item?.querySelector('.header__panel');
  if (!item || !panel) return;
  const open = forceOpen ?? trigger.getAttribute('aria-expanded') !== 'true';
  closePanels(block, open ? trigger : undefined);
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  panel.hidden = !open;
  item.classList.toggle('header__item--open', open);
}

/**
 * Sets the mobile menu button expanded state and accessible name.
 *
 * @param {Element} toggle Menu button
 * @param {boolean} open Whether the drawer is open
 * @returns {void}
 */
function setMenuToggle(toggle, open) {
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  const label = toggle.querySelector('.visually-hidden');
  if (label) label.textContent = open ? 'Close menu' : 'Menu';
}

/**
 * Closes the mobile drawer.
 *
 * @param {Element} block Header block
 * @param {Element} [restoreTo] Element to focus
 * @returns {void}
 */
function closeDrawer(block, restoreTo) {
  const toggle = block.querySelector('.header__toggle');
  if (!toggle) return;
  setMenuToggle(toggle, false);
  block.classList.remove('header--nav-open');
  restoreTo?.focus();
}

/**
 * Desktop: disclosure button. Mobile: static label, panel always shown.
 *
 * @param {Element} item `.header__item--has-menu`
 * @param {boolean} mobile Whether the mobile breakpoint matches
 * @returns {void}
 */
function syncMenuItem(item, mobile) {
  const panel = item.querySelector('.header__panel');
  let trigger = item.querySelector(':scope > .header__link');
  if (!panel || !trigger) return;

  if (mobile) {
    if (trigger.tagName === 'BUTTON') {
      const label = document.createElement('span');
      label.className = 'header__link';
      label.append(...trigger.childNodes);
      trigger.replaceWith(label);
    }
    panel.hidden = false;
    item.classList.remove('header__item--open');
    return;
  }

  if (trigger.tagName !== 'BUTTON') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'header__link';
    button.append(...trigger.childNodes);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panel.id);
    trigger.replaceWith(button);
    trigger = button;
  }
  trigger.setAttribute('aria-expanded', 'false');
  panel.hidden = true;
  item.classList.remove('header__item--open');
}

/**
 * Aligns mega-menu triggers with the current viewport.
 *
 * @param {Element} block Header block
 * @returns {void}
 */
function syncViewport(block) {
  const mobile = !isDesktop();
  block.querySelectorAll('.header__item--has-menu').forEach((item) => {
    syncMenuItem(item, mobile);
  });
}

/**
 * Wires mega-panel and mobile-drawer behavior.
 *
 * @param {Element} block Header block
 * @returns {void}
 */
function bindHeader(block) {
  const toggle = block.querySelector('.header__toggle');
  const nav = block.querySelector('.header__nav');

  headerAborts.get(block)?.abort();
  const abort = new AbortController();
  headerAborts.set(block, abort);
  const { signal } = abort;

  block.addEventListener('click', (event) => {
    const trigger = event.target.closest('.header__item--has-menu > button.header__link');
    if (!trigger || !block.contains(trigger)) return;
    const open = trigger.getAttribute('aria-expanded') !== 'true';
    setPanelOpen(block, trigger, open);
  }, { signal });

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setMenuToggle(toggle, open);
    block.classList.toggle('header--nav-open', open);
    closePanels(block);
  }, { signal });

  document.addEventListener('click', (event) => {
    if (!block.contains(event.target)) {
      closePanels(block);
      if (!isDesktop()) closeDrawer(block);
    }
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openTrigger = block.querySelector('button.header__link[aria-expanded="true"]');
    const drawerOpen = toggle?.getAttribute('aria-expanded') === 'true';
    if (openTrigger) {
      setPanelOpen(block, openTrigger, false);
      openTrigger.focus();
      return;
    }
    if (drawerOpen) closeDrawer(block, toggle);
  }, { signal });

  nav?.addEventListener('click', (event) => {
    if (isDesktop()) return;
    if (event.target.closest('a')) closeDrawer(block);
  }, { signal });

  nav?.addEventListener('focusout', (event) => {
    if (!isDesktop()) return;
    const openItem = block.querySelector('.header__item--open');
    if (!openItem || openItem.contains(event.relatedTarget)) return;
    const trigger = openItem.querySelector(':scope > button.header__link');
    if (trigger) setPanelOpen(block, trigger, false);
  }, { signal });

  const mq = window.matchMedia(DESKTOP_MQ);
  mq.addEventListener('change', () => syncViewport(block), { signal });
  syncViewport(block);
}

/**
 * ==================================================================
 * DECORATE
 * ==================================================================
 */

/**
 * Decorates the header from the nav fragment.
 *
 * @param {Element} block Header block
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  ensureSkipLink(document);

  const iconsPromise = Promise.all([
    loadHeaderIcon('img/logo-desktop.svg', 'header__logo-desktop'),
    loadHeaderIcon('img/logo-mobile.svg', 'header__logo-mobile'),
    loadHeaderIcon('img/menu.svg', 'header__toggle-icon'),
    loadHeaderIcon('img/chevron-down.svg', 'header__chevron'),
  ]);

  const fragment = await loadFragment(getNavPath());
  if (!fragment) return;

  const [logoDesktopSvg, logoMobileSvg, menuSvg, chevronSvg] = await iconsPromise;
  block.replaceChildren(buildHeaderBar(parseNavFragment(fragment), {
    logoDesktopSvg,
    logoMobileSvg,
    menuSvg,
    chevronSvg,
  }));
  bindHeader(block);
}
