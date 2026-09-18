import { toClassName } from '../../scripts/aem.js';

const HEADING_TEXT = 'Table of contents';
const SECTION_HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/**
 * Deep-link anchor for a TOC section. The backend already assigns headings
 * an id from their slugified text, so this reuses that id when present
 * instead of inventing a second, conflicting one. Only assigns a fresh id
 * (to the heading if there is one, otherwise the section itself) as a
 * fallback for a heading-less section.
 *
 * @param {Element} section A section with `dataset.toc`
 * @returns {string}
 */
function resolveAnchorId(section) {
  const target = section.querySelector(SECTION_HEADING_SELECTOR) || section;
  if (target.id) return target.id;

  const base = toClassName(section.dataset.toc) || 'section';
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
 * Builds one numbered TOC row linking to a section's heading.
 *
 * @param {Element} section A section with `dataset.toc`
 * @param {number} index 0-based; displayed number is `index + 1`
 * @returns {HTMLLIElement}
 */
function buildItem(section, index) {
  const li = document.createElement('li');
  li.className = 'toc__item';

  const link = document.createElement('a');
  link.className = 'toc__link';
  link.href = `#${resolveAnchorId(section)}`;

  const number = document.createElement('span');
  number.className = 'toc__number';
  number.setAttribute('aria-hidden', 'true');
  number.textContent = String(index + 1);

  const text = document.createElement('span');
  text.className = 'toc__text body-md';
  text.textContent = section.dataset.toc;

  link.append(number, text);
  li.append(link);
  return li;
}

/**
 * Removes the block: the section if the block is its only content,
 * otherwise just the block's own wrapper.
 *
 * @param {Element} block The toc block
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
 * Decorates a toc block: ignores any authored content and instead builds
 * an ordered list from sibling sections marked as TOC sections via
 * `Section Metadata` (see `decorateSectionMetadata` in scripts/utils/utils.js).
 * Removes itself when the page has no TOC sections.
 *
 * @param {Element} block The toc block
 */
export default function decorate(block) {
  const main = block.closest('main');
  const sections = main ? [...main.querySelectorAll(':scope > .section[data-toc]')] : [];

  if (!sections.length) {
    removeBlock(block);
    return;
  }

  const heading = document.createElement('h2');
  heading.id = 'toc-heading';
  heading.className = 'toc__heading heading-5';
  heading.textContent = HEADING_TEXT;

  const list = document.createElement('ol');
  list.className = 'toc__list';
  // Safari + VoiceOver drops list semantics when list-style is none.
  list.setAttribute('role', 'list');
  sections.forEach((section, index) => list.append(buildItem(section, index)));

  block.setAttribute('role', 'navigation');
  block.setAttribute('aria-labelledby', 'toc-heading');
  block.replaceChildren(heading, list);
}
