import decorate from './grid-line-content.js';

function createBlock(rows) {
  const block = document.createElement('div');
  rows.forEach((cells) => {
    const row = document.createElement('div');
    cells.forEach((html) => {
      const cell = document.createElement('div');
      cell.innerHTML = html;
      row.append(cell);
    });
    block.append(row);
  });
  return block;
}

describe('grid-line-content block', () => {
  it('wraps the authored cell content in a single text wrapper', () => {
    const block = createBlock([['<p>A closing statement</p>']]);

    decorate(block);

    expect(block.children).toHaveLength(1);
    const text = block.firstElementChild;
    expect(text).toHaveClass('grid-line-content-text');
    expect(text.querySelector('p')).toHaveTextContent('A closing statement');
  });

  it('flattens multiple rows and cells into the same wrapper', () => {
    const block = createBlock([
      ['<p>First</p>'],
      ['<p>Second</p>', '<p>Third</p>'],
    ]);

    decorate(block);

    expect(block.children).toHaveLength(1);
    const text = block.firstElementChild;
    const paragraphs = text.querySelectorAll('p');
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]).toHaveTextContent('First');
    expect(paragraphs[1]).toHaveTextContent('Second');
    expect(paragraphs[2]).toHaveTextContent('Third');
  });

  it('preserves headings alongside paragraphs when authored', () => {
    const block = createBlock([['<h2>Statement</h2><p>Attribution</p>']]);

    decorate(block);

    const text = block.firstElementChild;
    expect(text.querySelector('h2')).toHaveTextContent('Statement');
    expect(text.querySelector('p')).toHaveTextContent('Attribution');
  });

  it('optimizes authored images and preserves their alt text', () => {
    const block = createBlock([['<picture><img src="hero.jpg" alt="Adobe Labs"></picture>']]);

    decorate(block);

    const text = block.firstElementChild;
    const picture = text.querySelector('picture');
    expect(picture).toBeTruthy();
    expect(picture.querySelectorAll('source').length).toBeGreaterThan(0);
    expect(picture.querySelector('img')).toHaveAttribute('alt', 'Adobe Labs');
  });

  it('does not add a picture when no image is authored', () => {
    const block = createBlock([['<p>No media here</p>']]);

    decorate(block);

    expect(block.querySelector('picture')).toBeNull();
  });
});
