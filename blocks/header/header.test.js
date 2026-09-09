/**
 * Header block tests. Fixtures follow the Labs nav content shape.
 */
import { within } from '@testing-library/dom';
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import decorate from './header.js';

jest.mock('../../scripts/aem.js', () => ({
  getMetadata: jest.fn(() => ''),
}));

jest.mock('../fragment/fragment.js', () => ({
  loadFragment: jest.fn(),
}));

/**
 * Labs-shaped nav fragment: brand, links (one with nested menu), Subscribe.
 * @type {string}
 */
const NAV_HTML = `
  <div class="section">
    <div class="default-content-wrapper">
      <p><a href="/"><img src="/logo.svg" alt="Adobe Labs"></a></p>
    </div>
  </div>
  <div class="section">
    <div class="default-content-wrapper">
      <ul>
        <li><a href="/research">Research</a></li>
        <li><a href="/workflows">Workflows</a></li>
        <li>
          <a href="/products">Products</a>
          <ul>
            <li><a href="/products/photoshop">Photoshop</a></li>
            <li><a href="/products/illustrator">Illustrator</a></li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
  <div class="section">
    <div class="default-content-wrapper">
      <p><a class="button" href="https://www.adobe.com/">Subscribe</a></p>
    </div>
  </div>
`;

/**
 * Leftover Milo large-menu trigger pointing at a same-origin menu doc.
 * @type {string}
 */
const LARGE_MENU_HTML = `
  <div class="section">
    <div class="adobe-logo"><p><a href="/"><img src="/logo.svg" alt="Adobe Labs"></a></p></div>
  </div>
  <div class="large-menu">
    <div>
      <h2><a href="/fragments/menus/products">Products</a></h2>
    </div>
  </div>
`;

/**
 * Flattened menu document used when a large-menu href is fetched.
 * @type {string}
 */
const MENU_DOC_HTML = `
  <div>
    <h2>Apps</h2>
    <p><a href="/products/photoshop">Photoshop</a></p>
  </div>
`;

/**
 * Live DA shape still authored as Milo tables + h2 links.
 * @type {string}
 */
const LEGACY_NAV_HTML = `
  <div>
    <div class="gnav-brand image-only">
      <div><div><a href="/">Adobe Labs</a></div></div>
      <div>
        <p><a href="/federal/site-redesign/assets/mobile-adobe-logo-black.svg">logo.svg|Adobe, Inc.</a></p>
      </div>
    </div>
  </div>
  <div>
    <h2 id="research"><a href="/research/">Research</a></h2>
  </div>
  <div>
    <h2 id="workflows"><a href="/workflows/">Workflows</a></h2>
  </div>
  <div>
    <div class="large-menu">
      <div>
        <div>
          <h2 id="fragment-mega-menu"><a href="/fragments/nav/explore">Fragment Mega Menu</a></h2>
        </div>
      </div>
    </div>
  </div>
  <div>
    <div class="large-menu">
      <div>
        <div>
          <h2 id="inline-mega-menu">Inline Mega Menu</h2>
          <ul>
            <li><a href="https://adobe.com/">Creative Cloud</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <div>
    <div class="cta">
      <div>
        <div><a href="https://your-subscribe-url/">Subscribe</a></div>
      </div>
    </div>
  </div>
`;

/**
 * Builds a fragment root from HTML.
 * @param {string} html Fragment markup
 * @returns {HTMLElement}
 */
function createFragment(html) {
  const wrap = document.createElement('main');
  wrap.innerHTML = html;
  return wrap;
}

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="currentColor" d="M0 0h10v10H0z"/></svg>';

/**
 * Fetch mock that serves header SVGs and optional extra URLs.
 * @param {(url: string) => object|undefined} [override]
 * @returns {Function}
 */
function mockHeaderFetch(override) {
  return jest.fn(async (url) => {
    const href = String(url);
    const extra = override?.(href);
    if (extra) return extra;
    if (href.endsWith('.svg')) {
      return { ok: true, text: async () => ICON_SVG };
    }
    return { ok: false, text: async () => '' };
  });
}

let desktopMatches = true;

/**
 * Creates a header block, appends it, and runs decorate.
 * @returns {Promise<HTMLElement>}
 */
async function decorateHeader() {
  const block = document.createElement('div');
  block.className = 'header';
  const header = document.createElement('header');
  header.append(block);
  document.body.append(header);
  await decorate(block);
  return block;
}

