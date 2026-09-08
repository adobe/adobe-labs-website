import { within } from '@testing-library/dom';
import decorate from './elastic-router.js';

jest.mock('../../scripts/aem.js', () => ({
  toClassName: jest.fn(),
  getMetadata: jest.fn(),
  buildBlock: jest.fn(),
}));

function createBlock(rows) {
  const block = document.createElement('div');
  rows.forEach((html) => {
    const row = document.createElement('div');
    const cell = document.createElement('div');
    cell.innerHTML = html;
    row.append(cell);
    block.append(row);
  });
  return block;
}

const PICTURE = '<picture><img src="./flowers.jpg" alt=""></picture>';

describe('elastic-router block', () => {
  it('renders a linked card for a row with the image and text in separate paragraphs', () => {
    const block = createBlock([
      `<h3 id="research"><a href="/research/">Research</a></h3>
       <p>${PICTURE}</p>
       <p>Research the future of creative work</p>`,
    ]);

    decorate(block);

    const view = within(block);
    const link = view.getByRole('link', { name: /Research/ });

    expect(link).toHaveClass('elastic-router__link');
    expect(link).toHaveAttribute('href', expect.stringMatching(/\/research\/?$/));
    expect(view.getByText('Research', { selector: 'h3' })).toHaveClass('elastic-router__title');
    expect(view.getByText('Research the future of creative work')).toHaveClass('elastic-router__description');
    expect(link.querySelector('picture')).toBeTruthy();
  });

  it('renders the description when the image and text share one paragraph with a line break', () => {
    const block = createBlock([
      `<h3 id="sneaks"><a href="/sneaks/">Sneaks</a></h3>
       <p>${PICTURE}<br>Net-new innovation, straight from MAX</p>`,
    ]);

    decorate(block);

    expect(within(block).getByText('Net-new innovation, straight from MAX')).toHaveClass(
      'elastic-router__description',
    );
  });

  it('preserves the authored heading level', () => {
    const block = createBlock([
      '<h5><a href="/playground/">Playground</a></h5>',
    ]);

    decorate(block);

    const heading = block.querySelector('.elastic-router__title');
    expect(heading.tagName).toBe('H5');
  });

  it('does not nest a link inside the card link', () => {
    const block = createBlock([
      '<h3><a href="/workflows/">Workflows</a></h3>',
    ]);

    decorate(block);

    const link = within(block).getByRole('link', { name: 'Workflows' });
    expect(link.querySelector('a')).toBeNull();
    expect(link.textContent.trim()).toBe('Workflows');
  });

  it('skips a row with no href', () => {
    const block = createBlock([
      '<h3>Playground</h3>',
    ]);

    decorate(block);

    expect(block.querySelectorAll('.elastic-router__item')).toHaveLength(0);
  });

  it('skips a row with no heading', () => {
    const block = createBlock([
      '<p>Just some text</p>',
    ]);

    decorate(block);

    expect(block.querySelectorAll('.elastic-router__item')).toHaveLength(0);
  });

  it('ignores javascript URLs', () => {
    const block = createBlock([
      '<h3><a href="javascript:alert(1)">Playground</a></h3>',
    ]);

    decorate(block);

    expect(block.querySelectorAll('.elastic-router__item')).toHaveLength(0);
  });

  it('renders one list item per authored row, in order', () => {
    const block = createBlock([
      '<h3><a href="/research/">Research</a></h3>',
      '<h3><a href="/workflows/">Workflows</a></h3>',
      '<h3><a href="/sneaks/">Sneaks</a></h3>',
      '<h3><a href="/playground/">Playground</a></h3>',
    ]);

    decorate(block);

    const titles = [...block.querySelectorAll('.elastic-router__title')].map((el) => el.textContent);
    expect(titles).toEqual(['Research', 'Workflows', 'Sneaks', 'Playground']);
    expect(block.querySelector('ul.elastic-router__list')).toHaveAttribute('role', 'list');
  });
});
