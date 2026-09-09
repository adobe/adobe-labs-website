import { within } from '@testing-library/dom';
import { getMetadata } from '../../scripts/aem.js';
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
      <p><a href="https://example.com/subscribe">Subscribe</a></p>
    </div></div>
    <div><div>
      <h2>Connect</h2>
      <p><a href="/collaborate">Collaborate</a></p>
      <p><a href="/reuse" title="Reuse it responsibly">Reuse</a></p>
    </div></div>
    <div><div>
      <h2>Explore</h2>
      <p><a href="/research" title="Research">Research</a></p>
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

  it('builds a newsletter form from authored content', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    const form = block.querySelector('.footer__form');
    expect(form).toHaveAttribute('action', 'https://example.com/subscribe');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('aria-label');
    expect(within(block).getByLabelText('Your email address')).toHaveAttribute('type', 'email');
    expect(block.querySelector('.footer__submit')).toHaveAttribute('aria-label', 'Subscribe');
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

  it('assembles the footer wrapper with parallax logo', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(block.querySelector('.footer__inner')).toBeTruthy();
    expect(block.querySelector('.footer__inner').nextElementSibling).toHaveClass('footer__logo');
    expect(block.querySelector('.footer__logo-image')).toHaveAttribute('alt', 'Adobe');
    expect(block.querySelector('.footer__logo')).toBeTruthy();
  });

  it('registers scroll listeners for the parallax logo', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    addSpy.mockRestore();
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
});
