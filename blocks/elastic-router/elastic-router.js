/**
 * Decorates the elastic-router block.
 * @param {Element} block The elastic-router block element
 *
 * TODO: not yet implemented.
 */
// eslint-disable-next-line no-unused-vars
export default function decorate(block) {
  // Temporary, for demo purposes.
  const items = block.querySelectorAll(':scope > div');
  items.forEach((item) => {
    const link = item.querySelector('a');
    link?.parentElement.classList.add('heading-5');

    const subtext = item.querySelector('p:last-child');
    subtext?.classList.add('eyebrow');
  });
}
