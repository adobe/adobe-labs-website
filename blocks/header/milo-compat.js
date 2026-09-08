/**
 * Shims for Milo APIs used by the copied global-navigation sources.
 * Keep this module Labs-owned and linted; do not import Milo libs/utils.
 */
import {
  getMetadata as getAemMetadata,
  loadBlock,
  loadCSS,
  loadScript as loadAemScript,
} from '../../scripts/aem.js';

const PLACEHOLDER_FALLBACKS = {
  search: 'Search',
  menu: 'Menu',
  'sign-in': 'Sign in',
  overview: 'Overview',
  'something-went-wrong': 'Something went wrong',
  'unexpected-error': 'An unexpected error occurred',
  'please-try-again': 'Please try again',
};

const config = {
  codeRoot: '',
  miloLibs: undefined,
  theme: 'light',
  locale: { ietf: 'en-US', prefix: '', contentRoot: '' },
  env: { name: 'prod' },
  unav: undefined,
  mep: undefined,
  signInContext: {},
  imsClientId: '',
  miniGnav: false,
  showPlansCta: false,
  searchEnabled: 'off',
};

function refreshCodeRoot() {
  const base = window.hlx?.codeBasePath || '';
  config.codeRoot = `${base}/blocks/header/gnav`;
}

/**
 * Minimal Milo getConfig used by global navigation.
 * @returns {object}
 */
export function getConfig() {
  refreshCodeRoot();
  return config;
}

/**
 * @param {string} name
 * @param {Document} [doc]
 * @returns {string}
 */
export function getMetadata(name, doc = document) {
  return getAemMetadata(name, doc);
}

/**
 * Nav fragment path. Prefers `nav` metadata; defaults to /fragments/nav.
 * @returns {Promise<string>}
 */
export async function getGnavSource() {
  const navMeta = getMetadata('nav');
  if (!navMeta) return '/fragments/nav';
  try {
    return new URL(navMeta, window.location.href).pathname;
  } catch {
    return navMeta;
  }
}

/**
 * Milo loadStyle(href, callback) wrapper around EDS loadCSS.
 * @param {string} href
 * @param {Function} [callback]
 */
export function loadStyle(href, callback) {
  loadCSS(href)
    .then(() => callback?.())
    .catch(() => callback?.('error'));
}

/**
 * @param {string} [message]
 */
export function loadLana() {
  if (window.lana?.log) return;
  window.lana = {
    log: () => {},
  };
}

/**
 * IMS is out of scope for the initial migration.
 * @returns {Promise<never>}
 */
export function loadIms() {
  return Promise.reject(new Error('IMS disabled'));
}

/**
 * @param {string} url
 * @returns {Promise<void>}
 */
export function loadScript(url) {
  return loadAemScript(url);
}

/** Temporary origin for mega-menu docs and media until they are copied into Labs DA. */
export const FEDERAL_ORIGIN = 'https://main--federal--adobecom.aem.live';

/**
 * @param {string} url
 * @returns {string}
 */
export function getFederatedUrl(url) {
  return url || '';
}

/**
 * @returns {string}
 */
export function getFederatedContentRoot() {
  return FEDERAL_ORIGIN;
}

/**
 * @returns {object}
 */
export function getFedsPlaceholderConfig() {
  return getConfig();
}

/**
 * @returns {false}
 */
export function shouldBlockFreeTrialLinks() {
  return false;
}

/**
 * @returns {false}
 */
export function lingoActive() {
  return false;
}

/**
 * @returns {Promise<null>}
 */
export async function getLingoRegion() {
  return null;
}

/**
 * @returns {boolean}
 */
export function isLocalNav() {
  const header = document.querySelector('header');
  return header?.classList.contains('local-nav')
    || !!header?.querySelector('.local-nav');
}

/**
 * Product-card icons are authored as `https://…svg | Alt text` links.
 * Convert those to images so mega-menu icons render without a product-card block.
 * @param {Element} root
 */
function decorateSvgIconLinks(root) {
  root.querySelectorAll('a[href*=".svg"]').forEach((anchor) => {
    const text = (anchor.textContent || '').trim();
    if (!text.includes('|')) return;
    const alt = text.split('|').slice(1).join('|').trim();
    const img = document.createElement('img');
    img.src = anchor.getAttribute('href') || '';
    img.alt = alt;
    anchor.replaceWith(img);
  });
}

/**
 * @param {Element} root
 * @returns {Promise<Element>}
 */
export async function decorateLinksAsync(root) {
  if (root) decorateSvgIconLinks(root);
  return root;
}

/**
 * @param {string} href
 * @returns {Promise<string>}
 */
export async function localizeLinkAsync(href) {
  return href;
}

/**
 * @param {string} [str]
 * @returns {string}
 */
export function processTrackingLabels(str) {
  return typeof str === 'string' ? str : '';
}

/**
 * @param {string} tag
 * @param {object} [attributes]
 * @param {string|Node} [html]
 * @param {{ parent?: Element }} [options]
 * @returns {Element}
 */
export function createTag(tag, attributes, html, options = {}) {
  const el = document.createElement(tag);
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      el.setAttribute(key, value);
    });
  }
  if (html instanceof Node) {
    el.append(html);
  } else if (html) {
    el.insertAdjacentHTML('beforeend', html);
  }
  options.parent?.append(el);
  return el;
}

/**
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function placeholderValue(key) {
  return PLACEHOLDER_FALLBACKS[key] || key;
}

/**
 * @param {string} key
 * @returns {Promise<string>}
 */
export async function replaceKey(key) {
  return placeholderValue(key);
}

/**
 * @param {string[]} keys
 * @returns {Promise<string[]>}
 */
export async function replaceKeyArray(keys) {
  return Promise.all(keys.map((key) => replaceKey(key)));
}

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function replaceText(text) {
  return text;
}

/**
 * @returns {Promise<object>}
 */
export async function fetchPlaceholders() {
  return {};
}

export const PERSONALIZATION_TAGS = {
  safari: () => false,
};
export const FLAGS = { includeGnav: 'includeGnav' };

/**
 * @returns {Promise<void>}
 */
export async function handleCommands() {
  // no-op: Labs does not run Milo personalization commands
}

/**
 * @returns {{ country: string }}
 */
export function getMiloLocaleSettings() {
  return { country: 'US' };
}

/**
 * @returns {boolean}
 */
export function isMasGeoDetectionEnabled() {
  return false;
}

/**
 * Identity merch decorate — merch is out of scope.
 * @param {Element} elem
 * @returns {Promise<Element>}
 */
export default async function merch(elem) {
  return elem;
}

export {
  loadBlock,
};
