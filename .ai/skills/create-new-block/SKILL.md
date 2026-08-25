---
name: create-new-block
description: Scaffold and implement a new EDS block for the Adobe Labs website. Use when adding a new block — covers file structure, the decorate(block) function contract, autoblocking, CSS conventions, and when to use per-page authoring vs fragments vs an autoblock.
---

# Create a New Block

Use this skill when creating a new block from scratch or wiring an existing scaffolded block into the page lifecycle.

## Block file structure

Every block lives in its own folder under `blocks/`. The folder name must exactly match the class name that `loadBlock` uses to resolve it.

```
blocks/
  <block-name>/
    <block-name>.js
    <block-name>.css
```

## How `loadBlock` resolves a block

`loadBlock` lives in the vendored `scripts/aem.js` — never edit it directly.

```js
// scripts/aem.js (vendored)
async function loadBlock(block) {
  const { blockName } = block.dataset;
  const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`);
  const mod = await import(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.js`);
  if (mod.default) await mod.default(block);
  await Promise.all([cssLoaded, decorationComplete]);
}
```

Key rules:
- `block.dataset.blockName` (set by `decorateBlock` from the element's **first class**) determines which folder resolves — no secondary `block` class is needed to identify it, though `decorateBlock` does add one.
- CSS and JS load together, unconditionally, for **every** block on the page — there is no opt-out list. If a block genuinely has nothing to load, an empty `<block-name>.css` is fine; don't invent a config flag to skip it.
- **No registration required** — adding a folder under `blocks/` with matching JS and CSS files is sufficient.

## The `decorate(block)` contract

```js
export default function decorate(block) {
  // block is the block's DOM element
  // read its authored content, then replace/append into it
}
```

- The convention in this codebase is `decorate`, not `init` — see [cards.js](../../../blocks/cards/cards.js) and [columns.js](../../../blocks/columns/columns.js) for the pattern.
- `block` is the element `loadBlock` found — its first class is the block name, already added by `decorateBlock` (`.block`, `data-block-name`, and a `<name>-wrapper` class on its parent, `<name>-container` on the enclosing `.section`).
- `decorate` can be sync or `async` — `loadBlock` awaits the result either way. Use `async` only if the block needs to `await` something (e.g. `fetch`, `loadFragment`).
- Read authored content from `block.children` (rows) → each row's `children` (cells) **before** mutating the DOM, since most blocks tear down and rebuild their own markup (see "Content wrappers" below for what that authored content looks like when the block is authored directly on a page).

## Autoblocking vs per-page authoring vs fragments

There is no template-registration layer in this repo (no `templates/` directory) — every block gets onto the page one of these ways:

| Approach | Use when |
| --- | --- |
| **Per-page authoring** | Block is content-specific — authors add it to individual pages in the document editor via a table with the block name as the header. This is the default for most blocks. |
| **Fragment** | Content is shared across pages but not global. Author a document at `/fragments/<path>` and reference it with a link; `buildAutoBlocks` in `scripts.js` turns any `a[href*="/fragments/"]` into a `fragment` block automatically (see `blocks/fragment/fragment.js`). |
| **Autoblock** | Content should become a block based on a pattern in the markup, without the author adding a block table. `scripts.js`'s `buildAutoBlocks` is the place for this — see `buildWidgetAutoBlocks`, which turns any `a[href*="/widgets/"]` into a `widget` block. Add a new autoblock function alongside it and call it from `buildAutoBlocks`, following the same synthetic-block-then-`buildBlock` pattern. |

Header and footer are special: `loadHeader`/`loadFooter` in `scripts.js` target the `<header>`/`<footer>` elements already present in the page shell, build a synthetic `header`/`footer` block into them with `buildBlock`, and call `loadBlock` on it automatically — they are never authored per page.

## CSS file

`loadBlock` automatically loads `blocks/<name>/<name>.css` alongside the JS — no import needed. Scope all styles to the block's own root class (`.blockname`); per `AGENTS.md`, `-wrapper`/`-container` suffixes are section-level classes added by `decorateBlock`, not part of the block's own naming.

## Querying data from the index

If a block needs to fetch data at runtime rather than reading authored content (none in this repo do today, but it's a common EDS pattern for things like a site nav or a filtered listing):

```js
const resp = await fetch('/query-index.json');
if (!resp.ok) return;
const { data } = await resp.json();
```

`data` is an array of page objects: `{ path, title, description, ... }`.

## Content wrappers inside `block`

When a block is authored directly in a page document, `decorateSections` (in `aem.js`) groups each section's top-level children into wrapper divs before blocks load:

- Runs of non-`div` elements (paragraphs, headings, images, inline text) get wrapped in a `div.default-content-wrapper`.
- Runs of `div` elements (nested block/table content, including the block's own row/cell markup) get wrapped too, but with no special class of their own.

`decorateBlocks`/`decorateBlock` then walk `div.section > div > div` — so a block element's **parent** is one of these wrapper divs, and it's the parent that gets the `<name>-wrapper` class, not the block itself. Account for this when a block's authored content sits alongside unrelated default content in the same section; within the block element itself, authored rows are just nested `div > div` (row → cell), with no `.default-content-wrapper`/`.block-content` split — that split only applies at the section level, above the block.

Blocks built synthetically (via `buildBlock`, e.g. `header`, `footer`, `widget`) have no authored wrappers — the element handed to `decorate` is whatever `buildBlock` constructed, with no children until `decorate` populates it.

## Block authoring conventions, grounded in this repo's existing blocks

### Class naming — flat, not BEM

This codebase does not use BEM (`block__element--modifier`). Classes added by `decorate` are flat, hyphenated, and prefixed with the block name:

```js
// blocks/cards/cards.js
div.className = 'cards-card-image'; // or 'cards-card-body'
```

```js
// blocks/columns/columns.js
block.classList.add(`columns-${cols.length}-cols`); // e.g. columns-3-cols
picWrapper.classList.add('columns-img-col');
```

Follow this shape for new blocks: `<blockname>-<descriptor>`, not `<blockname>__<descriptor>`.

### Design tokens

Reference existing design tokens (`--s2a-color-*`, `--s2a-typography-*`, from `styles/lib/s2a-tokens-*`) rather than hardcoding colors or type values — see `blocks/hero/hero.css` for examples like `var(--s2a-color-gray-25, #fff)`.

### Reduce div soup

EDS decoration leaves unnecessary container elements in the DOM. Use `replaceWith`/`replaceChildren` to swap wrapper divs for the real element structure rather than appending inside them — see how `cards.js` replaces each row with a semantic `<li>` inside a `<ul>`, and `footer.js`'s `decorate` replaces the block's own children with the loaded fragment's sections.

### Prefer object syntax for DOM data

When reading block content from row/cell divs, assign it to a named object first. This keeps optional chaining isolated to one place and makes the rest of the function readable.

```js
const data = {
  backgroundColor: block.children?.[0]?.innerText?.trim(),
  imageCell: block.children?.[1]?.children?.[1],
};

if (data.backgroundColor) {
  el.style.setProperty('--background-color', data.backgroundColor);
}
```

## Testing

New blocks need a Jest unit test co-located with the block — see the [`write-block-tests`](../write-block-tests/SKILL.md) skill for the full pattern (fixtures, mocking `aem.js`/`fragment.js`, style, checklist). `blocks/footer/footer.test.js`, `blocks/columns/columns.test.js`, and `blocks/header/header.test.js` are working examples in this repo.

There is no accessibility-test scaffolding in this repo yet (no `test/a11y/`, no axe-core/Playwright wiring) — don't reference or scaffold it until that infrastructure actually exists.
