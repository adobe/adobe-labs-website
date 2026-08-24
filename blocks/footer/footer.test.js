import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import decorate from './footer.js';

jest.mock('../../scripts/aem.js', () => ({
  getMetadata: jest.fn(() => ''),
}));

jest.mock('../fragment/fragment.js', () => ({
  loadFragment: jest.fn(),
}));

function createFragment(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  return wrap;
}

describe('footer block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    loadFragment.mockResolvedValue(
      createFragment('<div class="section"><p>Footer</p></div>'),
    );
  });

  it('loads the default footer fragment when footer metadata is empty', async () => {
    const block = document.createElement('div');

    await decorate(block);

    expect(getMetadata).toHaveBeenCalledWith('footer');
    expect(loadFragment).toHaveBeenCalledWith('/fragments/footer');
  });

  it('loads a custom footer fragment from footer metadata', async () => {
    getMetadata.mockReturnValue('/fragments/custom-footer');
    const block = document.createElement('div');

    await decorate(block);

    expect(loadFragment).toHaveBeenCalledWith('/fragments/custom-footer');
  });

  it('replaces block content with fragment sections', async () => {
    loadFragment.mockResolvedValue(
      createFragment(`
        <div class="section"><p>Links</p></div>
        <div class="section"><p>Legal</p></div>
      `),
    );
    const block = document.createElement('div');
    block.innerHTML = '<p>Placeholder</p>';

    await decorate(block);

    expect(block.querySelector('p')).not.toHaveTextContent('Placeholder');
    expect(block.children).toHaveLength(1);
    expect(block.firstElementChild.children).toHaveLength(2);
    expect(block).toHaveTextContent('Links');
    expect(block).toHaveTextContent('Legal');
  });
});
