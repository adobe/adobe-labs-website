/**
 * Header block. Loads the nav fragment and paints Labs global navigation:
 * brand lockup, primary links, optional mega panels, and a Subscribe CTA.
 * Content path: `nav` metadata, or `/fragments/nav` by default.
 */
import { getMetadata } from '../../scripts/aem.js';
import { escapeAttr, fromHTML, toSafeHttpUrl } from '../../scripts/utils/utils.js';
import { loadFragment } from '../fragment/fragment.js';

const MOBILE_MQ = '(width < 48rem)';
const SKIP_MENU_SELECTOR = '.merch, .gnav-promo, .promo, .gnav-image, .cross-cloud-menu';
const headerAborts = new WeakMap();

/**
 * URL for an asset under this block.
 * @param {string} path Path relative to `blocks/header/`
 * @returns {string}
 */
function getHeaderAsset(path) {
  const base = window.hlx?.codeBasePath || '';
  return `${base}/blocks/header/${path}`;
}

/**
 * Fetches an SVG asset from this block.
 * @param {string} path Path relative to `blocks/header/`
 * @returns {Promise<string>}
 */
async function fetchHeaderSvg(path) {
  try {
    const resp = await fetch(getHeaderAsset(path));
    if (!resp.ok) return '';
    return await resp.text();
  } catch {
    return '';
  }
}

/**
 * Turns fetched SVG markup into an inline icon that inherits `--header-link`.
 * @param {string} markup SVG document
 * @param {string} className Class to add
 * @param {{ label?: string }} [options]
 * @returns {string}
 */
function inlineHeaderSvg(markup, className, options = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = markup.trim();
  const svg = wrap.querySelector('svg');
  if (!svg) return '';
  svg.classList.add(className);
  svg.setAttribute('focusable', 'false');
  if (options.label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', options.label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  return svg.outerHTML;
}

/**
 * Same-origin relative href, or an absolute http(s) URL. Rejects javascript:/data:.
 * @param {string} value Candidate URL
 * @returns {string}
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
 * Same-origin pathname for a candidate href, or empty if it cannot be fetched.
 * @param {string} href Authored href
 * @returns {string}
 */
function sameOriginPathname(href) {
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return '';
    return url.pathname;
  } catch {
    return '';
  }
}

/**
 * Whether `href` is the current page (or an ancestor path).
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
 * Safe http(s) links inside `root`, skipping merch/promo blocks.
 * @param {Element} root Tree to search
 * @returns {Element[]}
 */
function collectLinks(root) {
  return [...root.querySelectorAll('a[href]')].filter((link) => {
    if (link.closest(SKIP_MENU_SELECTOR)) return false;
    return Boolean(toSafeHttpUrl(link.getAttribute('href')));
  });
}

/**
 * Flattens a menu document into heading + link columns.
 * @param {Element} root Fetched menu root
 * @returns {{ heading: string, links: Element[] }[]}
 */
function columnsFromMenuRoot(root) {
  const nodes = [...root.querySelectorAll('h2, h3, h4, h5, h6, a[href]')]
    .filter((node) => !node.closest(SKIP_MENU_SELECTOR));
  const columns = [];
  let current = { heading: '', links: [] };

  const flush = () => {
    if (current.links.length) columns.push(current);
  };

  nodes.forEach((node) => {
    if (/^H[1-6]$/.test(node.tagName)) {
      flush();
      current = { heading: node.textContent.trim(), links: [] };
      return;
    }
    if (node.closest('h1, h2, h3, h4, h5, h6')) return;
    if (!toSafeHttpUrl(node.getAttribute('href'))) return;
    current.links.push(node);
  });
  flush();
  return columns;
}

/**
 * Fetches a same-origin menu document and flattens it into columns.
 * @param {string} href Menu document href
 * @returns {Promise<{ heading: string, links: Element[] }[]>}
 */
async function fetchMenuColumns(href) {
  const pathname = sameOriginPathname(href);
  if (!pathname) return [];
  try {
    const resp = await fetch(`${pathname}.plain.html`);
    if (!resp.ok) return [];
    const wrap = document.createElement('div');
    wrap.innerHTML = await resp.text();
    return columnsFromMenuRoot(wrap);
  } catch {
    return [];
  }
}

/**
 * Nested list columns under a list item.
 * @param {Element} itemEl `li` element
 * @returns {{ heading: string, links: Element[] }[]}
 */
