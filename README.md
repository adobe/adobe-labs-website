# Adobe Labs

> Adobe Labs is the always-on public home that makes Adobe's AI-and-creativity innovation visible,
> continuous, and credible; the trusted, human-centered, evidence-led voice on creative work in the AI era.

This site is built using AEM with content managed via Document Authoring (DA). The codebase is based off of the `aem-boilerplate`.

## Environments

- Preview: https://main--adobe-labs-website--adobe.aem.page/
- Live: https://main--adobe-labs-website--adobe.aem.live/
- Editing: https://da.live/#/adobe/adobe-labs-website/

## Documentation

### aem-boilerplate

Before using the aem-boilerplate, we recommend you to go through the documentation on https://www.aem.live/docs/ and more specifically:

1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Quick Start

```sh
npm i
npm start
```

## Local development

1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `npm start` (opens your browser at `http://localhost:3000`)
1. Open the `adobe-labs-website` directory in your favorite IDE and start coding

## Code Quality

To run ESLint and Stylelint:

```sh
npm run lint
```

## Creating blocks

A block is a named table in a document. Authors insert it; developers style and decorate it. The block name must match a folder under `blocks/` in this repo (for example `blocks/hero/` loads `hero.css` and `hero.js`). See [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks).

### Add the block code

1. Create `blocks/<block-name>/` with a CSS file, and a JS file if the block needs decoration.
2. Scope CSS to `.block-name`. Section wrappers use `.block-name-wrapper` / `.block-name-container` — do not put block layout CSS only on those unless you mean to style the section shell.
3. Authors can omit cells and add options in the table header, for example `grid-item (aspect-4/5)`. Options become extra classes on the block (`aspect-4-5`). Decorate defensively.
4. Run `npm start` and place the block on a preview page to verify. Inspect `http://localhost:3000/<path>.plain.html` if the authored markup is unclear.

