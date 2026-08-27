# Adobe Labs

> Adobe Labs is the always-on public home that makes Adobe's AI-and-creativity innovation visible,
> continuous, and credible; the trusted, human-centered, evidence-led voice on creative work in the AI era.

This site is built using AEM with content managed via Document Authoring (DA). The codebase is based off of the `aem-boilerplate`.

## Environments
- Preview: https://main--adobe-labs-website--adobe.aem.page/
- Live: https://main--adobe-labs-website--adobe.aem.live/

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
