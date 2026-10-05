/**
 * Schema.org JSON-LD from published meta tags.
 */
import { getMetadata, toClassName } from '../aem.js';
import { getShareUrl, isArticleDetailPage, parseCardDate } from './utils.js';

const SITE_ORIGIN = 'https://labs.adobe.com';
const ORG_ID = `${SITE_ORIGIN}/#organization`;
const PRODUCTION_HOSTS = new Set(['labs.adobe.com', 'www.labs.adobe.com']);

/**
 * Hostname without a trailing dot, lowercased.
 * @param {string} hostname
 * @returns {string}
 */
function normalizeHostname(hostname) {
  return String(hostname || '').toLowerCase().replace(/\.$/, '');
}

/**
 * Absolute http(s) image URL.
 * @param {string} value
 * @param {string} baseHref
 * @returns {string}
 */
function toAbsoluteImage(value, baseHref) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let url;
  try {
    url = new URL(raw, baseHref);
  } catch {
    return '';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  const authoredAbsolute = /^https?:\/\//i.test(raw) || raw.startsWith('//');
  if (!authoredAbsolute && !PRODUCTION_HOSTS.has(normalizeHostname(url.hostname))) {
    url.protocol = 'https:';
    url.hostname = 'labs.adobe.com';
    url.port = '';
  }
  return url.href;
}

/**
 * Publication date as YYYY-MM-DD in the local calendar.
 * ISO dates keep their calendar day.
 * @param {string} value
 * @returns {string}
 */
function toIsoDate(value) {
  const date = parseCardDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Set Organization node: Adobe Labs on every indexable page.
 * @returns {object}
 */
function buildOrganization() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Adobe Labs',
    url: `${SITE_ORIGIN}/`,
    parentOrganization: {
      '@type': 'Organization',
      name: 'Adobe',
      url: 'https://www.adobe.com/',
    },
  };
}

/**
 * One Person per authored name. The byline fallback "Adobe Labs" is not a name
 * here: an empty author field yields an empty list.
 * @param {Document} doc
 * @returns {object[]}
 */
function buildPeople(doc) {
  const seen = new Set();
  const people = [];
  getMetadata('author', doc)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .forEach((name) => {
      const slug = toClassName(name);
      if (!slug || seen.has(slug)) return;
      seen.add(slug);
      people.push({
        '@type': 'Person',
        '@id': `${SITE_ORIGIN}/#person-${slug}`,
        name,
      });
    });
  return people;
}

/**
 * Article author: one person id, a list of person ids, or the Organization id.
 * @param {object[]} people
 * @returns {object|object[]}
 */
function authorReference(people) {
  if (!people.length) return { '@id': ORG_ID };
  const refs = people.map((person) => ({ '@id': person['@id'] }));
  return refs.length === 1 ? refs[0] : refs;
}

/**
 * Article plus its Person nodes, or an empty list when this page is not an
 * article or has no headline.
 * @param {Document} doc
 * @returns {object[]}
 */
function buildArticleGraph(doc) {
  if (!isArticleDetailPage()) return [];
  const headline = getMetadata('og:title', doc).trim() || String(doc.title || '').trim();
  if (!headline) return [];

  const url = getShareUrl();
  const people = buildPeople(doc);
  const article = {
    '@type': 'Article',
    headline,
  };

  const description = getMetadata('description', doc).trim();
  if (description) article.description = description;

  const image = toAbsoluteImage(getMetadata('og:image', doc), url);
  if (image) article.image = image;

  const datePublished = toIsoDate(getMetadata('publication-date', doc));
  if (datePublished) article.datePublished = datePublished;

  article.url = url;
  article.mainEntityOfPage = { '@type': 'WebPage', '@id': url };
  article.publisher = { '@id': ORG_ID };
  article.inLanguage = 'en';
  article.author = authorReference(people);

  return [...people, article];
}

/**
 * Appends one application/ld+json script. Does nothing when head already has
 * JSON-LD, or when robots metadata contains noindex.
 * @param {Document} [doc]
 * @returns {void}
 */
// eslint-disable-next-line import/prefer-default-export
export function addStructuredData(doc = document) {
  const { head } = doc;
  if (!head) return;
  if (head.querySelector('script[type="application/ld+json"]')) return;
  if (getMetadata('robots', doc).toLowerCase().includes('noindex')) return;

  const script = doc.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [buildOrganization(), ...buildArticleGraph(doc)],
  });
  head.append(script);
}