function columnsFromNestedList(itemEl) {
  const nested = itemEl.querySelector(':scope > ul');
  if (!nested) return [];
  const nestedItems = [...nested.children];
  const hasNestedLists = nestedItems.some((child) => child.querySelector(':scope > ul'));
  if (hasNestedLists) {
    return nestedItems.map((child) => {
      const headingLink = child.querySelector(':scope > a, :scope > p > a');
      const links = collectLinks(child).filter((link) => link !== headingLink);
      const nestedLinks = links.length ? links : [];
      if (!nestedLinks.length && headingLink) nestedLinks.push(headingLink);
      return {
        heading: (headingLink || child).textContent.trim(),
        links: nestedLinks,
      };
    }).filter((column) => column.links.length);
  }
  const links = collectLinks(nested);
  return links.length ? [{ heading: '', links }] : [];
}

/**
 * Whether a link is the Subscribe / utility CTA.
 * @param {Element} link Anchor
 * @returns {boolean}
 */
function isCtaLink(link) {
  if (link.classList.contains('button')) return true;
  if (link.closest('.cta, .profile')) return true;
  return link.textContent.trim().toLowerCase() === 'subscribe';
}

/**
 * Whether a link is the brand / home lockup.
 * @param {Element} link Anchor
 * @returns {boolean}
 */
function isBrandLink(link) {
  if (link.querySelector('img, picture')) return true;
  if (link.closest('.adobe-logo, .gnav-brand')) return true;
  const href = link.getAttribute('href') || '';
  try {
    const url = new URL(href, window.location.href);
    return url.pathname === '/' && !link.textContent.trim();
  } catch {
    return false;
  }
}

/**
 * Whether an href points at a static asset rather than a page.
 * @param {string} href
 * @returns {boolean}
 */
function isAssetHref(href) {
  return /\.(svg|png|jpe?g|gif|webp)(\?|$)/i.test(href || '');
}

/**
 * Pushes a leftover `.large-menu` block as one nav item.
 * @param {Element} menu Menu root
 * @param {object[]} items Item list
 * @param {Set<Element>} used Consumed links
 * @param {Set<Element>} seenMenus Already-processed menus
 */
function consumeLargeMenu(menu, items, used, seenMenus) {
  if (seenMenus.has(menu)) return;
  seenMenus.add(menu);
  const heading = menu.querySelector('h2, h3, h4, h5, h6');
  const trigger = heading?.querySelector('a[href]');
  const label = (heading || trigger)?.textContent.trim();
  if (!label) return;
  collectLinks(menu).forEach((link) => used.add(link));
  const nested = columnsFromMenuRoot(menu);
  const triggerHref = trigger?.getAttribute('href') || '';
  let menuSrc = '';
  if (!nested.length && sameOriginPathname(triggerHref)) menuSrc = triggerHref;
  items.push({
    label,
    href: toNavHref(triggerHref),
    columns: nested,
    menuSrc,
  });
}

/**
 * Pushes top-level list items into the nav.
 * @param {Element} list `ul` element
 * @param {object[]} items Item list
 * @param {Set<Element>} used Consumed links
 * @param {Set<Element>} seenLists Already-processed lists
 */
function consumeNavList(list, items, used, seenLists) {
  if (seenLists.has(list) || list.parentElement?.closest('ul') || list.closest('.large-menu')) return;
  seenLists.add(list);
  [...list.children].forEach((itemEl) => {
    const trigger = itemEl.querySelector(':scope > a[href], :scope > p > a[href], :scope > h2 a[href]');
    if (trigger && used.has(trigger)) return;
    const columns = columnsFromNestedList(itemEl);
    if (trigger) {
      used.add(trigger);
      collectLinks(itemEl).forEach((link) => used.add(link));
      items.push({
        label: trigger.textContent.trim(),
        href: toNavHref(trigger.getAttribute('href')),
        columns,
        menuSrc: '',
      });
      return;
    }
    if (columns.length) {
      collectLinks(itemEl).forEach((link) => used.add(link));
      const label = itemEl.childNodes[0]?.textContent?.trim() || columns[0].heading;
      items.push({
        label,
        href: '',
        columns,
        menuSrc: '',
      });
    }
  });
}

/**
 * Pushes a remaining heading/link as a plain nav item.
 * @param {Element} link Anchor
 * @param {object[]} items Item list
 * @param {Set<Element>} used Consumed links
 */
function consumeLeftoverLink(link, items, used) {
  if (used.has(link) || isAssetHref(link.getAttribute('href'))) return;
  if (link.closest('.large-menu')) return;
  used.add(link);
  items.push({
    label: link.textContent.trim(),
    href: toNavHref(link.getAttribute('href')),
    columns: [],
    menuSrc: '',
  });
}

/**
 * Parses the nav fragment into brand, items, and CTA.
 * @param {Element} fragment Loaded fragment root
 * @returns {{
 *   brand: { href: string, image: Element|null, label: string }|null,
 *   items: Array<{
 *     label: string,
 *     href: string,
 *     columns: { heading: string, links: Element[] }[],
 *     menuSrc: string,
 *   }>,
 *   cta: { href: string, label: string }|null,
 * }}
 */
