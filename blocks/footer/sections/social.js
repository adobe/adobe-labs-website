function getSocialIconId(href) {
  const lower = new URL(href).hostname.replace(/^www\./, '').split('.')[0];
  return `footer-icon-${lower}`;
}

export function parseSection(section) {
  return section.querySelector('.social.block') || null;
}

export default function decorateSocial(social) {
  if (!social) return null;

  const socialElem = document.createElement('div');
  socialElem.className = 'footer__social';

  social.querySelectorAll('a[href]').forEach((link) => {
    const iconId = getSocialIconId(link.getAttribute('href'));
    const label = link.getAttribute('title')?.trim() || link.textContent.trim();
    const anchor = document.createElement('a');
    anchor.className = 'footer__social-link';
    anchor.href = link.href;
    anchor.target = link.target || '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('aria-label', label);

    anchor.innerHTML = `
      <svg class="footer__social-icon" aria-hidden="true" focusable="false">
        <use href="#${iconId}"></use>
      </svg>
    `;

    socialElem.append(anchor);
  });

  social.replaceWith(socialElem);
  return socialElem;
}
