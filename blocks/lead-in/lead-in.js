import { getCellText } from '../../scripts/utils/utils.js';

/**
 * Decorates an article lead-in block: a single authored cell rendered as
 * plain text (formatting stripped) inside one `h2`.
 *
 * @param {Element} block The lead-in block element
 */
export default function decorate(block) {
  const text = getCellText(block.children[0]?.children[0]);

  const heading = document.createElement('h2');
  heading.className = 'lead-in__headline';
  heading.textContent = text;

  block.replaceChildren(heading);
}
