import { escapeAttr, fromHTML } from '../../../scripts/utils/utils.js';

/**
 * Whether a menu column is the newsletter column.
 * @param {Element} column Menu column element
 * @returns {boolean}
 */
export function isNewsletterColumn(column) {
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
            <button type="submit" class="footer__submit" aria-label="${escapeAttr(label)}"></button>
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
export default function decorateNewsletter(columns) {
  if (!columns?.length) return columns;

  const next = [...columns];
  const column = findNewsletterColumn(next);
  const idx = next.indexOf(column);
  if (idx >= 0) next[idx] = decorateNewsletterColumn(column);
  return next;
}
