import { buildBlock, getMetadata } from '../aem.js';
import {
  buildArticleAuthorMeta,
  buildArticlePreFooter,
  buildAuthorByline,
  buildPlayIcon,
  ensureSkipLink,
  decorateArticleSections,
  formatCardDate,
  getAuthoredCells,
  getSection,
  getSectionFromPath,
  isArticleDetailPage,
  isAuthoredVideo,
} from './utils.js';

jest.mock('../aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
  getMetadata: jest.fn(() => ''),
  buildBlock: jest.fn(),
}));

function mockBuildBlock(blockName, content) {
  const block = document.createElement('div');
  block.className = blockName;
  const table = Array.isArray(content) ? content : [[content]];
  table.forEach((row) => {
    const rowEl = document.createElement('div');
    row.forEach((col) => {
      const colEl = document.createElement('div');
      const vals = col.elems ? col.elems : [col];
      vals.forEach((val) => {
        if (typeof val === 'string') {
          colEl.textContent += val;
        } else if (val) {
          colEl.append(val);
        }
      });
      rowEl.append(colEl);
    });
    block.append(rowEl);
  });
  return block;
}

function createKeyValueBlock(fields) {
  const block = document.createElement('div');
  Object.entries(fields).forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  return block;
}

function mockTemplate(template, extra = {}) {
  getMetadata.mockImplementation((name) => {
    if (name === 'template') return template;
    return extra[name] || '';
  });
}

describe('getSection', () => {
  it('resolves a slug or authored name to label and path', () => {
    expect(getSection('Research')).toEqual({
      slug: 'research',
      label: 'Research',
      path: '/research/',
    });
    expect(getSection('workflows')).toEqual({
      slug: 'workflows',
      label: 'Workflows',
      path: '/workflows/',
    });
  });

  it('returns null for unknown names', () => {
    expect(getSection('')).toBeNull();
    expect(getSection('policy')).toBeNull();
  });
});

describe('getSectionFromPath', () => {
  it('uses the first path segment', () => {
    expect(getSectionFromPath('/sneaks/clip')).toEqual({
      slug: 'sneaks',
      label: 'Sneaks',
      path: '/sneaks/',
    });
  });

  it('returns null for unknown folders', () => {
    expect(getSectionFromPath('/policy/terms')).toBeNull();
  });
});

describe('formatCardDate', () => {
  const now = new Date(2026, 7, 25);

  it('formats a current-year date as Month Day', () => {
    expect(formatCardDate('2026-10-21', now)).toBe('Oct 21');
  });

  it('includes the year when the date is not this year', () => {
    expect(formatCardDate('2027-10-21', now)).toBe('Oct 21, 2027');
  });

  it('includes the year for past years', () => {
    expect(formatCardDate('2025-10-21', now)).toBe('Oct 21, 2025');
  });

  it('parses authored month-name dates', () => {
    expect(formatCardDate('August 3, 2026', now)).toBe('Aug 3');
  });

  it('returns an empty string for invalid dates', () => {
    expect(formatCardDate('not a date', now)).toBe('');
    expect(formatCardDate('', now)).toBe('');
  });
});

describe('buildPlayIcon', () => {
  it('returns a hidden label and a play-icon with an inner svg', () => {
    const { label, icon } = buildPlayIcon();

    expect(label).toHaveClass('visually-hidden');
    expect(label).toHaveTextContent('Video article');
    expect(icon).toHaveClass('play-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon.querySelector('svg')).toBeTruthy();
    expect(label).not.toBe(icon);
  });
});

describe('isAuthoredVideo', () => {
  it.each([
    ['Is Video', 'true'],
    ['Show Video Icon', 'yes'],
    ['is-video', '1'],
  ])('is true when %s is %s', (label, value) => {
    const cells = getAuthoredCells(createKeyValueBlock({ [label]: value }));
    expect(isAuthoredVideo(cells)).toBe(true);
  });

  it('is false when the flag is not true', () => {
    const cells = getAuthoredCells(createKeyValueBlock({ 'Is Video': 'false' }));
    expect(isAuthoredVideo(cells)).toBe(false);
  });
});

describe('isArticleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    buildBlock.mockImplementation(mockBuildBlock);
  });

  it('returns false when template metadata is empty', () => {
    expect(isArticleDetailPage()).toBe(false);
  });

  it('returns false when template metadata is unrelated', () => {
    getMetadata.mockReturnValue('home');
    expect(isArticleDetailPage()).toBe(false);
  });

  it('returns true when template metadata includes article', () => {
    getMetadata.mockReturnValue('article');
    expect(isArticleDetailPage()).toBe(true);
  });

  it('returns true when template metadata lists article among others', () => {
    getMetadata.mockReturnValue('Dark, Article');
    expect(isArticleDetailPage()).toBe(true);
  });
});

