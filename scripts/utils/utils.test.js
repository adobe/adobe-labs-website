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

function mockTemplate(template, extra = {}) {
  getMetadata.mockImplementation((name) => {
    if (name === 'template') return template;
    return extra[name] || '';
  });
}

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
