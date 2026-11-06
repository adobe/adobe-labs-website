import { decorateCodeBlocks } from './utils.js';

const resizeCallbacks = [];
global.ResizeObserver = function ResizeObserver(callback) {
  resizeCallbacks.push(callback);
  return { observe() {} };
};

/**
 * @param {HTMLElement} pre
 * @param {{ scrollWidth: number, clientWidth: number }} widths
 */
function mockWidths(pre, { scrollWidth, clientWidth }) {
  Object.defineProperty(pre, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(pre, 'clientWidth', { configurable: true, value: clientWidth });
}

function createMain(count = 1) {
  const main = document.createElement('main');
  main.innerHTML = '<pre><code>sample</code></pre>'.repeat(count);
  return main;
}

beforeEach(() => {
  resizeCallbacks.length = 0;
});

describe('decorateCodeBlocks', () => {
  it('makes an overflowing code sample a named Tab stop', () => {
    const main = createMain();
    const pre = main.querySelector('pre');
    mockWidths(pre, { scrollWidth: 900, clientWidth: 400 });

    decorateCodeBlocks(main);

    expect(pre).toHaveAttribute('tabindex', '0');
    expect(pre).toHaveAttribute('role', 'region');
    expect(pre).toHaveAttribute('aria-label', 'Code sample');
  });

  it('leaves a code sample that fits out of the Tab order', () => {
    const main = createMain();
    const pre = main.querySelector('pre');
    mockWidths(pre, { scrollWidth: 400, clientWidth: 400 });

    decorateCodeBlocks(main);

    expect(pre).not.toHaveAttribute('tabindex');
    expect(pre).not.toHaveAttribute('role');
    expect(pre).not.toHaveAttribute('aria-label');
  });

  it('updates when a code sample starts or stops overflowing', () => {
    const main = createMain();
    const pre = main.querySelector('pre');
    mockWidths(pre, { scrollWidth: 400, clientWidth: 400 });
    decorateCodeBlocks(main);

    mockWidths(pre, { scrollWidth: 900, clientWidth: 400 });
    resizeCallbacks.forEach((callback) => callback([{ target: pre }]));
    expect(pre).toHaveAttribute('tabindex', '0');

    mockWidths(pre, { scrollWidth: 400, clientWidth: 400 });
    resizeCallbacks.forEach((callback) => callback([{ target: pre }]));
    expect(pre).not.toHaveAttribute('tabindex');
  });

  it('does nothing on a page without code samples', () => {
    decorateCodeBlocks(document.createElement('main'));

    expect(resizeCallbacks).toHaveLength(0);
  });
});
