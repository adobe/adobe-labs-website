/**
 * Decorates the grid line content block.
 * Flattens the authored row(s)/cell(s) into a single text wrapper so the
 * block works whether authors provide one cell or several.
 * @param {Element} block The grid-line-content block element
 */
export default function decorate(block) {
  const text = document.createElement('div');
  text.className = 'grid-line-content__text';

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      while (cell.firstChild) text.append(cell.firstChild);
    });
  });

  block.replaceChildren(text);
}
