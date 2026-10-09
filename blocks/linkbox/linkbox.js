import {
  createExternalArrow,
  getAuthoredCells,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  isExternalLink,
  markExternalLink,
  toSafeHttpUrl,
} from '../../scripts/utils/utils.js';

/**
 * Link box block.
 *
 * Authors a key/value table:
 * - Media: image
 * - Text: the link. Its text is the label; its href is the destination.
 *
 * The whole surface is one link. The arrow is decorative.
 */

/**
 * Data used to decorate a link box.
 *
 * @typedef {object} LinkBoxData
 * @property {Element|null} image `<picture>` or `<img>` from the media cell
 * @property {string} label Visible link text
 * @property {string} href Sanitized http(s) URL, or empty
 */

/**
 * Visible label, plus an aria-hidden copy whose underline wipes in on hover.
 * The two copies share wrapping, matching the hero and grid-item treatment.
 *
 * @param {string} label
 * @param {boolean} linked
 * @returns {HTMLSpanElement}
 */
function createLabel(label, linked) {
  const labelEl = document.createElement('span');
  labelEl.className = 'linkbox__label';

  if (!linked) {
    labelEl.textContent = label;
    return labelEl;
  }

  const stack = document.createElement('span');
  stack.className = 'linkbox__stack';

  const textEl = document.createElement('span');
  textEl.className = 'linkbox__text';
  textEl.textContent = label;

  const underline = document.createElement('span');
  underline.className = 'linkbox__underline';
  underline.setAttribute('aria-hidden', 'true');
  underline.textContent = label;

  stack.append(textEl, underline);
  labelEl.append(stack);
  return labelEl;
}

/**
 * Reads the Media and Text rows. "Image" is accepted as a Media alias.
 *
 * @param {Element} block The linkbox block element
 * @returns {LinkBoxData}
 */
export function getLinkBoxData(block) {
  const cells = getAuthoredCells(block);
  const textCell = cells.text;

  return {
    image: getCellMedia(cells.media || cells.image),
    label: getCellText(textCell),
    href: toSafeHttpUrl(getCellLinkHref(textCell)),
  };
}

/**
 * Builds link-box markup from data and writes it into `root`.
 * A safe href and a label make the surface an anchor. Otherwise it stays a div.
 *
 * @param {LinkBoxData} [data]
 * @param {Element} [root] Element to fill; a new `div` if omitted
 * @returns {Element} The filled root
 */
export function buildLinkBox(data = {}, root = document.createElement('div')) {
  const label = data.label || '';
  const href = data.href || '';
  const image = data.image || null;

  if (!label && !image) {
    root.replaceChildren();
    return root;
  }

  const linked = Boolean(href && label);
  const surface = document.createElement(linked ? 'a' : 'div');
  surface.className = 'linkbox__surface';

  if (image) {
    const img = image.matches('img') ? image : image.querySelector('img');
    if (img && !img.hasAttribute('alt')) img.alt = '';

    const media = document.createElement('span');
    media.className = 'linkbox__media';
    media.append(image);
    surface.append(media);
  }

  if (label) {
    const copy = document.createElement('span');
    copy.className = 'linkbox__copy heading-5';

    copy.append(createLabel(label, linked));

    if (linked) {
      const arrow = document.createElement('span');
      arrow.className = 'linkbox__arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.append(createExternalArrow());
      copy.append(arrow);
    }

    surface.append(copy);
  }

  if (linked) {
    surface.href = href;
    // The name stays the label so the external-link pass can append
    // "(opens in a new tab)" without painting that hint in the box.
    if (isExternalLink(surface)) surface.setAttribute('aria-label', label);
    markExternalLink(surface);
  }

  root.replaceChildren(surface);
  return root;
}

/**
 * Decorates a linkbox block.
 *
 * @param {Element} block The linkbox block element
 */
export default function decorate(block) {
  buildLinkBox(getLinkBoxData(block), block);
}
