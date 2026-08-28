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

1. Open `/docs/library/blocks/` and create a document named after the block.
2. In that document, author one or more default instances (tables whose first row is the block name, plus sample content). Use section breaks between variants so Library can list them separately. This is what gets placed when an author adds the block. Preview and publish the document.
3. Open the `blocks` spreadsheet in `/docs/library/` and add a row:
   - `name`: the label shown in Library → Blocks
   - `path`: the content URL of the document, for example `https://content.da.live/adobe/adobe-labs-website/docs/library/blocks/<block-name>` (use `content.da.live`, not `da.live`)
4. Preview and publish the spreadsheet.

Authors can then add the block from Library → Blocks. For more on library setup, see [Setup library](https://docs.da.live/administrators/guides/setup-library).

### content-grid (query-driven)

The homepage **Latest Content** section uses `content-grid` with a key/value table:

| Field | Meaning |
| --- | --- |
| Content Type | `All` (default) fetches `/content.json`. A section name — Research, Workflows, Sneaks, Playground — fetches that folder’s `content.json` |
| Category | Optional. `All` or omitted means no filter. Otherwise matched against the index `category` field (array or comma-separated string) after trim + lowercase |
| Count | How many cards to show (defaults to 8) |
| Intro | Optional freeform first cell (heading, paragraph, links). Extra; does not count toward Count |

The block fetches the Content Type endpoint via `dataStore`, filters by Category after the fetch, and renders each hit as a `grid-item`. If nothing matches, the block and its `.content-grid-wrapper` are hidden (including authored Intro). An Intro cell, when authored, sits in column 1 at four columns and stacks full-width above the cards at three columns and one. Card image frames follow the index `imageAspect` value (`1:1`, `4:5`, `3:2`, `2:3`; separators `:`, `/`, or `-` are fine). Missing or unknown values default to 3:2. Video cards get the play icon when the index has `isVideo` true, `contentType` is `video`, or the page lives under `/sneaks/` (Sneaks are video unless `isVideo` is explicitly false). Card section labels (when `show-category` is set) come from the first path segment.

Card subheads default to the publication date (`Oct 21` this year, `Oct 21, 2027` otherwise). Add `subhead-description` to the content-grid block header (`content-grid (subhead-description)`) to use the index description instead.

Standalone `grid-item` cards link when the Title cell is a link. Section labels on cards are off by default. Add `show-category` to the content-grid block header (`content-grid (show-category)`) to render each card’s `.grid-item__category` link.

Cards stay empty until indexed article pages exist. Index config lives at [tools.aem.live](https://www.aem.live/developer/indexing) (this repo does not contain `helix-query.yaml`).

**Index properties** (reindex after saving):

- Keep `title`, `image`, `description`, `publicationDate`, `robots`
- Add `category` as an array or comma-separated list so the Category filter can match
- Add `isVideo` from `meta[name="isvideo"]` so the play icon can follow page metadata outside `/sneaks/`
- Add `imageAspect` from `meta[name="image-aspect"]` so card frames follow page metadata `Image Aspect`

**On each Labs article in DA**, put the page under `/research`, `/workflows`, `/sneaks`, or `/playground`, and author description, `og:image`, publication date, and `Image Aspect` (`1:1`, `4:5`, `3:2`, or `2:3`). The block drops `noindex` pages, section index pages (`/research/`, `/workflows/index`, and the other known sections), and paths under `/docs` or `/fragments`.

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

Individual pages can then set metadata values via a `metadata` block, including overriding any of those default values.
See [AEM metadata block docs](https://www.aem.live/developer/block-collection/metadata) for more info. 
