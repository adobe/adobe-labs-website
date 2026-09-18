import decorate from './toc.js';

function createTocSection(id, text) {
  const section = document.createElement('div');
  section.className = 'section';
  section.id = id;
  section.dataset.toc = text;
  return section;
}

/**
 * Mirrors the DOM shape `decorateBlock` leaves behind: the block sits inside
 * its own `toc-wrapper` div, which is the section's child.
 */
function createBlockSection(...siblings) {
  const block = document.createElement('div');
  block.className = 'toc';
  const wrapper = document.createElement('div');
  wrapper.className = 'toc-wrapper';
  wrapper.append(block);
  const section = document.createElement('div');
  section.className = 'section';
  section.append(...siblings, wrapper);
  return { section, block };
}

describe('toc block', () => {
  it('builds a numbered list linking to each TOC section, in document order', () => {
    const main = document.createElement('main');
    const first = createTocSection('section-1', 'Section 1');
    const { section: blockSection, block } = createBlockSection();
    const second = createTocSection('section-2', 'Section 2');
    main.append(first, blockSection, second);

    decorate(block);

    const links = [...block.querySelectorAll('.toc__link')];
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '#section-1');
    expect(links[0].querySelector('.toc__text')).toHaveTextContent('Section 1');
    expect(links[1]).toHaveAttribute('href', '#section-2');
    expect(links[1].querySelector('.toc__text')).toHaveTextContent('Section 2');
  });

  it('numbers items sequentially starting at 1 and hides numbers from assistive tech', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(
      createTocSection('a', 'A'),
      createTocSection('b', 'B'),
      createTocSection('c', 'C'),
      blockSection,
    );

    decorate(block);

    const numbers = [...block.querySelectorAll('.toc__number')];
    expect(numbers.map((el) => el.textContent)).toEqual(['1', '2', '3']);
    numbers.forEach((el) => expect(el).toHaveAttribute('aria-hidden', 'true'));
  });

  it('renders the "Table of contents" heading as a heading-5', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(createTocSection('a', 'A'), blockSection);

    decorate(block);

    const heading = block.querySelector('h2.toc__heading');
    expect(heading).toHaveTextContent('Table of contents');
    expect(heading).toHaveClass('heading-5');
  });

  it('ignores sections without data-toc', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    const plain = document.createElement('div');
    plain.className = 'section';
    main.append(plain, createTocSection('a', 'A'), blockSection);

    decorate(block);

    expect(block.querySelectorAll('.toc__item')).toHaveLength(1);
  });

  it('removes the whole section when it has no TOC sections and the block is its only content', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(blockSection);

    decorate(block);

    expect(main.contains(blockSection)).toBe(false);
  });

  it('removes only the block\'s wrapper when its section has other content', () => {
    const main = document.createElement('main');
    const sibling = document.createElement('p');
    const { section: blockSection, block } = createBlockSection(sibling);
    main.append(blockSection);

    decorate(block);

    expect(main.contains(blockSection)).toBe(true);
    expect(blockSection.contains(block)).toBe(false);
    expect(blockSection.contains(sibling)).toBe(true);
  });

  it('does nothing unsafe when the block is not attached to a main', () => {
    const block = document.createElement('div');
    block.className = 'toc';

    expect(() => decorate(block)).not.toThrow();
  });
});
