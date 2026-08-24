import { within } from '@testing-library/dom';
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

jest.mock('../../scripts/aem.js', () => ({
  getMetadata: jest.fn(() => ''),
}));

jest.mock('../fragment/fragment.js', () => ({
  loadFragment: jest.fn(),
}));

let desktopMatches = false;
let decorate;

function createFragment(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  return wrap;
}

function createNavFragment() {
  return createFragment(`
    <div class="section">
      <div class="default-content-wrapper">
        <p class="button-container"><a class="button" href="/">Adobe Labs</a></p>
      </div>
    </div>
    <div class="section">
      <div class="default-content-wrapper">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/products">Products</a>
            <ul><li><a href="/p1">One</a></li></ul>
          </li>
        </ul>
      </div>
    </div>
    <div class="section">
      <div class="default-content-wrapper"><p>Search</p></div>
    </div>
  `);
}

async function decorateHeader({ append = false } = {}) {
  const block = document.createElement('div');
  block.innerHTML = '<p>Placeholder</p>';
  if (append) document.body.append(block);
  await decorate(block);
  return block;
}

function getNav(block) {
  return block.querySelector('#nav');
}

beforeAll(() => {
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

  // eslint-disable-next-line global-require
  decorate = require('./header.js').default;
});

describe('header block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    desktopMatches = false;
    document.body.innerHTML = '';
    document.body.style.overflowY = '';
    getMetadata.mockReturnValue('');
    loadFragment.mockResolvedValue(createNavFragment());
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

  it('decorates nav structure from the loaded fragment', async () => {
    const block = await decorateHeader();
    const nav = getNav(block);

    expect(block.querySelector('p')).not.toHaveTextContent('Placeholder');
    expect(block.querySelector('.nav-wrapper')).toBe(nav.parentElement);
    expect(nav.querySelector('.nav-hamburger button')).toHaveAttribute('aria-controls', 'nav');
    expect(nav.children[1]).toHaveClass('nav-brand');
    expect(nav.children[2]).toHaveClass('nav-sections');
    expect(nav.children[3]).toHaveClass('nav-tools');
  });

  it('strips button classes from the brand link', async () => {
    const block = await decorateHeader();
    const brandLink = getNav(block).querySelector('.nav-brand a');

    expect(brandLink).not.toHaveClass('button');
    expect(brandLink.closest('.button-container')).toBeNull();
  });

  it('adds nav-drop to sections with nested lists', async () => {
    const block = await decorateHeader();
    const sections = getNav(block).querySelectorAll('.nav-sections li');

    expect(sections[0]).not.toHaveClass('nav-drop');
    expect(sections[1]).toHaveClass('nav-drop');
  });

  it('toggles the mobile menu on hamburger click', async () => {
    const block = await decorateHeader();
    const scope = within(block);

    scope.getByRole('button', { name: 'Open navigation' }).click();

    expect(scope.getByRole('navigation')).toHaveAttribute('aria-expanded', 'true');
    expect(scope.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-label', 'Close navigation');
    expect(document.body.style.overflowY).toBe('hidden');

    scope.getByRole('button', { name: 'Close navigation' }).click();

    expect(scope.getByRole('navigation')).toHaveAttribute('aria-expanded', 'false');
    expect(scope.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-label', 'Open navigation');
    expect(document.body.style.overflowY).toBe('');
  });

  it('toggles nav-drop aria-expanded on desktop click', async () => {
    desktopMatches = true;
    const block = await decorateHeader();
    const navDrop = getNav(block).querySelector('.nav-drop');

    navDrop.click();

    expect(navDrop).toHaveAttribute('aria-expanded', 'true');

    navDrop.click();

    expect(navDrop).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile menu on Escape', async () => {
    const block = await decorateHeader({ append: true });
    const scope = within(block);

    scope.getByRole('button', { name: 'Open navigation' }).click();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));

    expect(scope.getByRole('navigation')).toHaveAttribute('aria-expanded', 'false');
    expect(scope.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-label', 'Open navigation');
  });

  it('closes expanded nav sections on desktop Escape', async () => {
    desktopMatches = true;
    const block = await decorateHeader({ append: true });
    const navDrop = getNav(block).querySelector('.nav-drop');

    navDrop.click();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }));

    expect(navDrop).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile menu on focus lost', async () => {
    const block = await decorateHeader();
    const scope = within(block);
    const nav = scope.getByRole('navigation');

    scope.getByRole('button', { name: 'Open navigation' }).click();

    nav.dispatchEvent(new FocusEvent('focusout', {
      bubbles: true,
      relatedTarget: document.body,
    }));

    expect(nav).toHaveAttribute('aria-expanded', 'false');
  });
});
