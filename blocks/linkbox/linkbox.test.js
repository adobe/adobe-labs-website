import { within } from '@testing-library/dom';
import decorate from './linkbox.js';

jest.mock('../../scripts/aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
}));

/**
 * Key/value rows, matching the authored linkbox table.
 *
 * @param {Object<string, string>} fields Label to cell HTML
 * @returns {HTMLDivElement}
 */
function createBlock(fields) {
  const block = document.createElement('div');
  block.className = 'linkbox';
  Object.entries(fields).forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  return block;
}

const PICTURE = '<picture><img src="toolkit.jpg" alt="Crisis response toolkit"></picture>';

describe('linkbox block', () => {
  it('makes the whole box one link with the authored label, image, and arrow', () => {
    const block = createBlock({
      Media: PICTURE,
      Text: '<a href="/playground/crisis">Launch experiment</a>',
    });

    decorate(block);

    const link = within(block).getByRole('link', {
      name: 'Crisis response toolkit Launch experiment',
    });
    expect(link).toHaveClass('linkbox__surface');
    expect(link).toHaveAttribute('href', expect.stringMatching(/\/playground\/crisis$/));
    expect(link).not.toHaveAttribute('target');

    const img = within(block).getByAltText('Crisis response toolkit');
    expect(link.querySelector('.linkbox__media')).toContainElement(img);
    expect(block.querySelector('.linkbox__text')).toHaveTextContent('Launch experiment');
    const underline = block.querySelector('.linkbox__underline');
    expect(underline).toHaveTextContent('Launch experiment');
    expect(underline).toHaveAttribute('aria-hidden', 'true');
    expect(block.querySelector('.linkbox__arrow')).toHaveAttribute('aria-hidden', 'true');
    expect(block.querySelector('.linkbox__arrow svg')).toBeTruthy();
    expect(block).not.toHaveTextContent('Media');
    expect(block).not.toHaveTextContent('Text');
  });

  it('marks an off-site link to open in a new tab', () => {
    const block = createBlock({
      Text: '<a href="https://example.com/experiment">Launch experiment</a>',
    });

    decorate(block);

    const link = within(block).getByRole('link', { name: 'Launch experiment (opens in a new tab)' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveAttribute('aria-label', 'Launch experiment (opens in a new tab)');
  });

  it('keeps an on-site absolute link in the same tab', () => {
    const block = createBlock({
      Text: '<a href="https://labs.adobe.com/playground/crisis">Launch experiment</a>',
    });

    decorate(block);

    const link = within(block).getByRole('link', { name: 'Launch experiment' });
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('aria-label');
  });

  it('accepts an Image row as the media field', () => {
    const block = createBlock({
      Image: PICTURE,
      Text: '<a href="/playground/crisis">Launch experiment</a>',
    });

    decorate(block);

    expect(within(block).getByAltText('Crisis response toolkit')).toBeTruthy();
  });

  it('renders text without a link when the cell is not a link', () => {
    const block = createBlock({
      Media: PICTURE,
      Text: 'Launch experiment',
    });

    decorate(block);

    expect(block.querySelector('a')).toBeNull();
    expect(block.querySelector('.linkbox__surface').tagName).toBe('DIV');
    expect(block.querySelector('.linkbox__label')).toHaveTextContent('Launch experiment');
    expect(block.querySelector('.linkbox__underline')).toBeNull();
    expect(block.querySelector('.linkbox__arrow')).toBeNull();
  });

  it('drops a non-http href and still shows the label', () => {
    const block = createBlock({
      Text: '<a href="javascript:alert(1)">Launch experiment</a>',
    });

    decorate(block);

    expect(block.querySelector('a')).toBeNull();
    expect(block.querySelector('.linkbox__label')).toHaveTextContent('Launch experiment');
  });

  it('reads a link wrapped in a paragraph, as EDS authors it', () => {
    const block = createBlock({
      Media: `<p>${PICTURE}</p>`,
      Text: '<p><a href="/playground/crisis">Launch experiment</a></p>',
    });

    decorate(block);

    const link = within(block).getByRole('link', {
      name: 'Crisis response toolkit Launch experiment',
    });
    expect(link).toHaveAttribute('href', expect.stringMatching(/\/playground\/crisis$/));
    expect(link.querySelector('p')).toBeNull();
    expect(link.querySelector('.linkbox__media picture')).toBeTruthy();
  });

  it('renders the link when the image is omitted', () => {
    const block = createBlock({
      Text: '<a href="/playground/crisis">Launch experiment</a>',
    });

    decorate(block);

    const link = within(block).getByRole('link', { name: 'Launch experiment' });
    expect(link.querySelector('.linkbox__media')).toBeNull();
    expect(link.querySelector('.linkbox__label')).toHaveTextContent('Launch experiment');
  });

  it('sets an empty alt when the authored image has none', () => {
    const block = createBlock({
      Media: '<picture><img src="toolkit.jpg"></picture>',
      Text: '<a href="/playground/crisis">Launch experiment</a>',
    });

    decorate(block);

    expect(block.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('clears the block when both fields are empty', () => {
    const block = createBlock({
      Media: '',
      Text: '   ',
    });

    decorate(block);

    expect(block).toBeEmptyDOMElement();
  });
});
