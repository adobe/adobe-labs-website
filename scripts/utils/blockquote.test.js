import { decorateBlockquotes } from './utils.js';

function decorateHtml(html) {
  const main = document.createElement('main');
  main.innerHTML = html;
  decorateBlockquotes(main);
  return main;
}

describe('decorateBlockquotes', () => {
  it.each([
    ['em dash', '— Jessica Walsh'],
    ['en dash', '– Jessica Walsh'],
    ['hyphen', '- Jessica Walsh'],
  ])('marks a %s paragraph inside the quote as the author', (_label, authored) => {
    const main = decorateHtml(`<blockquote><p>Quote</p><p>${authored}</p></blockquote>`);

    const figure = main.querySelector('.blockquote-figure');
    const author = figure.querySelector(':scope > .blockquote-author');
    expect(figure.querySelector(':scope > blockquote')).not.toBeNull();
    expect(author.tagName).toBe('FIGCAPTION');
    expect(author.textContent).toBe('— Jessica Walsh');
  });

  it('renders a missing space after the dash as an em dash plus one space', () => {
    const main = decorateHtml('<blockquote><p>Quote</p><p>—Jessica</p></blockquote>');

    expect(main.querySelector('.blockquote-author').textContent).toBe('— Jessica');
  });

  it.each([
    ['double hyphen', '-- Jessica'],
    ['double hyphen without a space', '--Jessica'],
    ['double em dash', '—— Jessica'],
    ['double en dash', '––Jessica'],
  ])('replaces a %s with one em dash', (_label, authored) => {
    const main = decorateHtml(`<blockquote><p>Quote</p><p>${authored}</p></blockquote>`);

    expect(main.querySelector('.blockquote-author').textContent).toBe('— Jessica');
  });

  it('collapses extra spaces after the dash to one space', () => {
    const main = decorateHtml('<blockquote><p>Quote</p><p>-  Jessica</p></blockquote>');

    expect(main.querySelector('.blockquote-author').textContent).toBe('— Jessica');
  });

  it('keeps markup after the dash', () => {
    const main = decorateHtml('<blockquote><p>Quote</p><p>– <strong>Jessica Walsh</strong></p></blockquote>');

    const author = main.querySelector('.blockquote-author');
    expect(author.textContent).toBe('— Jessica Walsh');
    expect(author.querySelector('strong')).toHaveTextContent('Jessica Walsh');
  });

  it('leaves a paragraph that does not start with a dash', () => {
    const main = decorateHtml('<blockquote><p>Quote</p></blockquote><p>Hello — Jessica</p>');

    expect(main.querySelector('.blockquote-author')).toBeNull();
    expect(main.querySelector('blockquote + p').textContent).toBe('Hello — Jessica');
  });

  it('leaves a following element that is not a paragraph', () => {
    const main = decorateHtml('<blockquote><p>Quote</p></blockquote><h2>— Jessica</h2>');

    expect(main.querySelector('.blockquote-author')).toBeNull();
    expect(main.querySelector('h2')).toHaveTextContent('— Jessica');
  });

  it('leaves a dash-led paragraph that does not follow a blockquote', () => {
    const main = decorateHtml('<p>— Jessica Walsh</p>');

    expect(main.querySelector('.blockquote-author')).toBeNull();
  });

  it('leaves a following paragraph that starts with a dash', () => {
    const main = decorateHtml('<blockquote><p>“Quote”</p></blockquote><p>- Not an author</p>');

    expect(main.querySelector('.blockquote-author')).toBeNull();
    expect(main.querySelector('figure')).toBeNull();
    expect(main.querySelector('blockquote')).toHaveClass('blockquote-hanging');
    expect(main.querySelector('blockquote + p').textContent).toBe('- Not an author');
  });

  it.each(['"', '“', '”', "'", '‘', '’', '«', '»', '‹', '›'])(
    'hangs a quote that starts with %s',
    (mark) => {
      const main = decorateHtml(`<blockquote><p>${mark}Quote</p></blockquote>`);

      expect(main.querySelector('blockquote')).toHaveClass('blockquote-hanging');
    },
  );

  it('replaces straight double quotes with curly quotes', () => {
    const main = decorateHtml('<blockquote><p>"It\'s more curated."</p></blockquote>');

    expect(main.querySelector('blockquote').textContent).toBe('“It’s more curated.”');
    expect(main.querySelector('blockquote')).toHaveClass('blockquote-hanging');
  });

  it('replaces a straight single quote used as a quotation', () => {
    const main = decorateHtml('<blockquote><p>I\'m like, \'oh I cheated kinda.\'</p></blockquote>');

    expect(main.querySelector('blockquote').textContent).toBe('I’m like, ‘oh I cheated kinda.’');
  });

  it('curls a straight quote split across elements', () => {
    const main = decorateHtml('<blockquote><p><strong>"</strong>Quote."</p></blockquote>');

    expect(main.querySelector('blockquote').textContent).toBe('“Quote.”');
    expect(main.querySelector('strong').textContent).toBe('“');
  });

  it('leaves curly quotes unchanged', () => {
    const main = decorateHtml('<blockquote><p>“Already curly.”</p></blockquote>');

    expect(main.querySelector('blockquote').textContent).toBe('“Already curly.”');
  });

  it('curls an apostrophe in the author name', () => {
    const main = decorateHtml('<blockquote><p>"Quote."</p><p>- O\'Brien</p></blockquote>');

    expect(main.querySelector('.blockquote-author').textContent).toBe('— O’Brien');
  });

  it('does not hang a quote that starts with a letter', () => {
    const main = decorateHtml('<blockquote><p>Quote</p></blockquote>');

    expect(main.querySelector('blockquote')).not.toHaveClass('blockquote-hanging');
    expect(main.querySelector('figure')).toBeNull();
  });

  it('moves an author paragraph inside the blockquote out beside it', () => {
    const main = decorateHtml(`
      <blockquote>
        <p>“What takes talent.”</p>
        <p>—Graphic artist</p>
      </blockquote>
    `);

    const quote = main.querySelector('blockquote');
    expect(quote).toHaveClass('blockquote-hanging');
    expect(quote.textContent).toContain('What takes talent.');
    expect(quote.querySelector('p')?.textContent).not.toContain('Graphic artist');
    expect(quote.parentElement.tagName).toBe('FIGURE');
    expect(quote.parentElement).toHaveClass('blockquote-figure');
    expect(quote.nextElementSibling.tagName).toBe('FIGCAPTION');
    expect(quote.nextElementSibling).toHaveClass('blockquote-author');
    expect(quote.nextElementSibling.textContent).toBe('— Graphic artist');
  });

  it('splits several quote and author pairs in one blockquote', () => {
    const main = decorateHtml(`
      <blockquote>
        <p>"First quote."</p>
        <p><em>—Creative director</em></p>
        <p>"Second quote."</p>
        <p><em>– Designer</em></p>
      </blockquote>
      <p>After</p>
    `);

    const quotes = [...main.querySelectorAll('blockquote')];
    const authors = [...main.querySelectorAll('.blockquote-author')];
    expect(quotes).toHaveLength(2);
    expect(authors).toHaveLength(2);
    expect(quotes[0]).toHaveClass('blockquote-hanging');
    expect(quotes[0].parentElement.tagName).toBe('FIGURE');
    expect(quotes[0].nextElementSibling).toBe(authors[0]);
    expect(authors[0].tagName).toBe('FIGCAPTION');
    expect(authors[0].textContent).toBe('— Creative director');
    expect(quotes[1].parentElement.tagName).toBe('FIGURE');
    expect(quotes[1].textContent).toContain('Second quote.');
    expect(authors[1].textContent).toBe('— Designer');
    expect(main.querySelector('.blockquote-figure + .blockquote-figure + p').textContent).toBe('After');
  });

  it('leaves a non-author paragraph inside the blockquote', () => {
    const main = decorateHtml(`
      <blockquote>
        <p>"A quote."</p>
        <p>—Author</p>
        <p>Commentary that stays in the quote.</p>
      </blockquote>
    `);

    const quotes = [...main.querySelectorAll('blockquote')];
    expect(quotes).toHaveLength(2);
    expect(quotes[0].parentElement.tagName).toBe('FIGURE');
    expect(quotes[1].parentElement.tagName).not.toBe('FIGURE');
    expect(quotes[1]).not.toHaveClass('blockquote-hanging');
    expect(quotes[1].textContent).toContain('Commentary that stays in the quote.');
  });

  it('decorates a quote nested in a block cell', () => {
    const main = decorateHtml(`
      <div class="media-and-text">
        <div>
          <div>
            <blockquote><p>“Nested”</p></blockquote>
            <p>- Ada Lovelace</p>
          </div>
        </div>
      </div>
    `);

    const quote = main.querySelector('blockquote');
    expect(quote).toHaveClass('blockquote-hanging');
    expect(main.querySelector('figure')).toBeNull();
    expect(quote.nextElementSibling.tagName).toBe('P');
    expect(quote.nextElementSibling).not.toHaveClass('blockquote-author');
    expect(quote.nextElementSibling.textContent).toBe('- Ada Lovelace');
  });
});
