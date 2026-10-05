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

beforeEach(() => {
  clearPage();
});

describe('addStructuredData', () => {
  it('emits Organization only on a generic page', () => {
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
    ]);
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
    expect(article.url).toBe(url);
    expect(article.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': url });
    expect(article.author).toEqual({ '@id': person['@id'] });
    expect(article.publisher).toEqual({ '@id': ORG_ID });
    expect(article.inLanguage).toBe('en');
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

  it('omits description, image, and date when those meta values are missing', () => {
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
    expect(article.headline).toBe('Article title');
  });

  it('emits no script when robots contains noindex', () => {
    addMeta('name', 'robots', 'noindex, nofollow');
    addStructuredData();

    expect(jsonLdScripts()).toHaveLength(0);
  });

  it('does not add a second script on a second call', () => {
    addStructuredData();
    const first = jsonLdScripts()[0].textContent;
    addStructuredData();

    expect(jsonLdScripts()).toHaveLength(1);
    expect(jsonLdScripts()[0].textContent).toBe(first);
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
