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
  it('renders the authored text as a single h2', () => {
    const block = createBlock('<p>We surveyed nearly 2,000 creative professionals.</p>');

    decorate(block);

    const heading = block.querySelector('h2');
    expect(heading).toHaveClass('lead-in__headline');
    expect(heading).toHaveTextContent('We surveyed nearly 2,000 creative professionals.');
  });

  it('strips formatting from the authored content', () => {
    const block = createBlock('<p>We surveyed <strong>nearly 2,000</strong> <em>creative</em> professionals.</p>');

    decorate(block);

    const heading = block.querySelector('h2');
    expect(heading.innerHTML).toBe('We surveyed nearly 2,000 creative professionals.');
    expect(heading.querySelector('strong, em')).toBeNull();
  });

  it('renders only one h2 even when multiple paragraphs are authored', () => {
    const block = createBlock('<p>First line.</p><p>Second line.</p>');

    decorate(block);

    expect(block.querySelectorAll('h2')).toHaveLength(1);
  });

  it('renders an empty heading when no content is authored', () => {
    const block = document.createElement('div');
    block.className = 'lead-in';

    decorate(block);

    const heading = block.querySelector('h2');
    expect(heading).toHaveClass('lead-in__headline');
    expect(heading).toHaveTextContent('');
  });
});
