/**
 * Footer garage door: the last rounded card reveals the footer menu, then hands
 * over to the Adobe logo sticky.
 */
import {
  bindFooterReveal,
  clearFooterReveal,
  refreshFooterReveal,
} from './footer-reveal.js';

/** Footer menu with the controls the card covers: links and the newsletter field. */
const MENU_HTML = `
  <div class="footer__inner">
    <div class="footer__content">
      <nav><a href="/privacy">Privacy</a></nav>
      <form><input type="email" id="footer-email"><button type="submit">Subscribe</button></form>
    </div>
  </div>
`;

/** Menu plus the Adobe logo that sits under it. */
const MENU_AND_LOGO_HTML = `
  ${MENU_HTML}
  <div class="footer__logo"></div>
`;

/** @type {Array<FrameRequestCallback>} */
let frames = [];

/**
 * Runs the frames a scroll has queued.
 *
 * @returns {void}
 */
function flushFrames() {
  const queued = frames;
  frames = [];
  queued.forEach((cb) => cb(0));
}

/**
 * @returns {void}
 */
function scroll() {
  window.dispatchEvent(new Event('scroll'));
  flushFrames();
}

/**
 * @param {string} mainHtml Sections inside main
 * @param {string} [footerHtml] Footer contents
 * @returns {{ main: HTMLElement, footer: HTMLElement }}
 */
function mountPage(mainHtml, footerHtml = '<div class="footer__inner"><div class="footer__content"></div></div>') {
  document.body.innerHTML = `<main>${mainHtml}</main><footer><div class="footer">${footerHtml}</div></footer>`;
  return {
    main: document.querySelector('main'),
    footer: document.querySelector('body > footer'),
  };
}

/**
 * Places the last card's bottom edge, which drives the menu's entry progress.
 *
 * @param {Element} card
 * @param {number} bottom
 * @returns {void}
 */
function cardBottom(card, bottom) {
  card.getBoundingClientRect = () => ({ bottom });
}

/**
 * @param {Element | null} inner
 * @param {number} height
 * @returns {void}
 */
function menuHeight(inner, height) {
  Object.defineProperty(inner, 'offsetHeight', { configurable: true, value: height });
}

/**
 * Tab, then focus, the way a keyboard user enters the footer.
 *
 * @param {Element} el Control that receives focus
 * @returns {void}
 */
function focusFromKeyboard(el) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

beforeEach(() => {
  frames = [];
  window.requestAnimationFrame = (cb) => frames.push(cb);
  window.cancelAnimationFrame = jest.fn();
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  document.body.innerHTML = '';
});

afterEach(() => {
  clearFooterReveal(document);
  document.body.innerHTML = '';
});

