import decorate from './fragment.js';

jest.mock('../../scripts/scripts.js', () => ({
  decorateMain: jest.fn(),
}));

jest.mock('../../scripts/aem.js', () => ({
  loadSections: jest.fn(() => Promise.resolve()),
}));

function createFragmentBlock({ href, hidden = false, extraSectionChild = false } = {}) {
  const section = document.createElement('div');
  section.className = 'section';
  const wrapper = document.createElement('div');
  wrapper.className = 'fragment-wrapper';
  const block = document.createElement('div');
  block.className = 'fragment';
  const row = document.createElement('div');
  const cell = document.createElement('div');
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.textContent = href;
  link.hidden = hidden;
  cell.append(link);
  row.append(cell);
  block.append(row);
  wrapper.append(block);
  section.append(wrapper);
  if (extraSectionChild) {
    const sibling = document.createElement('p');
    sibling.textContent = 'Keep me';
    section.append(sibling);
  }
  document.body.append(section);
  return { section, wrapper, block };
}

describe('fragment block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    global.fetch = jest.fn();
  });

  it('replaces the section with loaded fragment content', async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: async () => '<div class="section"><p>Related</p></div>',
    });
    const { block } = createFragmentBlock({ href: '/fragments/article-pre-footer' });

    await decorate(block);

    expect(document.body).toHaveTextContent('Related');
    expect(document.querySelector('.fragment')).toBeNull();
  });

  it('removes a hidden autoblock shell when the fragment fails to load', async () => {
    fetch.mockResolvedValue({ ok: false });
    const { section, block } = createFragmentBlock({
      href: '/fragments/article-pre-footer',
      hidden: true,
    });

    await decorate(block);

    expect(section.isConnected).toBe(false);
    expect(document.body).toBeEmptyDOMElement();
  });

  it('removes only the wrapper when a hidden autoblock shares its section', async () => {
    fetch.mockResolvedValue({ ok: false });
    const { section, wrapper, block } = createFragmentBlock({
      href: '/fragments/article-pre-footer',
      hidden: true,
      extraSectionChild: true,
    });

    await decorate(block);

    expect(wrapper.isConnected).toBe(false);
    expect(section.isConnected).toBe(true);
    expect(section).toHaveTextContent('Keep me');
  });

  it('keeps an authored fragment link when the fragment fails to load', async () => {
    fetch.mockResolvedValue({ ok: false });
    const { section, block } = createFragmentBlock({ href: '/fragments/promo' });

    await decorate(block);

    expect(section.isConnected).toBe(true);
    expect(block.querySelector('a')).toBeVisible();
  });
});
