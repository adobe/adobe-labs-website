import { buildBlock, getMetadata } from '../aem.js';
import {
  buildArticlePreFooter,
  buildPlayIcon,
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
