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
    expect(pre).toHaveAttribute('aria-label', 'Scrollable code sample');
  });

  it('names each sample from the closest heading or paragraph above it', () => {
    const main = document.createElement('main');
    main.innerHTML = `
      <h2>How to cite</h2>
      <p>Otherwise, use this format:</p>
      <pre><code>citation</code></pre>
      <p>BibTeX:</p>
      <pre><code>bibtex</code></pre>`;
    const [citation, bibtex] = main.querySelectorAll('pre');
    mockWidths(citation, { scrollWidth: 900, clientWidth: 400 });
    mockWidths(bibtex, { scrollWidth: 900, clientWidth: 400 });

    decorateCodeBlocks(main);

    expect(citation).toHaveAttribute('aria-label', 'Otherwise, use this format (scrollable code sample)');
    expect(bibtex).toHaveAttribute('aria-label', 'BibTeX (scrollable code sample)');
  });

  it('shortens a long intro to whole words', () => {
    const main = document.createElement('main');
    main.innerHTML = `<p>Changed it? Start with "Adapted from" and say what you changed in your version:</p>
      <pre><code>sample</code></pre>`;
    const pre = main.querySelector('pre');
    mockWidths(pre, { scrollWidth: 900, clientWidth: 400 });

    decorateCodeBlocks(main);

    expect(pre).toHaveAttribute('aria-label', 'Changed it? Start with "Adapted from" and say what you… (scrollable code sample)');
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
