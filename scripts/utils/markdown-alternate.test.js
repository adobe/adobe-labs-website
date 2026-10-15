import { addMarkdownAlternate, markdownAlternatePath } from './utils.js';

function clearPage() {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  window.history.pushState({}, '', '/');
}

/**
 * @param {string} template
 */
function setTemplate(template) {
  const meta = document.createElement('meta');
  meta.name = 'template';
  meta.content = template;
  document.head.append(meta);
}

/**
 * @param {string} href
 */
function setCanonical(href) {
  const link = document.createElement('link');
  link.rel = 'canonical';
  link.href = href;
  document.head.append(link);
}

function markdownLink() {
  return document.head.querySelector('link[rel="alternate"][type="text/markdown"]');
}

beforeEach(() => {
  clearPage();
});

describe('markdownAlternatePath', () => {
  it('appends .md to an extensionless article path', () => {
    expect(markdownAlternatePath('/research/ai-is-redistributing-creative-work'))
      .toBe('/research/ai-is-redistributing-creative-work.md');
  });

  it('maps directory URLs to index.md', () => {
    expect(markdownAlternatePath('/')).toBe('/index.md');
    expect(markdownAlternatePath('/research/')).toBe('/research/index.md');
  });

  it('leaves a markdown path unchanged and skips extension URLs', () => {
    expect(markdownAlternatePath('/research/article.md')).toBe('/research/article.md');
    expect(markdownAlternatePath('/research/article.plain.html')).toBe('');
  });
});

describe('addMarkdownAlternate', () => {
  it('points an article page at its markdown twin', () => {
    setTemplate('article');
    window.history.pushState({}, '', '/research/ai-is-redistributing-creative-work');

    addMarkdownAlternate();

    expect(markdownLink()?.getAttribute('href'))
      .toBe('/research/ai-is-redistributing-creative-work.md');
    expect(markdownLink()?.rel).toBe('alternate');
    expect(markdownLink()?.type).toBe('text/markdown');
  });

  it('leaves the pipeline canonical in place', () => {
    setTemplate('article');
    setCanonical('https://labs.adobe.com/sneaks/example-sneaks-article');
    window.history.pushState({}, '', '/sneaks/example-sneaks-article');

    addMarkdownAlternate();

    const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0].href).toBe('https://labs.adobe.com/sneaks/example-sneaks-article');
    expect(markdownLink()?.getAttribute('href')).toBe('/sneaks/example-sneaks-article.md');
  });

  it('skips the homepage, whose markdown omits the card index', () => {
    window.history.pushState({}, '', '/');

    addMarkdownAlternate();

    expect(markdownLink()).toBeNull();
  });

  it('skips a section index that is not an article template', () => {
    setTemplate('research');
    window.history.pushState({}, '', '/research/');

    addMarkdownAlternate();

    expect(markdownLink()).toBeNull();
  });

  it('does not add a second markdown alternate', () => {
    setTemplate('article');
    window.history.pushState({}, '', '/workflows/example-workflow-article');
    const existing = document.createElement('link');
    existing.rel = 'alternate';
    existing.type = 'text/markdown';
    existing.href = '/workflows/custom.md';
    document.head.append(existing);

    addMarkdownAlternate();
    addMarkdownAlternate();

    const links = document.head.querySelectorAll('link[rel="alternate"][type="text/markdown"]');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/workflows/custom.md');
  });
});
