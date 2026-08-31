import { within } from '@testing-library/dom';
import decorate from './page-header.js';

function createBlock(html) {
  const block = document.createElement('div');
  block.innerHTML = html;
  return block;
}

const JUMP_LINKS = `
  <p>Jump to:</p>
  <ul>
    <li><a href="#future">Future of Creative Work</a></li>
    <li><a href="#economic">Economic Impact</a></li>
    <li><a href="#standards">Standards &amp; Practices</a></li>
    <li><a href="#human">Human Side of AI</a></li>
  </ul>
`;

const TITLE_AND_JUMP = `
  <div>
    <div><h1>Research</h1></div>
  </div>
  <div>
    <div><p>The future of creative work.</p></div>
    <div>${JUMP_LINKS}</div>
  </div>
`;

describe('page-header block', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps the authored heading level and moves it out of the row wrappers', () => {
    const block = createBlock(TITLE_AND_JUMP);

    decorate(block);

    const title = within(block).getByRole('heading', { level: 1, name: 'Research' });
    expect(title).toHaveClass('page-header__title');
    expect(title.parentElement).toBe(block);
  });

  it('preserves a non-h1 heading level', () => {
    const block = createBlock(`
      <div>
        <div><h2>Research</h2></div>
      </div>
    `);

    decorate(block);

    expect(within(block).getByRole('heading', { level: 2, name: 'Research' }))
      .toHaveClass('page-header__title');
  });

  it('wraps a paragraph title as an h1', () => {
    const block = createBlock(`
      <div>
        <div><p>Research</p></div>
      </div>
    `);

    decorate(block);

    expect(within(block).getByRole('heading', { level: 1, name: 'Research' }))
      .toHaveClass('page-header__title');
    expect(block.querySelector('p')).toBeNull();
  });

  it('styles the subtitle as heading-4', () => {
    const block = createBlock(TITLE_AND_JUMP);

    decorate(block);

    const subtitle = block.querySelector('.page-header__subtitle');
    expect(subtitle).toHaveClass('heading-4');
    expect(subtitle).toHaveTextContent('The future of creative work.');
  });

  it('omits an empty subtitle cell', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
      <div>
        <div></div>
        <div>${JUMP_LINKS}</div>
      </div>
    `);

    decorate(block);
    document.body.append(block);

    expect(block.querySelector('.page-header__subtitle')).toBeNull();
    expect(within(block).getByRole('navigation', { name: 'Jump to:' })).toBeTruthy();
  });

  it('omits an empty subtitle cell that only contains a blank paragraph', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
      <div>
        <div><p>&nbsp;</p></div>
        <div><p>Caption</p></div>
      </div>
    `);

    decorate(block);

    expect(block.querySelector('.page-header__subtitle')).toBeNull();
    expect(block.querySelector('.page-header__aside')).toHaveTextContent('Caption');
  });

  it('wraps a list of links in a labelled nav and keeps the list', () => {
    const block = createBlock(TITLE_AND_JUMP);

    decorate(block);
    document.body.append(block);

    const nav = within(block).getByRole('navigation', { name: 'Jump to:' });
    expect(nav).toHaveClass('page-header__jump');
    expect(nav.querySelector('ul')).toHaveClass('page-header__jump-list', 'heading-6');
    expect(nav.querySelector('ul')).toHaveAttribute('role', 'list');
    expect(within(nav).getByRole('link', { name: 'Future of Creative Work' }))
      .toHaveAttribute('href', '#future');
    expect(nav.querySelectorAll('li')).toHaveLength(4);
  });

  it('names the jump nav when the authored label is missing', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
      <div>
        <div><p>The future of creative work.</p></div>
        <div>
          <ul>
            <li><a href="#future">Future of Creative Work</a></li>
            <li><a href="#economic">Economic Impact</a></li>
          </ul>
        </div>
      </div>
    `);

    decorate(block);
    document.body.append(block);

    expect(within(block).getByRole('navigation', { name: 'On this page' })).toBeTruthy();
  });

  it('unwraps paragraph wrappers inside jump-link items', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
      <div>
        <div><p>The future of creative work.</p></div>
        <div>
          <p>Jump to:</p>
          <ul>
            <li><p><a href="#future">Future of Creative Work</a></p></li>
            <li><p><a href="#economic">Economic Impact</a></p></li>
          </ul>
        </div>
      </div>
    `);

    decorate(block);

    const items = [...block.querySelectorAll('.page-header__jump-list li')];
    expect(items.every((item) => !item.querySelector('p'))).toBe(true);
    expect(items[0].querySelector('a')).toHaveTextContent('Future of Creative Work');
  });

  it('leaves non-link lists as aside content', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
      <div>
        <div><p>The future of creative work.</p></div>
        <div>
          <p>Also:</p>
          <ul>
            <li>Not a link</li>
            <li>Still not a link</li>
          </ul>
        </div>
      </div>
    `);

    decorate(block);

    expect(block.querySelector('nav')).toBeNull();
    expect(block.querySelector('.page-header__aside')).toHaveTextContent(/Also:/);
    expect(block.querySelector('.page-header__aside ul')).toBeTruthy();
  });

  it('renders a caption paragraph in the aside without converting it to nav', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
      <div>
        <div><p>The future of creative work.</p></div>
        <div><p>Caption</p></div>
      </div>
    `);

    decorate(block);

    expect(block.querySelector('nav')).toBeNull();
    expect(block.querySelector('.page-header__aside')).toHaveClass('heading-6');
    expect(block.querySelector('.page-header__aside')).toHaveTextContent('Caption');
  });

  it('renders heading only when the content row is missing', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
    `);

    decorate(block);

    expect(within(block).getByRole('heading', { name: 'Research' })).toBeTruthy();
    expect(block.querySelector('.page-header__row')).toBeNull();
    expect(block.children).toHaveLength(1);
  });

  it('renders heading and subtitle without an aside', () => {
    const block = createBlock(`
      <div>
        <div><h1>Research</h1></div>
      </div>
      <div>
        <div><p>The future of creative work.</p></div>
      </div>
    `);

    decorate(block);

    expect(block.querySelector('.page-header__subtitle')).toHaveTextContent(
      'The future of creative work.',
    );
    expect(block.querySelector('.page-header__aside')).toBeNull();
    expect(block.querySelector('nav')).toBeNull();
  });

  it('omits an empty title cell', () => {
    const block = createBlock(`
      <div>
        <div></div>
      </div>
      <div>
        <div><p>The future of creative work.</p></div>
        <div><p>Caption</p></div>
      </div>
    `);

    decorate(block);

    expect(block.querySelector('.page-header__title')).toBeNull();
    expect(within(block).queryByRole('heading')).toBeNull();
    expect(block.querySelector('.page-header__subtitle')).toBeTruthy();
    expect(block.querySelector('.page-header__aside')).toBeTruthy();
  });

  it('decorates the research index authored markup', () => {
    const block = createBlock(`
      <div>
        <div>
          <h1 id="research">Research</h1>
        </div>
      </div>
      <div>
        <div>The future<br>of creative work.</div>
        <div>
          <p>Jump to:</p>
          <ul>
            <li><a href="#anchor-1">Future of Creative Work</a></li>
            <li><a href="#anchor-2">Economic Impact</a></li>
            <li><a href="#anchor-3">Standards &amp; Practices</a></li>
            <li><a href="#anchor-4">Human Side of AI</a></li>
          </ul>
        </div>
      </div>
    `);

    decorate(block);
    document.body.append(block);

    expect(within(block).getByRole('heading', { level: 1, name: 'Research' })).toBeTruthy();
    expect(block.querySelector('.page-header__subtitle').innerHTML).toBe(
      'The future<br>of creative work.',
    );
    const nav = within(block).getByRole('navigation', { name: 'Jump to:' });
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
  });
});