See [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project) and [Exploring blocks](https://www.aem.live/docs/exploring-blocks).

### Make the block available to authors

Authors insert blocks from the Library in [Document Authoring](https://da.live/#/adobe/adobe-labs-website). That catalog lives in DA under `/docs/library/`, not in this repo. Code merges ship separately from content publish.

Library lists two kinds of variants:

- **Content variants**: an H2 above each sample table. The heading text is the sub-item name in Library.
- **Visual variants**: options in the table header, as in `grid-item (aspect-4/5)` above. Section breaks are for page layout, not for grouping Library items.

1. Create a document named after the block in the [blocks folder](https://da.live/#/adobe/adobe-labs-website/docs/library/blocks).
2. For each variant, add an H2 (the Library label), then a block table with dummy content. Use header options for visual variants.
3. Optionally add a `Library Metadata` table after a sample block so Library shows an info icon with that description. Wrap a heading with the block in `library-container-start` / `library-container-end` if the heading should insert with the block.
4. Preview the document so Library can read it. Publish if authors on the live site should see it.
5. Add a row on the [blocks spreadsheet](https://da.live/sheet#/adobe/adobe-labs-website/docs/library/blocks):
   - `name`: the label shown in Library → Blocks
   - `path`: `https://content.da.live/adobe/adobe-labs-website/docs/library/blocks/<block-name>` (use `content.da.live`, not `da.live`)
6. Preview the spreadsheet (publish if live authors need it).
7. In DA, open Library → Blocks and confirm the new name, with nested H2 variants.

### Library setup

Blocks, Templates, Placeholders, and Icons are registered on the **library** tab of the [site config](https://da.live/config#/adobe/adobe-labs-website/) (for example Blocks → `https://content.da.live/adobe/adobe-labs-website/docs/library/blocks.json`). Put those rows on the **library** tab, not **data**. Edit this tab only when adding a new *type* of library, not for each block.

For Templates, Placeholders, and Icons, see [Setup library](https://docs.da.live/administrators/guides/setup-library).

### content-grid (query-driven)

The homepage **Latest Content** section uses `content-grid` with a key/value table:

| Field | Meaning |
| --- | --- |
| Content Type | `All` (default) fetches `/content.json`. A section name — Research, Workflows, Sneaks, Playground — fetches that folder’s `content.json` |
| Category | Optional. `All` or omitted means no filter. Otherwise matched against the index `category` field (array or comma-separated string) after trim + lowercase |
| Count | How many cards to show (defaults to 8) |
| Intro | Optional freeform first cell (heading, paragraph, links). Extra; does not count toward Count |

The block fetches the Content Type endpoint via `dataStore`, filters by Category after the fetch, and renders each hit as a `grid-item`. If nothing matches, the block and its `.content-grid-wrapper` are hidden (including authored Intro). An Intro cell, when authored, sits in column 1 at four columns and stacks full-width above the cards at three columns and one. Card image frames follow the index `imageAspect` value (`1:1`, `4:5`, `3:2`, `2:3`; separators `:`, `/`, or `-` are fine). Missing or unknown values default to 1:1. Video cards get the play icon when the index has `isVideo` true, `contentType` is `video`, or the page lives under `/sneaks/` (Sneaks are video unless `isVideo` is explicitly false). Card content-type labels (when `show-content-type` is set) come from the first path segment (Research, Workflows, Sneaks, Playground)—not the topic Category metadata.

Card subheads default to the publication date (`Oct 21` this year, `Oct 21, 2027` otherwise). Add `subhead-description` to the content-grid block header (`content-grid (subhead-description)`) to use the index description instead.

Standalone `grid-item` cards link when the Title cell is a link. Content-type labels on cards are off by default. Add `show-content-type` to the content-grid block header (`content-grid (show-content-type)`) to render each card’s `.grid-item__content-type` link. On a standalone `grid-item`, author a `Content Type` row (legacy `Category` still works).

Cards stay empty until indexed article pages exist. Index config lives at [tools.aem.live](https://www.aem.live/developer/indexing) (this repo does not contain `helix-query.yaml`).

**Index properties** (reindex after saving):

- Keep `title`, `image`, `description`, `publicationDate`, `robots`
- Add `category` as an array or comma-separated list so the Category filter can match
- Add `isVideo` from `meta[name="isvideo"]` so the play icon can follow page metadata outside `/sneaks/`
- Add `imageAspect` from `meta[name="image-aspect"]` so card frames follow page metadata `Image Aspect`

**On each Labs article in DA**, put the page under `/research`, `/workflows`, `/sneaks`, or `/playground`, and author description, `og:image`, publication date, and `Image Aspect` (`1:1`, `4:5`, `3:2`, or `2:3`). The block drops `noindex` pages and section index pages (`/research/`, `/workflows/index`, and the other known sections).

## Testing

To run tests:

```sh
npm test
```

## Code Guidelines

### CSS

For blocks and other custom classes, the preference is to use BEM style classes where possible.

Native nesting can be used for this project. When doing so, keep the following in mind in order to increase the support for some slightly older Safari versions:

1. Use `&` when referencing **base** elements, e.g. `.thing { & p { color: red; }}`. This helps support Safari 16.5 through 17.1 that enforced a strict grammar rule.
2. If using `@supports`, keep this as a root selector and not nested within other selectors, to avoid a Webkit 
   bug that breaks all the other adjacent styles and CSS custom properties. Safari versions 16.5 through 18.1 were affected by this CSS nesting hoisting bug.

### JS

Make sure all code is documented with JSDOC style comments. Including functions, their parameters, and return values.
Avoid an excessive amount of separate imported files, as each is an a network request since the JS is not compiled into a bundle.

### Writing Block Tests

See the [write-block-tests](.ai/skills/write-block-tests/SKILL.md) skill for instructions and guidelines on writing unit tests for blocks.

## Query Indexes

The following query indexes are configured for this site.
The custom `content.json` indexes are used to render dynamic content, such as articles within the Content Grid.

- **All pages**: The `sitemap.xml` is configured to point to this. 
  `/query-index.json`
- **All content**: Returns all types of single article content within specific directories (excludes index pages).
  `/content.json`
- **Research content**: Returns all research articles (excludes the index page).
  `/research/content.json`
- **Workflows content**: Returns all workflow articles (excludes the index page).
  `/workflows/content.json`
- **Sneaks content**: Returns all workflow articles (excludes the index page).
  `/sneaks/content.json`
- **Playground content**: Returns all workflow articles (excludes the index page).
  `/playground/content.json`

Important development notes:

- The indexes are configured by admins using the [AEM Index Admin Tool](https://tools.aem.live/tools/index-admin/index.html), not via the "retired" method of using a YAML file.
- Per AEM docs, sitemaps should automatically exclude `noindex` robots metadata. They are not automatically
excluded from the query index JSON, so these must be filtered on the frontend.
- Only published pages (and changes) will show in the query indexes.

## Metadata

Default metadata values are set via the root `/metadata` spreadsheet.
See [AEM bulk metadata docs](https://www.aem.live/docs/bulk-metadata) for more info.

Article detail pages (`/research/*`, `/workflows/*`, `/sneaks/*`, `/playground/*`) get `template: article` from that spreadsheet. The article pre-footer autoblock keys off this metadata, not a hardcoded path list. A page-level metadata block can still add or omit `article` for an exception.

Individual pages can then set metadata values via a `metadata` block, including overriding any of those default values.
See [AEM metadata block docs](https://www.aem.live/developer/block-collection/metadata) for more info. 
### Buttons

The default `.button` class uses the Primary style. So far only the default/primary style is supported until others are needed.

Default buttons are dark-mode aware. The `.button--static-white` variant can be used for non-theme-aware buttons, like in the hero.

#### Adding a button in AEM

Follow [AEM's Buttons docs](https://www.aem.live/developer/block-collection/buttons#code).

The paragraph must contain only the link. `decorateButtons` then adds class `button` to the link and class `button-wrapper` to the paragraph.

`.button-wrapper` is a `p`, so it has the default paragraph margin.

You can use the same steps for a standalone button in default content and for a button in a block cell. 

> [!NOTE]
> The AEM docs incorrectly state that `p > a` (without `<strong>` or `<em>`). This is outdated, as standalone plain links do not receive the `.button` class. See [decorateButtons](https://github.com/adobe/adobe-labs-website/blob/9cd669eb7227dfea2350286db816361dc8bd55da/scripts/scripts.js#L123).

#### Adding a button in JavaScript

Create a native `button` or `a` as needed and add class `button` to it.

Add extra classes for variants as needed, for example `button--static-white`.

##### Disabled buttons as links
`decorateButtons` runs before block JavaScript. For a disabled link that you create as `a.button` in block JS, set `aria-disabled="true"`, set `tabIndex = "-1"`, and call `event.preventDefault()` on click.
