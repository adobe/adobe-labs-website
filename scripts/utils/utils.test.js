import { buildBlock, getMetadata } from '../aem.js';
import { buildArticlePreFooter, isArticleDetailPage } from './utils.js';

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

function setPath(pathname) {
  window.history.pushState({}, '', pathname);
}

describe('isArticleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    buildBlock.mockImplementation(mockBuildBlock);
  });

  it.each([
    ['/research/example-article-1'],
    ['/research/example-article-1/'],
    ['/workflows/example-workflow-article'],
    ['/sneaks/example-sneaks-article'],
    ['/playground/example-playground-article'],
  ])('returns true for article path %s', (pathname) => {
    expect(isArticleDetailPage(pathname)).toBe(true);
  });

  it.each([
    ['/'],
    ['/research'],
    ['/research/'],
    ['/workflows'],
    ['/sneaks'],
    ['/playground'],
    ['/research/future-of-creative-work/nested'],
    ['/about'],
  ])('returns false for non-article path %s', (pathname) => {
    expect(isArticleDetailPage(pathname)).toBe(false);
  });

  it('returns true when template metadata includes article', () => {
    getMetadata.mockReturnValue('article');
    expect(isArticleDetailPage('/')).toBe(true);
  });

  it('returns true when template metadata lists article among others', () => {
    getMetadata.mockReturnValue('Dark, Article');
    expect(isArticleDetailPage('/')).toBe(true);
  });
});

describe('buildArticlePreFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    buildBlock.mockImplementation(mockBuildBlock);
    document.body.innerHTML = '';
    setPath('/');
  });

  it('does not inject when main is detached from the document', () => {
    setPath('/research/example-article-1');
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
    setPath('/research/example-article-1');
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
    setPath('/research/example-article-1');
    getMetadata.mockImplementation((name) => (
      name === 'article-pre-footer' ? '/fragments/custom-pre-footer' : ''
    ));
    const main = document.createElement('main');
    document.body.append(main);

    buildArticlePreFooter(main);

    expect(main.querySelector('a[href="/fragments/custom-pre-footer"]')).not.toBeNull();
  });
});
