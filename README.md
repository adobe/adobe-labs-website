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
3. Authors can omit cells and add options in the table header, for example `grid-item (aspect-4/5)` or `grid-item (subhead-description)`. Options become extra classes on the block (`aspect-4-5`, `subhead-description`). Decorate defensively.
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
| Content Type | `All` (no filter) or a page `content-type` value (`article`, `video`) |
| Category | `All` (no filter) or Research, Workflows, Sneaks, Playground — matched from the page folder (`/research/...`) |
| Count | How many cards to show (defaults to 8) |

The block fetches `/query-index.json?limit=1000`, filters client-side, and renders each hit as a `grid-item` (3:2). Video cards get the play icon when the index has `isVideo` true, `contentType` is `video`, or the page lives under `/sneaks/` (Sneaks are video unless `isVideo` is explicitly false). Category comes from the first path segment; optional page metadata `category` overrides that when it is one of the four known values.

Card subheads default to the publication date (`Oct 21` this year, `Oct 21, 2027` otherwise). Add `subhead-description` to the block header (`content-grid (subhead-description)` or `grid-item (subhead-description)`) to use the description / Subhead cell instead.

Cards stay empty until indexed article pages exist. Index config lives at [tools.aem.live](https://www.aem.live/developer/indexing) (this repo does not contain `helix-query.yaml`).

**Index properties** (reindex after saving):

- Keep `title`, `image`, `description`, `publicationDate`, `robots`
- Add `contentType` from `meta[name="content-type"]` if you filter by Content Type
- Add `isVideo` from `meta[name="isvideo"]` so the play icon can follow page metadata outside `/sneaks/`

**On each Labs article in DA**, put the page under `/research`, `/workflows`, `/sneaks`, or `/playground`, and author description, `og:image`, and publication date. The block drops `noindex` pages and paths under `/docs` or `/fragments`.

## Testing

To run tests:

```sh
npm test
```

### Writing Block Tests

See the [write-block-tests](.ai/skills/write-block-tests/SKILL.md) skill for instructions and guidelines on writing unit tests for blocks.