describe('bindFooterReveal', () => {
  it('raises the last rounded card above the footer', () => {
    const { main, footer } = mountPage(`
      <div class="section section-rounded-blue"></div>
      <div class="section section-rounded-default"></div>
    `);

    bindFooterReveal(main, document);

    expect(main).toHaveClass('section-scroll-reveal-main');
    expect(main.children[0]).not.toHaveClass('section-scroll-reveal');
    expect(main.children[1]).toHaveClass('section-scroll-reveal');
    expect(footer).toHaveClass('section-scroll-under');
  });

  it('sets menu entry progress from the last card', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    const inner = footer.querySelector('.footer__inner');
    cardBottom(main.children[0], 680);
    menuHeight(inner, 240);

    bindFooterReveal(main, document);

    expect(inner.style.getPropertyValue('--section-scroll-inner-progress')).toBe('-50');
  });

  it('keeps the logo unstuck while the last card still covers the menu', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    cardBottom(main.children[0], 700);
    menuHeight(footer.querySelector('.footer__inner'), 240);

    bindFooterReveal(main, document);

    expect(footer).not.toHaveClass('section-scroll-logo');
  });

  it('hands over to the logo sticky once the menu is fully in', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    const card = main.children[0];
    cardBottom(card, 700);
    menuHeight(footer.querySelector('.footer__inner'), 240);

    bindFooterReveal(main, document);
    expect(footer).not.toHaveClass('section-scroll-logo');

    cardBottom(card, 500);
    scroll();

    expect(footer).toHaveClass('section-scroll-logo');
    expect(footer.querySelector('.footer__inner').style.getPropertyValue('--section-scroll-inner-progress')).toBe('0');
  });

  it('takes the logo sticky back when the card covers the menu again', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    const card = main.children[0];
    cardBottom(card, 500);
    menuHeight(footer.querySelector('.footer__inner'), 240);

    bindFooterReveal(main, document);
    expect(footer).toHaveClass('section-scroll-logo');

    cardBottom(card, 700);
    scroll();

    expect(footer).not.toHaveClass('section-scroll-logo');
  });

  it('coalesces a burst of scrolls into one frame', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    cardBottom(main.children[0], 680);
    menuHeight(footer.querySelector('.footer__inner'), 240);

    bindFooterReveal(main, document);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(frames).toHaveLength(1);
  });

  it('picks up a footer menu decorated after binding', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', '');
    cardBottom(main.children[0], 680);

    bindFooterReveal(main, document);
    expect(footer.querySelector('.footer__inner')).toBeNull();

    // loadLazy does not await loadFooter, so the menu can arrive after binding.
    footer.querySelector('.footer').innerHTML = '<div class="footer__inner"><div class="footer__content"></div></div>';
    const inner = footer.querySelector('.footer__inner');
    menuHeight(inner, 240);
    scroll();

    expect(inner.style.getPropertyValue('--section-scroll-inner-progress')).toBe('-50');
  });

  it('keeps the covered menu in the tab order', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_HTML);
    const inner = footer.querySelector('.footer__inner');
    menuHeight(inner, 240);
    // Card bottom on the viewport floor: the menu is entirely behind it.
    cardBottom(main.children[0], 800);

    bindFooterReveal(main, document);

    const controls = [...inner.querySelectorAll('a, input, button')];

    expect(controls.map((el) => el.getAttribute('tabindex'))).toEqual([null, null, null]);
    expect(inner).not.toHaveAttribute('inert');
    expect(inner).not.toHaveAttribute('aria-hidden');
  });

  it('scrolls the last card off a covered control that receives focus', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_HTML);
    menuHeight(footer.querySelector('.footer__inner'), 240);
    cardBottom(main.children[0], 800);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    footer.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    // Viewport 800, menu 240: the fully-in line is 560 from the top.
    expect(scrollBy).toHaveBeenCalledWith(240);
  });

  it('scrolls the remaining cover when the menu is only partly in', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_HTML);
    menuHeight(footer.querySelector('.footer__inner'), 240);
    cardBottom(main.children[0], 680);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    footer.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scrollBy).toHaveBeenCalledWith(120);
  });

  it('falls back to window.scrollBy when no scroller is wired', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_HTML);
    menuHeight(footer.querySelector('.footer__inner'), 240);
    cardBottom(main.children[0], 800);
    const scrollBy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {});

    bindFooterReveal(main, document);
    footer.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scrollBy).toHaveBeenCalledWith(0, 240);
    scrollBy.mockRestore();
  });

  it('scrolls the Adobe logo fully into view on keyboard focus', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_AND_LOGO_HTML);
    const inner = footer.querySelector('.footer__inner');
    const logo = footer.querySelector('.footer__logo');
    menuHeight(inner, 240);
    menuHeight(logo, 100);
    // Card and the stuck inner both sit on the viewport floor.
    cardBottom(main.children[0], 800);
    cardBottom(inner, 800);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    focusFromKeyboard(footer.querySelector('a'));

    // Menu shortfall 240, plus the logo's own 100.
    expect(scrollBy).toHaveBeenCalledWith(340);
    expect(logo.style.getPropertyValue('--footer-logo-entry-progress')).toBe('0');
  });

  it('scrolls only the logo when the menu is already in', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_AND_LOGO_HTML);
    const inner = footer.querySelector('.footer__inner');
    const logo = footer.querySelector('.footer__logo');
    menuHeight(inner, 240);
    menuHeight(logo, 80);
    cardBottom(main.children[0], 500);
    cardBottom(inner, 760);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    focusFromKeyboard(footer.querySelector('a'));

    // Logo fully-in line is 720. The inner still covers 40px of it.
    expect(scrollBy).toHaveBeenCalledWith(40);
    expect(logo.style.getPropertyValue('--footer-logo-entry-progress')).toBe('0');
  });

  it('does not pull the logo in when focus came from a pointer', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_AND_LOGO_HTML);
    const inner = footer.querySelector('.footer__inner');
    const logo = footer.querySelector('.footer__logo');
    menuHeight(inner, 240);
    menuHeight(logo, 100);
    cardBottom(main.children[0], 800);
    cardBottom(inner, 800);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    footer.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scrollBy).toHaveBeenCalledWith(240);
    expect(logo.style.getPropertyValue('--footer-logo-entry-progress')).toBe('');
  });

  it('does not scroll when the menu is already fully in', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_HTML);
    menuHeight(footer.querySelector('.footer__inner'), 240);
    cardBottom(main.children[0], 500);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    footer.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('does not scroll a covered control when the menu has not been measured yet', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_HTML);
    cardBottom(main.children[0], 800);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    footer.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('does nothing without a rounded section', () => {
    const { main, footer } = mountPage(`
      <div class="section hero-container"><div class="hero hero-full-screen"></div></div>
    `);

    bindFooterReveal(main, document);

    expect(main).not.toHaveClass('section-scroll-reveal-main');
    expect(footer).not.toHaveClass('section-scroll-under');
  });

  it('does nothing without a footer', () => {
    document.body.innerHTML = '<main><div class="section section-rounded-default"></div></main>';
    const main = document.querySelector('main');

    bindFooterReveal(main, document);

    expect(main).not.toHaveClass('section-scroll-reveal-main');
  });
});

