---
name: performance-review
description: Review a diff for performance cost and lifecycle fragility — before opening a PR, when a change touches scripts.js, aem.js, head.html, images, fonts or dependencies, or when a block wants to hook into core page load for "speed". Analyses the change against the load lifecycle; does not measure.
---

# Performance review

This project is buildless and every line ships. Regressions here are not slow functions — they are
bytes and requests added before first paint, and work hoisted ahead of the lifecycle stage that
should own it.

This skill analyses; it does not measure. Lighthouse against a proxied dev server produces numbers
that are not the published numbers, and every check below is decidable from source.

Report findings. Do not fix them unless asked.

## The lifecycle — what already happens, in order

| # | Where | What runs | Network |
|---|---|---|---|
| 1 | `head.html` | `aem.js`, then `scripts.js` load as `type="module"` (deferred); `styles.css` and the Typekit stylesheet load render-blocking | yes — render-blocking CSS |
| 2 | `aem.js` top level | `init()` sets up `sampleRUM` telemetry | deferred beacon, not blocking |
| 3 | `scripts.js` top level | trusted-types policy, then top-level `loadPage()` | no |
| 4 | `loadEager` → `decorateTemplateAndTheme` | `template`/`theme` metadata → body classes | no |
| 5 | `loadEager` → `decorateMain` | `decorateIcons`, `buildAutoBlocks` (fragments + `/widgets/` links), `decorateSections`, `decorateBlocks`, `decorateButtons` | fragment loading is a dynamic import, kicked off but not awaited |
| 6 | `loadEager` → first section only | `loadSection(firstSection, waitForFirstImage)`: blocks in that section load **one at a time**, then `waitForFirstImage` forces `loading="eager"` on the section's first `<img>` and awaits it | **yes** — per-block JS/CSS, sequential |
| 7 | `loadLazy` | `loadHeader` (not awaited), `await loadSections(main)` — remaining sections awaited in order, blocks within each section awaited **one at a time**, `sampleRUM.enhance()` after section 0, hash scroll, `loadFooter` (not awaited), `loadCSS('lazy-styles.css')` (not awaited) | yes, deferred behind step 6 |
| 8 | `loadDelayed` | dynamic `import('./consent-check.js')` → `consented.js` only once consent is granted | deferred, post-paint |

Steps 1–5 are synchronous and block the first section. Anything added there delays every paint on
every page.

## There is no concurrency to protect here

Unlike stacks that fan blocks out in parallel within a section, this boilerplate's `loadSection` and
`loadSections` in `aem.js` load every block **sequentially** — a plain `for` loop with `await
loadBlock(blocks[i])` inside it, both across sections and across blocks within one section. That is
vendored behavior in `aem.js`: don't "fix" it into a `Promise.all` from `scripts.js` without raising
it as its own change — turning it concurrent changes bandwidth contention on the critical path and
is a deliberate trade-off, not an oversight to patch in passing.

The practical result: a heavy block earlier in the DOM order delays every block after it, including
ones in the same section. When a diff adds a block to a template, its position in authoring order is
itself a performance lever — flag a heavy block placed before lighter ones that are needed for the
same paint.

### Kick off now, consume later

Because blocks are awaited strictly in order, the one lever available for something slow (a fetch, a
third-party script) is to start it early and consume it later, rather than awaiting it inline where
it delays every block after it:

```js
const data = fetch(url).then((r) => r.json());   // started, not awaited
// … later, in this block's own decorate(), where it is actually needed
render(await data);
```

Starting the request at the top of a block's `decorate()` and awaiting it only where the result is
consumed costs nothing extra and doesn't block sibling blocks queued behind it. Awaiting immediately
does block them — `loadBlock` awaits each block's module fully before starting the next.

### Reviewing it

Flag: an `await` whose result nothing reads; a fetch awaited before the point that needs it; a block
added anywhere in `loadEager`/`loadLazy`'s own awaited chain instead of doing its own work inside its
`decorate(block)`.

## Load what this request uses

Deferring is not the same as not loading. `loadDelayed` in `scripts.js` exists so
non-essential work (today, `consent-check.js`) happens after lazy content, not during it.

**If a module is not needed by every request, guard it and import it dynamically.**

| Where | Guard |
|---|---|
| `buildAutoBlocks` (fragments) | only imports `fragment/fragment.js` `if (fragments.length > 0)` |
| `consent-check.js` → `consented.js` | only imports `consented.js` once `hasConsent()` is true |
| `loadBlock` | dynamic-imports a block's own `<name>.js` per block, only for blocks present on the page |

The subtle failure is an **unguarded dynamic import** — `import()` inside a function that always
runs is a static import with extra steps: the request moved later but never went away. The test is
whether a condition stands in front of it.

