import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import decorateMenuColumns from './menu/menu.js';
import {
  animateLogo,
  createFooterLogoImage,
  createFooterMark,
} from './utils.js';

function getFooterAsset(path) {
  const base = window.hlx?.codeBasePath || '';
  return `${base}/blocks/footer/${path}`;
}

const SOCIAL_PLATFORMS = [
  'facebook',
  'linkedin',
  'instagram',
  'twitter',
  'x',
];

function unwrapSectionColumn(node) {
  if (node.children.length === 1 && node.firstElementChild?.tagName === 'DIV') {
    return node.firstElementChild;
  }
  return node;
}

function isSocialSection(section) {
  if (section.classList.contains('social')) return true;
  if (section.querySelector('h2')) return false;
  const links = section.querySelectorAll('a[href]');
  if (!links.length) return false;
  return [...links].every((link) => SOCIAL_PLATFORMS
    .some((name) => link.getAttribute('href').toLowerCase().includes(name)));
}

function flattenSectionNodes(section) {
  if (isSocialSection(section)) {
    const social = document.createElement('div');
    social.className = 'social';
    section.querySelectorAll('.default-content-wrapper > *, :scope > p, :scope > ul').forEach((child) => {
      social.append(child);
    });
    return [social];
  }

  if (section.querySelector('p > em, a[href*="opt-out"], a[href*="privacy"]')) {
    const legal = document.createElement('div');
    section.querySelectorAll('.default-content-wrapper > *, :scope > p, :scope > ul').forEach((child) => {
      legal.append(child);
    });
    return [legal];
  }

  return [...section.children].map((wrapper) => unwrapSectionColumn(wrapper));
}

function flattenFragment(fragment) {
  const main = document.createElement('div');
  while (fragment?.firstElementChild) {
    flattenSectionNodes(fragment.firstElementChild).forEach((node) => main.append(node));
    fragment.firstElementChild.remove();
  }
  return main;
}

function getMenuColumns(main) {
  const children = [...main.children];
  const social = main.querySelector('.social');
  const legal = children.find((div) => div.querySelector('p > em, a[href*="opt-out"], a[href*="privacy"]'));
  const roots = children.filter((div) => div !== social && div !== legal && div.querySelector('h2'));

  return roots.flatMap((root) => {
    const nested = [...root.children].filter((child) => child.tagName === 'DIV' && child.querySelector('h2'));
    return nested.length > 1 ? nested : [root];
  });
}

function parseFragment(main) {
  const social = main.querySelector('.social');
  const legal = [...main.children].find((div) => div.querySelector('p > em, a[href*="opt-out"], a[href*="privacy"]'));
  const menuColumns = getMenuColumns(main);
  const newsletter = menuColumns.find((div) => div.classList.contains('footer-newsletter')
    || div.querySelector('a[href*="subscribe"], input[type="email"]'))
    || menuColumns[0];

  return {
    newsletter,
    menuColumns,
    social,
    legal,
  };
}

function decorateNewsletter(column) {
  if (!column) return null;

  const heading = column.querySelector('h2');
  const description = [...column.querySelectorAll('p')].find((p) => !p.querySelector('a'));
  const subscribeLink = column.querySelector('a[href]');
  const action = subscribeLink?.getAttribute('href') || '#';

  const wrapper = document.createElement('div');
  wrapper.className = 'footer-menu-column footer-newsletter';

  const section = document.createElement('div');
  section.className = 'footer-menu-section';

  if (heading) {
    heading.classList.add('footer-menu-headline');
    section.append(heading);
  }

  const items = document.createElement('div');
  items.className = 'footer-menu-items';

  const descId = description ? `footer-newsletter-desc-${Date.now()}` : null;
  if (description) {
    description.classList.add('footer-newsletter-description');
    description.id = descId;
    items.append(description);
  }

  const form = document.createElement('form');
  form.className = 'footer-newsletter-form';
  form.action = action;
  form.method = 'post';

  const label = document.createElement('label');
  label.className = 'footer-newsletter-label';
  label.setAttribute('for', 'footer-email');
  label.textContent = 'Your email address';

  const input = document.createElement('input');
  input.id = 'footer-email';
  input.className = 'footer-newsletter-input';
  input.type = 'email';
  input.name = 'email';
  input.required = true;
  input.placeholder = 'Your email address';
  if (descId) input.setAttribute('aria-describedby', descId);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'footer-newsletter-submit';
  button.setAttribute('aria-label', subscribeLink?.textContent?.trim() || 'Subscribe');

  form.append(label, input, button);
  items.append(form);
  section.append(items);
  wrapper.append(section);

  column.replaceWith(wrapper);
  return wrapper;
}

