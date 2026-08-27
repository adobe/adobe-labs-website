import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import decorateMenuColumns, { parseSection as parseMenuSection } from './sections/menu.js';
import decorateNewsletter from './sections/newsletter.js';
import decorateSocial, { parseSection as parseSocialSection } from './sections/social.js';
import decorateLegal, { parseSection as parseLegalSection } from './sections/legal.js';
import decorateLogo from './sections/logo.js';
import { loadIcons } from './utils.js';

function parseFragment(fragment) {
  const menuColumns = [];
  let social = null;
  let legal = null;

  [...fragment.children].forEach((section) => {
    const socialNode = parseSocialSection(section);
    if (socialNode) {
      social = socialNode;
      return;
    }

    const legalNode = parseLegalSection(section);
    if (legalNode) {
      legal = legalNode;
      return;
    }

    const columns = parseMenuSection(section);
    if (columns) menuColumns.push(...columns);
  });

  return {
    menuColumns,
    social,
    legal,
  };
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

  const data = parseFragment(fragment);

  const newsletter = decorateNewsletter(data.menuColumns);
  const menuColumns = decorateMenuColumns(newsletter);
  const social = decorateSocial(data.social);
  const legal = decorateLegal(data.legal);

  block.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'footer__inner';

  const content = document.createElement('div');
  content.className = 'footer__content';

  if (menuColumns) content.append(menuColumns);

  const options = document.createElement('div');
  options.className = 'footer__options';

  if (legal) options.append(legal);
  if (social) options.append(social);
  content.append(options);

  wrapper.append(content);

  block.append(wrapper);
  decorateLogo(block);
  await loadIcons(block);
}
