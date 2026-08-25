---
name: write-block-tests
description: >-
  Write Jest unit tests for Edge Delivery Services (EDS) blocks using jsdom HTML
  fixtures and decorate assertions. Use when adding or updating block tests,
  co-locating *.test.js files, mocking /scripts/ imports, or documenting the
  project's block testing strategy.
---

# EDS Block Testing

## Stack

- Jest with `jsdom` (`npm test`)
- `@testing-library/jest-dom` matchers (via `tests/setupTests.js`)
- `@testing-library/dom` queries for behavioral tests (`getByRole`, `getByLabelText`, etc.)

## Pattern

1. Co-locate: `blocks/<block>/<block>.test.js`
2. Build an HTML fixture matching the markup `decorate` receives (block element after authoring/EDS processing)
3. Call `decorate(block)` with that fixture
4. Assert DOM changes (`classes`, structure, attributes, text, ARIA)

## What to test

- Conditional logic (e.g. cases where a class is added or not added)
- Structural changes (e.g. moved/replaced nodes, added semantic markup)
- Content rendering (e.g. the content is rendered in the correct node)
- Behaviors: after `decorate`, query controls with `@testing-library/dom` (`getByRole`, `getByLabelText`) and drive interactions with native DOM APIs (`.click()`, `dispatchEvent`)
  - e.g. `within(block).getByRole('button', { name: 'Open navigation' }).click()`
  - e.g. Escape / focusout closes an open menu
  - Append the decorated block to `document.body` when handlers use `document.getElementById` or other global lookups
  - Always try to query elements by accessible roles first. Fall back to block selectors only when the control has no accessible role or name.

## Mocking

Mock `/scripts/` and cross-block helpers so tests stay unit-scoped (no network, no full page bootstrap). Prefer `jest.mock` on the module the block imports.

- **`getMetadata`** (`scripts/aem.js`): return authored meta strings (or `''`) so path/feature branches are covered without `<meta>` tags. Vary return values per test for default vs custom paths (e.g. footer/nav).
- **`loadFragment`** (`blocks/fragment/fragment.js`): resolve to a minimal DOM fragment (`DocumentFragment` or element with the children decorate expects). Do not hit real fragment URLs.
- **Other `aem.js` helpers** (`createOptimizedPicture`, `loadCSS`, etc.): stub to simple passthroughs or no-ops when decorate calls them.
- Assert the block called mocks with the expected args when the contract matters (path, meta name); otherwise only assert decorate’s DOM output.
- Keep mocks local to the test file; reset with `jest.clearAllMocks()` in `beforeEach` when return values change per case.
- Do not reference `document` (or other out-of-scope values) inside a `jest.mock` factory — Jest hoists factories and rejects that. Stub with `jest.fn()` and set DOM return values in `beforeEach`.

Example shape:

```js
jest.mock('../../scripts/aem.js', () => ({
  getMetadata: jest.fn(() => ''),
}));

jest.mock('../fragment/fragment.js', () => ({
  loadFragment: jest.fn(),
}));

function createFragment(html) {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  return wrap;
}

beforeEach(() => {
  jest.clearAllMocks();
  getMetadata.mockReturnValue('');
  loadFragment.mockResolvedValue(
    createFragment('<div class="section"><p>Footer</p></div>'),
  );
});
```

## Test style

- Jest + `@testing-library/jest-dom` matchers
- Imperative test names: "adds columns-img-col when …" (not "should …" / "correctly …")

## Examples

### Decorate

When testing the `decorate` function, assert that the DOM has been modified as expected:

```js
it('adds a class to the paragraph', () => {
  const block = document.createElement('div');
  block.innerHTML = '<p>Hello</p>';

  decorate(block);

  expect(block.querySelector('p')).toHaveClass('decorated-class');
});
```

### Behavior

Mock deps and set up fixtures in `beforeEach` (see Mocking). Append to `document.body` when handlers use global lookups. Query by role or accessible name; scope queries with `within(block)`.

```js
import { within } from '@testing-library/dom';

it('toggles the mobile menu on hamburger click', async () => {
  const block = document.createElement('div');

  await decorate(block);

  within(block).getByRole('button', { name: 'Open navigation' }).click();

  expect(within(block).getByRole('navigation')).toHaveAttribute('aria-expanded', 'true');
});
```

## Checklist

```
- [ ] Test file co-located with the block
- [ ] Fixture mirrors decorate input markup
- [ ] decorate(block) called under test
- [ ] Conditional rendering logic for block is covered
- [ ] Assertions target decoration outcomes
- [ ] /scripts/ deps mocked when needed
- [ ] npm test passes
```
