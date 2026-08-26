import { within } from '@testing-library/dom';
import {
  buildBlock,
  createOptimizedPicture,
  decorateBlock,
  loadBlock,
  readBlockConfig,
} from '../../scripts/aem.js';
import dataStore from '../../scripts/utils/dataStore.js';
import decorate from './content-grid.js';

jest.mock('../../scripts/aem.js', () => ({
  readBlockConfig: jest.fn(),
  buildBlock: jest.fn(),
  decorateBlock: jest.fn(),
  loadBlock: jest.fn(),
  createOptimizedPicture: jest.fn(),
}));

jest.mock('../../scripts/utils/dataStore.js', () => ({
  __esModule: true,
  default: {
    getData: jest.fn(),
    commonEndpoints: { queryIndex: '/query-index.json?limit=1000' },
  },
}));

function createBlock(fields) {
  const block = document.createElement('div');
  block.className = 'content-grid four-up';
  Object.entries(fields).forEach(([label, value]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${value}</div>`;
    block.append(row);
  });
  return block;
}

const INDEX = {
  data: [
    {
      path: '/research/newer',
      title: 'Newer research',
      contentType: 'article',
      description: 'Latest',
      image: '/newer.jpg',
      publicationDate: '2026-08-20',
      robots: '',
    },
    {
      path: '/research/older',
      title: 'Older research',
      contentType: 'article',
      description: 'Earlier',
      image: '/older.jpg',
      publicationDate: '2026-01-01',
      robots: '',
    },
    {
      path: '/workflows/clip',
      title: 'Workflow video',
      contentType: 'video',
      description: 'A clip',
      image: '/clip.jpg',
      publicationDate: '2026-07-01',
      robots: '',
    },
    {
      path: '/sneaks/hidden',
      title: 'Noindex sneak',
      contentType: 'article',
      publicationDate: '2026-08-21',
      robots: 'noindex, nofollow',
    },
    {
      path: '/docs/library/blocks/hero',
      title: 'Docs page',
      contentType: 'article',
      publicationDate: '2026-08-22',
    },
    {
      path: '/fragments/nav',
      title: 'Nav fragment',
      contentType: 'article',
      publicationDate: '2026-08-22',
    },
    {
      path: '/',
      title: 'Homepage',
      contentType: 'article',
      publicationDate: '2026-08-22',
    },
  ],
};

function titlesFromBuildCalls() {
  return buildBlock.mock.calls.map(([, rows]) => {
    const titleRow = rows.find(([label]) => label === 'Title');
    return titleRow?.[1];
  });
}

function fieldFromCall(callIndex, label) {
  const rows = buildBlock.mock.calls[callIndex][1];
  return rows.find(([name]) => name === label)?.[1];
}

describe('content-grid block', () => {
  let consoleError;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html></html>',
    });
    dataStore.getData.mockResolvedValue(INDEX);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    readBlockConfig.mockImplementation((block) => {
      const config = {};
      [...block.children].forEach((row) => {
        const [label, cell] = row.children;
        if (!label || !cell) return;
        const name = label.textContent
          .trim()
          .toLowerCase()
          .replace(/[^0-9a-z]/gi, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        config[name] = cell.textContent.trim();
      });
      return config;
    });

    buildBlock.mockImplementation((name) => {
      const el = document.createElement('div');
      el.className = name;
      return el;
    });

    decorateBlock.mockImplementation((block) => {
      block.classList.add('block');
      block.dataset.blockName = 'grid-item';
      block.parentElement?.classList.add('grid-item-wrapper');
    });

    loadBlock.mockImplementation(async (block) => block);

    createOptimizedPicture.mockImplementation((src) => {
      const picture = document.createElement('picture');
      const img = document.createElement('img');
      img.src = src;
      picture.append(img);
      return picture;
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
    global.fetch = originalFetch;
  });

  it('replaces the config table with a list of grid-item cards', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    const list = within(block).getByRole('list');
    expect(list).toHaveClass('content-grid__list');
    expect(list.children).toHaveLength(3);
    expect(list.querySelectorAll('.grid-item')).toHaveLength(3);
    expect(list.querySelector('.grid-item')).toHaveClass('aspect-3-2');
    expect(list.querySelector('li')).toHaveClass('content-grid__item', 'grid-item-wrapper');
    expect(buildBlock).toHaveBeenCalledTimes(3);
    expect(decorateBlock).toHaveBeenCalledTimes(3);
    expect(loadBlock).toHaveBeenCalledTimes(3);
    expect(dataStore.getData).toHaveBeenCalledWith('/query-index.json?limit=1000');
    expect(block).not.toHaveTextContent('Content Type:');
  });

  it('orders matching items by publicationDate descending', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromBuildCalls()).toEqual([
      'Newer research',
      'Workflow video',
      'Older research',
    ]);
  });

  it('excludes noindex, docs, fragments, and homepage paths', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromBuildCalls()).not.toEqual(
      expect.arrayContaining(['Noindex sneak', 'Docs page', 'Nav fragment', 'Homepage']),
    );
  });

  it('filters by category from the page path', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Research',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromBuildCalls()).toEqual(['Newer research', 'Older research']);
  });

  it('omits category on grid-item by default', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(fieldFromCall(0, 'Category')).toBeUndefined();
  });

  it('passes category to grid-item when show-category is set', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });
    block.classList.add('show-category');

    await decorate(block);

    expect(fieldFromCall(0, 'Category')).toBe('Research');
  });

  it('prefers index category metadata over the path folder', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/workflows/override',
        title: 'Filed under workflows',
        category: 'Research',
        contentType: 'article',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Research',
      'Count:': '8',
    });
    block.classList.add('show-category');

    await decorate(block);

    expect(titlesFromBuildCalls()).toEqual(['Filed under workflows']);
    expect(fieldFromCall(0, 'Category')).toBe('Research');
  });

  it('omits category for unknown path folders', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/policy/terms',
        title: 'Terms',
        contentType: 'article',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromBuildCalls()).toEqual(['Terms']);
    expect(fieldFromCall(0, 'Category')).toBeUndefined();
  });

  it('filters by content type and marks video items', async () => {
    const block = createBlock({
      'Content Type:': 'Video',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromBuildCalls()).toEqual(['Workflow video']);
    expect(fieldFromCall(0, 'Is Video')).toBe('true');
  });

  it('marks items with isVideo true even when contentType is article', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/talk',
        title: 'Talk article',
        contentType: 'article',
        isVideo: 'true',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromBuildCalls()).toEqual(['Talk article']);
    expect(fieldFromCall(0, 'Is Video')).toBe('true');
  });

  it('includes isVideo items when filtering by Video', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/talk',
        title: 'Talk article',
        contentType: 'article',
        isVideo: true,
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'Video',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromBuildCalls()).toEqual(['Talk article']);
    expect(fieldFromCall(0, 'Is Video')).toBe('true');
  });

  it('marks sneaks as video when isVideo is omitted from the index', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/sneaks/clip',
        title: 'Sneak clip',
        contentType: 'article',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(fieldFromCall(0, 'Is Video')).toBe('true');
  });

  it('does not mark sneaks when isVideo is explicitly false', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/sneaks/writeup',
        title: 'Sneak writeup',
        isVideo: 'false',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(fieldFromCall(0, 'Is Video')).toBeUndefined();
  });

  it('slices results to the authored count', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '2',
    });

    await decorate(block);

    expect(within(block).getByRole('list').children).toHaveLength(2);
    expect(titlesFromBuildCalls()).toEqual(['Newer research', 'Workflow video']);
  });

  it('defaults count to 8 when the value is missing or invalid', async () => {
    dataStore.getData.mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) => ({
        path: `/research/item-${i}`,
        title: `Item ${i}`,
        contentType: 'article',
        publicationDate: `2026-08-${String(10 - i).padStart(2, '0')}`,
      })),
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': 'n/a',
    });

    await decorate(block);

    expect(within(block).getByRole('list').children).toHaveLength(8);
  });

  it.each([
    ['1:1', 'aspect-1-1'],
    ['4/5', 'aspect-4-5'],
    ['3-2', 'aspect-3-2'],
    ['aspect-2-3', 'aspect-2-3'],
  ])('applies Image Aspect %s as %s', async (imageAspect, className) => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/ratio',
        title: 'Ratio card',
        contentType: 'article',
        publicationDate: '2026-08-20',
        imageAspect,
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(block.querySelector('.grid-item')).toHaveClass(className);
  });

  it('reads image-aspect when the index uses a kebab-case column', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/ratio',
        title: 'Ratio card',
        contentType: 'article',
        publicationDate: '2026-08-20',
        'image-aspect': '4:5',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(block.querySelector('.grid-item')).toHaveClass('aspect-4-5');
  });

  it('defaults Image Aspect to 3:2 when the value is missing or unknown', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/ratio',
        title: 'Ratio card',
        contentType: 'article',
        publicationDate: '2026-08-20',
        imageAspect: '16:9',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(block.querySelector('.grid-item')).toHaveClass('aspect-3-2');
    expect(block.querySelector('.grid-item')).not.toHaveClass('aspect-1-1');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reads image-aspect meta from the article when the index omits the field', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><head><meta name="image-aspect" content="4/5"></head></html>',
    });
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/ratio',
        title: 'Ratio card',
        contentType: 'article',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(global.fetch).toHaveBeenCalledWith('/research/ratio');
    expect(block.querySelector('.grid-item')).toHaveClass('aspect-4-5');
  });

  it('does not fetch articles when the index lists an Image Aspect column', async () => {
    dataStore.getData.mockResolvedValue({
      columns: ['path', 'title', 'imageAspect'],
      data: [{
        path: '/research/ratio',
        title: 'Ratio card',
        contentType: 'article',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(block.querySelector('.grid-item')).toHaveClass('aspect-3-2');
  });

  it('maps index fields onto the generated grid-item', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Research',
      'Count:': '1',
    });

    await decorate(block);

    const rows = buildBlock.mock.calls[0][1];
    const asObject = Object.fromEntries(rows.map(([label, value]) => [label, value]));
    expect(asObject.Title).toBe('Newer research');
    expect(asObject.Category).toBeUndefined();
    expect(asObject.Date).toBe('2026-08-20');
    expect(asObject.Subhead).toBeUndefined();
    expect(asObject.URL).toHaveAttribute('href', expect.stringMatching(/\/research\/newer$/));
    expect(createOptimizedPicture).toHaveBeenCalledWith('/newer.jpg', '', false);
    expect(asObject.Image.tagName).toBe('PICTURE');
  });

  it('passes descriptions to grid-item when subhead-description is set', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Research',
      'Count:': '1',
    });
    block.classList.add('subhead-description');

    await decorate(block);

    const rows = buildBlock.mock.calls[0][1];
    const asObject = Object.fromEntries(rows.map(([label, value]) => [label, value]));
    expect(asObject.Subhead).toBe('Latest');
    expect(asObject.Date).toBeUndefined();
    expect(block.querySelector('.grid-item')).toHaveClass('subhead-description');
  });

  it('leaves the block empty when the index request fails', async () => {
    dataStore.getData.mockResolvedValue(null);
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(block.children).toHaveLength(0);
    expect(buildBlock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it('leaves the block empty when no items match', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Playground',
      'Count:': '8',
    });

    await decorate(block);

    expect(block.children).toHaveLength(0);
    expect(buildBlock).not.toHaveBeenCalled();
  });
});
