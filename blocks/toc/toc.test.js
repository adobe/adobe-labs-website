import decorate from './toc.js';

/**
 * A TOC section with a heading — the common case, mirroring how the backend
 * assigns headings an id from their slugified text before any JS runs.
 */
function createHeadedSection(text, headingId) {
  const section = document.createElement('div');
  section.className = 'section';
  section.dataset.toc = text;
  const heading = document.createElement('h2');
  heading.textContent = text;
  if (headingId) heading.id = headingId;
  section.append(heading);
  return section;
}

/** A TOC section with no heading at all. */
function createBareSection(text, id) {
  const section = document.createElement('div');
  section.className = 'section';
  section.dataset.toc = text;
  if (id) section.id = id;
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
  it('links to the section heading\'s existing id instead of inventing a new one', () => {
    const main = document.createElement('main');
    const first = createHeadedSection('Section 1', 'section-1');
    const { section: blockSection, block } = createBlockSection();
    main.append(first, blockSection);

    decorate(block);

    const link = block.querySelector('.toc__link');
    expect(link).toHaveAttribute('href', '#section-1');
  });

  it('assigns an id to the heading (not the section) when it has none', () => {
    const main = document.createElement('main');
    const first = createHeadedSection('Most Creatives are undecided about AI');
    const { section: blockSection, block } = createBlockSection();
    main.append(first, blockSection);

    decorate(block);

    const heading = first.querySelector('h2');
    expect(heading.id).toBe('most-creatives-are-undecided-about-ai');
    expect(first.id).toBe('');
    expect(block.querySelector('.toc__link')).toHaveAttribute(
      'href',
      '#most-creatives-are-undecided-about-ai',
    );
  });

  it('falls back to an id on the section itself when it has no heading', () => {
    const main = document.createElement('main');
    const first = createBareSection('Section 1');
    const { section: blockSection, block } = createBlockSection();
    main.append(first, blockSection);

    decorate(block);

    expect(first.id).toBe('section-1');
    expect(block.querySelector('.toc__link')).toHaveAttribute('href', '#section-1');
  });

  it('dedupes a generated id that collides with one already in the document', () => {
    const existing = document.createElement('div');
    existing.id = 'section-1';
    document.body.append(existing);

    const main = document.createElement('main');
    const first = createBareSection('Section 1');
    const { section: blockSection, block } = createBlockSection();
    main.append(first, blockSection);
    document.body.append(main);

    decorate(block);

    expect(first.id).toBe('section-1-2');

    document.body.removeChild(existing);
    document.body.removeChild(main);
  });

  it('builds a numbered list linking to each TOC section, in document order', () => {
    const main = document.createElement('main');
    const first = createHeadedSection('Section 1', 'section-1');
    const { section: blockSection, block } = createBlockSection();
    const second = createHeadedSection('Section 2', 'section-2');
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
      createHeadedSection('A', 'a'),
      createHeadedSection('B', 'b'),
      createHeadedSection('C', 'c'),
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
    main.append(createHeadedSection('A', 'a'), blockSection);

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
    main.append(plain, createHeadedSection('A', 'a'), blockSection);

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