function parseNavFragment(fragment) {
  const used = new Set();
  const seenMenus = new Set();
  const seenLists = new Set();
  const allLinks = collectLinks(fragment);

  const brandLink = allLinks.find((link) => isBrandLink(link) && !isAssetHref(link.getAttribute('href')));
  if (brandLink) used.add(brandLink);
  fragment.querySelectorAll('.adobe-logo a[href], .gnav-brand a[href]').forEach((link) => used.add(link));

  const ctaLink = [...allLinks].reverse().find((link) => !used.has(link) && isCtaLink(link));
  if (ctaLink) used.add(ctaLink);

  const items = [];
  const sections = fragment.children.length ? [...fragment.children] : [fragment];
  sections.forEach((section) => {
    section.querySelectorAll('.large-menu').forEach((menu) => {
      consumeLargeMenu(menu, items, used, seenMenus);
    });
    section.querySelectorAll('ul').forEach((list) => {
      consumeNavList(list, items, used, seenLists);
    });
    collectLinks(section).forEach((link) => consumeLeftoverLink(link, items, used));
  });
  fragment.querySelectorAll('.large-menu').forEach((menu) => {
    consumeLargeMenu(menu, items, used, seenMenus);
  });
  fragment.querySelectorAll('ul').forEach((list) => {
    consumeNavList(list, items, used, seenLists);
  });
  allLinks.forEach((link) => consumeLeftoverLink(link, items, used));

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
    items: items.filter((item) => item.label),
    cta: ctaLink ? {
      href: toNavHref(ctaLink.getAttribute('href')),
      label: ctaLink.textContent.trim() || 'Subscribe',
    } : null,
  };
}

/**
 * Fills empty mega items by fetching leftover `.large-menu` documents.
 * @param {{ label: string, href: string, columns: object[], menuSrc: string }[]} items
 * @returns {Promise<void>}
 */
async function hydrateMenuDocuments(items) {
  await Promise.all(items.map(async (item) => {
    if (!item.menuSrc || item.columns.length) return;
    item.columns = await fetchMenuColumns(item.menuSrc);
    if (!item.columns.length) item.menuSrc = '';
  }));
}

/**
 * Markup for a mega-panel column.
 * @param {{ heading: string, links: Element[] }} column
 * @returns {string}
 */
function columnMarkup(column) {
  const heading = column.heading
    ? `<p class="header__column-heading">${escapeAttr(column.heading)}</p>`
    : '';
  const links = column.links.map((link) => {
    const href = escapeAttr(toNavHref(link.getAttribute('href')));
    const label = escapeAttr(link.textContent.trim());
    const current = pathMatches(link.getAttribute('href')) ? ' aria-current="page"' : '';
    return `<li><a class="header__panel-link" href="${href}"${current}>${label}</a></li>`;
  }).join('');
  return `
    <div class="header__column">
      ${heading}
      <ul class="header__column-list">${links}</ul>
    </div>
  `;
}

/**
 * Markup for one primary nav item.
 * @param {{ label: string, href: string, columns: object[] }} item
 * @param {number} index Item index
 * @returns {string}
 */
function itemMarkup(item, index) {
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
  const columns = item.columns.map(columnMarkup).join('');
  return `
    <li class="header__item header__item--has-menu">
      <button
        type="button"
        class="header__link"
        aria-expanded="false"
        aria-haspopup="true"
        aria-controls="${panelId}"
      >${label}</button>
      <div class="header__panel" id="${panelId}" hidden>
        ${columns}
      </div>
    </li>
  `;
}

/**
 * Whether the viewport is the mobile nav breakpoint.
 * @returns {boolean}
 */
function isMobile() {
  return window.matchMedia(MOBILE_MQ).matches;
}

/**
 * Closes every open mega panel in the header.
 * @param {Element} block Header block
 * @param {Element} [exceptTrigger] Trigger to leave open
 */
function closePanels(block, exceptTrigger) {
  block.querySelectorAll('.header__item--has-menu').forEach((item) => {
    const trigger = item.querySelector(':scope > .header__link');
    const panel = item.querySelector('.header__panel');
    if (!trigger || !panel || trigger === exceptTrigger) return;
    trigger.setAttribute('aria-expanded', 'false');
    if (!isMobile()) panel.hidden = true;
    item.classList.remove('header__item--open');
  });
}

/**
 * Opens or closes one mega panel.
 * @param {Element} block Header block
 * @param {Element} trigger Menu button
 * @param {boolean} [forceOpen] Explicit open/close
 */
