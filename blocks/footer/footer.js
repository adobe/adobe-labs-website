import { getMetadata } from '../../scripts/aem.js';
import { escapeAttr, fromHTML } from '../../scripts/utils/utils.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * ==================================================================
 * FOOTER UTILS
 * ==================================================================
 */

/**
 * Builds a URL for an asset under the footer block.
 * @param {string} path Path relative to `blocks/footer/`
 * @returns {string}
 */
function getFooterAsset(path) {
  const base = window.hlx?.codeBasePath || '';
  return `${base}/blocks/footer/${path}`;
}

/**
 * Removes a link's title attribute when it just repeats the visible text. decorateButtons()
 * in scripts.js defaults every link's title to its own text, which is a redundant tooltip
 * that adds no information; an author-supplied title that differs from the text is kept.
 * @param {Element} link Anchor element to check
 */
function dropRedundantTitle(link) {
  if (link.getAttribute('title')?.trim() === link.textContent.trim()) {
    link.removeAttribute('title');
  }
}

/**
 * Fetches and injects the footer SVG icon sprite into the block once.
 * @param {Element} block The footer block element
 * @returns {Promise<void>}
 */
async function loadFooterIcons(block) {
  if (block.querySelector('.footer__icons')) return;

  const resp = await fetch(getFooterAsset('img/icons.svg'));
  if (!resp.ok) return;

  const content = await resp.text();
  const icons = fromHTML(`
    <div class="footer__icons" aria-hidden="true">
      ${content}
    </div>
  `);
  block.append(icons);
}

/**
 * ==================================================================
 * NEWSLETTER SECTION
 * ==================================================================
 */

/**
 * Whether a menu column is the newsletter column.
 * @param {Element} column Menu column element
 * @returns {boolean}
 */
function isNewsletterColumn(column) {
  return column.classList.contains('footer__menu-column--newsletter')
    || column.classList.contains('footer-newsletter')
    || !!column.querySelector('a[href*="subscribe"], input[type="email"]');
}

/**
 * Finds the newsletter column among menu columns, falling back to the first column.
 * @param {Element[]} columns Menu column elements
 * @returns {Element|undefined}
 */
function findNewsletterColumn(columns) {
  return columns.find(isNewsletterColumn) || columns[0];
}

/**
 * Decorates a newsletter column with heading, description, and subscribe form.
 * @param {Element} column Authored newsletter column element
 * @returns {Element}
 */
function decorateNewsletterColumn(column) {
  const heading = column.querySelector('h2');
  const description = [...column.querySelectorAll('p')].find((p) => !p.querySelector('a'));
  const subscribeLink = column.querySelector('a[href]');
  const action = subscribeLink?.getAttribute('href') || '#';
  const label = subscribeLink?.textContent?.trim() || 'Subscribe';
  const descId = description ? `footer-newsletter-desc-${Date.now()}` : null;

  if (heading) heading.classList.add('footer__menu-headline');
  if (description) {
    description.classList.add('footer__description');
    description.id = descId;
  }

  const wrapper = fromHTML(`
    <div class="footer__menu-column footer__menu-column--newsletter">
      <div class="footer__menu-section">
        <div class="footer__menu-items footer__menu-items--newsletter">
          <form class="footer__form" action="${escapeAttr(action)}" method="post">
            <label class="footer__label" for="footer-email">Your email address</label>
            <input
              id="footer-email"
              class="footer__input"
              type="email"
              name="email"
              required
              placeholder="Your email address"
              ${descId ? `aria-describedby="${escapeAttr(descId)}"` : ''}
            >
            <button type="submit" class="footer__submit" aria-label="${escapeAttr(label)}">
              <svg class="footer__submit-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle class="footer__submit-circle" cx="12" cy="12" r="12" />
                <path
                  class="footer__submit-arrow"
                  d="M11.707 7.29297C11.3165 6.90244 10.6835 6.90244 10.293 7.29297C9.90264 7.68352 9.9025 8.31657 10.293 8.70703L13.5859 12L10.293 15.293C9.90258 15.6835 9.90248 16.3165 10.293 16.707C10.6835 17.0973 11.3165 17.0973 11.707 16.707L15.707 12.707C16.0975 12.3166 16.0974 11.6835 15.707 11.293L11.707 7.29297Z"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  `);

  const section = wrapper.querySelector('.footer__menu-section');
  const items = wrapper.querySelector('.footer__menu-items');
  if (heading) section.prepend(heading);
  if (description) items.prepend(description);

  column.replaceWith(wrapper);
  return wrapper;
}

/**
 * Replaces the newsletter column in the menu columns list with a decorated form.
 * @param {Element[]|null|undefined} columns Menu column elements
 * @returns {Element[]|null|undefined}
 */
