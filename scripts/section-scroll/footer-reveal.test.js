/**
 * Footer garage door: the last rounded card reveals the footer menu, then hands
 * over to the Adobe logo sticky.
 */
import {
  bindFooterReveal,
  clearFooterReveal,
  refreshFooterReveal,
} from './footer-reveal.js';

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
