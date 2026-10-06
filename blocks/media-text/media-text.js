import { getCellMedia, getCellText } from '../../scripts/utils/utils.js';

/**
 * Element children of a content cell, unchanged.
 * A cell with only text nodes becomes one paragraph.
 *
 * @param {Element} [cell] The content cell
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
 * @property {Element|null} image `<picture>` or `<img>` from the image cell
 * @property {string} [caption] Optional plain text in the image cell
 * @property {Element[]} content Authored text elements, tags unchanged
 * @property {boolean} mediaRight True when the image cell is not the first cell
 */

/**
 * Reads the first authored row of a media-text block.
 * The cell that contains a picture is the image. Its index sets the side.
 *
 * @param {Element} block The media-text block element
 * @returns {MediaTextData}
 */
export function getMediaTextData(block) {
  const cells = [...(block?.firstElementChild?.children || [])];
  const mediaIndex = cells.findIndex((cell) => getCellMedia(cell));
  const mediaCell = mediaIndex >= 0 ? cells[mediaIndex] : null;
  const contentCell = cells.find((cell, index) => index !== mediaIndex);

  return {
    image: getCellMedia(mediaCell),
    caption: mediaCell ? getCellText(mediaCell) : '',
    content: getContentElements(contentCell),
    mediaRight: mediaIndex > 0,
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

  const mediaRight = Boolean(data.mediaRight);
  root.classList.toggle('media-right', mediaRight);
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
