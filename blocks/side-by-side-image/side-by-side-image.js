/**
 * Decorates the side-by-side-image block: flattens authored row(s)/cell(s)
 * into a flat list of items so the block works for a single image pair and
 * degrades gracefully if authors add or omit cells.
 * @param {Element} block The side-by-side-image block element
 */
export default function decorate(block) {
  const items = [...block.querySelectorAll(':scope > div > div')];

  items.forEach((item) => {
    item.className = 'side-by-side-image__item';
  });

  block.replaceChildren(...items);
}