describe('buildArticlePreFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    buildBlock.mockImplementation(mockBuildBlock);
    document.body.innerHTML = '';
  });

  it('does not inject when main is detached from the document', () => {
    mockTemplate('article');
    const main = document.createElement('main');

    buildArticlePreFooter(main);

    expect(main.querySelector('.fragment')).toBeNull();
    expect(buildBlock).not.toHaveBeenCalled();
  });

  it('does not inject on non-article pages', () => {
    const main = document.createElement('main');
    document.body.append(main);

    buildArticlePreFooter(main);

    expect(main.querySelector('.fragment')).toBeNull();
    expect(buildBlock).not.toHaveBeenCalled();
  });

  it('appends a fragment block for the default article pre-footer path', () => {
    mockTemplate('article');
    const main = document.createElement('main');
    document.body.append(main);

    buildArticlePreFooter(main);

    expect(buildBlock).toHaveBeenCalledWith(
      'fragment',
      expect.objectContaining({
        elems: [expect.any(HTMLAnchorElement)],
      }),
    );
    const link = main.querySelector('a[href="/fragments/article-pre-footer"]');
    expect(link).not.toBeNull();
    expect(link).toHaveTextContent('/fragments/article-pre-footer');
    expect(link).not.toBeVisible();
    expect(main.querySelector(':scope > div > .fragment')).not.toBeNull();
  });

  it('uses article-pre-footer metadata when present', () => {
    mockTemplate('article', { 'article-pre-footer': '/fragments/custom-pre-footer' });
    const main = document.createElement('main');
    document.body.append(main);

    buildArticlePreFooter(main);

    expect(main.querySelector('a[href="/fragments/custom-pre-footer"]')).not.toBeNull();
  });
});

describe('ensureSkipLink', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('prepends a skip link to the site header and names main', () => {
    document.body.innerHTML = '<header></header><main></main>';

    ensureSkipLink(document);

    const skip = document.querySelector('.header__skip');
    expect(skip).toHaveTextContent('Skip to main content');
    expect(skip).toHaveAttribute('href', '#main');
    expect(document.querySelector('header').firstElementChild).toBe(skip);
    expect(document.querySelector('main')).toHaveAttribute('id', 'main');
    expect(document.querySelector('main')).toHaveAttribute('tabindex', '-1');
  });

  it('does not add a second skip link', () => {
    document.body.innerHTML = '<header></header><main id="main"></main>';

    ensureSkipLink(document);
    ensureSkipLink(document);

    expect(document.querySelectorAll('.header__skip')).toHaveLength(1);
  });
});

function createSection({ hero = false } = {}) {
  const section = document.createElement('div');
  section.className = 'section';
  if (hero) {
    const block = document.createElement('div');
    block.className = 'hero';
    section.append(block);
  }
  return section;
}

describe('decorateArticleSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    document.body.innerHTML = '';
  });

  it('does not add the class on non-article pages', () => {
    const main = document.createElement('main');
    main.append(createSection(), createSection());

    decorateArticleSections(main);

    expect(main.querySelector('.section-rounded-default')).toBeNull();
  });

  it('skips the hero and adds the class to other article sections', () => {
    mockTemplate('article');
    const hero = createSection({ hero: true });
    const body = createSection();
    const preFooter = createSection();
    const main = document.createElement('main');
    main.append(hero, body, preFooter);
    document.body.append(main);

    decorateArticleSections(main);

    expect(hero).not.toHaveClass('section-rounded-default');
    expect(body).toHaveClass('section-rounded-default');
    expect(preFooter).toHaveClass('section-rounded-default');
  });

  it('adds the class to every section when there is no hero', () => {
    mockTemplate('article');
    const first = createSection();
    const second = createSection();
    const main = document.createElement('main');
    main.append(first, second);
    document.body.append(main);

    decorateArticleSections(main);

    expect(first).toHaveClass('section-rounded-default');
    expect(second).toHaveClass('section-rounded-default');
  });

  it('adds the class to all sections of a detached fragment main', () => {
    mockTemplate('article');
    const first = createSection();
    const second = createSection();
    const main = document.createElement('main');
    main.append(first, second);

    decorateArticleSections(main);

    expect(first).toHaveClass('section-rounded-default');
    expect(second).toHaveClass('section-rounded-default');
  });
});