function decorateNewsletter(columns) {
  if (!columns?.length) return columns;

  const next = [...columns];
  const column = findNewsletterColumn(next);
  const idx = next.indexOf(column);
  if (idx >= 0) next[idx] = decorateNewsletterColumn(column);
  return next;
}

/**
 * ==================================================================
 * MENU SECTION
 * ==================================================================
 */

/**
 * Extracts menu column roots from a section that contains h2 headings.
 * @param {Element} section Fragment section element
 * @returns {Element[]|null}
 */
function parseMenuSection(section) {
  if (!section.querySelector('h2')) return null;

  return [...section.children].map((child) => (
    child.children.length === 1 && child.firstElementChild?.tagName === 'DIV'
      ? child.firstElementChild
      : child
  ));
}

let menuItemsId = 0;

/**
 * Syncs the accordion toggle button a11y and item visibility for the current viewport.
 * Below the desktop breakpoint the button drives a collapsible panel; at and above it the
 * panel is always visible and the button is taken out of the tab order since it does nothing.
 * @param {Element} button Menu toggle button element
 * @param {Element} items Menu items container
 * @param {MediaQueryList} desktopQuery Desktop layout media query
 */
function syncHeadline(button, items, desktopQuery) {
  if (desktopQuery.matches) {
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('tabindex', '-1');
    items.hidden = false;
    return;
  }

  button.setAttribute('aria-expanded', 'false');
  button.removeAttribute('tabindex');
  items.hidden = true;
}

/**
 * Makes a nav column heading an accordion toggle on mobile. The heading itself stays a plain
 * h2 so its heading role is preserved for screen readers; a native button nested inside it
 * provides the expand/collapse control, per the APG accordion pattern.
 * @param {Element} heading Authored h2 element
 * @param {Element} items Menu items container
 */
function decorateHeadline(heading, items) {
  heading.classList.add('footer__menu-headline');

  menuItemsId += 1;
  items.id = `footer-menu-items-${menuItemsId}`;

  const button = fromHTML('<button type="button" class="footer__menu-toggle"></button>');
  button.setAttribute('aria-controls', items.id);
  while (heading.firstChild) button.append(heading.firstChild);
  heading.append(button);

  const desktopQuery = window.matchMedia('(min-width: 1024px)');
  const onActivate = () => {
    if (desktopQuery.matches) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    items.hidden = expanded;
  };

  button.addEventListener('click', onActivate);
  desktopQuery.addEventListener('change', () => syncHeadline(button, items, desktopQuery));
  syncHeadline(button, items, desktopQuery);
}

/**
 * Decorates a single nav menu column with headline and links.
 * @param {Element} column Authored menu column element
 * @returns {Element}
 */
function decorateColumn(column) {
  const wrapper = fromHTML(`
    <div class="footer__menu-column footer__menu-column--nav">
      <div class="footer__menu-section">
        <ul class="footer__menu-items"></ul>
      </div>
    </div>
  `);

  const section = wrapper.querySelector('.footer__menu-section');
  const items = wrapper.querySelector('.footer__menu-items');
  const heading = column.querySelector('h2');

  if (heading) {
    section.prepend(heading);
    decorateHeadline(heading, items);
    column.querySelectorAll('p a').forEach((link) => {
      link.classList.add('footer__menu-link');
      dropRedundantTitle(link);
      const item = fromHTML('<li></li>');
      item.append(link);
      items.append(item);
    });
  }

  column.replaceWith(wrapper);
  return wrapper;
}

/**
 * Builds the footer menu from newsletter and nav columns.
 * @param {Element[]} columns Decorated and authored menu columns
 * @returns {Element|null}
 */
function decorateMenuColumns(columns) {
  if (!columns?.length) return null;

  const menu = fromHTML('<div class="footer__menu"></div>');
  const navColumns = fromHTML('<nav class="footer__menu-nav" aria-label="Footer"></nav>');

  columns.forEach((column) => {
    if (isNewsletterColumn(column)) {
      menu.append(column);
      return;
    }
    if (column.querySelector('h2')) {
      navColumns.append(decorateColumn(column));
    }
  });

  if (navColumns.childElementCount) {
    menu.append(navColumns);
  }

  return menu;
}

/**
 * ==================================================================
 * SOCIAL SECTION
 * ==================================================================
 */

/**
 * Derives a footer social icon sprite id from a link href hostname.
 * @param {string} href Social profile URL
 * @returns {string}
 */
function getSocialIconId(href) {
  try {
    const lower = new URL(href).hostname.replace(/^www\./, '').split('.')[0];
    return `footer-icon-${lower}`;
  } catch {
    return '';
  }
}

