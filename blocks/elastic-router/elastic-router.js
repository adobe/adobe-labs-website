import { toSafeHttpUrl } from '../../scripts/utils/utils.js';

/**
 * One authored elastic-router entry.
 *
 * @typedef {object} ElasticRouterItem
 * @property {string} href Sanitized http(s) URL
 * @property {string} title Heading text (also the accessible name of the card)
 * @property {Element} [heading] Original heading element (any level, h1-h6)
 * @property {Element} [media] `<picture>` or `<img>` element from AEM
 * @property {string} description Supporting copy under the title
 */

/**
 * Description text after an authored image. Authors can enter the copy either
 * as its own paragraph, or in the same paragraph as the image separated by a
 * line break (`<br>`) — both are common depending on how the row is typed.
 * Cloning and stripping the media out of the image's own paragraph first
 * handles the `<br>` case; an empty result falls back to the next paragraph.
 *
 * @param {Element|null} mediaParagraph Closest ancestor `<p>` of the media, if any
 * @returns {string}
 */
function getDescription(mediaParagraph) {
  if (!mediaParagraph) return '';

  const clone = mediaParagraph.cloneNode(true);
  clone.querySelectorAll('picture, img').forEach((el) => el.remove());
  const inline = clone.textContent.replace(/\s+/g, ' ').trim();
  if (inline) return inline;

  const next = mediaParagraph.nextElementSibling;
  return next?.tagName === 'P' ? next.textContent.trim() : '';
}

/**
 * Reads authored rows into item data. Each row is a single-column entry:
 * a heading (any level) with a link, an image, and a description. Skips rows
 * without a safe href or title.
 *
 * @param {Element} block The elastic-router block
 * @returns {ElasticRouterItem[]}
 */
function getElasticRouterItems(block) {
  return [...block.children].flatMap((row) => {
    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const link = heading?.querySelector('a[href]');
    const href = toSafeHttpUrl(link?.href);
    const title = (link || heading)?.textContent.trim() || '';
    if (!href || !title) return [];

    const media = row.querySelector('picture, img');
    const description = getDescription(media?.closest('p'));

    return [{
      href, title, heading, media, description,
    }];
  });
}

/**
 * Builds one card. The whole card is a single link — the authored heading
 * keeps its original level (author's choice) but its inner link is unwrapped
 * so it isn't nested inside the card's own link.
 *
 * @param {ElasticRouterItem} data Parsed row
 * @returns {HTMLLIElement}
 */
function buildElasticRouterItem(data) {
  const item = document.createElement('li');
  item.className = 'elastic-router__item';

  const link = document.createElement('a');
  link.className = 'elastic-router__link';
  link.href = data.href;

  const media = document.createElement('div');
  media.className = 'elastic-router__media';
  if (data.media) media.append(data.media);

  const body = document.createElement('div');
  body.className = 'elastic-router__body';

  if (data.heading) {
    data.heading.className = 'elastic-router__title';
    const innerLink = data.heading.querySelector('a');
    if (innerLink) innerLink.replaceWith(...innerLink.childNodes);
    body.append(data.heading);
  }

  if (data.description) {
    const description = document.createElement('p');
    description.className = 'elastic-router__description body-md';
    description.textContent = data.description;
    body.append(description);
  }

  link.append(media, body);
  item.append(link);
  return item;
}

/**
 * Decorates an elastic-router block: authored rows become a grid of linked
 * cards. The grid/expand-on-hover behavior lives entirely in CSS
 * (`:hover` / `:focus-within`) so keyboard and pointer interaction stay in
 * sync without extra JS.
 *
 * @param {Element} block The elastic-router block
 */
export default function decorate(block) {
  const items = getElasticRouterItems(block);
  const list = document.createElement('ul');
  list.className = 'elastic-router__list';
  list.setAttribute('role', 'list');
  items.forEach((item) => list.append(buildElasticRouterItem(item)));
  block.replaceChildren(list);
}
