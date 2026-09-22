/**
 * Decorates an article lead-in block: the authored cell's paragraphs and/or
 * headings are kept as-is (preserving line breaks and multiple paragraphs)
 * and styled, rather than being forced into a single `h2`.
 *
 * @param {Element} block The lead-in block element
 */
export default function decorate(block) {
  const cell = block.children[0]?.children[0];
  if (!cell?.textContent.trim()) {
    block.replaceChildren();
    return;
  }

  let content = [...cell.children].filter((el) => el.matches('p, h1, h2, h3, h4, h5, h6'));
  if (!content.length) {
    const paragraph = document.createElement('p');
    paragraph.append(...cell.childNodes);
    content = [paragraph];
  }

  content.forEach((el) => el.classList.add('lead-in__headline'));
  block.replaceChildren(...content);
}
