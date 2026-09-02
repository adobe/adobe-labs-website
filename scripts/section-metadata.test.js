import decorateSectionMetadata, { resolveColor, toSameOriginPath } from './section-metadata.js';

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

  it('adds only a gap-N class from the gap field, no bare gap class', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { gap: 'l' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('gap-l');
    expect(section).not.toHaveClass('gap');
  });

  it('adds only a radius-N class from the radius field, no bare radius class', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { radius: 'xl' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('radius-xl');
    expect(section).not.toHaveClass('radius');
  });

  it('adds only a spacing-N class from the spacing field, no bare spacing class', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { spacing: 'xxl' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('spacing-xxl');
    expect(section).not.toHaveClass('spacing');
  });

  it('adds container and container-N classes from the container field', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { container: '4' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('container', 'container-4');
  });

  it('adds only a layout-N class from the layout field, no bare layout class', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', { layout: 'bento' });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('layout-bento');
    expect(section).not.toHaveClass('layout');
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

  it('strips an own-asset-host origin down to a same-origin path', () => {
    expect(toSameOriginPath('https://main--adobe-labs-website--adobe.aem.page/drafts/media_123.jpg?width=750'))
      .toBe('/drafts/media_123.jpg');
    expect(toSameOriginPath('https://main--adobe-labs-website--adobe.aem.live/drafts/media_123.jpg'))
      .toBe('/drafts/media_123.jpg');
    expect(toSameOriginPath(`${window.location.origin}/drafts/media_123.jpg`))
      .toBe('/drafts/media_123.jpg');
  });

  it('leaves a genuine external image URL untouched', () => {
    const external = 'https://images.example.com/photo.jpg';
    expect(toSameOriginPath(external)).toBe(external);
  });

  it('prepends an optimized background picture from a published asset URL, eager for the first section', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', {
      backgroundColor: 'https://main--adobe-labs-website--adobe.aem.page/media_123.jpg',
    });

    decorateSectionMetadata(main);

    expect(section).toHaveClass('has-background');
    expect(section).not.toHaveClass('light-scheme', 'dark-scheme');
    const picture = section.querySelector(':scope > picture.section-background');
    expect(picture).not.toBeNull();
    expect(section.firstElementChild).toBe(picture);
    const img = picture.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img.src).toBe(`${window.location.origin}/media_123.jpg?width=750&format=jpg&optimize=medium`);
  });

  it('does not throw and adds no scheme class when the image cannot be sampled', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', {
      backgroundColor: 'https://main--adobe-labs-website--adobe.aem.page/media_123.jpg',
    });

    decorateSectionMetadata(main);
    const img = section.querySelector('img');
    expect(() => img.dispatchEvent(new Event('load'))).not.toThrow();

    expect(section).not.toHaveClass('light-scheme', 'dark-scheme');
  });

  it('lazy-loads a background picture on a section after the first', () => {
    const main = document.createElement('main');
    const firstSection = document.createElement('div');
    firstSection.className = 'section';
    firstSection.innerHTML = '<div><p>First</p></div>';
    const secondSection = document.createElement('div');
    secondSection.className = 'section';
    secondSection.dataset.backgroundColor = 'https://main--adobe-labs-website--adobe.aem.page/media_123.jpg';
    secondSection.innerHTML = '<div><p>Second</p></div>';
    main.append(firstSection, secondSection);

    decorateSectionMetadata(main);

    expect(secondSection.querySelector('img')).toHaveAttribute('loading', 'lazy');
  });

  it('does nothing when no metadata fields are present', () => {
    const { main, section } = createMain('<div><p>Card</p></div>', {});

    decorateSectionMetadata(main);

    expect(section.className).toBe('section');
  });
});