Flag: a new static import of something conditional; a dynamic import with no guard; a guard placed
after the import rather than before.

## The core rule

**`scripts/aem.js` is vendored — never edit it.** It is the shared engine every AEM Boilerplate
project inherits; see `AGENTS.md`'s "Avoid" list. A diff touching it should be assumed wrong until it
argues otherwise.

`scripts.js` is more permissive, but only for **data and non-blocking, network-free logic** inside
`loadEager`/`loadLazy`/`loadDelayed`. Building up a synthetic block (as `buildWidgetAutoBlocks` does)
for `decorateMain`/`loadSection` to hydrate later is fine — it is synchronous DOM work, and the
existing loader takes it from there. A new static import or an awaited JSON fetch added to
`loadEager` or `loadLazy` is not: both put a request ahead of, or inside, the section-loading chain.

Legitimate: a new autoblock pattern that builds markup for `decorateMain` to pick up, a new
`hlx.codeBasePath`-relative asset guard, a consent-gated import following the
`consent-check.js`/`consented.js` pattern.

Not legitimate: anything awaiting the network from `loadEager`, a new static import at the top of
`scripts.js`, or work that could equally happen inside a block's own `decorate()` or in `loadDelayed`.

## The ruthless test

For anything added to steps 1–6, ask in order:

1. **CLS** — does removing this cause layout shift that reserved CSS space cannot fix?
2. **LCP** — does removing this measurably delay paint of the actual LCP element?
3. **Generic?** — does it work regardless of which blocks are on the page?
4. **Could it live in the block?** — could the same work happen in that block's `decorate()`?
5. **Wrong shelf?** — would `loadLazy` or `loadDelayed` produce an identical visible result?
6. **Measured or imagined?** — is this fixing a profiled waterfall or a theorised one?

**If 1 and 2 are both "no", it does not belong ahead of `loadSections`.** Question 6 carries the
most weight: speculative optimisation is the common case, and this project treats unmeasured
defensive work as shipped bytes.

## What already runs for free — do not re-solve it

- **Per-block lazy JS and CSS.** `loadBlock` dynamic-imports every block's code and stylesheet
  already, only for blocks present on the page.
- **Section-ordered, block-ordered rendering.** `loadSections`/`loadSection` await section *N*
  (and block *N* within it) before starting the next, so above-the-fold work finishes first by
  construction.
- **Forced-eager LCP image.** `waitForFirstImage` already sets `loading="eager"` on the first
  section's first `<img>` and blocks `loadEager` until it loads or errors.
- **Deferred, consent-gated extras.** `loadDelayed` → `consent-check.js` exists for exactly this.
  New "not needed for paint" work belongs there, not in `loadPage`.

## Mechanical checks

**Imports.** With no bundler every static import is its own request, and everything reachable from
`scripts.js` is fetched before first paint.

```bash
git diff <base>..HEAD -- '*.js' | grep -E '^\+import .* from'
```

Judge each hit against "Load what this request uses" above.

**Blocking resources.** Any new `<link rel="stylesheet">`, non-module `<script>`, or synchronous
third-party tag added to `head.html`. `head.html` already ships two render-blocking stylesheets
(`styles.css`, the Typekit CSS) — a diff adding a third is a finding even if each one looks small.
`styles.css` also pulls in design tokens via `@import url(...)`, which the browser cannot discover
or fetch in parallel with the stylesheet that contains it; a new `@import` chained the same way
compounds that cost and should be flagged even though it's an existing pattern.

**Images.** Missing `width`/`height` (the most common CLS cause here); `loading="eager"` on anything
below the fold or `loading="lazy"` fighting `waitForFirstImage`'s forced-eager LCP image; a large
PNG/JPEG doing a job the `?format=webply` query param on `createOptimizedPicture` already does
smaller.

**Fonts.** A new `@font-face` needs `font-display: swap` and a `unicode-range` if it's meant to avoid
blocking text rendering; note that Typekit's stylesheet is out of this project's control, so a new
custom font added alongside it is the part actually reviewable here.

**Dependencies.** Any addition to `dependencies` is a finding — this project ships none as runtime
package-manager dependencies; anything shipped goes through `styles/lib` or a vendored script
instead. `devDependencies` are fine if they cannot reach shipped code.

**Payload.** `git diff --stat <base>..HEAD -- '*.css' '*.js'`. Growth is not itself a defect; growth
on the critical path, or growth that is mostly comments and defensive scaffolding, is.

## Reporting

Order by cost: lifecycle violations and added critical-path requests first, then layout shift, then
payload. For each, give file and line, what it costs, and the specific alternative — usually a
lifecycle stage to move to, or a CSS property that removes the need for JS timing.

A finding without an alternative is an observation. Say so, or leave it out.

If the diff touches none of this, say so in one line. Most diffs will.