function getSocialIconId(href) {
  const platform = SOCIAL_PLATFORMS.find((name) => href.toLowerCase().includes(name));
  if (!platform) return 'footer-icon-social-media';
  if (platform === 'twitter' || platform === 'x') return 'footer-icon-x';
  return `footer-icon-${platform}`;
}

function decorateSocial(social) {
  if (!social) return null;

  const socialElem = document.createElement('div');
  socialElem.className = 'footer-social';

  social.querySelectorAll('a[href]').forEach((link) => {
    const iconId = getSocialIconId(link.getAttribute('href'));
    const anchor = document.createElement('a');
    anchor.className = 'footer-social-link';
    anchor.href = link.href;
    anchor.target = link.target || '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.setAttribute('aria-label', link.textContent.trim());

    anchor.innerHTML = `
      <svg class="footer-social-icon" aria-hidden="true" focusable="false">
        <use href="#${iconId}"></use>
      </svg>
    `;

    socialElem.append(anchor);
  });

  social.replaceWith(socialElem);
  return socialElem;
}

function decorateLegal(legal) {
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
      '<svg class="footer-adchoices-icon" aria-hidden="true" focusable="false"><use href="#footer-icon-adchoices"></use></svg>',
    );
  }

  const legalWrapper = document.createElement('div');
  legalWrapper.className = 'footer-legal';

  const privacySection = document.createElement('ul');
  privacySection.className = 'footer-privacy-section';

  const copyrightItem = document.createElement('li');
  copyrightItem.className = 'footer-privacy-item';
  copyrightItem.textContent = copyrightText;
  privacySection.append(copyrightItem);

  privacyContent.querySelectorAll('a').forEach((link) => {
    link.classList.add('footer-privacy-link');
    const item = document.createElement('li');
    item.className = 'footer-privacy-item';
    item.append(link);
    privacySection.append(item);
  });

  legalWrapper.append(privacySection);
  privacyContent.replaceWith(legalWrapper);
  return legalWrapper;
}

async function loadIcons(block) {
  if (block.querySelector('.footer-icons')) return;

  const resp = await fetch(getFooterAsset('img/icons.svg'));
  if (!resp.ok) return;

  const content = await resp.text();
  const icons = document.createElement('div');
  icons.className = 'footer-icons';
  icons.innerHTML = content;
  icons.setAttribute('aria-hidden', 'true');
  block.append(icons);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/fragments/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  const main = flattenFragment(fragment);
  const data = parseFragment(main);

  const columns = [...data.menuColumns];
  const newsletterIdx = data.newsletter ? columns.indexOf(data.newsletter) : -1;
  if (newsletterIdx >= 0) {
    columns[newsletterIdx] = decorateNewsletter(data.newsletter);
  }
  const menuColumns = decorateMenuColumns(columns);
  const social = decorateSocial(data.social);
  const legal = decorateLegal(data.legal);

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'footer-inner';

  const content = document.createElement('div');
  content.className = 'footer-content';

  if (menuColumns) content.append(menuColumns);

  const options = document.createElement('div');
  options.className = 'footer-options';

  const legalRow = document.createElement('div');
  legalRow.className = 'footer-legal-row';
  if (legal) legalRow.append(legal);
  legalRow.append(createFooterMark());
  options.append(legalRow);

  if (social) options.append(social);
  content.append(options);

  wrapper.append(content);

  const logo = document.createElement('div');
  logo.className = 'footer-logo';
  logo.append(createFooterLogoImage());

  block.append(wrapper, logo);
  await loadIcons(block);
  animateLogo(logo);
}
