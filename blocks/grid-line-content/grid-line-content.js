import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Decorates the grid line content block.
 * Flattens the authored row(s)/cell(s) into a single text wrapper so the
 * block works whether authors provide one cell or several.
 * @param {Element} block The grid-line-content block element
 */
export default function decorate(block) {
  const text = document.createElement('div');
  text.className = 'grid-line-content-text';

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      while (cell.firstChild) text.append(cell.firstChild);
    });
  });

  text.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false));
  });

  block.replaceChildren(text);
}
