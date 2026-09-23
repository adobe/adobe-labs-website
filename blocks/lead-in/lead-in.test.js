import decorate from './lead-in.js';

function createBlock(html) {
  const block = document.createElement('div');
  block.className = 'lead-in';
  const row = document.createElement('div');
  const cell = document.createElement('div');
  cell.innerHTML = html;
  row.append(cell);
  block.append(row);
  return block;
}

describe('lead-in block', () => {
  it('renders an authored paragraph as a styled p, not a forced heading', () => {
    const block = createBlock('<p>We surveyed nearly 2,000 creative professionals.</p>');

    decorate(block);

    expect(block.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    const paragraph = block.querySelector('p');
    expect(paragraph).toHaveClass('lead-in__headline');
    expect(paragraph).toHaveTextContent('We surveyed nearly 2,000 creative professionals.');
  });

  it('preserves an authored heading instead of forcing h2', () => {
    const block = createBlock('<h3>We surveyed nearly 2,000 creative professionals.</h3>');

    decorate(block);

    const heading = block.querySelector('h3');
    expect(heading).toHaveClass('lead-in__headline');
    expect(block.querySelector('h2')).toBeNull();
  });

  it('preserves formatting from the authored content', () => {
    const block = createBlock('<p>We surveyed <strong>nearly 2,000</strong> <em>creative</em> professionals.</p>');

    decorate(block);

    const paragraph = block.querySelector('p');
    expect(paragraph.querySelector('strong')).toHaveTextContent('nearly 2,000');
    expect(paragraph.querySelector('em')).toHaveTextContent('creative');
  });

  it('renders multiple authored paragraphs as separate elements', () => {
    const block = createBlock('<p>First line.</p><p>Second line.</p>');

    decorate(block);

    const paragraphs = block.querySelectorAll('p.lead-in__headline');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent('First line.');
    expect(paragraphs[1]).toHaveTextContent('Second line.');
  });

  it('preserves line breaks within a single paragraph', () => {
    const block = createBlock('<p>First line.<br>Second line.</p>');

    decorate(block);

    const paragraph = block.querySelector('p');
    expect(paragraph.querySelector('br')).not.toBeNull();
  });

  it('renders no content when nothing is authored', () => {
    const block = document.createElement('div');
    block.className = 'lead-in';

    decorate(block);

    expect(block.querySelector('.lead-in__headline')).toBeNull();
  });
});
