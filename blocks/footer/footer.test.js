import { within } from '@testing-library/dom';
import { getMetadata } from '../../scripts/aem.js';
import { holdLogoEntry } from '../../scripts/utils/entry-progress.js';
import { loadFragment } from '../fragment/fragment.js';
import decorate from './footer.js';

jest.mock('../../scripts/aem.js', () => ({
  getMetadata: jest.fn(() => ''),
}));

jest.mock('../fragment/fragment.js', () => ({
  loadFragment: jest.fn(),
}));

const FOOTER_FRAGMENT = `
  <div class="section">
    <div><div class="footer-newsletter">
      <h2>New research, in your inbox.</h2>
      <p>We publish new AI research as it's ready.</p>
      <p class="button-wrapper"><a class="button primary" href="https://example.com/subscribe" title="Subscribe">Subscribe</a></p>
    </div></div>
    <div><div>
      <h2>Connect</h2>
      <p><a href="/collaborate">Collaborate</a></p>
      <p><a href="/reuse" title="Reuse it responsibly">Reuse</a></p>
    </div></div>
    <div><div>
      <h2>Explore</h2>
      <p><a href="/research" title="Research">Research</a></p>
      <p><a href="https://labs.adobe.com/research">Labs</a></p>
      <p><a href="https://main--adobe-labs-website--adobe.aem.page/research">Preview</a></p>
      <p><a href="https://research.adobe.com/" target="_blank">Adobe Research</a></p>
    </div></div>
  </div>
  <div class="section">
    <div class="default-content-wrapper">
      <p><strong>Social</strong></p>
      <ul>
        <li><a href="https://facebook.com/adobe">Facebook</a></li>
        <li><a href="https://linkedin.com/company/adobe">LinkedIn</a></li>
        <li><a href="https://instagram.com/adobe">Instagram</a></li>
        <li><a href="https://x.com/adobe">X</a></li>
      </ul>
    </div>
  </div>
  <div class="section">
    <div class="default-content-wrapper">
      <p><em>All rights reserved.</em></p>
      <p><a href="https://www.adobe.com/privacy/opt-out.html" title="Do not sell or share my personal information">Do not sell or share my personal information</a></p>
      <p><a href="#interest-based-ads" title="AdChoices">AdChoices</a></p>
    </div>
  </div>
`;

function createFragment(html) {
  const wrap = document.createElement('main');
  wrap.innerHTML = html;
  return wrap;
}

