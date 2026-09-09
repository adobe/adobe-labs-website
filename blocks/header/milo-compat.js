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

/**
 * English fallbacks for Milo placeholder keys used by the copied gnav.
 * @type {Object<string, string>}
 */
const PLACEHOLDER_FALLBACKS = {
  search: 'Search',
  menu: 'Menu',
  'sign-in': 'Sign in',
  overview: 'Overview',
  'something-went-wrong': 'Something went wrong',
  'unexpected-error': 'An unexpected error occurred',
  'please-try-again': 'Please try again',
};

/**
 * Minimal Milo `getConfig()` object. IMS, Universal Nav, merch, and dark theme are off.
 * @type {object}
 */
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

/**
 * Points Milo `codeRoot` at the copied gnav folder under this block.
 */
function refreshCodeRoot() {
  const base = window.hlx?.codeBasePath || '';
  config.codeRoot = `${base}/blocks/header/gnav`;
}

/**
 * Minimal Milo getConfig used by global navigation.
 * @returns {object} Labs shim of Milo's runtime config
 */
export function getConfig() {
  refreshCodeRoot();
  return config;
}

/**
 * Reads a page metadata value via EDS `getMetadata`.
 * @param {string} name Metadata name (for example `nav`)
 * @param {Document} [doc] Document to read from
 * @returns {string}
 */
export function getMetadata(name, doc = document) {
  return getAemMetadata(name, doc);
}

/**
 * Nav fragment path. Prefers `nav` metadata; defaults to `/fragments/nav`.
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
 * @param {string} href Stylesheet URL
 * @param {Function} [callback] Called with no args on success, `'error'` on failure
 */
export function loadStyle(href, callback) {
  loadCSS(href)
    .then(() => callback?.())
    .catch(() => callback?.('error'));
}

/**
 * Installs a no-op `window.lana` logger when Milo logging is not present.
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
 * Loads a script via EDS `loadScript`.
 * @param {string} url Script URL
 * @returns {Promise<void>}
 */
export function loadScript(url) {
  return loadAemScript(url);
}

/**
 * Temporary origin for mega-menu docs and media until they are copied into Labs DA.
 * @type {string}
 */
export const FEDERAL_ORIGIN = 'https://main--federal--adobecom.aem.live';

/**
 * Pass-through for Milo federated URL rewriting. Labs fetches same-origin only.
 * @param {string} url Source URL
 * @returns {string}
 */
export function getFederatedUrl(url) {
  return url || '';
}

/**
 * Origin used when rewriting federal media paths.
 * @returns {string}
 */
export function getFederatedContentRoot() {
  return FEDERAL_ORIGIN;
}

/**
 * Placeholder config object consumed by Milo gnav copy.
 * @returns {object}
 */
export function getFedsPlaceholderConfig() {
  return getConfig();
}

/**
 * Free-trial link gating is unused on Labs.
 * @returns {false}
 */
export function shouldBlockFreeTrialLinks() {
  return false;
}

/**
 * Lingo (geo language) is unused on Labs.
 * @returns {false}
 */
export function lingoActive() {
  return false;
}

/**
 * Lingo region lookup is unused on Labs.
 * @returns {Promise<null>}
 */
export async function getLingoRegion() {
  return null;
}

/**
 * Whether the current header is in Milo local-nav mode.
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
 * @param {Element} root Root whose descendant SVG links should be converted
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
 * Decorates links in a fragment the way Milo `decorateLinksAsync` would.
 * @param {Element} root Fragment root
 * @returns {Promise<Element>}
 */
export async function decorateLinksAsync(root) {
  if (root) decorateSvgIconLinks(root);
  return root;
}

/**
 * Locale-aware link rewriting is unused on Labs.
 * @param {string} href Link href
 * @returns {Promise<string>}
 */
export async function localizeLinkAsync(href) {
  return href;
}

/**
 * Analytics label processing is unused on Labs; returns the string as-is.
 * @param {string} [str] Raw label
 * @returns {string}
 */
export function processTrackingLabels(str) {
  return typeof str === 'string' ? str : '';
}

/**
 * Creates a DOM element with optional attributes, children, and parent.
 * @param {string} tag Tag name
 * @param {object} [attributes] Attribute map
 * @param {string|Node} [html] Child HTML string or node
 * @param {{ parent?: Element }} [options] Optional parent to append to
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
 * Returns a debounced function.
 * @param {Function} fn Function to debounce
 * @param {number} delay Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Resolves a Milo placeholder key to English fallback copy.
 * @param {string} key Placeholder key
 * @returns {string}
 */
function placeholderValue(key) {
  return PLACEHOLDER_FALLBACKS[key] || key;
}

/**
 * Looks up a single placeholder string.
 * @param {string} key Placeholder key
 * @returns {Promise<string>}
 */
export async function replaceKey(key) {
  return placeholderValue(key);
}

/**
 * Looks up several placeholder strings.
 * @param {string[]} keys Placeholder keys
 * @returns {Promise<string[]>}
 */
export async function replaceKeyArray(keys) {
  return Promise.all(keys.map((key) => replaceKey(key)));
}

/**
 * Placeholder token replacement is unused on Labs.
 * @param {string} text Source text
 * @returns {Promise<string>}
 */
export async function replaceText(text) {
  return text;
}

/**
 * Placeholder dictionary fetch is unused on Labs.
 * @returns {Promise<object>}
 */
export async function fetchPlaceholders() {
  return {};
}

/**
 * Milo personalization tag predicates. Labs always returns false.
 * @type {{ safari: function(): boolean }}
 */
export const PERSONALIZATION_TAGS = {
  safari: () => false,
};

/**
 * Milo personalization flag names used by the copied gnav.
 * @type {{ includeGnav: string }}
 */
export const FLAGS = { includeGnav: 'includeGnav' };

/**
 * Milo personalization command runner. No-op on Labs.
 * @returns {Promise<void>}
 */
export async function handleCommands() {
  // no-op: Labs does not run Milo personalization commands
}

/**
 * Locale settings consumed by unused merch / geo helpers.
 * @returns {{ country: string }}
 */
export function getMiloLocaleSettings() {
  return { country: 'US' };
}

/**
 * MAS geo detection is unused on Labs.
 * @returns {boolean}
 */
export function isMasGeoDetectionEnabled() {
  return false;
}

/**
 * Identity merch decorate — merch is out of scope.
 * @param {Element} elem Element Milo would turn into a merch CTA
 * @returns {Promise<Element>}
 */
export default async function merch(elem) {
  return elem;
}

export {
  loadBlock,
};
