import { createOptimizedPicture } from '../../scripts/aem.js';
import { toSafeHttpUrl } from '../../scripts/utils/utils.js';

/**
 * Hover-list block.
 *
 * Two jobs live in this file:
 * 1. **List decorate** (this section): authored table rows become a numbered
 *    list of full-row links. That is the Policy-page contract.
 * 2. **Cursor-following images** (bottom of file): optional, idle-deferred,
 *    and only on fine pointers when the user has not requested reduced motion.
 *    Skip that section unless you are reviewing the hover animation.
 *
 * Public API: `decorate` (default), `attachHoverMedia`, `HOVER_IMAGE_BREAKPOINTS`.
 */

/**
 * Display size is ~180×230 CSS px; one 2× source is enough.
 *
 * @type {{ width: string }[]}
 */
export const HOVER_IMAGE_BREAKPOINTS = [{ width: '400' }];

const FINE_POINTER_MQ = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_MQ = '(prefers-reduced-motion: reduce)';

/** Outlined ↗ from Figma (Adobe Clean Display Black). The webfont lacks this glyph. */
const ARROW_PATH = 'M3.072 13.704L0.552 11.184L8.592 3.144H0L3.144 0'
  + 'L14.208.024V11.16L11.112 14.232V5.664L3.072 13.704Z';

/**
 * Parsed authored row. Images inside the headline link are ignored.
 *
 * @typedef {object} HoverListItem
 * @property {string} href Sanitized http(s) URL
 * @property {string} headline Link text (accessible name of the row)
 * @property {string[]} mediaSrcs Up to two sibling image URLs for hover
 */

/**
 * Whether cursor-following hover images should load and track.
 * Touch-only devices and reduced-motion users never see them.
 *
 * @returns {boolean}
 */
function canUseHoverMedia() {
  return window.matchMedia(FINE_POINTER_MQ).matches
    && !window.matchMedia(REDUCED_MOTION_MQ).matches;
}

/**
 * Builds the decorative external-link SVG. `currentColor` tracks the row
 * text color; the webfont does not include ↗.
 *
 * @returns {SVGSVGElement}
 */
function createArrowIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 15 15');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ARROW_PATH);
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

/**
 * Reads authored rows into item data. Skips rows without a safe href or
 * headline (`javascript:` and other non-http schemes are dropped).
 *
 * @param {Element} block The hover-list block
 * @returns {HoverListItem[]}
 */
function getHoverListItems(block) {
  return [...block.children].flatMap((row) => {
    const link = row.querySelector('a[href]');
    const href = toSafeHttpUrl(link?.href);
    const headline = link?.textContent.trim() || '';
    if (!href || !headline) return [];

    const mediaSrcs = [...row.querySelectorAll('img')]
      .filter((img) => !link.contains(img))
      .map((img) => img.getAttribute('src') || img.src)
      .filter(Boolean)
      .slice(0, 2);

    return [{ href, headline, mediaSrcs }];
  });
}

/**
 * Builds one list row: generated number, headline, decorative arrow.
 * Stashes hover image URLs on `data-hover-images` for the idle media pass.
 *
 * @param {HoverListItem} data Parsed row
 * @param {number} index 0-based; displayed number is `index + 1`
 * @returns {HTMLLIElement}
 */
function buildHoverListItem(data, index) {
  const item = document.createElement('li');
  item.className = 'hover-list__item';

  const link = document.createElement('a');
  link.className = 'hover-list__link';
  link.href = data.href;

  const number = document.createElement('span');
  number.className = 'hover-list__number body-lg';
  number.setAttribute('aria-hidden', 'true');
  number.textContent = String(index + 1);

  const headline = document.createElement('span');
  headline.className = 'hover-list__headline heading-6';
  headline.textContent = data.headline;

  const arrow = document.createElement('span');
  arrow.className = 'hover-list__arrow heading-6';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.append(createArrowIcon());

  link.append(number, headline, arrow);
  item.append(link);

  if (data.mediaSrcs.length) {
    item.dataset.hoverImages = JSON.stringify(data.mediaSrcs);
  }

  return item;
}

/**
 * Decorates a hover-list block: authored rows become a numbered list of
 * full-row links. Hover images load later, off this path.
 *
 * @param {Element} block The hover-list block
 */
export default function decorate(block) {
  const items = getHoverListItems(block);
  const list = document.createElement('ol');
  list.className = 'hover-list__list';
  list.setAttribute('role', 'list');
  items.forEach((item, index) => {
    list.append(buildHoverListItem(item, index));
  });
  block.replaceChildren(list);
  // eslint-disable-next-line no-use-before-define -- idle media pass lives with the follower
  scheduleHoverMedia(block);
}

/* --- Cursor-following images (fine pointer, motion OK only) --- */

