function findNewsletterColumn(columns) {
  return columns.find((div) => div.classList.contains('footer-newsletter')
    || div.querySelector('a[href*="subscribe"], input[type="email"]'))
    || columns[0];
}

function decorateNewsletterColumn(column) {
  const heading = column.querySelector('h2');
  const description = [...column.querySelectorAll('p')].find((p) => !p.querySelector('a'));
  const subscribeLink = column.querySelector('a[href]');
  const action = subscribeLink?.getAttribute('href') || '#';

  const wrapper = document.createElement('div');
  wrapper.className = 'footer__menu-column footer__menu-column--newsletter';

  const section = document.createElement('div');
  section.className = 'footer__menu-section';

  if (heading) {
    heading.classList.add('footer__menu-headline');
    section.append(heading);
  }

  const items = document.createElement('div');
  items.className = 'footer__menu-items footer__menu-items--newsletter';

  const descId = description ? `footer-newsletter-desc-${Date.now()}` : null;
  if (description) {
    description.classList.add('footer__description');
    description.id = descId;
    items.append(description);
  }

  const form = document.createElement('form');
  form.className = 'footer__form';
  form.action = action;
  form.method = 'post';

  const label = document.createElement('label');
  label.className = 'footer__label';
  label.setAttribute('for', 'footer-email');
  label.textContent = 'Your email address';

  const input = document.createElement('input');
  input.id = 'footer-email';
  input.className = 'footer__input';
  input.type = 'email';
  input.name = 'email';
  input.required = true;
  input.placeholder = 'Your email address';
  if (descId) input.setAttribute('aria-describedby', descId);

  const button = document.createElement('button');
  button.type = 'submit';
  button.className = 'footer__submit';
  button.setAttribute('aria-label', subscribeLink?.textContent?.trim() || 'Subscribe');

  form.append(label, input, button);
  items.append(form);
  section.append(items);
  wrapper.append(section);

  column.replaceWith(wrapper);
  return wrapper;
}

export default function decorateNewsletter(columns) {
  if (!columns?.length) return columns;

  const next = [...columns];
  const column = findNewsletterColumn(next);
  const idx = next.indexOf(column);
  if (idx >= 0) next[idx] = decorateNewsletterColumn(column);
  return next;
}
