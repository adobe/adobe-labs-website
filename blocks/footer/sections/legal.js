import { escapeAttr, fromHTML } from '../../../scripts/utils/utils.js';
import getFooterAsset from '../utils.js';

const LEGAL_SELECTOR = 'p > em, a[href*="opt-out"], a[href*="privacy"]';

/**
 * Returns the legal content node from a fragment section, if present.
 * @param {Element} section Fragment section element
 * @returns {Element|null}
 */
export function parseSection(section) {
  if (!section.querySelector(LEGAL_SELECTOR)) return null;
  return section.querySelector('.default-content-wrapper') || section;
}

/**
 * Decorates the footer legal row with privacy links and Adobe mark.
 * @param {Element|null} legal Parsed legal content container
 * @returns {Element}
 */
export default function decorateLegal(legal) {
  const markSrc = escapeAttr(getFooterAsset('img/adobe-logo-mark.svg'));
  const legalRow = fromHTML(`
    <div class="footer__legal-row">
      <span class="footer__mark" role="img" aria-label="Adobe">
        <img src="${markSrc}" alt="" loading="lazy" class="footer__mark-image">
      </span>
    </div>
  `);

  if (!legal) return legalRow;

  const year = new Date().getFullYear();
  const content = fromHTML(`
    <div class="footer__legal">
      <ul class="footer__privacy">
        <li class="footer__privacy-item">© ${year} Adobe Inc. All rights reserved.</li>
      </ul>
    </div>
  `);
  const list = content.querySelector('.footer__privacy');

  legal.querySelectorAll('a').forEach((link) => {
    link.classList.add('footer__privacy-link');
    if (/interest-based-ads/.test(link.getAttribute('href') || '')) {
      link.insertAdjacentHTML(
        'afterbegin',
        '<svg class="footer__adchoices-icon" aria-hidden="true" focusable="false"><use href="#footer-icon-adchoices"></use></svg>',
      );
    }
    const item = fromHTML('<li class="footer__privacy-item"></li>');
    item.append(link);
    list.append(item);
  });

  legalRow.prepend(content);
  return legalRow;
}
