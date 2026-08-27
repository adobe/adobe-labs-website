import { escapeAttr, fromHTML } from '../../../scripts/utils/utils.js';
import getFooterAsset from '../utils.js';

const LEGAL_SELECTOR = 'p > em, a[href*="opt-out"], a[href*="privacy"]';

/**
 * Creates the Adobe mark image used in the legal row.
 * @returns {Element}
 */
function createFooterMark() {
  const src = escapeAttr(getFooterAsset('img/adobe-logo-mark.svg'));
  return fromHTML(`
    <span class="footer__mark" role="img" aria-label="Adobe">
      <img src="${src}" alt="" loading="lazy" class="footer__mark-image">
    </span>
  `);
}

/**
 * Extracts legal content from a fragment section, if present.
 * @param {Element} section Fragment section element
 * @returns {Element|null}
 */
export function parseSection(section) {
  if (!section.querySelector(LEGAL_SELECTOR)) return null;

  const legal = document.createElement('div');
  section.querySelectorAll('.default-content-wrapper > *, :scope > p, :scope > ul').forEach((child) => {
    legal.append(child);
  });
  return legal;
}

/**
 * Builds the copyright and privacy links legal block.
 * @param {Element|null} legal Parsed legal content container
 * @returns {Element|null}
 */
function decorateLegalContent(legal) {
  if (!legal) return null;

  const copyrightElem = legal.querySelector('p > em');
  const copyrightPara = copyrightElem?.closest('p') || legal.querySelector('p');
  if (!copyrightPara) return null;

  const privacyContent = copyrightPara.closest('div');
  const currentYear = new Date().getFullYear();
  let copyrightText = `© ${currentYear} Adobe Inc. All rights reserved.`;
  if (copyrightElem) {
    copyrightElem.remove();
  } else if (/copyright/i.test(copyrightPara.textContent)) {
    copyrightText = copyrightPara.textContent.trim();
    copyrightPara.remove();
  }

  const adChoicesLink = privacyContent.querySelector('a[href*="#interest-based-ads"], a[href*="interest-based-ads"]');
  if (adChoicesLink) {
    adChoicesLink.insertAdjacentHTML(
      'afterbegin',
      '<svg class="footer__adchoices-icon" aria-hidden="true" focusable="false"><use href="#footer-icon-adchoices"></use></svg>',
    );
  }

  const links = [...privacyContent.querySelectorAll('a')];
  links.forEach((link) => link.classList.add('footer__privacy-link'));

  const legalWrapper = fromHTML(`
    <div class="footer__legal">
      <ul class="footer__privacy">
        <li class="footer__privacy-item">${escapeAttr(copyrightText)}</li>
      </ul>
    </div>
  `);

  const privacySection = legalWrapper.querySelector('.footer__privacy');
  links.forEach((link) => {
    const item = fromHTML('<li class="footer__privacy-item"></li>');
    item.append(link);
    privacySection.append(item);
  });

  privacyContent.replaceWith(legalWrapper);
  return legalWrapper;
}

/**
 * Decorates the footer legal row with privacy links and Adobe mark.
 * @param {Element|null} legal Parsed legal content container
 * @returns {Element}
 */
export default function decorateLegal(legal) {
  const legalRow = fromHTML('<div class="footer__legal-row"></div>');
  const content = decorateLegalContent(legal);
  if (content) legalRow.append(content);
  legalRow.append(createFooterMark());
  return legalRow;
}
