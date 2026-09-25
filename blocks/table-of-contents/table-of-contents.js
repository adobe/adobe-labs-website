import { toClassName } from '../../scripts/aem.js';

const HEADING_TEXT = 'Table of Contents';
const SECTION_HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const SECTION_SELECTOR = ':scope > .section[data-table-of-contents], :scope > .section[data-toc]';

/**
 * Label authored for a section. `Table of Contents` wins when both
 * Section Metadata rows are present.
 *
 * @param {Element} section A section with `dataset.tableOfContents` or `dataset.toc`
 * @returns {string}
 */
function sectionLabel(section) {
  return section.dataset.tableOfContents || section.dataset.toc || '';
}

/**
 * Deep-link anchor for a Table of Contents section. The backend already
 * assigns headings an id from their slugified text, so this reuses that id
 * when present instead of inventing a second, conflicting one. Only assigns
 * a fresh id (to the heading if there is one, otherwise the section itself)
 * as a fallback for a heading-less section.
 *
 * @param {Element} section A section with `dataset.tableOfContents` or `dataset.toc`
 * @returns {string}
 */
function resolveAnchorId(section) {
  const target = section.querySelector(SECTION_HEADING_SELECTOR) || section;
  if (target.id) return target.id;

  const base = toClassName(sectionLabel(section)) || 'section';
  let id = base;
  let n = 2;
  while (document.getElementById(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  target.id = id;
  return id;
}

/**
 * Builds one numbered Table of Contents row linking to a section's heading.
 *
 * @param {Element} section A section with `dataset.tableOfContents` or `dataset.toc`
 * @param {number} index 0-based; displayed number is `index + 1`
 * @returns {HTMLLIElement}
 */
function buildItem(section, index) {
  const li = document.createElement('li');
  li.className = 'table-of-contents__item';

  const link = document.createElement('a');
  link.className = 'table-of-contents__link';
  link.href = `#${resolveAnchorId(section)}`;

  const number = document.createElement('span');
  number.className = 'table-of-contents__number';
  number.setAttribute('aria-hidden', 'true');
  number.textContent = String(index + 1);

  const text = document.createElement('span');
  text.className = 'table-of-contents__text body-md';
  text.textContent = sectionLabel(section);

  link.append(number, text);
  li.append(link);
  return li;
}

/**
 * Removes the block: the section if the block is its only content,
 * otherwise just the block's own wrapper.
 *
 * @param {Element} block The Table of Contents block
 */
function removeBlock(block) {
  const wrapper = block.parentElement;
  const section = block.closest('.section');
  if (section && section.children.length === 1) {
    section.remove();
    return;
  }
  (wrapper || block).remove();
}

/**
 * Decorates a Table of Contents block: ignores any authored content and
 * instead builds an ordered list from sibling sections marked via
 * `Section Metadata` (see `decorateSectionMetadata` in scripts/utils/utils.js).
 * A section qualifies when its metadata row is named `Table of Contents` or
 * `TOC`. Removes itself when the page has no such sections.
 *
 * @param {Element} block The Table of Contents block
 */
export default function decorate(block) {
  const main = block.closest('main');
  const sections = main ? [...main.querySelectorAll(SECTION_SELECTOR)] : [];

  if (!sections.length) {
    removeBlock(block);
    return;
  }

  const heading = document.createElement('h2');
  heading.id = 'table-of-contents-heading';
  heading.className = 'table-of-contents__heading heading-5';
  heading.textContent = HEADING_TEXT;

  const list = document.createElement('ol');
  list.className = 'table-of-contents__list';
  // Safari + VoiceOver drops list semantics when list-style is none.
  list.setAttribute('role', 'list');
  sections.forEach((section, index) => list.append(buildItem(section, index)));

  block.setAttribute('role', 'navigation');
  block.setAttribute('aria-labelledby', 'table-of-contents-heading');
  block.replaceChildren(heading, list);
}