function setPanelOpen(block, trigger, forceOpen) {
  const item = trigger.closest('.header__item');
  const panel = item?.querySelector('.header__panel');
  if (!item || !panel) return;
  const open = forceOpen ?? trigger.getAttribute('aria-expanded') !== 'true';
  closePanels(block, open ? trigger : undefined);
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  panel.hidden = isMobile() ? false : !open;
  item.classList.toggle('header__item--open', open);
}

/**
 * Closes the mobile drawer.
 * @param {Element} block Header block
 * @param {Element} [restoreTo] Element to focus
 */
function closeDrawer(block, restoreTo) {
  const toggle = block.querySelector('.header__toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', 'false');
  block.classList.remove('header--nav-open');
  restoreTo?.focus();
}

/**
 * Wires mega-panel and mobile-drawer behavior.
 * @param {Element} block Header block
 */
function bindHeader(block) {
  const toggle = block.querySelector('.header__toggle');
  const nav = block.querySelector('.header__nav');

  block.querySelectorAll('.header__item--has-menu').forEach((item) => {
    const trigger = item.querySelector(':scope > .header__link');
    const panel = item.querySelector('.header__panel');
    if (!trigger || !panel) return;
    trigger.addEventListener('click', () => {
      if (isMobile()) return;
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      setPanelOpen(block, trigger, open);
    });
  });

  if (isMobile()) {
    block.querySelectorAll('.header__panel').forEach((panel) => {
      panel.hidden = false;
    });
  }

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    block.classList.toggle('header--nav-open', open);
    closePanels(block);
  });

  headerAborts.get(block)?.abort();
  const abort = new AbortController();
  headerAborts.set(block, abort);
  const { signal } = abort;

  document.addEventListener('click', (event) => {
    if (!block.contains(event.target)) {
      closePanels(block);
      if (isMobile()) closeDrawer(block);
    }
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openTrigger = block.querySelector('.header__link[aria-expanded="true"]');
    const drawerOpen = toggle?.getAttribute('aria-expanded') === 'true';
    if (openTrigger && openTrigger !== toggle) {
      setPanelOpen(block, openTrigger, false);
      openTrigger.focus();
      return;
    }
    if (drawerOpen) closeDrawer(block, toggle);
  }, { signal });

  nav?.addEventListener('click', (event) => {
    if (!isMobile()) return;
    if (event.target.closest('a')) closeDrawer(block);
  });
}

/**
 * Decorates the header from the nav fragment.
 * @param {Element} block Header block
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const iconsPromise = Promise.all([
    fetchHeaderSvg('img/lockup.svg'),
    fetchHeaderSvg('img/mark.svg'),
    fetchHeaderSvg('img/menu.svg'),
  ]);

  const navMeta = getMetadata('nav');
  let navPath = '/fragments/nav';
  if (navMeta) {
    try {
      navPath = new URL(navMeta, window.location.href).pathname;
    } catch {
      navPath = navMeta;
    }
  }

  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  const data = parseNavFragment(fragment);
  await hydrateMenuDocuments(data.items);

  const [lockupMarkup, markMarkup, menuMarkup] = await iconsPromise;
  const brandLabel = data.brand.label || 'Adobe Labs';
  const lockupSvg = inlineHeaderSvg(lockupMarkup, 'header__lockup', { label: brandLabel });
  const markSvg = inlineHeaderSvg(markMarkup, 'header__mark');
  const menuSvg = inlineHeaderSvg(menuMarkup, 'header__toggle-icon');
  const brandHref = escapeAttr(data.brand.href || '/');
  const authoredImage = data.brand.image;
  let brandMedia = `${lockupSvg}${markSvg}`;
  if (authoredImage) {
    const img = authoredImage.tagName === 'PICTURE'
      ? authoredImage.querySelector('img')
      : authoredImage;
    const src = img?.getAttribute('src');
    const alt = escapeAttr(img?.getAttribute('alt') || brandLabel);
    if (src) {
      brandMedia = `
        <img class="header__lockup" src="${escapeAttr(src)}" alt="${alt}">
        ${markSvg}
      `;
    }
  }

  const items = data.items.map(itemMarkup).join('');
  const cta = data.cta?.href
    ? `<a class="header__cta button" href="${escapeAttr(data.cta.href)}">${escapeAttr(data.cta.label)}</a>`
    : '';

  const bar = fromHTML(`
    <div class="header__bar">
      <a class="header__brand" href="${brandHref}">
        ${brandMedia}
      </a>
      <button type="button" class="header__toggle" aria-expanded="false" aria-controls="header-nav">
        ${menuSvg}
        <span class="visually-hidden">Menu</span>
      </button>
      <nav class="header__nav" id="header-nav" aria-label="Main">
        <ul class="header__list">${items}</ul>
      </nav>
      ${cta}
    </div>
  `);

  block.replaceChildren(bar);
  bindHeader(block);
}
