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
const MENU_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <path class="header__toggle-line header__toggle-line--top" d="M3 7h14v1.5H3z"/>
    <path class="header__toggle-line header__toggle-line--bottom" d="M3 12h14v1.5H3z"/>
  </svg>
`;

/**
 * Fetch mock that serves header SVGs.
 * @returns {Function}
 */
function mockHeaderFetch() {
  return jest.fn(async (url) => {
    const href = String(url);
    if (href.endsWith('menu.svg')) {
      return { ok: true, text: async () => MENU_SVG };
    }
    if (href.endsWith('.svg')) {
      return { ok: true, text: async () => ICON_SVG };
    }
    return { ok: false, text: async () => '' };
  });
}

let desktopMatches = true;
let mediaChangeHandlers = [];
let observerInstances = [];

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

/**
 * First-section full-screen hero used for overlay / inverse tests.
 * @returns {HTMLElement}
 */
function addFirstSectionFullScreenHero() {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section hero-container';
  const hero = document.createElement('div');
  hero.className = 'hero hero-full-screen';
  section.append(hero);
  main.append(section);
  document.body.append(main);
  return hero;
}

beforeAll(() => {
  window.hlx = { codeBasePath: '' };
  window.matchMedia = jest.fn((query) => ({
    get matches() {
      return query.includes('width >= 48rem') ? desktopMatches : !desktopMatches;
    },
    media: query,
    addEventListener: jest.fn((event, handler) => {
      if (event === 'change') mediaChangeHandlers.push(handler);
    }),
    removeEventListener: jest.fn((event, handler) => {
      mediaChangeHandlers = mediaChangeHandlers.filter((fn) => fn !== handler);
    }),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  global.IntersectionObserver = jest.fn(function MockIntersectionObserver(callback, options) {
    this.callback = callback;
    this.options = options || {};
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    this.unobserve = jest.fn();
    observerInstances.push(this);
  });
});

describe('header block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    desktopMatches = true;
    mediaChangeHandlers = [];
    observerInstances = [];
    document.body.innerHTML = '';
    document.documentElement.classList.remove('header-scroll-lock');
    getMetadata.mockReturnValue('');
    loadFragment.mockResolvedValue(createFragment(NAV_HTML));
    global.fetch = mockHeaderFetch();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.classList.remove('header-scroll-lock');
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

  it('renders the logo, links, and Subscribe', async () => {
    const block = await decorateHeader();

    expect(block.querySelector('.header__logo-desktop')).toHaveAttribute('alt', '');
    expect(within(block).getByRole('link', { name: 'Adobe Labs' })).toBeInTheDocument();
    expect(within(document.body).getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(within(block).getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(within(block).getByRole('link', { name: 'Research' })).toHaveAttribute('href', '/research');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveAttribute('href', 'https://www.adobe.com/');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveClass('header__cta', 'button');
    expect(within(block).getByRole('button', { name: 'Products' })).not.toHaveAttribute('aria-haspopup');
    expect(within(block).getByRole('button', { name: 'Products' }).querySelector('.header__chevron')).toHaveAttribute('aria-hidden', 'true');
    expect(within(block).getByRole('link', { name: 'Research' }).querySelector('.header__chevron')).toBeNull();
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
    expect(within(block).queryByRole('button', { name: 'Products' })).toBeNull();
    expect(block.querySelector('.header__trigger')).toHaveAttribute('hidden');
    expect(block.querySelector('.header__menu-label')).not.toHaveAttribute('hidden');
    expect(block.querySelector('.header__menu-label')).toHaveTextContent('Products');
    expect(block.querySelector('#header-panel-2')).not.toHaveAttribute('hidden');
    expect(block.querySelector('#header-panel-2')).toHaveAttribute('role', 'group');
    expect(block.querySelector('#header-panel-2')).toHaveAttribute('aria-label', 'Products');
    expect(within(block).getByRole('link', { name: 'Photoshop' })).toBeInTheDocument();
    expect(block.querySelector('#unav-app-switcher, .unav-comp-app-switcher, .feds-utilities')).toBeNull();
    expect(block.querySelector('.feds-signIn')).toBeNull();

    toggle.click();

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(block).getByRole('button', { name: 'Close menu' })).toBe(toggle);
    expect(block).toHaveClass('header--nav-open');
    expect(toggle.querySelector('.header__toggle-line--top')).not.toBeNull();
    expect(toggle.querySelector('.header__toggle-line--bottom')).not.toBeNull();
    expect(within(block).getByRole('link', { name: 'Photoshop' })).toBeInTheDocument();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(block).getByRole('button', { name: 'Menu' })).toBe(toggle);
    expect(block).not.toHaveClass('header--nav-open');
  });

  it('drops javascript: hrefs and HTML tags from nav labels', async () => {
    loadFragment.mockResolvedValue(createFragment(`
      <div>
        <p><a href="/">Adobe Labs</a></p>
        <ul>
          <li><a href="javascript:alert(1)">XSS</a></li>
          <li><a href="/safe">A <em>nested</em> label</a></li>
        </ul>
      </div>
    `));

    const block = await decorateHeader();
    const safe = within(block).getByRole('link', { name: 'A nested label' });

    expect(within(block).queryByRole('link', { name: 'XSS' })).toBeNull();
    expect(safe).toHaveAttribute('href', '/safe');
    expect(safe.innerHTML).toBe('A nested label');
  });

  it('does not use javascript: brand image sources', async () => {
    loadFragment.mockResolvedValue(createFragment(`
      <p><a href="/"><img src="javascript:alert(1)" alt="Adobe Labs"></a></p>
      <ul><li><a href="/research">Research</a></li></ul>
    `));

    const block = await decorateHeader();

    expect(block.querySelector('img.header__logo-desktop')).toBeNull();
    expect(block.querySelector('svg.header__logo-desktop')).toHaveAttribute('aria-hidden', 'true');
    expect(within(block).getByRole('link', { name: 'Adobe Labs' })).toBeInTheDocument();
  });

  it('hides mega-menu triggers and shows static labels at the mobile breakpoint', async () => {
    const block = await decorateHeader();
    const panel = block.querySelector('#header-panel-2');
    const trigger = within(block).getByRole('button', { name: 'Products' });

    expect(trigger).toBeInTheDocument();
    expect(panel).toHaveAttribute('hidden');

    desktopMatches = false;
    mediaChangeHandlers.forEach((handler) => handler());

    expect(within(block).queryByRole('button', { name: 'Products' })).toBeNull();
    expect(trigger).toHaveAttribute('hidden');
    expect(block.querySelector('.header__menu-label')).not.toHaveAttribute('hidden');
    expect(block.querySelector('.header__menu-label')).toHaveTextContent('Products');
    expect(panel).not.toHaveAttribute('hidden');
    expect(panel).toHaveAttribute('role', 'group');
    expect(panel).toHaveAttribute('aria-label', 'Products');
    expect(within(block).getByRole('link', { name: 'Photoshop' })).toBeInTheDocument();
  });

  it('applies inverse chrome over a first-section full-screen hero', async () => {
    window.history.pushState({}, '', '/sneaks/clip');
    addFirstSectionFullScreenHero();

    const block = await decorateHeader();

    expect(block).toHaveClass('header--inverse');
    expect(block).not.toHaveClass('header--scrolled');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveClass('button--static-white');
  });

  it('frosts the overlay bar once the page has scrolled', async () => {
    addFirstSectionFullScreenHero();

    const block = await decorateHeader();
    const scrollObserver = observerInstances.find((obs) => !obs.options.rootMargin);

    expect(block).toHaveClass('header--inverse');
    expect(block).not.toHaveClass('header--scrolled');
    expect(document.querySelector('.header-scroll-sentinel')).not.toBeNull();
    expect(scrollObserver).toBeDefined();

    scrollObserver.callback([{ isIntersecting: false }]);

    expect(block).toHaveClass('header--scrolled');

    scrollObserver.callback([{ isIntersecting: true }]);

    expect(block).not.toHaveClass('header--scrolled');
  });

  it('does not invert without a first-section full-screen hero', async () => {
    const block = await decorateHeader();

    expect(block).not.toHaveClass('header--inverse');
    expect(block).not.toHaveClass('header--scrolled');
    expect(document.querySelector('.header-scroll-sentinel')).toBeNull();
    expect(within(block).getByRole('link', { name: 'Subscribe' })).not.toHaveClass('button--static-white');
  });

  it('drops inverse when the full-screen hero scrolls away', async () => {
    addFirstSectionFullScreenHero();

    const block = await decorateHeader();

    expect(block).toHaveClass('header--inverse');
    const heroObserver = observerInstances.find((obs) => obs.options.rootMargin);
    expect(heroObserver).toBeDefined();

    heroObserver.callback([{ isIntersecting: false }]);

    expect(block).not.toHaveClass('header--inverse');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).not.toHaveClass('button--static-white');

    heroObserver.callback([{ isIntersecting: true }]);

    expect(block).toHaveClass('header--inverse');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveClass('button--static-white');
  });

  it('locks document scroll while the mobile drawer is open', async () => {
    desktopMatches = false;
    const block = await decorateHeader();
    const toggle = within(block).getByRole('button', { name: 'Menu' });

    toggle.click();

    expect(block).toHaveClass('header--nav-open');
    expect(document.documentElement).toHaveClass('header-scroll-lock');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(block).not.toHaveClass('header--nav-open');
    expect(document.documentElement).not.toHaveClass('header-scroll-lock');
  });

  it('inerts page content while the mobile drawer is open', async () => {
    desktopMatches = false;
    const main = document.createElement('main');
    const pageLink = document.createElement('a');
    pageLink.href = '/research';
    pageLink.textContent = 'In page';
    main.append(pageLink);
    document.body.append(main);

    const block = await decorateHeader();
    const toggle = within(block).getByRole('button', { name: 'Menu' });

    toggle.click();

    expect(main.inert).toBe(true);
    expect(block.closest('header').inert).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(main.inert).toBe(false);
  });

  it('closes the mobile drawer when the skip link is used', async () => {
    desktopMatches = false;
    const main = document.createElement('main');
    document.body.append(main);

    const block = await decorateHeader();
    const toggle = within(block).getByRole('button', { name: 'Menu' });
    toggle.click();

    expect(block).toHaveClass('header--nav-open');
    expect(main.inert).toBe(true);

    within(document.body).getByRole('link', { name: 'Skip to main content' }).click();

    expect(block).not.toHaveClass('header--nav-open');
    expect(main.inert).toBe(false);
  });

  it('parses a nav nested under the brand list item', async () => {
    loadFragment.mockResolvedValue(createFragment(`
      <ul>
        <li>
          <a href="/"><img src="/logo.svg" alt="Adobe Labs"></a>
          <ul>
            <li><a href="/research">Research</a></li>
            <li>
              <a href="/products">Products</a>
              <ul>
                <li><a href="/products/photoshop">Photoshop</a></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><a class="button" href="https://www.adobe.com/">Subscribe</a></li>
      </ul>
    `));

    const block = await decorateHeader();

    expect(within(block).getByRole('link', { name: 'Adobe Labs' })).toHaveAttribute('href', '/');
    expect(within(block).getByRole('link', { name: 'Research' })).toHaveAttribute('href', '/research');
    expect(within(block).getByRole('button', { name: 'Products' })).toBeInTheDocument();
    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveClass('header__cta');
  });

  it('keeps a Subscribe nav item when the CTA is a sibling button', async () => {
    loadFragment.mockResolvedValue(createFragment(`
      <p><a href="/">Adobe Labs</a></p>
      <ul>
        <li><a href="/research">Research</a></li>
        <li><a href="/subscribe">Subscribe</a></li>
      </ul>
      <p><a class="button" href="https://www.adobe.com/">Join</a></p>
    `));

    const block = await decorateHeader();

    expect(within(block).getByRole('link', { name: 'Subscribe' })).toHaveAttribute('href', '/subscribe');
    expect(within(block).getByRole('link', { name: 'Subscribe' })).not.toHaveClass('header__cta');
    expect(within(block).getByRole('link', { name: 'Join' })).toHaveClass('header__cta');
  });
});
