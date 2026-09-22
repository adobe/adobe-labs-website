import { getCellMedia, getCellText } from '../../scripts/utils/utils.js';

/**
 * Whether a row is caption-only: none of its cells contain an image.
 * @param {Element} row A row of the side-by-side-image block
 * @returns {boolean}
 */
function isCaptionRow(row) {
  return ![...row.children].some((cell) => getCellMedia(cell));
}

/**
 * Reads authored rows into image items. A row containing an image starts a
 * new group of items; a row with no images applies its cells, by column
 * position, as captions on the image row directly above it. This keeps the
 * block's original flat "one item per image cell" model for any number of
 * image rows, while letting an optional caption row follow any of them.
 * @param {Element} block The side-by-side-image block element
 * @returns {{ picture: Element|null, caption: string }[]}
 */
function getItems(block) {
  const groups = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];

    if (isCaptionRow(row) && groups.length) {
      const previous = groups[groups.length - 1];
      cells.forEach((cell, index) => {
        if (previous[index]) previous[index].caption = getCellText(cell);
      });
      return;
    }

    groups.push(cells.map((cell) => ({ picture: getCellMedia(cell), caption: '' })));
  });

  return groups.flat();
}

/**
 * Decorates the side-by-side-image block: turns each image item into a
 * figure, with an optional figcaption when a caption row was authored below
 * it. Degrades gracefully if authors add or omit cells.
 * @param {Element} block The side-by-side-image block element
 */
export default function decorate(block) {
  const figures = getItems(block).map(({ picture, caption }) => {
    const figure = document.createElement('figure');
    figure.className = 'side-by-side-image__item';
    if (picture) figure.append(picture);

    if (caption) {
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'side-by-side-image__caption';
      figcaption.textContent = caption;
      figure.append(figcaption);
    }

    return figure;
  });

  block.replaceChildren(...figures);
}
