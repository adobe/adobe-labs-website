import { getMetadata } from '../../scripts/aem.js';
import { fromHTML } from '../../scripts/utils/utils.js';
import { loadFragment } from '../fragment/fragment.js';
import decorateMenuColumns, { parseSection as parseMenuSection } from './sections/menu.js';
import decorateNewsletter from './sections/newsletter.js';
import decorateSocial, { parseSection as parseSocialSection } from './sections/social.js';
import decorateLegal, { parseSection as parseLegalSection } from './sections/legal.js';
import decorateLogo from './sections/logo.js';
import { loadFooterIcons } from './utils.js';

/**
 * Parses the footer fragment into menu columns, social, and legal sections.
 * @param {Element} fragment The loaded footer fragment root
 * @returns {{ menuColumns: Element[], social: Element|null, legal: Element|null }}
 */
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
 * Loads and decorates the footer.
 * @param {Element} block The footer block element
 * @returns {Promise<void>}
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

  const wrapper = fromHTML(`
    <div class="footer__inner">
      <div class="footer__content">
        <div class="footer__options"></div>
      </div>
    </div>
  `);

  const content = wrapper.querySelector('.footer__content');
  const options = wrapper.querySelector('.footer__options');
  if (menuColumns) content.prepend(menuColumns);
  if (legal) options.append(legal);
  if (social) options.append(social);

  block.append(wrapper);
  decorateLogo(block);
  await loadFooterIcons(block);
}
