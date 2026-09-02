import { within } from '@testing-library/dom';
import { getMetadata, loadCSS } from '../../scripts/aem.js';
import dataStore from '../../scripts/utils/dataStore.js';
import { buildGridItem } from '../grid-item/grid-item.js';
import decorate from './related-content.js';

jest.mock('../../scripts/aem.js', () => ({
  getMetadata: jest.fn(() => ''),
  loadCSS: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../scripts/utils/dataStore.js', () => ({
  __esModule: true,
  default: {
    getData: jest.fn(),
    commonEndpoints: {
      allContent: '/content.json',
      research: '/research/content.json',
      workflows: '/workflows/content.json',
      sneaks: '/sneaks/content.json',
      playground: '/playground/content.json',
    },
  },
}));

jest.mock('../grid-item/grid-item.js', () => ({
  buildGridItem: jest.fn(),
}));

function createBlock(headingHtml) {
  const wrapper = document.createElement('div');
  wrapper.className = 'related-content-wrapper';
  const block = document.createElement('div');
  block.className = 'related-content';
  const row = document.createElement('div');
  const cell = document.createElement('div');
  cell.innerHTML = headingHtml;
  row.append(cell);
  block.append(row);
  wrapper.append(block);
  return block;
}

const RESEARCH_INDEX = {
  data: [
    {
      path: '/research/current',
      title: 'Current article',
      category: 'Research',
      publicationDate: '2026-08-30',
    },
    {
      path: '/research/shared-category',
      title: 'Shares a category',
      category: ['Research', 'Future of Creative Work'],
      publicationDate: '2026-08-20',
    },
    {
      path: '/research/no-shared-category',
      title: 'No shared category',
      category: 'Different Topic',
      publicationDate: '2026-08-25',
    },
    {
      path: '/research/hidden',
      title: 'Noindex research',
      robots: 'noindex, nofollow',
      publicationDate: '2026-08-28',
    },
  ],
};

function titlesFromCards() {
  return buildGridItem.mock.calls.map(([data]) => data.title);
}

beforeEach(() => {
  jest.clearAllMocks();
  window.history.pushState({}, '', '/research/current');
  getMetadata.mockReturnValue('');
  dataStore.getData.mockResolvedValue(RESEARCH_INDEX);
  buildGridItem.mockImplementation((data) => {
    const card = document.createElement('div');
    card.className = 'grid-item';
    if (data.title) {
      const title = document.createElement('p');
      title.textContent = data.title;
      card.append(title);
    }
    return card;
  });
});

describe('related-content block', () => {
  it('renders the authored heading with the designed typography, keeping its level', async () => {
    const block = createBlock('<h3>Related Articles</h3>');

    await decorate(block);

    const heading = within(block).getByRole('heading', { level: 3, name: 'Related Articles' });
    expect(heading).toHaveClass('related-content__heading', 'heading-6');
  });

  it('falls back to an h2 when the authored cell has plain text', async () => {
    const block = createBlock('Related Articles');

    await decorate(block);

    expect(within(block).getByRole('heading', { level: 2, name: 'Related Articles' })).toBeTruthy();
  });

  it('excludes the current article and noindex rows', async () => {
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(titlesFromCards()).not.toContain('Current article');
    expect(titlesFromCards()).not.toContain('Noindex research');
  });

  it('prefers items sharing a category with the current page', async () => {
    getMetadata.mockReturnValue('Research');
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(titlesFromCards()).toEqual(['Shares a category']);
  });

  it('falls back to the same content type when nothing shares a category', async () => {
    getMetadata.mockReturnValue('A Topic Nothing Has');
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(titlesFromCards().sort()).toEqual(
      ['No shared category', 'Shares a category'].sort(),
    );
  });

  it('fetches from the section endpoint matching the current page path', async () => {
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(dataStore.getData).toHaveBeenCalledWith('/research/content.json');
  });

  it('falls back to the all-content endpoint when the path has no known section', async () => {
    window.history.pushState({}, '', '/some-other-page');
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(dataStore.getData).toHaveBeenCalledWith('/content.json');
  });

  it('loads grid-item styles once results are available', async () => {
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(loadCSS).toHaveBeenCalledWith(expect.stringContaining('/blocks/grid-item/grid-item.css'));
  });

  it('hides the block and its section wrapper when there are no results', async () => {
    dataStore.getData.mockResolvedValue({ data: [] });
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(block.children).toHaveLength(0);
    expect(block.parentElement).toHaveAttribute('hidden');
  });

  it('hides the block on a fetch failure', async () => {
    dataStore.getData.mockResolvedValue(null);
    const block = createBlock('<h2>Related Articles</h2>');

    await decorate(block);

    expect(block.children).toHaveLength(0);
    expect(block.parentElement).toHaveAttribute('hidden');
  });
});
