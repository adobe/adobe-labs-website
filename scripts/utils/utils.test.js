import {
  buildPlayIcon,
  getAuthoredCells,
  isAuthoredVideo,
} from './utils.js';

jest.mock('../aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
}));

function createKeyValueBlock(fields) {
  const block = document.createElement('div');
  Object.entries(fields).forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  return block;
}

describe('buildPlayIcon', () => {
  it('returns a hidden label and a play-icon with an inner svg', () => {
    const { label, icon } = buildPlayIcon();

    expect(label).toHaveClass('visually-hidden');
    expect(label).toHaveTextContent('Video article');
    expect(icon).toHaveClass('play-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon.querySelector('svg')).toBeTruthy();
    expect(label).not.toBe(icon);
  });
});

describe('isAuthoredVideo', () => {
  it.each([
    ['Is Video', 'true'],
    ['Show Video Icon', 'yes'],
    ['is-video', '1'],
  ])('is true when %s is %s', (label, value) => {
    const cells = getAuthoredCells(createKeyValueBlock({ [label]: value }));
    expect(isAuthoredVideo(cells)).toBe(true);
  });

  it('is false when the flag is not true', () => {
    const cells = getAuthoredCells(createKeyValueBlock({ 'Is Video': 'false' }));
    expect(isAuthoredVideo(cells)).toBe(false);
  });
});
