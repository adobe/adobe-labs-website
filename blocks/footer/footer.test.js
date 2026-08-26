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
      <p><a href="/reuse">Reuse</a></p>
    </div></div>
    <div><div>
      <h2>Explore</h2>
      <p><a href="/research">Research</a></p>
    </div></div>
  </div>
  <div class="section social">
    <div class="default-content-wrapper">
      <p><a href="https://facebook.com/adobe">Facebook</a></p>
      <p><a href="https://linkedin.com/company/adobe">LinkedIn</a></p>
    </div>
  </div>
  <div class="section">
    <div class="default-content-wrapper">
      <p><em>All rights reserved.</em></p>
      <p><a href="https://www.adobe.com/privacy/opt-out.html">Do not sell or share my personal information</a></p>
      <p><a href="#interest-based-ads">AdChoices</a></p>
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
      matches: query === '(min-width: 900px)',
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

    const form = block.querySelector('.footer-newsletter-form');
    expect(form).toHaveAttribute('action', 'https://example.com/subscribe');
    expect(form).toHaveAttribute('method', 'post');
    expect(within(block).getByLabelText('Your email address')).toHaveAttribute('type', 'email');
    expect(block.querySelector('.footer-newsletter-submit')).toHaveAttribute('aria-label', 'Subscribe');
  });

  it('parses menu columns from h2 groups', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(block.querySelectorAll('.footer-menu-column')).toHaveLength(3);
    expect(block.querySelector('.footer-menu-columns').children).toHaveLength(3);
    expect(block.querySelector('.footer-newsletter')).toHaveClass('footer-menu-column');
    expect(block.querySelector('.footer-newsletter .footer-menu-headline').tagName).toBe('H2');
    expect(block).toHaveTextContent('Connect');
    expect(block).toHaveTextContent('Collaborate');
    expect(block).toHaveTextContent('Research');
  });

  it('renders social links with icons and accessible names', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(block.querySelectorAll('.footer-social-link')).toHaveLength(2);
    expect(block.querySelector('a[aria-label="Facebook"] .footer-social-icon use'))
      .toHaveAttribute('href', '#footer-icon-facebook');
    expect(block.querySelector('a[aria-label="LinkedIn"]')).toHaveAttribute(
      'href',
      'https://linkedin.com/company/adobe',
    );
  });

  it('inserts the current year in the copyright line', async () => {
    const block = document.createElement('div');
    block.className = 'footer';
    const year = new Date().getFullYear();

    await decorate(block);

    expect(block).toHaveTextContent(`© ${year} Adobe Inc. All rights reserved.`);
    expect(block).toHaveTextContent('Do not sell or share my personal information');
    expect(block.querySelector('.footer-adchoices-icon')).toBeTruthy();
    expect(block.querySelector('.footer-mark-image')).toBeTruthy();
  });

  it('assembles the footer wrapper with parallax logo', async () => {
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(block.querySelector('.footer-wrapper')).toBeTruthy();
    expect(block.querySelector('.footer-wrapper').nextElementSibling).toHaveClass('footer-logo');
    expect(block.querySelector('.footer-logo-image')).toHaveAttribute('alt', 'Adobe');
    expect(block.querySelector('.footer-logo')).toBeTruthy();
  });

  it('registers scroll listeners for the parallax logo', async () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const block = document.createElement('div');
    block.className = 'footer';

    await decorate(block);

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    addSpy.mockRestore();
  });

  it('toggles mobile accordion sections on headline click', async () => {
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    const block = document.createElement('div');
    block.className = 'footer';
    document.body.append(block);

    await decorate(block);

    const headline = block.querySelector('.footer-menu-column:not(.footer-newsletter) .footer-menu-headline');
    const items = headline.closest('.footer-menu-section').querySelector('.footer-menu-items');

    expect(headline).toHaveAttribute('aria-expanded', 'false');
    expect(items).toHaveAttribute('hidden');

    headline.click();

    expect(headline).toHaveAttribute('aria-expanded', 'true');
    expect(items).not.toHaveAttribute('hidden');

    block.remove();
  });
});
