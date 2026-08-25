import decorate from './section-metadata.js';

function createSection(rows) {
  const section = document.createElement('div');
  section.className = 'section';

  const wrapper = document.createElement('div');
  wrapper.className = 'section-metadata-wrapper';

  const block = document.createElement('div');
  block.className = 'section-metadata';
  block.innerHTML = rows
    .map(([key, value]) => `<div><div>${key}</div><div>${value}</div></div>`)
    .join('');

  wrapper.append(block);
  section.append(wrapper);

  return { section, block };
}

describe('section-metadata block', () => {
  it('adds style classes from the Style field to the section', () => {
    const { section, block } = createSection([['style', 'highlight, center']]);

    decorate(block);

    expect(section).toHaveClass('highlight', 'center');
  });

  it('adds grid and grid-N classes from the Grid field', () => {
    const { section, block } = createSection([['grid', '3']]);

    decorate(block);

    expect(section).toHaveClass('grid', 'grid-3');
  });

  it('skips the Grid field when the value is 0', () => {
    const { section, block } = createSection([['grid', '0']]);

    decorate(block);

    expect(section.className).toBe('section');
  });

  it('adds a gap class from the Gap field', () => {
    const { section, block } = createSection([['gap', 'md']]);

    decorate(block);

    expect(section).toHaveClass('gap-md');
  });

  it('adds a radius class from the Radius field', () => {
    const { section, block } = createSection([['radius', 'xl']]);

    decorate(block);

    expect(section).toHaveClass('radius-xl');
  });

  it('adds a spacing class from the Spacing field', () => {
    const { section, block } = createSection([['spacing', 'lg']]);

    decorate(block);

    expect(section).toHaveClass('spacing-lg');
  });

  it('adds container and container-N classes from the Container field', () => {
    const { section, block } = createSection([['container', '4']]);

    decorate(block);

    expect(section).toHaveClass('container', 'container-4');
  });

  it('adds a layout class from the Layout field', () => {
    const { section, block } = createSection([['layout', 'bento']]);

    decorate(block);

    expect(section).toHaveClass('layout-bento');
  });

  it('sets a solid background color and a matching color scheme', () => {
    const { section, block } = createSection([['background-color', '#000000']]);

    decorate(block);

    expect(section.style.backgroundColor).toBe('rgb(0, 0, 0)');
    expect(section).toHaveClass('dark-scheme');
  });

  it('moves background pictures in front of the section content and marks it has-background', () => {
    const { section, block } = createSection([
      ['background-image', '<picture><img src="bg.jpg" alt=""></picture>'],
    ]);

    decorate(block);

    expect(section).toHaveClass('has-background');
    expect(section.firstElementChild).toHaveClass('section-background');
  });

  it('removes the block and its wrapper from the section', () => {
    const { section, block } = createSection([['style', 'highlight']]);

    decorate(block);

    expect(section.querySelector('.section-metadata')).toBeNull();
    expect(section.querySelector('.section-metadata-wrapper')).toBeNull();
  });

  it('does nothing when the block is not inside a section', () => {
    const block = document.createElement('div');
    block.className = 'section-metadata';
    block.innerHTML = '<div><div>style</div><div>highlight</div></div>';

    expect(() => decorate(block)).not.toThrow();
    expect(block.isConnected).toBe(false);
  });
});
