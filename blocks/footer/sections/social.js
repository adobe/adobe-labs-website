import { escapeAttr, fromHTML } from '../../../scripts/utils/utils.js';

/**
 * Derives a footer social icon sprite id from a link href hostname.
 * @param {string} href Social profile URL
 * @returns {string}
 */
function getSocialIconId(href) {
  const lower = new URL(href).hostname.replace(/^www\./, '').split('.')[0];
  return `footer-icon-${lower}`;
}

/**
 * Returns the social block node from a fragment section, if present.
 * @param {Element} section Fragment section element
 * @returns {Element|null}
 */
export function parseSection(section) {
  return section.querySelector('.social.block') || null;
}

/**
 * Decorates the social links section with icon links.
 * @param {Element|null} social Social block element from the fragment
 * @returns {Element|null}
 */
export default function decorateSocial(social) {
  if (!social) return null;

  const links = [...social.querySelectorAll('a[href]')].map((link) => {
    const iconId = getSocialIconId(link.getAttribute('href'));
    const label = link.getAttribute('title')?.trim() || link.textContent.trim();
    const { href } = link;
    const target = link.target || '_blank';

    return `
      <a
        class="footer__social-link"
        href="${escapeAttr(href)}"
        target="${escapeAttr(target)}"
        rel="noopener noreferrer"
        aria-label="${escapeAttr(label)}"
      >
        <svg class="footer__social-icon" aria-hidden="true" focusable="false">
          <use href="#${escapeAttr(iconId)}"></use>
        </svg>
      </a>
    `;
  }).join('');

  const socialElem = fromHTML(`<div class="footer__social">${links}</div>`);
  social.replaceWith(socialElem);
  return socialElem;
}
