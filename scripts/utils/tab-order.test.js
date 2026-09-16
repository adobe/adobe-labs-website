/**
 * Shared tab-order suppression: keyboard focus skips controls that the section
 * surfaces have hidden, without hiding them from assistive technology.
 */
import {
  ATTR_SUPPRESSED,
  clearTabOrderSuppression,
  setTabOrderSuppressed,
} from './tab-order.js';

/**
 * @param {string} html Host contents
 * @returns {HTMLElement}
 */
function mount(html) {
  document.body.innerHTML = `<div id="host">${html}</div>`;
  return document.getElementById('host');
}

/**
 * @param {Element} host
 * @returns {Array<string | null>}
 */
function tabIndexes(host) {
  return [...host.querySelectorAll('a, button, input, select, textarea')]
    .map((el) => el.getAttribute('tabindex'));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('setTabOrderSuppressed', () => {
  it('skips every control while hidden and restores them after', () => {
    const host = mount(`
      <a href="/a">Link</a>
      <button type="button">Button</button>
      <input type="email">
      <select><option>One</option></select>
      <textarea></textarea>
    `);

    setTabOrderSuppressed(host, true);

    expect(tabIndexes(host)).toEqual(['-1', '-1', '-1', '-1', '-1']);

    setTabOrderSuppressed(host, false);

    expect(tabIndexes(host)).toEqual([null, null, null, null, null]);
  });

  it('gives an authored tabindex back rather than dropping it', () => {
    const host = mount('<a href="/a" tabindex="2">Link</a><div tabindex="-1">Target</div>');
    const link = host.querySelector('a');
    const target = host.querySelector('div');

    setTabOrderSuppressed(host, true);

    expect(link).toHaveAttribute('tabindex', '-1');
    expect(target).toHaveAttribute('tabindex', '-1');

    setTabOrderSuppressed(host, false);

    expect(link).toHaveAttribute('tabindex', '2');
    expect(target).toHaveAttribute('tabindex', '-1');
  });

  it('leaves the content in the accessibility tree', () => {
    const host = mount('<h2>Heading</h2><a href="/a">Link</a>');

    setTabOrderSuppressed(host, true);

    // `inert` and `visibility: hidden` would both take the heading out of the
    // tree, so a screen reader could no longer reach it by heading navigation.
    expect(host).not.toHaveAttribute('inert');
    expect(host).not.toHaveAttribute('aria-hidden');
    expect(host.querySelector('h2')).toBeVisible();
  });

  it('does not overwrite the stored tabindex when suppressed twice', () => {
    const host = mount('<a href="/a" tabindex="3">Link</a>');

    setTabOrderSuppressed(host, true);
    setTabOrderSuppressed(host, true);
    setTabOrderSuppressed(host, false);

    expect(host.querySelector('a')).toHaveAttribute('tabindex', '3');
  });
});

describe('clearTabOrderSuppression', () => {
  it('restores every suppressed host in a tree', () => {
    document.body.innerHTML = `
      <div id="one"><a href="/a">A</a></div>
      <div id="two"><a href="/b">B</a></div>
    `;
    const one = document.getElementById('one');
    const two = document.getElementById('two');
    setTabOrderSuppressed(one, true);
    setTabOrderSuppressed(two, true);

    clearTabOrderSuppression(document);

    expect(document.querySelectorAll(`[${ATTR_SUPPRESSED}]`)).toHaveLength(0);
    expect(one.querySelector('a')).not.toHaveAttribute('tabindex');
    expect(two.querySelector('a')).not.toHaveAttribute('tabindex');
  });
});
