import { addStructuredData } from './utils.js';

const ORG_ID = 'https://labs.adobe.com/#organization';

function clearPage() {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.title = '';
}

/**
 * @param {'name'|'property'} attr
 * @param {string} key
 * @param {string} content
 */
function addMeta(attr, key, content) {
  const meta = document.createElement('meta');
  meta.setAttribute(attr, key);
  meta.content = content;
  document.head.append(meta);
}

/**
 * @param {string} href
 */
function addCanonical(href) {
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.append(link);
}

function jsonLdScripts() {
  return [...document.head.querySelectorAll('script[type="application/ld+json"]')];
}

function readGraph() {
  const [script] = jsonLdScripts();
  const data = JSON.parse(script.textContent);
  return data;
}

function articlePage() {
  addMeta('name', 'template', 'article');
  addMeta('property', 'og:title', 'Article title');
  addMeta('name', 'description', 'Article description');
  addMeta('property', 'og:image', 'https://labs.adobe.com/media/article.png');
  addMeta('name', 'publication-date', '2026-10-05');
  addMeta('name', 'author', 'Jane Doe');
  addCanonical('https://labs.adobe.com/research/article-title#comments');
}

/** 00:30 UTC on 7 Oct 2026. West of UTC, the local calendar day is 6 Oct. */
const MODIFIED_INSTANT = new Date(Date.UTC(2026, 9, 7, 0, 30, 0));
const DATE_MODIFIED = '2026-10-07';
const MODIFIED_TIME = '2026-10-07T00:30:00Z';

/**
 * The article Open Graph modification-time tag, when present.
 * @returns {Element|null}
 */
function modifiedTimeMeta() {
  return document.head.querySelector('meta[property="article:modified_time"]');
}

/**
 * `document.lastModified` is the Last-Modified header in local time:
 * `MM/DD/YYYY hh:mm:ss`.
 * @param {Date} date
 * @returns {string}
 */