beforeAll(() => {
  window.hlx = { codeBasePath: '' };
  window.matchMedia = jest.fn((query) => ({
    get matches() {
      return query.includes('width < 48rem') ? !desktopMatches : desktopMatches;
    },
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});

describe('header block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    desktopMatches = true;
    document.body.innerHTML = '';
    getMetadata.mockReturnValue('');
    loadFragment.mockResolvedValue(createFragment(NAV_HTML));
    global.fetch = mockHeaderFetch();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads the default nav fragment when nav metadata is empty', async () => {
    await decorateHeader();

    expect(getMetadata).toHaveBeenCalledWith('nav');
    expect(loadFragment).toHaveBeenCalledWith('/fragments/nav');
  });

  it('loads a custom nav fragment from nav metadata', async () => {
    getMetadata.mockReturnValue('/fragments/custom-nav');

    await decorateHeader();

    expect(loadFragment).toHaveBeenCalledWith('/fragments/custom-nav');
  });

  it('renders lockup, links, and Subscribe', async () => {
    const block = await decorateHeader();

    expect(block.querySelector('.header__lockup')).toHaveAttribute('alt', 'Adobe Labs');
    expect(within(block).getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(within(block).getByRole('link', { name: 'Research' })).toHaveAttribute('href', '/research');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveAttribute('href', 'https://www.adobe.com/');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveClass('header__cta', 'button');
  });

  it('marks the matching path with aria-current', async () => {
    window.history.pushState({}, '', '/research');

    const block = await decorateHeader();

    expect(within(block).getByRole('link', { name: 'Research' })).toHaveAttribute('aria-current', 'page');
    expect(within(block).getByRole('link', { name: 'Workflows' })).not.toHaveAttribute('aria-current');
  });

  it('opens a desktop mega panel and closes on Escape and outside click', async () => {
    const block = await decorateHeader();
    const trigger = within(block).getByRole('button', { name: 'Products' });
    const panel = block.querySelector('#header-panel-2');

    trigger.click();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).not.toHaveAttribute('hidden');
    expect(within(panel).getByRole('link', { name: 'Photoshop' })).toBeInTheDocument();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('hidden');
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    document.body.click();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a leftover large-menu panel from a fetched same-origin doc', async () => {
    loadFragment.mockResolvedValue(createFragment(LARGE_MENU_HTML));
    global.fetch = mockHeaderFetch((href) => {
      if (href.includes('/fragments/menus/products.plain.html')) {
        return { ok: true, text: async () => MENU_DOC_HTML };
      }
      return undefined;
    });

    const block = await decorateHeader();
    const trigger = within(block).getByRole('button', { name: 'Products' });

    trigger.click();

    expect(global.fetch).toHaveBeenCalledWith('/fragments/menus/products.plain.html');
    expect(within(block).getByRole('link', { name: 'Photoshop' })).toBeInTheDocument();
  });

  it('does not throw when the nav fragment is missing', async () => {
    loadFragment.mockResolvedValue(null);
    const block = document.createElement('div');
    block.className = 'header';
    document.body.append(block);

    await expect(decorate(block)).resolves.toBeUndefined();
    expect(block.querySelector('.header__bar')).toBeNull();
  });

  it('opens and closes the mobile drawer and shows nested links', async () => {
    desktopMatches = false;
    const block = await decorateHeader();
    const toggle = within(block).getByRole('button', { name: 'Menu' });

    expect(block).not.toHaveClass('header--nav-open');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(block).getByRole('link', { name: 'Photoshop' })).toBeInTheDocument();
    expect(block.querySelector('#unav-app-switcher, .unav-comp-app-switcher, .feds-utilities')).toBeNull();
    expect(block.querySelector('.feds-signIn')).toBeNull();

    toggle.click();

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(block).toHaveClass('header--nav-open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(block).not.toHaveClass('header--nav-open');
  });

  it('parses leftover Milo brand, h2 links, and large-menu in document order', async () => {
    loadFragment.mockResolvedValue(createFragment(LEGACY_NAV_HTML));
    global.fetch = mockHeaderFetch((href) => {
      if (href.includes('/fragments/nav/explore.plain.html')) {
        return { ok: true, text: async () => MENU_DOC_HTML };
      }
      return undefined;
    });

    const block = await decorateHeader();
    const labels = [...block.querySelectorAll('.header__list > .header__item > .header__link')]
      .map((el) => el.textContent.trim());

    expect(within(block).getByRole('link', { name: 'Adobe Labs' })).toHaveAttribute('href', '/');
    expect(block.querySelector('svg.header__lockup')).toHaveAttribute('aria-label', 'Adobe Labs');
    expect(block.querySelector('svg.header__lockup path')).toHaveAttribute('fill', 'currentColor');
    expect(labels).toEqual(['Research', 'Workflows', 'Fragment Mega Menu', 'Inline Mega Menu']);
    expect(within(block).getByRole('link', { name: 'Research' })).toHaveAttribute('href', '/research/');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveAttribute('href', 'https://your-subscribe-url/');
    expect(within(block).queryByRole('link', { name: /logo\.svg/ })).toBeNull();

    within(block).getByRole('button', { name: 'Inline Mega Menu' }).click();
    expect(within(block).getByRole('link', { name: 'Creative Cloud' })).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Inline Mega Menu' })).toHaveAttribute('aria-expanded', 'true');

    within(block).getByRole('button', { name: 'Fragment Mega Menu' }).click();
    expect(within(block).getByRole('link', { name: 'Photoshop' })).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Fragment Mega Menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(block).getByRole('button', { name: 'Inline Mega Menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('uses inlined large-menu headings when the h2 trigger was replaced', async () => {
    loadFragment.mockResolvedValue(createFragment(`
      <div class="gnav-brand"><p><a href="/">Adobe Labs</a></p></div>
      <div class="large-menu">
        <h5>Explore</h5>
        <ul><li><a href="/explore/one">One</a></li></ul>
        <h5>Get involved</h5>
        <ul><li><a href="/explore/two">Two</a></li></ul>
      </div>
    `));

    const block = await decorateHeader();
    const trigger = within(block).getByRole('button', { name: 'Explore' });

    trigger.click();

    expect(within(block).getByRole('link', { name: 'One' })).toHaveAttribute('href', '/explore/one');
    expect(within(block).getByRole('link', { name: 'Two' })).toHaveAttribute('href', '/explore/two');
  });
});
