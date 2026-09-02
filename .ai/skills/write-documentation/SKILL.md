---
name: write-documentation
description: Follow Adobe content writing standards when writing documentation for the Adobe Labs website.
---

# Documentation standards

Follow and understand Adobe content writing standards when writing documentation for the Adobe Labs website.

## When this skill applies

- Writing or updating documentation for this codebase
- Writing any documentation that is shipped to external consumers
- Creating documentation that is internal
- Drafting Jira tickets
- Writing a pull request description

## Example

### 🚨 Not following Adobe content standards

THE COLUMNS BLOCK figures out how many columns you have based on however many cells are in the first row and it adds a class like columns-2-cols or columns-3-cols or whatever number applies to the block wrapper, and ALSO if a column's only content is a single picture it gets tagged with columns-img-col so you can target it in CSS, and this matters because otherwise your image columns won't get the special layout treatment and things might look broken on smaller screens if you forget this!!!

### ✅ Following Adobe content standards

The columns block adds a `columns-<n>-cols` class to the block, where `<n>` is the number of cells in the first row. Any column whose only content is an image is also tagged `columns-img-col`, so image columns can be styled separately from text columns.

## Key patterns

Most often, documentation is written in Markdown format.

### Markdown syntax reference

#### Headers

```markdown
# H1 Header

## H2 Header

### H3 Header

#### H4 Header

##### H5 Header

###### H6 Header
```

#### Text Formatting

```markdown
**Bold text**

_Italic text_

**_Bold and italic_**

~~Strikethrough~~

`Inline code`

> Blockquote
> Multiple lines
> in blockquote

---

Horizontal rule (also \_\_\_ or \*\*\*)
```

#### Lists

```markdown
Unordered list:

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

Ordered list:

1. First item
2. Second item
   1. Nested item 2.1
   2. Nested item 2.2
3. Third item

Task list (GitHub Flavored Markdown):

- [x] Completed task
- [ ] Incomplete task
- [ ] Another task
```

#### Links and Images

```markdown
[Link text](https://example.com)
[Link with title](https://example.com 'Link title')

Reference-style link:
[Link text][reference]
[reference]: https://example.com

Automatic link:
<https://example.com>
<email@example.com>

![Alt text](image.png)
![Alt text](image.png 'Image title')

Reference-style image:
![Alt text][image-ref]
[image-ref]: image.png
```

#### Code Blocks

````markdown
Inline code: `const x = 5;`

Code block with language:

```javascript
function hello(name) {
  console.log(`Hello, ${name}!`);
}
```

```bash
npm install
npm start
```
````

#### Tables

```markdown
Simple table:
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | Data     |
| Row 2    | Data     | Data     |

Aligned columns:
| Left | Center | Right |
|:-----|:------:|------:|
| Left | Center | Right |
| Text | Text   | Text  |
```

## Resources

- [Adobe voice and tone](https://spectrum.adobe.com/page/voice-and-tone/)
- [Grammar and mechanics](https://spectrum.adobe.com/page/grammar-and-mechanics/)
- [Inclusive UX writing](https://spectrum.adobe.com/page/inclusive-ux-writing/)
- [Writing about people](https://spectrum.adobe.com/page/writing-about-people/)
- [Writing for readability](https://spectrum.adobe.com/page/writing-for-readability/)
- [Writing with visuals](https://spectrum.adobe.com/page/writing-with-visuals/)
- [In-product word list](https://spectrum.adobe.com/page/in-product-word-list/)
- [Writing for errors](https://spectrum.adobe.com/page/writing-for-errors/)