describe('footer block', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMetadata.mockReturnValue('');
    loadFragment.mockResolvedValue(createFragment(FOOTER_FRAGMENT));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<svg><symbol id="footer-icon-facebook"></symbol></svg>'),
    });
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(min-width: 64rem)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));
    document.documentElement.dataset.theme = 'dark';
  });

  it('loads the default footer fragment when footer metadata is empty', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(getMetadata).toHaveBeenCalledWith('footer');
    expect(loadFragment).toHaveBeenCalledWith('/fragments/footer');
  });

  it('labels the surrounding footer landmark for assistive tech', async () => {
    const footerEl = document.createElement('footer');
    const block = document.createElement('div');
    block.className = 'footer';
    footerEl.append(block);

    await decorate(block);

    expect(footerEl).toHaveAttribute('aria-label');
  });

  it('loads a custom footer fragment from footer metadata', async () => {
    getMetadata.mockReturnValue('/fragments/custom-footer');
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(loadFragment).toHaveBeenCalledWith('/fragments/custom-footer');
  });

  it('shows an authored button in the newsletter column', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    const button = within(block).getByRole('link', { name: 'Subscribe' });
    expect(button).toHaveClass('button', 'button--static-white');
    expect(button).toHaveAttribute('href', 'https://example.com/subscribe');
    expect(button).not.toHaveAttribute('title');
    expect(button.closest('.button-wrapper')).toBeTruthy();
    expect(button.closest('.footer__menu-column--newsletter')).toBeTruthy();
    expect(block.querySelector('.footer__form')).toBeNull();
  });

  it('parses menu columns from h2 groups', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(block.querySelectorAll('.footer__menu-column')).toHaveLength(3);
    expect(block.querySelector('.footer__menu').children).toHaveLength(2);
    expect(block.querySelector('.footer__menu-nav')).toBeTruthy();
    expect(block.querySelector('.footer__menu-column--newsletter')).toBeTruthy();
    expect(block.querySelector('.footer__menu-column--newsletter .footer__menu-headline').tagName).toBe('H2');
    expect(block).toHaveTextContent('Connect');
    expect(block).toHaveTextContent('Collaborate');
    expect(block).toHaveTextContent('Research');
  });

  it('adds an external-link icon only on menu links that leave this site', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    const external = within(block).getByRole('link', { name: 'Adobe Research (opens in a new tab)' });
    expect(external.querySelector('.footer__external-icon')).toBeTruthy();
    expect(external.querySelector('.visually-hidden')).toHaveTextContent('(opens in a new tab)');
    expect(block.querySelectorAll('.footer__external-icon')).toHaveLength(1);
    expect(within(block).getByRole('link', { name: 'Research' }).querySelector('.footer__external-icon')).toBeNull();
    expect(within(block).getByRole('link', { name: 'Labs' }).querySelector('.footer__external-icon')).toBeNull();
    expect(within(block).getByRole('link', { name: 'Preview' }).querySelector('.footer__external-icon')).toBeNull();
    expect(within(block).getByRole('link', { name: 'Subscribe' }).querySelector('.footer__external-icon')).toBeNull();
  });

  it('strips redundant title attributes that just repeat the link text', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    const researchLink = within(block).getByText('Research');
    expect(researchLink).not.toHaveAttribute('title');

    const reuseLink = within(block).getByText('Reuse');
    expect(reuseLink).toHaveAttribute('title', 'Reuse it responsibly');
  });

  it('renders social links with icons and accessible names', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(block.querySelectorAll('.footer__social-link')).toHaveLength(4);
    expect(block.querySelector('a[aria-label^="Facebook"] .footer__social-icon use'))
      .toHaveAttribute('href', '#footer-icon-facebook');
    expect(block.querySelector('a[aria-label^="LinkedIn"]')).toHaveAttribute(
      'href',
      'https://linkedin.com/company/adobe',
    );
    expect(block.querySelector('a[aria-label^="X"] .footer__social-icon use'))
      .toHaveAttribute('href', '#footer-icon-x');
  });

  it('inserts the current year in the copyright line', async () => {
    const block = document.createElement('div');
    block.className = 'footer';
    const year = new Date().getFullYear();

    await decorate(block);

    expect(block).toHaveTextContent(`© ${year} Adobe Inc. All rights reserved.`);
    expect(block).toHaveTextContent('Do not sell or share my personal information');
    expect(block.querySelector('.footer__adchoices-icon')).toBeTruthy();
    expect(block.querySelector('.footer__mark-image')).toBeTruthy();

    const privacyLinks = block.querySelectorAll('.footer__privacy-link');
    privacyLinks.forEach((link) => expect(link).not.toHaveAttribute('title'));
  });

  it('assembles the footer wrapper with the Adobe logo', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(block.querySelector('.footer__inner')).toBeTruthy();
    expect(block.querySelector('.footer__inner').nextElementSibling).toHaveClass('footer__logo');
    expect(block.querySelector('.footer__logo-image')).toHaveAttribute('alt', 'Adobe');
    expect(block.querySelector('.footer__logo')).toBeTruthy();
  });

  it('registers scroll listeners for the logo rise', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    addSpy.mockRestore();
  });

  it('sets logo entry progress from the footer inner', async () => {
    const block = document.createElement('div');
    block.className = 'footer';
    document.body.append(block);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });

    await decorate(block);

    const logo = block.querySelector('.footer__logo');
    const inner = block.querySelector('.footer__inner');
    Object.defineProperty(logo, 'offsetHeight', { configurable: true, value: 240 });
    inner.getBoundingClientRect = () => ({ bottom: 680 });
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });

    try {
      window.dispatchEvent(new Event('scroll'));
      expect(logo.style.getPropertyValue('--footer-logo-entry-progress')).toBe('-50');
    } finally {
      raf.mockRestore();
      block.remove();
    }
  });

  it('measures the logo once per resize, not once per scroll frame', async () => {
    const block = document.createElement('div');
    block.className = 'footer';
    document.body.append(block);

    await decorate(block);

    const logo = block.querySelector('.footer__logo');
    let reads = 0;
    Object.defineProperty(logo, 'offsetHeight', {
      configurable: true,
      get() {
        reads += 1;
        return 400;
      },
    });
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });

    try {
      for (let i = 0; i < 5; i += 1) window.dispatchEvent(new Event('scroll'));

      expect(reads).toBe(1);

      window.dispatchEvent(new Event('resize'));

      expect(reads).toBe(2);
    } finally {
      raf.mockRestore();
      block.remove();
    }
  });

  it('skips the logo measurement while section scroll owns the rise', async () => {
    const block = document.createElement('div');
    block.className = 'footer';
    document.body.append(block);

    await decorate(block);

    const logo = block.querySelector('.footer__logo');
    let reads = 0;
    Object.defineProperty(logo, 'offsetHeight', {
      configurable: true,
      get() {
        reads += 1;
        return 240;
      },
    });
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
    holdLogoEntry(true);
    const before = logo.style.getPropertyValue('--footer-logo-entry-progress');

    try {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
      expect(reads).toBe(0);
      expect(logo.style.getPropertyValue('--footer-logo-entry-progress')).toBe(before);
    } finally {
      holdLogoEntry(false);
      raf.mockRestore();
      block.remove();
    }
  });

  it('toggles mobile accordion sections on toggle button click', async () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const block = document.createElement('div');
    block.className = 'footer';
    document.body.append(block);

    await decorate(block);

    const heading = block.querySelector('.footer__menu-column--nav .footer__menu-headline');
    const toggle = heading.querySelector('.footer__menu-toggle');
    const items = toggle.closest('.footer__menu-section').querySelector('.footer__menu-items');

    expect(heading.tagName).toBe('H2');
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', items.id);
    expect(toggle).not.toHaveAttribute('aria-haspopup');
    expect(items).toHaveAttribute('hidden');

    toggle.click();

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(items).not.toHaveAttribute('hidden');

    block.remove();
  });

  it('keeps the heading role intact and disables the toggle on desktop', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    const heading = block.querySelector('.footer__menu-column--nav .footer__menu-headline');
    const toggle = heading.querySelector('.footer__menu-toggle');
    const items = toggle.closest('.footer__menu-section').querySelector('.footer__menu-items');

    expect(heading.tagName).toBe('H2');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('tabindex', '-1');
    expect(items).not.toHaveAttribute('hidden');
  });

  it('renders each nav column as its own labelled navigation landmark', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    const columns = block.querySelectorAll('.footer__menu-column--nav');
    expect(columns.length).toBeGreaterThan(0);

    columns.forEach((column) => {
      const nav = column.querySelector('.footer__menu-section');
      const heading = nav.querySelector(':scope > h2');
      expect(nav.tagName).toBe('NAV');
      expect(heading.id).toBeTruthy();
      expect(nav).toHaveAttribute('aria-labelledby', heading.id);

      const items = nav.querySelector('.footer__menu-items');
      expect(items.tagName).toBe('UL');
      expect(items.querySelectorAll(':scope > li').length).toBeGreaterThan(0);
      expect(items.querySelector('li > .footer__menu-link')).toBeTruthy();
    });

    const headingIds = [...columns].map((c) => c.querySelector('h2').id);
    expect(new Set(headingIds).size).toBe(headingIds.length);
  });

  describe('skip links', () => {
    function appendHeaderNav({ open }) {
      const header = document.createElement('header');
      header.innerHTML = `
        <button type="button" class="header__toggle" aria-controls="header-nav" aria-expanded="false"></button>
        <nav class="header__nav" id="header-nav" aria-label="Main"></nav>
      `;
      const nav = header.querySelector('#header-nav');
      const toggle = header.querySelector('.header__toggle');
      nav.style.display = open ? 'block' : 'none';
      toggle.addEventListener('click', () => {
        nav.style.display = 'block';
        toggle.setAttribute('aria-expanded', 'true');
      });
      document.body.append(header);
      return { nav, toggle };
    }

    // The skip links are inserted as siblings of <footer>, not descendants of
    // it (see footer.js), so a real <footer> landmark in the DOM is required
    // for them to appear at all.
    function appendFooterBlock() {
      const footerEl = document.createElement('footer');
      const block = document.createElement('div');
      block.className = 'footer';
      footerEl.append(block);
      document.body.append(footerEl);
      return block;
    }

    afterEach(() => {
      document.querySelectorAll('header, footer, .footer__skip-links').forEach((el) => el.remove());
    });

    it('adds a labelled skip-links landmark, as a sibling before the footer landmark', async () => {
      const block = appendFooterBlock();

      await decorate(block);

      const footerEl = block.closest('footer');
      const skipNav = footerEl.previousElementSibling;
      expect(skipNav).toHaveClass('footer__skip-links');
      expect(skipNav.tagName).toBe('NAV');
      expect(skipNav).toHaveAttribute('aria-label', 'Skip links');

      const links = skipNav.querySelectorAll('a.footer__skip');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', '#main');
      expect(links[0]).toHaveTextContent('Skip to content');
      expect(links[1]).toHaveAttribute('href', '#header-nav');
      expect(links[1]).toHaveTextContent('Skip to navigation');
    });

    it('scrolls the footer into view when a skip link is focused', async () => {
      const block = appendFooterBlock();
      await decorate(block);

      const footerEl = block.closest('footer');
      const scrollIntoView = jest.fn();
      footerEl.scrollIntoView = scrollIntoView;

      const skipToContent = within(document.body).getByRole('link', { name: 'Skip to content' });
      skipToContent.focus();

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    });

    it('opens the closed mobile nav drawer and focuses it when activated by keyboard', async () => {
      const { nav, toggle } = appendHeaderNav({ open: false });
      const block = appendFooterBlock();
      await decorate(block);

      const skipToNav = within(document.body).getByRole('link', { name: 'Skip to navigation' });
      // Real Enter activation fires keydown before the browser synthesizes the click.
      skipToNav.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      skipToNav.click();

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(nav).toHaveFocus();
    });

    it('opens the closed mobile nav drawer and focuses it when activated by pointer', async () => {
      const { nav, toggle } = appendHeaderNav({ open: false });
      const block = appendFooterBlock();
      await decorate(block);

      const skipToNav = within(document.body).getByRole('link', { name: 'Skip to navigation' });
      skipToNav.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      skipToNav.click();

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(nav).toHaveFocus();
    });

    it('focuses the nav directly, without re-opening it, when it is already open', async () => {
      const { nav, toggle } = appendHeaderNav({ open: true });
      const block = appendFooterBlock();
      await decorate(block);

      const toggleClick = jest.fn();
      toggle.addEventListener('click', toggleClick);

      const skipToNav = within(document.body).getByRole('link', { name: 'Skip to navigation' });
      skipToNav.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      skipToNav.click();

      expect(toggleClick).not.toHaveBeenCalled();
      expect(nav).toHaveFocus();
    });

    it('stops the click from reaching the header\'s click-outside-closes-drawer listener', async () => {
      const { nav } = appendHeaderNav({ open: false });
      const block = appendFooterBlock();
      await decorate(block);

      // Mirrors header.js: clicks outside the header close the mobile drawer.
      const outsideClickCloses = jest.fn();
      document.addEventListener('click', (event) => {
        if (!nav.closest('header').contains(event.target)) outsideClickCloses();
      });

      const skipToNav = within(document.body).getByRole('link', { name: 'Skip to navigation' });
      skipToNav.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      skipToNav.click();

      expect(outsideClickCloses).not.toHaveBeenCalled();
      expect(nav).toHaveFocus();
    });
  });
});