const STIFFNESS = 0.34;
const ROTATE_LERP = 0.12;
const INTRO_STEP = 0.045;
const EXIT_STEP = 0.08;
const TARGET_OFFSET = { x: 14, y: -4 };

/**
 * Per-picture spring offsets and follow rates. Front layer (i = 0) rotates
 * the opposite way from the back layer so the pair reads as a stack.
 *
 * @param {number} i Layer index
 * @param {number} n Layer count
 * @returns {{ spawn: { x: number, y: number }, stagger: { x: number, y: number },
 *   follow: number, rot: number, restRotate: number }}
 */
function layerConfig(i, n) {
  const t = n > 1 ? i / (n - 1) : 0;
  const s = 120 - t * 24;
  return {
    spawn: { x: s, y: -s },
    stagger: { x: i * 8, y: i * 6 - 6 },
    follow: 0.32 + t * 0.36,
    rot: 0.03 + t * 0.11,
    restRotate: i === 0 ? -8 : 6,
  };
}

/**
 * Steps one layer toward the cursor (position + rotation).
 *
 * @param {{ config: ReturnType<typeof layerConfig>, x: number, y: number,
 *   rotate: number }} layer
 * @param {number} mx Cursor X
 * @param {number} my Cursor Y
 * @param {number} vx Cursor X velocity
 */
function stepLayer(layer, mx, my, vx) {
  const { config: c } = layer;
  layer.x += (mx + TARGET_OFFSET.x - layer.x) * STIFFNESS * c.follow;
  layer.y += (my + TARGET_OFFSET.y - layer.y) * STIFFNESS * c.follow;
  layer.rotate += ((vx * c.rot + c.restRotate) - layer.rotate) * ROTATE_LERP;
}

/**
 * Writes transform and opacity for one layer from its current state.
 *
 * @param {{ config: ReturnType<typeof layerConfig>, pic: Element, x: number,
 *   y: number, intro: number, exit: number, rotate: number }} layer
 */
function renderLayer(layer) {
  const { config: c, pic } = layer;
  const fade = (1 - layer.exit) ** 1.9;
  const scale = 0.6 + (1 - (1 - layer.intro) ** 2.2) * 0.4; // ease-in 0.6 → 1
  pic.style.transform = `translate3d(${layer.x + c.stagger.x}px, ${layer.y + c.stagger.y}px, 0)`
    + ` translate(-50%, -100%) scale(${scale}) rotate(${layer.rotate}deg)`;
  pic.style.opacity = String(fade);
}

/**
 * Whether the hover media popover (or class fallback) is open.
 *
 * @param {Element} media
 * @returns {boolean}
 */
function isPopoverOpen(media) {
  try {
    return media.matches(':popover-open');
  } catch {
    return media.classList.contains('hover-list__media--open');
  }
}

/**
 * Shows the hover media overlay. Uses the Popover API when available.
 *
 * @param {Element} media
 */
function showMedia(media) {
  if (typeof media.showPopover === 'function') {
    if (!isPopoverOpen(media)) media.showPopover();
  } else {
    media.classList.add('hover-list__media--open');
  }
  media.classList.add('hover-list__media--active');
}

/**
 * Hides the overlay and clears per-picture transforms.
 *
 * @param {Element|null} media
 */
function hideMedia(media) {
  if (!media) return;
  media.classList.remove('hover-list__media--active');
  if (typeof media.hidePopover === 'function') {
    if (isPopoverOpen(media)) media.hidePopover();
  } else {
    media.classList.remove('hover-list__media--open');
  }
  media.querySelectorAll('picture').forEach((pic) => {
    pic.style.transform = '';
    pic.style.opacity = '';
  });
}

/**
 * List item under a viewport point, if it belongs to `list`.
 *
 * @param {Element} list
 * @param {number} x Client X
 * @param {number} y Client Y
 * @returns {Element|null}
 */
function itemFromPoint(list, x, y) {
  const item = document.elementFromPoint(x, y)?.closest('.hover-list__item');
  return item && list.contains(item) ? item : null;
}

/**
 * Cursor-following hover pictures.
 *
 * State machine: at most one `activeItem`. Leaving a row (or entering another)
 * pushes its layers into `exitingGroups` until they fade out. Re-entering a
 * row that is still exiting resumes that group instead of spawning a new one.
 * The rAF loop runs only while something is active or exiting.
 *
 * @param {Element} list The decorated `ol.hover-list__list`
 */
