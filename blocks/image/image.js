import { getAuthoredCells, getCellMedia, getCellText } from '../../scripts/utils/utils.js';

/**
 * Data used to decorate an image block. Parsed from a key/value block:
 * `Image` holds the picture/img (alt text comes from the authored image
 * itself), `Caption` is optional text shown below it.
 *
 * @typedef {object} ImageData
 * @property {Element|null} image `<picture>` or `<img>` from AEM (source + alt)
 * @property {string} [caption]
 */

/**
 * Reads authored key/value rows from an image block.
 *
 * @param {Element} block The image block element
 * @returns {ImageData}
 */
export function getImageData(block) {
  const cells = getAuthoredCells(block);
  return {
    image: getCellMedia(cells.image),
    caption: getCellText(cells.caption),
  };
}

/**
 * Builds image markup from data and writes it into `root`.
 *
 * @param {ImageData} [data]
 * @param {Element} [root] Element to fill; a new `div` if omitted
 * @returns {Element} The filled root
 */
export function buildImage(data = {}, root = document.createElement('div')) {
  const figure = document.createElement('figure');
  figure.className = 'image__figure';

  if (data.image) figure.append(data.image);

  if (data.caption) {
    const figcaption = document.createElement('figcaption');
    figcaption.className = 'image__caption';
    figcaption.textContent = data.caption;
    figure.append(figcaption);
  }

  root.replaceChildren(figure);
  return root;
}

/**
 * loads and decorates the image block
 * @param {Element} block The image block element
 */
export default function decorate(block) {
  buildImage(getImageData(block), block);
}
