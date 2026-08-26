import decorateSectionMetadata, { resolveColor } from './section-metadata.js';

function createMain(sectionHtml, dataset) {
  const main = document.createElement('main');
  const section = document.createElement('div');
  section.className = 'section';
  Object.entries(dataset).forEach(([key, value]) => { section.dataset[key] = value; });
  section.innerHTML = sectionHtml;
  main.append(section);
  return { main, section };
}

describe('decorateSectionMetadata', () => {
  it('adds grid and grid-N classes from the grid field', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { grid: '3' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('grid', 'grid-3');
  });

  it('skips the grid field when the value is 0', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { grid: '0' });

    decorateSectionMetadata(main);

    expect(section.className).toBe('section');
  });

  it('adds a gap class from the gap field', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { gap: 'l' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('gap', 'gap-l');
  });

  it('adds a radius class from the radius field', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { radius: 'xl' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('radius', 'radius-xl');
  });

  it('adds a spacing class from the spacing field', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { spacing: 'xxl' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('spacing', 'spacing-xxl');
  });

  it('adds container and container-N classes from the container field', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { container: '4' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('container', 'container-4');
  });

  it('adds a layout class from the layout field', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { layout: 'bento' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('layout', 'layout-bento');
  });

  it('sets a solid background color and a matching color scheme', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { backgroundColor: '#000000' });

    decorateSectionMetadata(main);

    expect(section.style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(section).toHaveClass('dark-scheme');
  });

  it('wraps a bare custom-property name in var()', () => {
    expect(resolveColor('--link-color')).toBe('var(--link-color)');
  });

  it('maps a legacy color-token value to the s2a color namespace', () => {
    expect(resolveColor('color-token-gray-100')).toBe('var(--s2a-color-gray-100)');
  });

  it('passes a literal color value through unchanged', () => {
    expect(resolveColor('pink')).toBe('pink');
  });

  it('sets a background image from a published asset URL without a color scheme', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', {
      backgroundColor: 'https://main--adobe-labs-website--adobe.aem.page/media_123.jpg',
    });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('has-background');
    expect(section.style.backgroundImage).toBe('url(https://main--adobe-labs-website--adobe.aem.page/media_123.jpg)');
    expect(section).not.toHaveClass('light-scheme', 'dark-scheme');
  });

  it('does nothing when no metadata fields are present', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', {});

    decorateSectionMetadata(main);

    expect(section.className).toBe('section');
  });
});