/**
 * Returns the social block node from a section that starts with the paragraph text "Social",
 * if present. Returns the unordered list after the text.
 * @param {Element} section Fragment section element
 * @returns {Element|null}
 */
function parseSocialSection(section) {
  const firstParagraph = section.querySelector('.default-content-wrapper > p:first-child');
  if (firstParagraph?.textContent?.trim().toLowerCase().startsWith('social')) {
    if (firstParagraph?.nextElementSibling?.matches('ul')) {
      return firstParagraph.nextElementSibling;
    }
  }
  return null;
}

/**
 * Decorates the social links section with icon links.
 * @param {Element|null} social Social block element from the fragment
 * @returns {Element|null}
 */
function decorateSocial(social) {
  if (!social) return null;

  const links = [...social.querySelectorAll('a[href]')].map((link) => {
    const iconId = getSocialIconId(link.getAttribute('href'));

    // Don't render the item if no associated icon was found.
    if (!iconId) { return ''; }

    const label = link.getAttribute('title')?.trim() || link.textContent.trim();
    const { href } = link;
    const target = link.target || '_blank';
    const ariaLabel = target === '_blank' ? `${label} (opens in a new tab)` : label;

    return `
      <li>
        <a
          class="footer__social-link"
          href="${escapeAttr(href)}"
          target="${escapeAttr(target)}"
          rel="noopener noreferrer"
          aria-label="${escapeAttr(ariaLabel)}"
        >
          <svg class="footer__social-icon" aria-hidden="true" focusable="false">
            <use href="#${escapeAttr(iconId)}"></use>
          </svg>
        </a>
      </li>
    `;
  }).join('');

  const socialElem = fromHTML(`<ul class="footer__social">${links}</ul>`);
  social.replaceWith(socialElem);
  return socialElem;
}

/**
 * ==================================================================
 * LEGAL SECTION
 * ==================================================================
 */

const LEGAL_SELECTOR = 'p > em, a[href*="opt-out"], a[href*="privacy"]';

/**
 * Returns the legal content node from a section, if present.
 * @param {Element} section Fragment section element
 * @returns {Element|null}
 */
function parseLegalSection(section) {
  if (!section.querySelector(LEGAL_SELECTOR)) return null;
  return section.querySelector('.default-content-wrapper') || section;
}

/**
 * Decorates the footer legal row with privacy links and Adobe mark.
 * @param {Element|null} legal Parsed legal content container
 * @returns {Element}
 */
function decorateLegal(legal) {
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
    dropRedundantTitle(link);
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

/**
 * ==================================================================
 * LOGO SECTION
 * ==================================================================
 */

/**
 * Updates footer logo entry progress from scroll and resize for CSS-driven animation.
 * @param {Element|null} logo Footer logo element
 * @returns {(() => void)|undefined} Cleanup that removes listeners and cancels pending frames
 */
function animateLogo(logo) {
  if (!logo) return undefined;

  let scrollPending = false;
  let resizeRaf = null;

  const updateLogoProgress = () => {
    const prevElement = logo.previousElementSibling;
    if (!prevElement) return;
    const bottom = prevElement.getBoundingClientRect().bottom ?? 0;
    let progress = ((window.innerHeight - bottom) / logo.offsetHeight) * 100;
    progress = Math.max(0, Math.min(100, progress));
    logo.style.setProperty('--footer-logo-entry-progress', progress);
  };

  const onScroll = () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => {
      updateLogoProgress();
      scrollPending = false;
    });
  };

  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = null;
      updateLogoProgress();
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  updateLogoProgress();

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
  };
}

/**
 * Appends the full Adobe logo and starts its scroll-linked animation.
 * @param {Element} parent Footer block or container to append the logo to
 * @returns {Element}
 */
function decorateLogo(parent) {
  const src = escapeAttr(getFooterAsset('img/adobe-logo-full.svg'));
  const logo = fromHTML(`
    <div class="footer__logo">
      <img src="${src}" alt="Adobe" loading="lazy" class="footer__logo-image">
    </div>
  `);
  parent.append(logo);
  animateLogo(logo);
  return logo;
}

/**
 * ==================================================================
 * PARSE SECTIONS & DECORATE BLOCK
 * ==================================================================
 */

/**
 * Parses the footer fragment into menu columns, social, and legal sections.
 * @param {Element} fragment The loaded footer fragment root
 * @returns {{ menuColumns: Element[], social: Element|null, legal: Element|null }}
 */
function parseFooterFragment(fragment) {
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

  const data = parseFooterFragment(fragment);

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
