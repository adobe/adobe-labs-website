import { within } from '@testing-library/dom';
import {
  decorateBlock,
  getMetadata,
  loadBlock,
  readBlockConfig,
} from '../../scripts/aem.js';
import { buildGridItem } from '../grid-item/grid-item.js';
import dataStore from '../../scripts/utils/dataStore.js';
import decorate, { wireStackedGridPagers } from './content-grid.js';

jest.mock('../../scripts/aem.js', () => ({
  readBlockConfig: jest.fn(),
  decorateBlock: jest.fn(),
  loadBlock: jest.fn(),
  getMetadata: jest.fn(() => ''),
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
  createOptimizedPicture: jest.fn(),
}));

jest.mock('../grid-item/grid-item.js', () => ({
  buildGridItem: jest.fn(),
}));

jest.mock('../../scripts/utils/dataStore.js', () => ({
  __esModule: true,
  default: {
    getData: jest.fn(),
    commonEndpoints: {
      allPages: '/query-index.json',
      allContent: '/content.json',
      research: '/research/content.json',
      workflows: '/workflows/content.json',
      sneaks: '/sneaks/content.json',
      playground: '/playground/content.json',
    },
  },
}));

function createBlock(fields) {
  const wrapper = document.createElement('div');
  wrapper.className = 'content-grid-wrapper';
  const block = document.createElement('div');
  block.className = 'content-grid four-up';
  Object.entries(fields).forEach(([label, value]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${value}</div>`;
    block.append(row);
  });
  wrapper.append(block);
  return block;
}

const INDEX = {
  data: [
    {
      path: '/research/newer',
      title: 'Newer research',
      category: 'Research',
      contentType: 'article',
      description: 'Latest',
      image: '/newer.jpg',
      publicationDate: '2026-08-20',
      robots: '',
    },
    {
      path: '/research/older',
      title: 'Older research',
      category: ['Research', 'Future of Creative Work'],
      contentType: 'article',
      description: 'Earlier',
      image: '/older.jpg',
      publicationDate: '2026-01-01',
      robots: '',
    },
    {
      path: '/workflows/clip',
      title: 'Workflow video',
      category: 'Workflows',
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
      path: '/',
      title: 'Homepage',
      contentType: 'article',
      publicationDate: '2026-08-22',
    },
    {
      path: '/research/',
      title: 'Research index',
      contentType: 'article',
      publicationDate: '2026-08-23',
    },
    {
      path: '/workflows/index',
      title: 'Workflows index',
      contentType: 'article',
      publicationDate: '2026-08-23',
    },
  ],
};

function titlesFromCards() {
  return buildGridItem.mock.calls.map(([data]) => data.title);
}

function dataFromCall(callIndex) {
  return buildGridItem.mock.calls[callIndex][0];
}

describe('content-grid block', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/');
    dataStore.getData.mockResolvedValue(INDEX);
    getMetadata.mockReturnValue('');
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

    decorateBlock.mockImplementation((block) => {
      block.classList.add('block');
      block.dataset.blockName = 'grid-item';
      block.parentElement?.classList.add('grid-item-wrapper');
    });

    loadBlock.mockImplementation(async (block) => block);

    buildGridItem.mockImplementation((data = {}) => {
      const el = document.createElement('div');
      el.className = 'grid-item';
      if (data.title) {
        const title = document.createElement('p');
        title.className = 'grid-item__title';
        title.textContent = data.title;
        el.append(title);
      }
      if (data.contentType) {
        const contentType = document.createElement('span');
        contentType.className = 'grid-item__content-type';
        contentType.textContent = data.contentType;
        el.append(contentType);
      }
      if (data.subhead) {
        const subhead = document.createElement('p');
        subhead.className = 'grid-item__subhead';
        subhead.textContent = data.subhead;
        el.append(subhead);
      }
      if (data.isVideo) {
        const play = document.createElement('span');
        play.className = 'play-icon';
        el.append(play);
      }
      return el;
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
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
    expect(list).toHaveAttribute('role', 'list');
    expect(list.children).toHaveLength(3);
    expect(list.querySelectorAll('.grid-item')).toHaveLength(3);
    expect(list.querySelector('.grid-item')).toHaveClass('aspect-1-1');
    expect(list.querySelector('li')).toHaveClass('content-grid__item', 'grid-item-wrapper');
    expect(buildGridItem).toHaveBeenCalledTimes(3);
    expect(decorateBlock).toHaveBeenCalledTimes(3);
    expect(loadBlock).toHaveBeenCalledTimes(3);
    expect(dataStore.getData).toHaveBeenCalledWith('/content.json');
    expect(block.parentElement.hidden).toBe(false);
    expect(block).not.toHaveTextContent('Content Type:');
  });

  it('orders matching items by publicationDate descending', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromCards()).toEqual([
      'Newer research',
      'Workflow video',
      'Older research',
    ]);
  });

  it('excludes noindex, homepage, and section index paths', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromCards()).not.toEqual(
      expect.arrayContaining([
        'Noindex sneak',
        'Homepage',
        'Research index',
        'Workflows index',
      ]),
    );
  });

  it('fetches the research content index for Content Type Research', async () => {
    const block = createBlock({
      'Content Type:': 'Research',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(dataStore.getData).toHaveBeenCalledWith('/research/content.json');
  });

  it('fetches all content when Content Type is omitted', async () => {
    const block = createBlock({
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(dataStore.getData).toHaveBeenCalledWith('/content.json');
  });

  it('filters by category after fetch', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Research',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromCards()).toEqual(['Newer research', 'Older research']);
  });

  it('matches category after trim and lowercase', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': '  research ',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromCards()).toEqual(['Newer research', 'Older research']);
  });

  it('matches a comma-separated category list on the index row', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/practices',
        title: 'Standards research',
        category: 'Future of Creative Work, Standards & Practices',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'standards & practices',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromCards()).toEqual(['Standards research']);
  });

  it('splits comma-separated strings inside a category array', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/nested',
        title: 'Nested categories',
        category: ['Future of Creative Work, Another Category'],
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Another Category',
      'Count:': '8',
    });

    await decorate(block);

    expect(titlesFromCards()).toEqual(['Nested categories']);
  });

  it('omits the content-type label on grid-item by default', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(dataFromCall(0).contentType).toBe('');
  });

  it('passes the content-type label to grid-item when show-content-type is set', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });
    block.classList.add('show-content-type');

    await decorate(block);

    expect(dataFromCall(0).contentType).toBe('Research');
  });

  it('filters by JSON category independently of the page path', async () => {
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
    block.classList.add('show-content-type');

    await decorate(block);

    expect(titlesFromCards()).toEqual(['Filed under workflows']);
    expect(dataFromCall(0).contentType).toBe('Workflows');
  });

  it('omits the content-type label for unknown path folders', async () => {
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

    expect(titlesFromCards()).toEqual(['Terms']);
    expect(dataFromCall(0).contentType).toBe('');
  });

  it('fetches the workflows endpoint for Content Type Workflows', async () => {
    const block = createBlock({
      'Content Type:': 'Workflows',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(dataStore.getData).toHaveBeenCalledWith('/workflows/content.json');
    expect(titlesFromCards()).toEqual(['Newer research', 'Workflow video', 'Older research']);
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

    expect(titlesFromCards()).toEqual(['Talk article']);
    expect(dataFromCall(0).isVideo).toBe(true);
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

    expect(dataFromCall(0).isVideo).toBe(true);
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

    expect(dataFromCall(0).isVideo).toBe(false);
  });

  it('slices results to the authored count', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '2',
    });

    await decorate(block);

    expect(within(block).getByRole('list').children).toHaveLength(2);
    expect(titlesFromCards()).toEqual(['Newer research', 'Workflow video']);
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

    expect(block.querySelector('.grid-item')).toHaveClass('aspect-4-5');
  });

  it('defaults Image Aspect to 1:1 when the value is missing or unknown', async () => {
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

    expect(block.querySelector('.grid-item')).toHaveClass('aspect-1-1');
    expect(block.querySelector('.grid-item')).not.toHaveClass('aspect-3-2');
  });

  it('defaults Image Aspect to 1:1 when the index omits the field', async () => {
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

    expect(block.querySelector('.grid-item')).toHaveClass('aspect-1-1');
  });

  it('maps index fields onto the generated grid-item', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 25));
    try {
      const block = createBlock({
        'Content Type:': 'All',
        'Category:': 'Research',
        'Count:': '1',
      });

      await decorate(block);

      expect(dataFromCall(0)).toEqual(expect.objectContaining({
        title: 'Newer research',
        href: expect.stringMatching(/\/research\/newer$/),
        subhead: 'Aug 20',
        contentType: '',
        imageUrl: '/newer.jpg',
        imageAlt: '',
        isVideo: false,
      }));
    } finally {
      jest.useRealTimers();
    }
  });

  it('passes descriptions to grid-item when subhead-description is set', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Research',
      'Count:': '1',
    });
    block.classList.add('subhead-description');

    await decorate(block);

    expect(dataFromCall(0).subhead).toBe('Latest');
    expect(block.querySelector('.grid-item')).not.toHaveClass('subhead-description');
  });

  it('passes empty image alt when the card has a title', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Research',
      'Count:': '1',
    });

    await decorate(block);

    expect(dataFromCall(0).imageAlt).toBe('');
  });

  it('uses the description as image alt when the title is missing', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/untitled',
        contentType: 'article',
        description: 'A short description',
        image: '/untitled.jpg',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(dataFromCall(0).title).toBe('');
    expect(dataFromCall(0).imageAlt).toBe('A short description');
  });

  it('uses a fallback image alt when title and description are missing', async () => {
    dataStore.getData.mockResolvedValue({
      data: [{
        path: '/research/untitled',
        contentType: 'article',
        image: '/untitled.jpg',
        publicationDate: '2026-08-20',
      }],
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(dataFromCall(0).imageAlt).toBe('Article');
  });

  it('leaves the grid card-only when Intro is missing or empty', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
      Intro: '   ',
    });

    await decorate(block);

    expect(block).not.toHaveClass('content-grid--has-intro');
    expect(block.querySelector('.content-grid__intro')).toBeNull();
    expect(within(block).getByRole('list').children).toHaveLength(3);
  });

  it('prepends authored Intro content without reducing Count', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '2',
      Intro: '<h2>Future of Creative Work</h2><p>How AI is reshaping creative roles.</p>',
    });

    await decorate(block);

    const intro = block.querySelector('.content-grid__intro');
    expect(block).toHaveClass('content-grid--has-intro');
    expect(block.firstElementChild).toBe(intro);
    expect(intro.querySelector('h2')).toHaveTextContent('Future of Creative Work');
    expect(intro.querySelector('p')).toHaveTextContent('How AI is reshaping creative roles.');
    expect(intro.querySelector('p')).toHaveClass('body-lg');
    expect(within(block).getByRole('list').children).toHaveLength(2);
    expect(buildGridItem).toHaveBeenCalledTimes(2);
  });

  it('does not pass Intro to readBlockConfig', async () => {
    const labels = [];
    readBlockConfig.mockImplementation((el) => {
      [...el.children].forEach((row) => {
        const [label, cell] = row.children;
        if (!label || !cell) return;
        const name = label.textContent
          .trim()
          .toLowerCase()
          .replace(/[^0-9a-z]/gi, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        labels.push(name);
      });
      return { 'content-type': 'All', category: 'All', count: '1' };
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
      Intro: '<h2>Explore Workflows</h2>',
    });

    await decorate(block);

    expect(labels).not.toContain('intro');
    expect(block).toHaveClass('content-grid--has-intro');
  });

  it('leaves the block empty and hides the wrapper when the index request fails', async () => {
    dataStore.getData.mockResolvedValue(null);
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
    });

    await decorate(block);

    expect(block.children).toHaveLength(0);
    expect(block.parentElement.hidden).toBe(true);
    expect(buildGridItem).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it('hides the block and intro when the index request fails', async () => {
    dataStore.getData.mockResolvedValue(null);
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '8',
      Intro: '<h2>Future of Creative Work</h2>',
    });

    await decorate(block);

    expect(block.children).toHaveLength(0);
    expect(block).not.toHaveClass('content-grid--has-intro');
    expect(block.parentElement.hidden).toBe(true);
    expect(within(block).queryByRole('heading', { name: 'Future of Creative Work' })).toBeNull();
    expect(buildGridItem).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it('hides the block when no items match, including authored Intro', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'Playground',
      'Count:': '8',
      Intro: '<h2>Playground</h2>',
    });

    await decorate(block);

    expect(block.children).toHaveLength(0);
    expect(block).not.toHaveClass('content-grid--has-intro');
    expect(block.parentElement.hidden).toBe(true);
    expect(buildGridItem).not.toHaveBeenCalled();
  });

  describe('date subhead', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 7, 25));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('fills the subhead with a formatted date by default', async () => {
      const block = createBlock({
        'Content Type:': 'All',
        'Category:': 'Research',
        'Count:': '1',
      });

      await decorate(block);

      expect(dataFromCall(0).subhead).toBe('Aug 20');
    });

    it('includes the year when the date is not this year', async () => {
      dataStore.getData.mockResolvedValue({
        data: [{
          path: '/research/future',
          title: 'Future research',
          contentType: 'article',
          publicationDate: '2027-10-21',
        }],
      });
      const block = createBlock({
        'Content Type:': 'All',
        'Category:': 'All',
        'Count:': '1',
      });

      await decorate(block);

      expect(dataFromCall(0).subhead).toBe('Oct 21, 2027');
    });

    it('prefers the formatted date over the description by default', async () => {
      const block = createBlock({
        'Content Type:': 'All',
        'Category:': 'Research',
        'Count:': '1',
      });

      await decorate(block);

      expect(dataFromCall(0).subhead).toBe('Aug 20');
    });

    it('uses the description when a date is missing', async () => {
      dataStore.getData.mockResolvedValue({
        data: [{
          path: '/research/undated',
          title: 'Undated research',
          contentType: 'article',
          description: 'A short description',
        }],
      });
      const block = createBlock({
        'Content Type:': 'All',
        'Category:': 'All',
        'Count:': '1',
      });

      await decorate(block);

      expect(dataFromCall(0).subhead).toBe('A short description');
    });
  });

  describe('Related content: true (related content)', () => {
    const RELATED_INDEX = {
      data: [
        {
          path: '/research/current',
          title: 'Current article',
          category: 'Future of Creative Work',
          publicationDate: '2026-08-20',
        },
        {
          path: '/research/shared-category',
          title: 'Shares a category',
          category: ['Future of Creative Work', 'Another Category'],
          publicationDate: '2026-08-18',
        },
        {
          path: '/research/no-shared-category',
          title: 'No shared category',
          category: 'Standards & Practices',
          publicationDate: '2026-08-19',
        },
      ],
    };

    it('derives the endpoint from the current page path when Related content is true', async () => {
      window.history.pushState({}, '', '/research/current');
      const block = createBlock({ 'Related content:': 'true', 'Count:': '8' });

      await decorate(block);

      expect(dataStore.getData).toHaveBeenCalledWith('/research/content.json');
    });

    it('ignores an authored Content Type value when Related content is true', async () => {
      window.history.pushState({}, '', '/research/current');
      const block = createBlock({ 'Related content:': 'true', 'Content Type:': 'Workflows', 'Count:': '8' });

      await decorate(block);

      expect(dataStore.getData).toHaveBeenCalledWith('/research/content.json');
    });

    it('derives the category from page metadata instead of an authored value when Related content is true', async () => {
      window.history.pushState({}, '', '/research/current');
      getMetadata.mockReturnValue('Future of Creative Work');
      dataStore.getData.mockResolvedValue(RELATED_INDEX);
      const block = createBlock({
        'Related content:': 'true', 'Content Type:': 'Research', 'Category:': 'Standards & Practices', 'Count:': '8',
      });

      await decorate(block);

      expect(getMetadata).toHaveBeenCalledWith('category');
      expect(titlesFromCards()).toEqual(['Shares a category']);
    });

    it('excludes the current page from its own results when Related content is true', async () => {
      window.history.pushState({}, '', '/research/current');
      getMetadata.mockReturnValue('Future of Creative Work');
      dataStore.getData.mockResolvedValue(RELATED_INDEX);
      const block = createBlock({ 'Related content:': 'true', 'Count:': '8' });

      await decorate(block);

      expect(titlesFromCards()).not.toContain('Current article');
    });

    it('does not exclude the current page when Related content is not set', async () => {
      window.history.pushState({}, '', '/research/current');
      dataStore.getData.mockResolvedValue(RELATED_INDEX);
      const block = createBlock({ 'Content Type:': 'Research', 'Category:': 'All', 'Count:': '8' });

      await decorate(block);

      expect(titlesFromCards()).toContain('Current article');
    });

    it('falls back to the same content type when Related content matches no category', async () => {
      window.history.pushState({}, '', '/research/current');
      getMetadata.mockReturnValue('A Topic Nothing Has');
      dataStore.getData.mockResolvedValue(RELATED_INDEX);
      const block = createBlock({ 'Related content:': 'true', 'Count:': '8' });

      await decorate(block);

      expect(titlesFromCards().sort()).toEqual(
        ['Shares a category', 'No shared category'].sort(),
      );
    });

    it('hides the block when the Related content fallback also has nothing to show', async () => {
      window.history.pushState({}, '', '/research/current');
      getMetadata.mockReturnValue('A Topic Nothing Has');
      dataStore.getData.mockResolvedValue({
        data: [{
          path: '/research/current',
          title: 'Current article',
          category: 'Future of Creative Work',
          publicationDate: '2026-08-20',
        }],
      });
      const block = createBlock({ 'Related content:': 'true', 'Count:': '8' });

      await decorate(block);

      expect(block.children).toHaveLength(0);
      expect(block.parentElement.hidden).toBe(true);
    });

    it('adds content-grid--related for the fixed intro heading style, and removes it otherwise', async () => {
      window.history.pushState({}, '', '/research/current');
      dataStore.getData.mockResolvedValue(RELATED_INDEX);
      const related = createBlock({ 'Related content:': 'true', 'Count:': '8' });
      await decorate(related);
      expect(related).toHaveClass('content-grid--related');

      const plain = createBlock({ 'Content Type:': 'All', 'Category:': 'All', 'Count:': '8' });
      await decorate(plain);
      expect(plain).not.toHaveClass('content-grid--related');
    });
  });

  describe('stacked jump links', () => {
    function createStackedPage(specs) {
      const main = document.createElement('main');
      const blocks = specs.map((spec) => {
        if (spec === 'break') {
          const section = document.createElement('div');
          section.className = 'section';
          const wrap = document.createElement('div');
          wrap.className = 'default-content-wrapper';
          wrap.innerHTML = '<h2>Other section</h2>';
          section.append(wrap);
          main.append(section);
          return null;
        }
        const section = document.createElement('div');
        section.className = 'section content-grid-container';
        const fields = {
          'Content Type:': spec.contentType || 'All',
          'Category:': spec.category || 'All',
          'Count:': spec.count || '8',
        };
        if (spec.intro) fields.Intro = spec.intro;
        const block = createBlock(fields);
        if (spec.notFirst) {
          const extra = document.createElement('div');
          extra.className = 'default-content-wrapper';
          extra.textContent = 'before';
          section.append(extra, block.parentElement);
        } else {
          section.append(block.parentElement);
        }
        main.append(section);
        return block;
      });
      document.body.append(main);
      return { main, blocks };
    }

    afterEach(() => {
      document.body.replaceChildren();
    });

    it('adds Next only, both, then Previous only across a stack of three', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>One</h2>' },
        { intro: '<h2>Two</h2>' },
        { intro: '<h2>Three</h2>' },
      ]);

      await decorate(blocks[0]);
      expect(within(blocks[0]).queryByRole('navigation')).toBeNull();

      await decorate(blocks[1]);
      await decorate(blocks[2]);

      const first = within(blocks[0]);
      expect(first.queryByRole('link', { name: 'Previous: One' })).toBeNull();
      expect(first.getByRole('link', { name: 'Next: Two' })).toHaveAttribute('href', '#two');
      expect(first.getByRole('navigation')).toHaveAttribute('aria-label', 'One section');
      expect(blocks[0].querySelector('.content-grid__pager-icon')).toHaveAttribute('aria-hidden', 'true');
      expect(document.getElementById('two')).toHaveClass('section');

      const middle = within(blocks[1]);
      expect(middle.getByRole('link', { name: 'Previous: One' })).toHaveAttribute('href', '#one');
      expect(middle.getByRole('link', { name: 'Next: Three' })).toHaveAttribute('href', '#three');
      expect(middle.getByRole('navigation')).toHaveAttribute('aria-label', 'Two section');

      const last = within(blocks[2]);
      expect(last.getByRole('link', { name: 'Previous: Two' })).toHaveAttribute('href', '#two');
      expect(last.queryByRole('link', { name: /Next:/ })).toBeNull();
    });

    it('does not add a pager to an isolated content grid', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>Only</h2>' },
      ]);

      await decorate(blocks[0]);

      expect(within(blocks[0]).queryByRole('navigation')).toBeNull();
    });

    it('does not link grids across a non-grid section', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>One</h2>' },
        'break',
        { intro: '<h2>Three</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[2]);

      expect(within(blocks[0]).queryByRole('navigation')).toBeNull();
      expect(within(blocks[2]).queryByRole('navigation')).toBeNull();
    });

    it('skips a hidden empty grid and still links neighbors', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>One</h2>' },
        { intro: '<h2>Empty</h2>', category: 'Playground' },
        { intro: '<h2>Three</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);
      await decorate(blocks[2]);

      expect(blocks[1].parentElement.hidden).toBe(true);
      expect(within(blocks[0]).getByRole('link', { name: 'Next: Three' })).toHaveAttribute('href', '#three');
      expect(within(blocks[2]).getByRole('link', { name: 'Previous: One' })).toHaveAttribute('href', '#one');
      expect(within(blocks[1]).queryByRole('navigation')).toBeNull();
    });

    it('skips a grid with no intro heading and is not a jump target', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>One</h2>' },
        {},
        { intro: '<h2>Three</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);
      await decorate(blocks[2]);

      expect(within(blocks[0]).getByRole('link', { name: 'Next: Three' })).toHaveAttribute('href', '#three');
      expect(within(blocks[1]).queryByRole('navigation')).toBeNull();
      expect(blocks[1].querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
      expect(within(blocks[2]).getByRole('link', { name: 'Previous: One' })).toHaveAttribute('href', '#one');
    });

    it('slugs the heading text onto the section for the jump target', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>Future of Creative Work</h2>' },
        { intro: '<h2>Standards</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);

      expect(blocks[0].closest('.section')).toHaveAttribute('id', 'future-of-creative-work');
      expect(blocks[1].closest('.section')).toHaveAttribute('id', 'standards');
      expect(within(blocks[0]).getByRole('link', { name: 'Next: Standards' }))
        .toHaveAttribute('href', '#standards');
      expect(document.getElementById('standards')).toHaveClass('section');
    });

    it('moves an AEM heading slug onto the section so the jump target is the section', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2 id="one">One</h2>' },
        { intro: '<h2 id="two">Two</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);

      expect(blocks[0].closest('.section')).toHaveAttribute('id', 'one');
      expect(blocks[1].closest('.section')).toHaveAttribute('id', 'two');
      expect(within(blocks[0]).getByRole('heading', { name: 'One' })).toHaveAttribute('id', 'one-title');
      expect(within(blocks[0]).getByRole('link', { name: 'Next: Two' })).toHaveAttribute('href', '#two');
      expect(document.getElementById('two')).toHaveClass('section');
      expect(within(blocks[0]).getByRole('navigation')).toHaveAttribute('aria-label', 'One section');
    });

    it('keeps an authored heading id on the heading, not the jump target', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2 id="custom-one">One</h2>' },
        { intro: '<h2 id="custom-two">Two</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);

      expect(within(blocks[0]).getByRole('link', { name: 'Next: Two' })).toHaveAttribute('href', '#two');
      expect(within(blocks[1]).getByRole('link', { name: 'Previous: One' })).toHaveAttribute('href', '#one');
      expect(within(blocks[0]).getByRole('navigation')).toHaveAttribute('aria-label', 'One section');
      expect(within(blocks[0]).getByRole('heading', { name: 'One' })).toHaveAttribute('id', 'custom-one');
      expect(blocks[0].closest('.section')).toHaveAttribute('id', 'one');
      expect(blocks[1].closest('.section')).toHaveAttribute('id', 'two');
    });

    it('gives unique section ids when titles repeat', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>Standards</h2>' },
        { intro: '<h2>Standards</h2>' },
        { intro: '<h2>Standards</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);
      await decorate(blocks[2]);

      const sectionIds = blocks.map((block) => block.closest('.section').id);
      expect(sectionIds).toEqual(['standards', 'standards-section', 'standards-section-2']);
      expect(blocks.map((block) => block.querySelector('h2').id)).toEqual(['', '', '']);
      expect(within(blocks[0]).getByRole('link', { name: 'Next: Standards' }))
        .toHaveAttribute('href', '#standards-section');
      expect(within(blocks[1]).getByRole('link', { name: 'Next: Standards' }))
        .toHaveAttribute('href', '#standards-section-2');
    });

    it('focuses the destination heading on pager click without changing the hash target', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>One</h2>' },
        { intro: '<h2>Two</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);

      const next = within(blocks[0]).getByRole('link', { name: 'Next: Two' });
      expect(next).toHaveAttribute('href', '#two');
      next.click();
      await Promise.resolve();

      const destinationHeading = within(blocks[1]).getByRole('heading', { name: 'Two' });
      expect(destinationHeading).toHaveAttribute('tabindex', '-1');
      expect(destinationHeading).toHaveFocus();
      expect(document.getElementById('two')).toHaveClass('section');
      expect(document.getElementById('two')).not.toHaveAttribute('tabindex');
    });

    it('does not add a pager when the grid is not the section first child', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>One</h2>' },
        { intro: '<h2>Two</h2>', notFirst: true },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);

      expect(within(blocks[0]).queryByRole('navigation')).toBeNull();
      expect(within(blocks[1]).queryByRole('navigation')).toBeNull();
    });

    it('removes a stale pager when a neighbor later hides', async () => {
      const { blocks } = createStackedPage([
        { intro: '<h2>One</h2>' },
        { intro: '<h2>Two</h2>' },
      ]);

      await decorate(blocks[0]);
      await decorate(blocks[1]);
      expect(within(blocks[0]).getByRole('link', { name: 'Next: Two' })).toBeTruthy();

      blocks[1].parentElement.hidden = true;
      wireStackedGridPagers(blocks[1]);

      expect(within(blocks[0]).queryByRole('navigation')).toBeNull();
    });
  });
});
