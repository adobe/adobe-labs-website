import { within } from '@testing-library/dom';
import {
  decorateBlock,
  loadBlock,
  readBlockConfig,
} from '../../scripts/aem.js';
import { buildGridItem } from '../grid-item/grid-item.js';
import dataStore from '../../scripts/utils/dataStore.js';
import decorate from './content-grid.js';

jest.mock('../../scripts/aem.js', () => ({
  readBlockConfig: jest.fn(),
  decorateBlock: jest.fn(),
  loadBlock: jest.fn(),
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
      if (data.category) {
        const category = document.createElement('span');
        category.className = 'grid-item__category';
        category.textContent = data.category;
        el.append(category);
      }
      if (data.subhead) {
        const subhead = document.createElement('p');
        subhead.className = 'grid-item__subhead';
        subhead.textContent = data.subhead;
        el.append(subhead);
      }
      if (data.isVideo) {
        const play = document.createElement('span');
        play.className = 'grid-item__play';
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
    expect(list.querySelector('.grid-item')).toHaveClass('aspect-3-2');
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

  it('omits the section label on grid-item by default', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });

    await decorate(block);

    expect(dataFromCall(0).category).toBe('');
  });

  it('passes the section label to grid-item when show-category is set', async () => {
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
    });
    block.classList.add('show-category');

    await decorate(block);

    expect(dataFromCall(0).category).toBe('Research');
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
    block.classList.add('show-category');

    await decorate(block);

    expect(titlesFromCards()).toEqual(['Filed under workflows']);
    expect(dataFromCall(0).category).toBe('Workflows');
  });

  it('omits the section label for unknown path folders', async () => {
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
    expect(dataFromCall(0).category).toBe('');
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
  });

  it('defaults Image Aspect to 3:2 when the index omits the field', async () => {
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

    expect(block.querySelector('.grid-item')).toHaveClass('aspect-3-2');
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
        category: '',
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

  it('discards leftover Previous and Next rows', async () => {
    const labels = [];
    readBlockConfig.mockImplementation((el) => {
      [...el.children].forEach((row) => {
        const [label, cell] = row.children;
        if (!label || !cell) return;
        labels.push(label.textContent.trim().toLowerCase().replace(/[^0-9a-z]/gi, '-'));
      });
      return { 'content-type': 'All', category: 'All', count: '1' };
    });
    const block = createBlock({
      'Content Type:': 'All',
      'Category:': 'All',
      'Count:': '1',
      Previous: '<a href="#future-of-creative-work">Previous</a>',
      Next: '<a href="#workflows">Next</a>',
    });

    await decorate(block);

    expect(labels).not.toEqual(expect.arrayContaining(['previous', 'next']));
    expect(block).not.toHaveClass('content-grid--has-intro');
    expect(within(block).queryByRole('navigation')).toBeNull();
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
});
