/**
 * Keyboard focus scrolls a covered control into view instead of skipping it.
 */
import {
  bindFocusReveal,
  clearFocusReveal,
  layoutTop,
  revealDelta,
} from './focus-reveal.js';

/** @type {Array<{ id: number, cb: FrameRequestCallback }>} */
let frames = [];
let nextFrame = 0;

/**
 * @param {HTMLElement} el
 * @param {{ top: number, bottom: number, left?: number, right?: number }} box
 * @returns {void}
 */
function place(el, box) {
  const left = box.left ?? 0;
  const right = box.right ?? 400;
  el.getBoundingClientRect = () => ({
    top: box.top,
    bottom: box.bottom,
    left,
    right,
    width: right - left,
    height: box.bottom - box.top,
    x: left,
    y: box.top,
  });
}

/**
 * @param {HTMLElement} el
 * @param {number} top In-flow document Y, applied as the previous sibling's height
 * @returns {void}
 */
function layout(el, top) {
  const prev = el.previousElementSibling;
  if (prev instanceof HTMLElement) {
    Object.defineProperty(prev, 'offsetHeight', { configurable: true, value: top });
  }
}

/**
 * @param {HTMLElement} el
 * @param {string} top
 * @returns {void}
 */
function stick(el, top) {
  el.style.position = 'sticky';
  el.style.top = top;
}

/**
 * Runs the frame a focus has queued.
 *
 * @returns {void}
 */
function flushFrame() {
  const queued = frames;
  frames = [];
  queued.forEach((frame) => frame.cb(0));
}

beforeEach(() => {
  frames = [];
  nextFrame = 0;
  window.requestAnimationFrame = (cb) => {
    nextFrame += 1;
    frames.push({ id: nextFrame, cb });
    return nextFrame;
  };
  window.cancelAnimationFrame = (id) => {
    frames = frames.filter((frame) => frame.id !== id);
  };
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
  document.documentElement.style.setProperty('--nav-height', '80px');
  document.body.style.margin = '0';
  document.elementsFromPoint = () => [];
  document.body.innerHTML = '';
});

afterEach(() => {
  clearFocusReveal();
  document.body.innerHTML = '';
  document.documentElement.style.removeProperty('--nav-height');
});

describe('layoutTop', () => {
  it('uses previous siblings heights instead of a sticky offsetTop', () => {
    document.body.innerHTML = `
      <header></header>
      <main>
        <div class="section" id="one"></div>
        <div class="section" id="two"></div>
      </main>
    `;
    const header = document.querySelector('header');
    const one = document.getElementById('one');
    const two = document.getElementById('two');
    Object.defineProperty(header, 'offsetHeight', { configurable: true, value: 80 });
    Object.defineProperty(one, 'offsetHeight', { configurable: true, value: 1000 });
    Object.defineProperty(one, 'offsetTop', { configurable: true, value: 500 });
    Object.defineProperty(two, 'offsetTop', { configurable: true, value: 200 });

    expect(layoutTop(two)).toBe(1080);
  });
});