describe('buildAuthorByline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
  });

  it('falls back to Adobe Labs when there is no author metadata', () => {
    const byline = buildAuthorByline();

    expect(byline).toHaveClass('article-meta__authors');
    expect(byline.querySelector('.article-meta__authors-label')).toHaveTextContent('Words by:');
    const names = [...byline.querySelectorAll('.article-meta__author-name')].map((el) => el.textContent);
    expect(names).toEqual(['Adobe Labs']);
  });

  it('reads one author per name from comma-separated metadata', () => {
    getMetadata.mockReturnValue('Randy Oest, Josh Winn');

    const byline = buildAuthorByline();

    const names = [...byline.querySelectorAll('.article-meta__author-name')].map((el) => el.textContent);
    expect(names).toEqual(['Randy Oest', 'Josh Winn']);
    expect(byline.querySelectorAll('.article-meta__author')).toHaveLength(2);
  });

  it('requests each author image by slugified name and hides it until it loads', () => {
    getMetadata.mockReturnValue('Randy Oest');

    const byline = buildAuthorByline();

    const img = byline.querySelector('.article-meta__author-image');
    expect(img).toHaveAttribute('src', '/icons/authors/randy-oest.png');
    expect(img).toHaveAttribute('alt', '');
    expect(img.hidden).toBe(true);
  });

  it('reveals the image on load and removes it on error', () => {
    getMetadata.mockReturnValue('Randy Oest');
    const byline = buildAuthorByline();
    const img = byline.querySelector('.article-meta__author-image');
    const item = img.closest('.article-meta__author');

    img.dispatchEvent(new Event('load'));
    expect(img.hidden).toBe(false);

    img.dispatchEvent(new Event('error'));
    expect(item.querySelector('.article-meta__author-image')).toBeNull();
    expect(item.querySelector('.article-meta__author-name')).toHaveTextContent('Randy Oest');
  });

  it('does not render authors as links', () => {
    getMetadata.mockReturnValue('Randy Oest');

    const byline = buildAuthorByline();

    expect(byline.querySelector('a')).toBeNull();
  });

  it('returns a new element on every call', () => {
    expect(buildAuthorByline()).not.toBe(buildAuthorByline());
  });
});

describe('buildArticleAuthorMeta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    document.body.innerHTML = '';
  });

  it('does not inject when main is detached from the document', () => {
    mockTemplate('article');
    const main = document.createElement('main');
    main.append(createSection());

    buildArticleAuthorMeta(main);

    expect(main.querySelector('.article-meta')).toBeNull();
  });

  it('does not inject on non-article pages', () => {
    const main = document.createElement('main');
    main.append(createSection());
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(main.querySelector('.article-meta')).toBeNull();
  });

  it('prepends the top meta and appends the bottom meta to the non-hero sections', () => {
    mockTemplate('article');
    const hero = createSection({ hero: true });
    const body = createSection();
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Body copy';
    body.append(paragraph);
    const preFooter = createSection();
    const main = document.createElement('main');
    main.append(hero, body, preFooter);
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(hero.querySelector('.article-meta')).toBeNull();
    expect(body.firstElementChild).toHaveClass('article-meta');
    expect(preFooter.lastElementChild).toHaveClass('article-meta');
    expect(body.querySelector('.article-meta').contains(body.firstElementChild)).toBe(true);
  });

  it('places both the top and bottom meta in the only section when there is no hero', () => {
    mockTemplate('article');
    const only = createSection();
    const main = document.createElement('main');
    main.append(only);
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(only.firstElementChild).toHaveClass('article-meta');
    expect(only.lastElementChild).toHaveClass('article-meta');
    expect(only.querySelectorAll('.article-meta')).toHaveLength(2);
  });

  it('inserts the top meta right after the hero when authors skip the section break after it', () => {
    mockTemplate('article');
    const section = document.createElement('div');
    section.className = 'section';
    const hero = document.createElement('div');
    hero.className = 'hero';
    const leadIn = document.createElement('div');
    leadIn.className = 'lead-in';
    leadIn.textContent = 'Lead in text';
    section.append(hero, leadIn);
    const main = document.createElement('main');
    main.append(section);
    document.body.append(main);

    buildArticleAuthorMeta(main);

    expect(hero.nextElementSibling).toHaveClass('article-meta');
    expect(section.lastElementChild).toHaveClass('article-meta');
    expect(section.querySelectorAll('.article-meta')).toHaveLength(2);
  });
});
