/**
 * Header block tests. Fixtures follow the Milo gnav content shape.
 */
import { within } from '@testing-library/dom';
import { getMetadata, loadCSS } from '../../scripts/aem.js';

jest.mock('../../scripts/aem.js', () => ({
  getMetadata: jest.fn(() => ''),
  loadCSS: jest.fn(() => Promise.resolve()),
  loadBlock: jest.fn(() => Promise.resolve()),
  loadScript: jest.fn(() => Promise.resolve()),
}));

let desktopMatches = true;
let decorate;

/**
 * Federal-shaped nav fragment used by most header tests.
 * @type {string}
 */
const GNAV_HTML = `
  <div class="adobe-logo">
    <p><a href="/"><img src="/logo.svg" alt="Adobe, Inc."></a></p>
  </div>
  <div class="gnav-brand">
    <p><a href="/">Adobe</a></p>
  </div>
  <div class="large-menu">
    <div>
      <h2><a href="/products">Products</a></h2>
    </div>
  </div>
  <p><a href="https://www.adobe.com/creativecloud/plans.html">Plans</a></p>
`;

/**
 * Nav fragment that includes a CMS-authored Subscribe CTA.
 * @type {string}
 */
const GNAV_WITH_CTA_HTML = `
  ${GNAV_HTML}
  <div class="cta">
    <div>
      <div><p><a href="https://www.adobe.com/">Subscribe</a></p></div>
    </div>
  </div>
`;

/**
 * Builds a fetch-like Response stub.
 * @param {number} status HTTP status
 * @param {string} [html=''] Response body
 * @returns {{
 *   status: number,
 *   ok: boolean,
 *   statusText: string,
 *   url: string,
 *   text: function(): Promise<string>,
 *   clone: function(): object,
 * }}
 */
function jsonResponse(status, html = '') {
  return {
    status,
    ok: status === 200,
    statusText: status === 200 ? 'OK' : 'Not Found',
    url: '',
    text: async () => html,
    clone() {
      return jsonResponse(status, html);
    },
  };
}

/**
 * Polls until `predicate` is true or `timeout` elapses.
 * @param {function(): boolean} predicate Condition to wait for
 * @param {number} [timeout=2000] Timeout in milliseconds
 * @returns {Promise<void>}
 */
async function waitFor(predicate, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
  throw new Error('Timed out waiting for header decoration');
}

/**
 * Creates a header block, runs decorate, and waits for the Milo topnav.
 * @param {{ append?: boolean }} [options]
 * @param {boolean} [options.append] Unused; block is always appended to `document.body`
 * @returns {Promise<HTMLElement>} Decorated header block
 */
async function decorateHeader({ append = false } = {}) {
  const block = document.createElement('div');
  block.className = 'header';
  block.innerHTML = '<p>Placeholder</p>';
  const header = document.createElement('header');
  header.append(block);
  if (append) document.body.append(header);
  else document.body.append(header);
  await decorate(block);
  await waitFor(() => block.querySelector('.feds-topnav') || !block.querySelector('p'));
  return block;
}

beforeAll(() => {
  window.hlx = { codeBasePath: '' };
  window.performance = window.performance || {};
  window.performance.mark = jest.fn();
  window.performance.measure = jest.fn(() => ({
    name: '',
    startTime: 0,
    duration: 0,
  }));
  window.performance.getEntriesByName = jest.fn(() => []);
  window.matchMedia = jest.fn(() => ({
    get matches() {
      return desktopMatches;
    },
    media: '(min-width: 900px)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // eslint-disable-next-line global-require
  decorate = require('./header.js').default;
});

describe('header block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    desktopMatches = true;
    document.body.innerHTML = '';
    getMetadata.mockImplementation((name) => (name === 'nav' ? '' : ''));
    global.fetch = jest.fn(async (url) => {
      const href = String(url);
      if (href.includes('/fragments/nav.plain.html') || href.includes('/fragments/custom-nav.plain.html')) {
        return jsonResponse(200, GNAV_HTML);
      }
      return jsonResponse(404);
    });
    loadCSS.mockResolvedValue();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('loads the default nav fragment when nav metadata is empty', async () => {
    await decorateHeader();

    expect(getMetadata.mock.calls.some(([name]) => name === 'nav')).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/fragments\/nav\.plain\.html$/),
    );
    // cssPromise is a module singleton — assert on the first decorate in this file.
    expect(loadCSS).toHaveBeenCalledWith(
      expect.stringMatching(/\/blocks\/header\/gnav\/base\.css$/),
    );
    expect(loadCSS).toHaveBeenCalledWith(
      expect.stringMatching(/\/blocks\/header\/gnav\/global-navigation\.css$/),
    );
  });

  it('loads a custom nav fragment from nav metadata', async () => {
    getMetadata.mockImplementation((name) => (name === 'nav' ? '/fragments/custom-nav' : ''));

    await decorateHeader();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/fragments\/custom-nav\.plain\.html$/),
    );
  });

  it('renders logo, brand, and top-level items from gnav content', async () => {
    const block = await decorateHeader();
    const headerEl = block.closest('header');

    expect(block).toHaveClass('global-navigation');
    expect(headerEl).toHaveClass('global-navigation');
    expect(headerEl).toHaveClass('ready');
    expect(block.querySelector('.feds-logo, .feds-brand')).not.toBeNull();
    expect(within(block).getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Products' })).toBeInTheDocument();
  });

  it('opens a desktop dropdown on trigger click and closes on outside click', async () => {
    const block = await decorateHeader({ append: true });
    const trigger = within(block).getByRole('button', { name: 'Products' });

    trigger.click();
    await waitFor(() => trigger.getAttribute('aria-expanded') === 'true');

    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    document.body.click();
    await waitFor(() => trigger.getAttribute('aria-expanded') === 'false');

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not throw when the nav fragment is missing', async () => {
    global.fetch.mockResolvedValue(jsonResponse(404));
    const block = document.createElement('div');
    block.className = 'header';
    document.body.append(block);

    await expect(decorate(block)).resolves.toBeUndefined();
    expect(block.querySelector('.feds-topnav')).toBeNull();
  });

  it('renders mobile logo and hamburger without an app switcher', async () => {
    desktopMatches = false;
    const block = await decorateHeader();
    const headerEl = block.closest('header');

    expect(headerEl).toHaveClass('new-nav');
    expect(block.querySelector('.feds-brand, .feds-logo')).not.toBeNull();
    expect(within(block).getByRole('button', { name: 'Navigation menu' })).toBeInTheDocument();
    expect(block.querySelector('.feds-signIn')).toBeNull();
    expect(block.querySelector('#unav-app-switcher, .unav-comp-app-switcher, .feds-utilities')).toBeNull();
  });

  it('renders a CMS-authored Subscribe CTA from the cta block', async () => {
    desktopMatches = false;
    global.fetch = jest.fn(async (url) => {
      const href = String(url);
      if (href.includes('/fragments/nav.plain.html')) {
        return jsonResponse(200, GNAV_WITH_CTA_HTML);
      }
      return jsonResponse(404);
    });

    const block = await decorateHeader();
    const cta = within(block).getByRole('link', { name: 'Subscribe' });

    expect(cta).toHaveAttribute('href', 'https://www.adobe.com/');
    expect(cta).toHaveClass('button');
  });
});
