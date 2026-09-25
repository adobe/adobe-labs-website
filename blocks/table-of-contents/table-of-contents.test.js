import decorate from './table-of-contents.js';

/**
 * Sets the section label. Defaults to the `Table of Contents` key. Pass
 * `toc` and/or `tableOfContents` to opt in with a specific metadata row.
 *
 * @param {HTMLElement} section
 * @param {string} text
 * @param {{ toc?: string, tableOfContents?: string }} [labels]
 */
function applySectionLabel(section, text, labels = {}) {
  const useDefault = labels.toc === undefined && labels.tableOfContents === undefined;
  if (useDefault || labels.tableOfContents !== undefined) {
    section.dataset.tableOfContents = labels.tableOfContents ?? text;
  }
  if (labels.toc !== undefined) section.dataset.toc = labels.toc;
}

/**
 * A Table of Contents section with a heading — the common case, mirroring
 * how the backend assigns headings an id from their slugified text before
 * any JS runs.
 *
 * @param {string} text
 * @param {string} [headingId]
 * @param {{ toc?: string, tableOfContents?: string }} [labels]
 */
function createHeadedSection(text, headingId, labels) {
  const section = document.createElement('div');
  section.className = 'section';
  applySectionLabel(section, text, labels);
  const heading = document.createElement('h2');
  heading.textContent = text;
  if (headingId) heading.id = headingId;
  section.append(heading);
  return section;
}

/**
 * A Table of Contents section with no heading at all.
 *
 * @param {string} text
 * @param {string} [id]
 * @param {{ toc?: string, tableOfContents?: string }} [labels]
 */
function createBareSection(text, id, labels) {
  const section = document.createElement('div');
  section.className = 'section';
  applySectionLabel(section, text, labels);
  if (id) section.id = id;
  return section;
}

/**
 * Mirrors the DOM shape `decorateBlock` leaves behind: the block sits inside
 * its own `table-of-contents-wrapper` div, which is the section's child.
 */
function createBlockSection(...siblings) {
  const block = document.createElement('div');
  block.className = 'table-of-contents';
  const wrapper = document.createElement('div');
  wrapper.className = 'table-of-contents-wrapper';
  wrapper.append(block);
  const section = document.createElement('div');
  section.className = 'section';
  section.append(...siblings, wrapper);
  return { section, block };
}

describe('table of contents block', () => {
  it('links to the section heading\'s existing id instead of inventing a new one', () => {
    const main = document.createElement('main');
    const first = createHeadedSection('Section 1', 'section-1');
    const { section: blockSection, block } = createBlockSection();
    main.append(first, blockSection);

    decorate(block);

    const link = block.querySelector('.table-of-contents__link');
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
    expect(block.querySelector('.table-of-contents__link')).toHaveAttribute(
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
    expect(block.querySelector('.table-of-contents__link')).toHaveAttribute('href', '#section-1');
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

  it('builds a numbered list linking to each Table of Contents section, in document order', () => {
    const main = document.createElement('main');
    const first = createHeadedSection('Section 1', 'section-1');
    const { section: blockSection, block } = createBlockSection();
    const second = createHeadedSection('Section 2', 'section-2');
    main.append(first, blockSection, second);

    decorate(block);

    const links = [...block.querySelectorAll('.table-of-contents__link')];
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '#section-1');
    expect(links[0].querySelector('.table-of-contents__text')).toHaveTextContent('Section 1');
    expect(links[1]).toHaveAttribute('href', '#section-2');
    expect(links[1].querySelector('.table-of-contents__text')).toHaveTextContent('Section 2');
  });

  it('includes a section opted in with only the TOC metadata key', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(createHeadedSection('Legacy', 'legacy', { toc: 'Legacy' }), blockSection);

    decorate(block);

    const text = block.querySelector('.table-of-contents__text');
    expect(text).toHaveTextContent('Legacy');
    expect(block.querySelector('.table-of-contents__link')).toHaveAttribute('href', '#legacy');
  });

  it('prefers the Table of Contents label when a section has both metadata keys', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(
      createHeadedSection('Current label', 'both', {
        toc: 'Legacy label',
        tableOfContents: 'Current label',
      }),
      blockSection,
    );

    decorate(block);

    const items = block.querySelectorAll('.table-of-contents__item');
    expect(items).toHaveLength(1);
    expect(items[0].querySelector('.table-of-contents__text')).toHaveTextContent('Current label');
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

    const numbers = [...block.querySelectorAll('.table-of-contents__number')];
    expect(numbers.map((el) => el.textContent)).toEqual(['1', '2', '3']);
    numbers.forEach((el) => expect(el).toHaveAttribute('aria-hidden', 'true'));
  });

  it('renders the "Table of Contents" heading as a heading-5', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(createHeadedSection('A', 'a'), blockSection);

    decorate(block);

    const heading = block.querySelector('h2.table-of-contents__heading');
    expect(heading).toHaveTextContent('Table of Contents');
    expect(heading).toHaveClass('heading-5');
    expect(heading.id).toBe('table-of-contents-heading');
  });

  it('exposes itself as a navigation landmark labelled by its own heading', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(createHeadedSection('A', 'a'), blockSection);

    decorate(block);

    expect(block).toHaveAttribute('role', 'navigation');
    const headingId = block.querySelector('.table-of-contents__heading').id;
    expect(headingId).toBe('table-of-contents-heading');
    expect(block).toHaveAttribute('aria-labelledby', headingId);
  });

  it('marks the list with role="list" (Safari/VoiceOver drops it for list-style: none)', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    main.append(createHeadedSection('A', 'a'), blockSection);

    decorate(block);

    expect(block.querySelector('.table-of-contents__list')).toHaveAttribute('role', 'list');
  });

  it('ignores sections without a Table of Contents or TOC label', () => {
    const main = document.createElement('main');
    const { section: blockSection, block } = createBlockSection();
    const plain = document.createElement('div');
    plain.className = 'section';
    main.append(plain, createHeadedSection('A', 'a'), blockSection);

    decorate(block);

    expect(block.querySelectorAll('.table-of-contents__item')).toHaveLength(1);
  });

  it('removes the whole section when it has no Table of Contents sections and the block is its only content', () => {
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
    block.className = 'table-of-contents';

    expect(() => decorate(block)).not.toThrow();
  });
});
