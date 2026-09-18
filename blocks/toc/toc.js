const HEADING_TEXT = 'Table of contents';

/**
 * Builds one numbered TOC row linking to a section's id.
 *
 * @param {Element} section A section with `dataset.toc` and an id
 * @param {number} index 0-based; displayed number is `index + 1`
 * @returns {HTMLLIElement}
 */
function buildItem(section, index) {
  const li = document.createElement('li');
  li.className = 'toc__item';

  const link = document.createElement('a');
  link.className = 'toc__link';
  link.href = `#${section.id}`;

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
  heading.className = 'toc__heading heading-5';
  heading.textContent = HEADING_TEXT;

  const list = document.createElement('ol');
  list.className = 'toc__list';
  sections.forEach((section, index) => list.append(buildItem(section, index)));

  block.replaceChildren(heading, list);
}