function browserLastModified(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Overrides `document.lastModified` for the current page.
 * @param {string} value Browser-formatted local time (`MM/DD/YYYY hh:mm:ss`)
 * @returns {void}
 */
function setLastModified(value) {
  Object.defineProperty(document, 'lastModified', {
    configurable: true,
    get: () => value,
  });
}

beforeEach(() => {
  clearPage();
  setLastModified(browserLastModified(MODIFIED_INSTANT));
});

describe('addStructuredData', () => {
  it('emits Organization and WebPage on a generic page', () => {
    addCanonical('https://labs.adobe.com/policy');
    addStructuredData();

    expect(jsonLdScripts()).toHaveLength(1);
    const data = readGraph();
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@graph']).toEqual([
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'Adobe Labs',
        url: 'https://labs.adobe.com/',
        parentOrganization: {
          '@type': 'Organization',
          name: 'Adobe',
          url: 'https://www.adobe.com/',
        },
      },
      {
        '@type': 'WebPage',
        '@id': 'https://labs.adobe.com/policy',
        url: 'https://labs.adobe.com/policy',
        dateModified: DATE_MODIFIED,
      },
    ]);
    expect(modifiedTimeMeta()).toBeNull();
  });

  it('uses the UTC day of document.lastModified and ignores publication-date', () => {
    addCanonical('https://labs.adobe.com/policy');
    addMeta('name', 'publication-date', '2026-06-01');
    addMeta('name', 'modified-date', '2026-01-01');
    addStructuredData();

    const page = readGraph()['@graph'].find((node) => node['@type'] === 'WebPage');
    expect(page.dateModified).toBe(DATE_MODIFIED);
    expect(page).not.toHaveProperty('datePublished');
  });

  it('omits dateModified when document.lastModified is unparseable', () => {
    addCanonical('https://labs.adobe.com/policy');
    setLastModified('');
    addStructuredData();

    const page = readGraph()['@graph'].find((node) => node['@type'] === 'WebPage');
    expect(page).not.toHaveProperty('dateModified');
    expect(modifiedTimeMeta()).toBeNull();
  });

  it('emits Article and one Person and strips the canonical hash', () => {
    articlePage();
    addStructuredData();

    const { '@graph': graph } = readGraph();
    const person = graph.find((node) => node['@type'] === 'Person');
    const article = graph.find((node) => node['@type'] === 'Article');
    const url = 'https://labs.adobe.com/research/article-title';

    expect(graph.filter((node) => node['@type'] === 'Person')).toHaveLength(1);
    expect(person).toEqual({
      '@type': 'Person',
      '@id': 'https://labs.adobe.com/#person-jane-doe',
      name: 'Jane Doe',
    });
    expect(article.headline).toBe('Article title');
    expect(article.description).toBe('Article description');
    expect(article.image).toBe('https://labs.adobe.com/media/article.png');
    expect(article.datePublished).toBe('2026-10-05');
    expect(article.dateModified).toBe(DATE_MODIFIED);
    expect(article.url).toBe(url);
    expect(article.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': url });
    expect(article.author).toEqual({ '@id': person['@id'] });
    expect(article.publisher).toEqual({ '@id': ORG_ID });
    expect(article.inLanguage).toBe('en');

    const page = graph.find((node) => node['@type'] === 'WebPage');
    expect(page).toMatchObject({
      '@id': url,
      url,
      name: 'Article title',
      dateModified: DATE_MODIFIED,
    });
    expect(modifiedTimeMeta()).toHaveAttribute('content', MODIFIED_TIME);
  });

  it('emits two Person nodes for two author names', () => {
    articlePage();
    document.head.querySelector('meta[name="author"]').content = 'Jane Doe, Alex Kim';
    addStructuredData();

    const { '@graph': graph } = readGraph();
    const people = graph.filter((node) => node['@type'] === 'Person');
    const article = graph.find((node) => node['@type'] === 'Article');

    expect(people.map((person) => person.name)).toEqual(['Jane Doe', 'Alex Kim']);
    expect(article.author).toEqual([
      { '@id': 'https://labs.adobe.com/#person-jane-doe' },
      { '@id': 'https://labs.adobe.com/#person-alex-kim' },
    ]);
  });

  it('points Article author at the Organization when author metadata is empty', () => {
    articlePage();
    document.head.querySelector('meta[name="author"]').remove();
    addStructuredData();

    const { '@graph': graph } = readGraph();
    const article = graph.find((node) => node['@type'] === 'Article');

    expect(graph.some((node) => node['@type'] === 'Person')).toBe(false);
    expect(article.author).toEqual({ '@id': ORG_ID });
  });

  it('omits description, image, and datePublished when those meta values are missing', () => {
    addMeta('name', 'template', 'article');
    addMeta('property', 'og:title', 'Article title');
    addCanonical('https://labs.adobe.com/research/article-title');
    addStructuredData();

    const data = readGraph();
    const article = data['@graph'].find((node) => node['@type'] === 'Article');

    expect(article).toBeDefined();
    expect(article).not.toHaveProperty('description');
    expect(article).not.toHaveProperty('image');
    expect(article).not.toHaveProperty('datePublished');
    expect(article.dateModified).toBe(DATE_MODIFIED);
    expect(article.headline).toBe('Article title');

    const page = data['@graph'].find((node) => node['@type'] === 'WebPage');
    expect(page.dateModified).toBe(DATE_MODIFIED);
  });

  it('emits no script when robots contains noindex', () => {
    addMeta('name', 'template', 'article');
    addMeta('name', 'robots', 'noindex, nofollow');
    addStructuredData();

    expect(jsonLdScripts()).toHaveLength(0);
    expect(modifiedTimeMeta()).toBeNull();
  });

  it('does not add a second script on a second call', () => {
    articlePage();
    addStructuredData();
    const first = jsonLdScripts()[0].textContent;
    addStructuredData();

    expect(jsonLdScripts()).toHaveLength(1);
    expect(jsonLdScripts()[0].textContent).toBe(first);
    expect(document.head.querySelectorAll('meta[property="article:modified_time"]')).toHaveLength(1);
  });

  it('leaves an existing JSON-LD script untouched', () => {
    const existing = document.createElement('script');
    existing.type = 'application/ld+json';
    existing.textContent = '{"kept":true}';
    document.head.append(existing);

    addStructuredData();

    expect(jsonLdScripts()).toHaveLength(1);
    expect(jsonLdScripts()[0]).toBe(existing);
    expect(existing.textContent).toBe('{"kept":true}');
  });

  it('resolves a root-relative image against the production origin on localhost', () => {
    addMeta('name', 'template', 'article');
    addMeta('property', 'og:title', 'Article title');
    addMeta('property', 'og:image', '/media/article.png');
    addStructuredData();

    const article = readGraph()['@graph'].find((node) => node['@type'] === 'Article');
    expect(article.image).toBe('https://labs.adobe.com/media/article.png');
  });
});