describe('refreshFooterReveal', () => {
  it('re-measures the menu after a resize', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    const inner = footer.querySelector('.footer__inner');
    cardBottom(main.children[0], 680);
    menuHeight(inner, 240);

    bindFooterReveal(main, document);
    expect(inner.style.getPropertyValue('--section-scroll-inner-progress')).toBe('-50');

    menuHeight(inner, 120);
    refreshFooterReveal();

    expect(inner.style.getPropertyValue('--section-scroll-inner-progress')).toBe('0');
  });
});

describe('clearFooterReveal', () => {
  it('strips every class and the progress property', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    const inner = footer.querySelector('.footer__inner');
    cardBottom(main.children[0], 500);
    menuHeight(inner, 240);

    bindFooterReveal(main, document);
    expect(footer).toHaveClass('section-scroll-logo');

    clearFooterReveal(document);

    expect(main).not.toHaveClass('section-scroll-reveal-main');
    expect(main.children[0]).not.toHaveClass('section-scroll-reveal');
    expect(footer).not.toHaveClass('section-scroll-under');
    expect(footer).not.toHaveClass('section-scroll-logo');
    expect(inner.style.getPropertyValue('--section-scroll-inner-progress')).toBe('');
  });

  it('stops uncovering on focus', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>', MENU_HTML);
    menuHeight(footer.querySelector('.footer__inner'), 240);
    cardBottom(main.children[0], 800);
    const scrollBy = jest.fn();

    bindFooterReveal(main, document, { scrollBy });
    clearFooterReveal(document);
    footer.querySelector('a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('stops syncing on scroll', () => {
    const { main, footer } = mountPage('<div class="section section-rounded-default"></div>');
    cardBottom(main.children[0], 680);
    menuHeight(footer.querySelector('.footer__inner'), 240);

    bindFooterReveal(main, document);
    clearFooterReveal(document);
    window.dispatchEvent(new Event('scroll'));

    expect(frames).toHaveLength(0);
  });
});
