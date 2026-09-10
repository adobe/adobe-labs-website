import { toClassName } from '../../scripts/aem.js';
import { getSectionFromPath, toSafeHttpUrl } from '../../scripts/utils/utils.js';

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
 * Chevron-right glyph only — the circular badge behind it is CSS
 * (`--s2a-color-content-label` background), not part of this icon, so its
 * color (`currentColor`) can independently use `--s2a-color-content-inverse`
 * for contrast against that badge in both themes. Extracted from the
 * Figma-exported "Subtract.svg", which combined the circle and glyph into
 * one fixed-color shape.
 */
const ARROW_ICON_SVG = `
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
    <path fill="currentColor" d="M9.75586 6.07715C9.4304 5.75183 8.90255 5.75175 8.57715 6.07715C8.25174 6.40255 8.25182 6.93041 8.57715 7.25586L11.3213 10L8.57715 12.7441C8.25182 13.0696 8.25174 13.5974 8.57715 13.9229C8.90255 14.2483 9.4304 14.2482 9.75586 13.9229L13.0889 10.5889C13.4143 10.2634 13.4143 9.73657 13.0889 9.41113L9.75586 6.07715Z"/>
  </svg>
`.trim();

/**
 * Mobile-only tap affordance shown next to each card's title (CSS hides it
 * at 48rem and up, where the hover-driven expand interaction takes over
 * instead). Purely decorative — the whole card is already a link — so it's
 * built unconditionally here and hidden by breakpoint in CSS, and hidden
 * from assistive tech.
 *
 * @returns {HTMLSpanElement}
 */
function buildArrowIcon() {
  const arrow = document.createElement('span');
  arrow.className = 'elastic-router__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = ARROW_ICON_SVG;
  return arrow;
}

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

  const section = getSectionFromPath(new URL(data.href).pathname);
  if (section) item.dataset.contentType = section.slug;

  const link = document.createElement('a');
  link.className = 'elastic-router__link';
  link.href = data.href;

  if (data.heading) {
    data.heading.className = 'elastic-router__title';
    const innerLink = data.heading.querySelector('a');
    if (innerLink) innerLink.replaceWith(...innerLink.childNodes);
    data.heading.append(buildArrowIcon());
    link.append(data.heading);
  }

  const media = document.createElement('div');
  media.className = 'elastic-router__media';
  if (data.media) media.append(data.media);
  link.append(media);

  if (data.description) {
    const description = document.createElement('p');
    description.className = 'elastic-router__description eyebrow';
    description.textContent = data.description;
    link.append(description);
  }

  item.append(link);
  return item;
}

/**
 * Heading authored immediately before this block (e.g. an "Explore" H2 in
 * the same section, ahead of the block's own wrapper), used to label the
 * block's nav landmark via `aria-labelledby`. Assigns an id if the heading
 * doesn't already have one. Returns null when there's no such heading —
 * e.g. the block reused without one — so the landmark is left unlabeled
 * rather than mislabeled.
 *
 * @param {Element} block The elastic-router block, still in the page tree
 * @returns {Element|null}
 */
function getSectionHeading(block) {
  const heading = block.parentElement
    ?.previousElementSibling
    ?.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) return null;
  if (!heading.id) heading.id = toClassName(heading.textContent);
  return heading;
}

/**
 * Decorates an elastic-router block: authored rows become a grid of linked
 * cards inside a `nav` landmark (this block routes to the site's main
 * sections). The grid/expand-on-hover behavior lives entirely in CSS
 * (`:hover` / `:focus-within`) so keyboard and pointer interaction stay in
 * sync without extra JS.
 *
 * @param {Element} block The elastic-router block
 */
export default function decorate(block) {
  const items = getElasticRouterItems(block);

  const nav = document.createElement('nav');
  const heading = getSectionHeading(block);
  if (heading) nav.setAttribute('aria-labelledby', heading.id);

  const list = document.createElement('ul');
  list.className = 'elastic-router__list';
  list.setAttribute('role', 'list');
  items.forEach((item) => list.append(buildElasticRouterItem(item)));

  nav.append(list);
  block.replaceChildren(nav);
}