describe('revealDelta', () => {
  it('scrolls up until a stuck card clears the control the next section covers', () => {
    document.body.innerHTML = `
      <main>
        <div class="section slow"><a href="/x">Buried</a></div>
        <div class="section next"></div>
      </main>
    `;
    const slow = document.querySelector('.slow');
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    stick(slow, '-100px');
    place(slow, { top: -100, bottom: 500 });
    place(link, {
      top: 400, bottom: 420, left: 10, right: 100,
    });
    place(next, { top: 300, bottom: 900 });
    layout(next, 2800);

    expect(revealDelta(link, 2500)).toBe(-132);
  });

  it('scrolls down when a stuck cover sits over content that is still in flow', () => {
    document.body.innerHTML = `
      <main>
        <div class="section intro"><a href="/x">Intro link</a></div>
        <div class="section next"></div>
      </main>
    `;
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    stick(next, '200px');
    place(next, { top: 200, bottom: 900 });
    place(link, {
      top: 480, bottom: 500, left: 10, right: 80,
    });

    expect(revealDelta(link, 1000)).toBe(312);
  });

  it('stops a stuck cover from scrolling an in-flow control off the top', () => {
    document.body.innerHTML = `
      <main>
        <div class="section intro"><a href="/x">Intro link</a></div>
        <div class="section next"></div>
      </main>
    `;
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    stick(next, '-180px');
    place(next, { top: -180, bottom: 700 });
    place(link, {
      top: 400, bottom: 420, left: 10, right: 80,
    });

    // Raw clearance is 604, which would move the link to y = -204.
    // The limit keeps its top just below the 80px header plus the 4px ring.
    expect(revealDelta(link, 1000)).toBe(316);
  });

  it('clears a stuck control that sits near the bottom of the viewport', () => {
    document.body.innerHTML = `
      <main>
        <div class="section slow"><a href="/x">Link</a></div>
        <div class="section next"></div>
      </main>
    `;
    const slow = document.querySelector('.slow');
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    stick(slow, '-100px');
    place(slow, { top: -100, bottom: 990 });
    place(link, {
      top: 960, bottom: 980, left: 10, right: 80,
    });
    place(next, { top: 700, bottom: 1200 });

    // The card is stuck, so this scroll moves the cover and leaves the link put.
    expect(revealDelta(link, 1000)).toBe(-292);
  });

  it('leaves an in-flow overlap alone, since scrolling moves both sections together', () => {
    document.body.innerHTML = `
      <main>
        <div class="section slow"><a href="/x">Link</a></div>
        <div class="section next"></div>
      </main>
    `;
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    place(link, {
      top: 400, bottom: 420, left: 10, right: 80,
    });
    place(next, { top: 300, bottom: 900 });

    expect(revealDelta(link, 0)).toBe(0);
  });

  it('scrolls a control out from under the sticky header', () => {
    document.body.innerHTML = '<main><div class="section"><a href="/x">Link</a></div></main>';
    const link = document.querySelector('a');
    place(link, {
      top: 20, bottom: 40, left: 10, right: 80,
    });

    expect(revealDelta(link, 400)).toBe(-64);
  });

  it('does not nudge a control that is already stuck against the header', () => {
    document.body.innerHTML = `
      <main>
        <div class="section">
          <div class="section-scroll-fade"><a href="/x">Link</a></div>
        </div>
      </main>
    `;
    const fade = document.querySelector('.section-scroll-fade');
    const link = document.querySelector('a');
    stick(fade, '80px');
    place(fade, { top: 80, bottom: 200 });
    place(link, {
      top: 80, bottom: 100, left: 10, right: 80,
    });

    expect(revealDelta(link, 200)).toBe(0);
  });

  it('scrolls a faded page header back to the top of its fade', () => {
    document.body.innerHTML = `
      <main>
        <div class="section section-scroll-intro">
          <div class="section-scroll-fade" style="opacity: 0"><a href="/x">Link</a></div>
        </div>
        <div class="section section-scroll-next"></div>
      </main>
    `;
    const link = document.querySelector('a');
    place(link, {
      top: 90, bottom: 110, left: 10, right: 80,
    });

    expect(revealDelta(link, 400)).toBe(-400);
  });

  it('scrolls faded hero copy back to the cover line', () => {
    document.body.innerHTML = `
      <main>
        <div class="section section-scroll-slow">
          <div class="hero__content" style="opacity: 0.2"><a href="/x">CTA</a></div>
        </div>
        <div class="section next"></div>
      </main>
    `;
    const section = document.querySelector('.section-scroll-slow');
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    Object.defineProperty(section, 'offsetHeight', { configurable: true, value: 800 });
    layout(next, 2000);
    place(link, {
      top: 200, bottom: 220, left: 10, right: 80,
    });

    // Cover line is 0.7 of the 1000px viewport.
    expect(revealDelta(link, 1500)).toBe(-200);
  });

  it('does not scroll a control that is already fully visible', () => {
    document.body.innerHTML = `
      <main>
        <div class="section"><a href="/x">Link</a></div>
        <div class="section next"></div>
      </main>
    `;
    const link = document.querySelector('a');
    const next = document.querySelector('.next');
    place(link, {
      top: 200, bottom: 220, left: 10, right: 80,
    });
    place(next, { top: 800, bottom: 1400 });

    expect(revealDelta(link, 0)).toBe(0);
  });

  it('does not scroll when the skip link focuses main', () => {
    document.body.innerHTML = '<main id="main"><div class="section"><a href="/x">Link</a></div></main>';
    const main = document.querySelector('main');
    place(main, {
      top: 0, bottom: 2000, left: 0, right: 800,
    });

    expect(revealDelta(main, 0)).toBe(0);
  });

  it('does not uncover an in-page hash link, so a pager click can leave the section', () => {
    document.body.innerHTML = `
      <main>
        <div class="section slow"><a href="#two">Next</a></div>
        <div class="section next" id="two"></div>
      </main>
    `;
    const slow = document.querySelector('.slow');
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    stick(slow, '-100px');
    place(slow, { top: -100, bottom: 500 });
    place(link, {
      top: 400, bottom: 420, left: 10, right: 80,
    });
    place(next, { top: 300, bottom: 900 });

    expect(revealDelta(link, 1000)).toBe(0);
  });

  it('leaves header and footer controls to their own scrolling', () => {
    document.body.innerHTML = `
      <header><a href="#main">Skip</a></header>
      <footer><a href="/privacy">Privacy</a></footer>
    `;
    const skip = document.querySelector('header a');
    const privacy = document.querySelector('footer a');
    place(skip, {
      top: 8, bottom: 28, left: 8, right: 40,
    });
    place(privacy, {
      top: 700, bottom: 720, left: 8, right: 80,
    });

    expect(revealDelta(skip, 0)).toBe(0);
    expect(revealDelta(privacy, 500)).toBe(0);
  });
});

