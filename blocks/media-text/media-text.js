import { getAuthoredCells, getCellMedia, getCellText } from '../../scripts/utils/utils.js';

/**
 * Element children of the Text cell, unchanged.
 * A cell with only text nodes becomes one paragraph.
 *
 * @param {Element} [cell] The Text value cell
 * @returns {Element[]}
 */
function getContentElements(cell) {
  if (!cell) return [];

  const elements = [...cell.children];
  if (elements.length) return elements;
  if (!cell.textContent.trim()) return [];

  const paragraph = document.createElement('p');
  paragraph.append(...cell.childNodes);
  return [paragraph];
}

/**
 * Data used to decorate a media-text block.
 *
 * @typedef {object} MediaTextData
 * @property {Element|null} image `<picture>` or `<img>` from AEM
 * @property {string} [caption] Optional plain text under the image
 * @property {Element[]} content Authored text elements, tags unchanged
 */

/**
 * Reads authored key/value rows from a media-text block.
 *
 * @param {Element} block The media-text block element
 * @returns {MediaTextData}
 */
export function getMediaTextData(block) {
  const cells = getAuthoredCells(block);
  return {
    image: getCellMedia(cells.image),
    caption: getCellText(cells.caption),
    content: getContentElements(cells.text),
  };
}

/**
 * Builds media-text markup from data and writes it into `root`.
 * The block element is the root, so header classes stay on it.
 * `media-right` writes the text before the image.
 *
 * @param {MediaTextData} [data]
 * @param {Element} [root] Element to fill; a new `div` if omitted
 * @returns {Element} The filled root
 */
export function buildMediaText(data = {}, root = document.createElement('div')) {
  let figure = null;
  let content = null;

  if (data.image || data.caption) {
    figure = document.createElement('figure');
    figure.className = 'media-text__media';
    if (data.image) figure.append(data.image);

    if (data.caption) {
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'media-text__caption';
      figcaption.textContent = data.caption;
      figure.append(figcaption);
    }
  }

  if (data.content?.length) {
    content = document.createElement('div');
    content.className = 'media-text__content';
    content.append(...data.content);
  }

  const mediaRight = root.classList.contains('media-right');
  const parts = mediaRight ? [content, figure] : [figure, content];
  root.replaceChildren(...parts.filter(Boolean));
  return root;
}

/**
 * Decorates the media-text block.
 * @param {Element} block The media-text block element
 */
export default function decorate(block) {
  buildMediaText(getMediaTextData(block), block);
}
