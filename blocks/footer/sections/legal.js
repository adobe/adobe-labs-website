import getFooterAsset from '../utils.js';

const LEGAL_SELECTOR = 'p > em, a[href*="opt-out"], a[href*="privacy"]';

function createFooterMark() {
  const mark = document.createElement('span');
  mark.className = 'footer__mark';
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', 'Adobe');

  const img = document.createElement('img');
  img.src = getFooterAsset('img/adobe-logo-mark.svg');
  img.alt = '';
  img.loading = 'lazy';
  img.className = 'footer__mark-image';
  mark.append(img);

  return mark;
}

export function parseSection(section) {
  if (!section.querySelector(LEGAL_SELECTOR)) return null;

  const legal = document.createElement('div');
  section.querySelectorAll('.default-content-wrapper > *, :scope > p, :scope > ul').forEach((child) => {
    legal.append(child);
  });
  return legal;
}

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

  const legalWrapper = document.createElement('div');
  legalWrapper.className = 'footer__legal';

  const privacySection = document.createElement('ul');
  privacySection.className = 'footer__privacy';

  const copyrightItem = document.createElement('li');
  copyrightItem.className = 'footer__privacy-item';
  copyrightItem.textContent = copyrightText;
  privacySection.append(copyrightItem);

  privacyContent.querySelectorAll('a').forEach((link) => {
    link.classList.add('footer__privacy-link');
    const item = document.createElement('li');
    item.className = 'footer__privacy-item';
    item.append(link);
    privacySection.append(item);
  });

  legalWrapper.append(privacySection);
  privacyContent.replaceWith(legalWrapper);
  return legalWrapper;
}

export default function decorateLegal(legal) {
  const legalRow = document.createElement('div');
  legalRow.className = 'footer__legal-row';

  const content = decorateLegalContent(legal);
  if (content) legalRow.append(content);
  legalRow.append(createFooterMark());

  return legalRow;
}