describe('bindFocusReveal', () => {
  it('scrolls on focus and stops once the overlap no longer shrinks', () => {
    document.body.innerHTML = '<main><div class="section"><a href="/x">Link</a></div></main>';
    const link = document.querySelector('a');
    place(link, {
      top: 20, bottom: 40, left: 10, right: 80,
    });
    const scrollBy = jest.fn();

    bindFocusReveal({ scrollBy, getScroll: () => 400 });
    link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flushFrame();
    flushFrame();

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith(-64);
  });

  it('keeps scrolling until a cover that shifts with the control is clear', () => {
    document.body.innerHTML = `
      <main>
        <div class="section slow"><a href="/x">Link</a></div>
        <div class="section next"></div>
      </main>
    `;
    const slow = document.querySelector('.slow');
    const next = document.querySelector('.next');
    const link = document.querySelector('a');
    stick(slow, '-100px');
    place(slow, { top: -100, bottom: 700 });
    const linkBox = {
      top: 400, bottom: 480, left: 10, right: 80,
    };
    let nextTop = 400;
    link.getBoundingClientRect = () => ({
      top: linkBox.top,
      bottom: linkBox.bottom,
      left: linkBox.left,
      right: linkBox.right,
      width: linkBox.right - linkBox.left,
      height: linkBox.bottom - linkBox.top,
      x: linkBox.left,
      y: linkBox.top,
    });
    next.getBoundingClientRect = () => ({
      top: nextTop,
      bottom: nextTop + 500,
      left: 0,
      right: 400,
      width: 400,
      height: 500,
      x: 0,
      y: nextTop,
    });
    const scrollBy = jest.fn((delta) => {
      nextTop -= delta;
      const shift = delta * 0.4;
      linkBox.top -= shift;
      linkBox.bottom -= shift;
    });

    bindFocusReveal({ scrollBy, getScroll: () => 1000 });
    link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    let guard = 0;
    while (frames.length && guard < 10) {
      flushFrame();
      guard += 1;
    }

    expect(nextTop).toBeGreaterThanOrEqual(linkBox.bottom + 12);
    expect(scrollBy.mock.calls.length).toBeGreaterThan(1);
  });

  it('does not scroll a footer control', () => {
    document.body.innerHTML = '<footer><a href="/privacy">Privacy</a></footer>';
    const link = document.querySelector('a');
    place(link, {
      top: 20, bottom: 40, left: 10, right: 80,
    });
    const scrollBy = jest.fn();

    bindFocusReveal({ scrollBy, getScroll: () => 0 });
    link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flushFrame();

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('stops uncovering after teardown', () => {
    document.body.innerHTML = '<main><div class="section"><a href="/x">Link</a></div></main>';
    const link = document.querySelector('a');
    place(link, {
      top: 20, bottom: 40, left: 10, right: 80,
    });
    const scrollBy = jest.fn();

    bindFocusReveal({ scrollBy, getScroll: () => 400 });
    clearFocusReveal();
    link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    flushFrame();

    expect(scrollBy).not.toHaveBeenCalled();
  });
});