function addCursorFollower(list) {
  const cursor = {
    x: 0,
    y: 0,
    vx: 0,
    hasPrev: false,
  };
  let activeItem = null;
  let activeLayers = [];
  let exitingGroups = [];
  let rafId = null;

  const updateCursor = (e) => {
    cursor.vx = cursor.hasPrev ? e.clientX - cursor.x : 0;
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    cursor.hasPrev = true;
  };

  const tick = () => {
    activeLayers.forEach((layer) => {
      stepLayer(layer, cursor.x, cursor.y, cursor.vx);
      layer.intro = Math.min(layer.intro + INTRO_STEP, 1);
      renderLayer(layer);
    });
    exitingGroups = exitingGroups.filter(({ media, layers }) => {
      let alive = false;
      layers.forEach((layer) => {
        layer.exit = Math.min(layer.exit + EXIT_STEP, 1);
        stepLayer(layer, cursor.x, cursor.y, cursor.vx);
        renderLayer(layer);
        if (layer.exit < 1) alive = true;
      });
      if (!alive) hideMedia(media);
      return alive;
    });
    rafId = (activeLayers.length || exitingGroups.length)
      ? requestAnimationFrame(tick)
      : null;
  };

  const startLoop = () => {
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  const activate = (item) => {
    if (item === activeItem) return;
    if (activeItem) {
      exitingGroups.push({
        media: activeItem.querySelector('.hover-list__media'),
        layers: activeLayers,
      });
    }
    activeItem = null;
    activeLayers = [];
    const media = item.querySelector('.hover-list__media');
    if (!media) return;
    const resumeExit = exitingGroups.find((group) => group.media === media);
    exitingGroups = exitingGroups.filter((group) => group.media !== media);
    activeItem = item;
    if (resumeExit) {
      activeLayers = resumeExit.layers;
      activeLayers.forEach((layer) => {
        layer.exit = 0;
      });
      activeLayers.forEach(renderLayer);
    } else {
      const pics = [...media.querySelectorAll('picture')];
      activeLayers = pics.map((pic, i) => {
        const c = layerConfig(i, pics.length);
        return {
          pic,
          config: c,
          x: cursor.x + c.spawn.x,
          y: cursor.y + c.spawn.y,
          intro: 0,
          exit: 0,
          rotate: c.restRotate,
        };
      });
      activeLayers.forEach(renderLayer);
    }
    showMedia(media);
    startLoop();
  };

  const deactivate = () => {
    if (!activeItem) return;
    exitingGroups.push({
      media: activeItem.querySelector('.hover-list__media'),
      layers: activeLayers,
    });
    activeItem = null;
    activeLayers = [];
    startLoop();
  };

  document.addEventListener('mousemove', updateCursor, { passive: true });
  list.addEventListener('mousemove', (e) => {
    if (!canUseHoverMedia()) return;
    const item = itemFromPoint(list, e.clientX, e.clientY);
    if (item) activate(item);
  });
  list.addEventListener('mouseleave', deactivate);
  window.addEventListener('scroll', () => {
    if (!canUseHoverMedia() || !cursor.hasPrev || !activeItem) return;
    const item = itemFromPoint(list, cursor.x, cursor.y);
    if (item === activeItem) return;
    if (item) activate(item);
    else deactivate();
  }, { passive: true });
}

/**
 * Builds optimized hover pictures into items that have stashed image URLs,
 * then starts the cursor follower once. No-ops on touch-only devices and
 * when the user prefers reduced motion.
 *
 * Exported so tests can run the idle pass synchronously.
 *
 * @param {Element} block The hover-list block
 */
export function attachHoverMedia(block) {
  if (!canUseHoverMedia()) return;

  const pending = [...block.querySelectorAll('.hover-list__item[data-hover-images]')];
  pending.forEach((item) => {
    let srcs = [];
    try {
      srcs = JSON.parse(item.dataset.hoverImages);
    } catch {
      srcs = [];
    }
    item.removeAttribute('data-hover-images');
    if (!Array.isArray(srcs) || !srcs.length) return;

    const media = document.createElement('div');
    media.className = 'hover-list__media';
    media.setAttribute('popover', 'manual');
    media.setAttribute('aria-hidden', 'true');
    srcs.forEach((src) => {
      const picture = createOptimizedPicture(src, '', false, HOVER_IMAGE_BREAKPOINTS);
      picture.querySelectorAll('img').forEach((img) => {
        img.alt = '';
        img.setAttribute('decoding', 'async');
        img.setAttribute('fetchpriority', 'low');
      });
      media.append(picture);
    });
    item.append(media);
  });

  const list = block.querySelector('.hover-list__list');
  if (list && !list.dataset.followerReady && list.querySelector('.hover-list__media')) {
    list.dataset.followerReady = 'true';
    addCursorFollower(list);
  }
}

/**
 * Defers hover-image work until the page is idle so `decorate` stays cheap.
 *
 * @param {Element} block The hover-list block
 * @returns {number|undefined} Idle/timeout handle when work is scheduled
 */
function scheduleHoverMedia(block) {
  if (!canUseHoverMedia()) return undefined;
  const run = () => attachHoverMedia(block);
  if (typeof requestIdleCallback === 'function') {
    return requestIdleCallback(run, { timeout: 2000 });
  }
  return setTimeout(run, 0);
}
