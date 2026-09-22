import { waitFor, within } from '@testing-library/dom';
import decorate from './video.js';

jest.mock('../../scripts/aem.js', () => ({
  toClassName: (name) => (typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : ''),
  getMetadata: jest.fn(() => ''),
  buildBlock: jest.fn(),
}));

const VIDEO_ID = '1F-5bZC_M7Q';
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

function createBlock(fields) {
  const block = document.createElement('div');
  block.className = 'video';
  Object.entries(fields).forEach(([label, html]) => {
    const row = document.createElement('div');
    row.innerHTML = `<div>${label}</div><div>${html}</div>`;
    block.append(row);
  });
  return block;
}

function youtubeLink(href, text = href) {
  return `<a href="${href}">${text}</a>`;
}

describe('video block', () => {
  beforeEach(() => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    delete window.fetch;
  });
  it('builds a YouTube maxres poster and play control from a watch URL', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      'Custom poster image (optional)': '',
    });

    decorate(block);

    const button = within(block).getByRole('button', { name: `Play YouTube video ${VIDEO_ID}` });
    const img = button.querySelector('img');
    expect(button).toHaveClass('video__poster');
    expect(button.querySelector('.video__media')).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('src', `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`);
    expect(img).toHaveAttribute('alt', '');
    expect(button.querySelector('.play-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(within(block).queryByText('Video article')).toBeNull();
    const status = within(block).getByRole('status');
    expect(status).toHaveTextContent('');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
  });

  it('extracts an ID from a youtu.be URL', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(`https://youtu.be/${VIDEO_ID}`),
    });

    decorate(block);

    expect(block.querySelector('img').src).toContain(`/vi/${VIDEO_ID}/`);
  });

  it('extracts an ID from an embed URL', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(`https://www.youtube.com/embed/${VIDEO_ID}`),
    });

    decorate(block);

    expect(block.querySelector('img').src).toContain(`/vi/${VIDEO_ID}/`);
  });

  it('extracts an ID from a shorts URL', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(`https://www.youtube.com/shorts/${VIDEO_ID}`),
    });

    decorate(block);

    expect(block.querySelector('img').src).toContain(`/vi/${VIDEO_ID}/`);
  });

  it('uses an authored picture when Custom poster image is set', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      'Custom poster image (optional)': '<picture><img src="custom.jpg" alt=""></picture>',
    });

    decorate(block);

    const picture = block.querySelector('picture');
    expect(picture).toBeTruthy();
    expect(picture.querySelector('img')).toHaveAttribute('src', expect.stringContaining('custom.jpg'));
    expect(block.querySelector('img').src).not.toContain('img.youtube.com');
  });

  it('uses the first row that contains media, regardless of the label', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      Image: '<img src="poster.png" alt="">',
    });

    decorate(block);

    expect(block.querySelector('img')).toHaveAttribute('src', expect.stringContaining('poster.png'));
  });

  it('names the play control from custom link text', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL, 'Keynote'),
    });

    decorate(block);

    expect(within(block).getByRole('button', { name: 'Play Keynote' })).toBeTruthy();
    expect(window.fetch).not.toHaveBeenCalled();
  });

  it('uses the YouTube oEmbed title for the play control', async () => {
    window.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'How Creatives are thinking about AI' }),
    });

    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    await waitFor(() => {
      expect(within(block).getByRole('button', {
        name: 'Play How Creatives are thinking about AI',
      })).toBeTruthy();
    });

    const requested = String(window.fetch.mock.calls[0][0]);
    expect(requested).toContain('youtube.com/oembed');
    expect(requested).toContain(VIDEO_ID);

    within(block).getByRole('button', {
      name: 'Play How Creatives are thinking about AI',
    }).click();
    expect(block.querySelector('iframe')).toHaveAttribute(
      'title',
      'How Creatives are thinking about AI',
    );
  });

  it('replaces the poster with a youtube-nocookie iframe on play', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);
    within(block).getByRole('button', { name: `Play YouTube video ${VIDEO_ID}` }).click();

    const iframe = block.querySelector('iframe');
    expect(within(block).queryByRole('button')).toBeNull();
    expect(block.querySelector('.video__player')).toBeTruthy();
    expect(iframe.src).toContain(`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?`);
    expect(iframe.src).not.toContain('autoplay=');
    expect(iframe.src).toContain('rel=0');
    expect(iframe.src).toContain('cc_load_policy=1');
    expect(iframe).toHaveAttribute('title', `YouTube video ${VIDEO_ID}`);
    expect(iframe).toHaveAttribute('allowfullscreen');
    expect(iframe).not.toHaveAttribute('tabindex');
    expect(within(block).getByRole('status')).toHaveTextContent('Video player loaded');
  });

  it('autoplays only when the visitor prefers motion', () => {
    const { matchMedia: originalMatchMedia } = window;
    window.matchMedia = jest.fn((query) => ({
      matches: String(query).includes('no-preference'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    try {
      const block = createBlock({
        'YouTube URL': youtubeLink(WATCH_URL),
      });

      decorate(block);
      within(block).getByRole('button', { name: `Play YouTube video ${VIDEO_ID}` }).click();

      expect(block.querySelector('iframe').src).toContain('autoplay=1');
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('titles the iframe from custom link text', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL, 'Keynote'),
    });

    decorate(block);
    within(block).getByRole('button', { name: 'Play Keynote' }).click();

    expect(block.querySelector('iframe')).toHaveAttribute('title', 'Keynote');
  });

  it('removes the block and logs when the YouTube URL is invalid', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const href = 'https://example.com/not-youtube';
    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    const block = createBlock({
      'YouTube URL': youtubeLink(href),
    });
    wrapper.append(block);

    decorate(block);

    expect(block.parentElement).toBeNull();
    expect(wrapper.contains(block)).toBe(false);
    expect(wrapper.children).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(`video: broken YouTube link (${href})`);
    log.mockRestore();
  });

  it('swaps a tiny YouTube poster to hqdefault.jpg', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    const img = block.querySelector('img');
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 120 });
    img.dispatchEvent(new Event('load'));

    expect(img).toHaveAttribute('src', `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`);
  });

  it('swaps a broken YouTube poster to hqdefault.jpg', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    const img = block.querySelector('img');
    img.dispatchEvent(new Event('error'));

    expect(img).toHaveAttribute('src', `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`);
  });

  it('does not rewrite an authored custom poster on error', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      'Custom poster image (optional)': '<img src="custom.jpg" alt="">',
    });

    decorate(block);

    const img = block.querySelector('img');
    img.dispatchEvent(new Event('error'));

    expect(img.src).toContain('custom.jpg');
    expect(img.src).not.toContain('hqdefault.jpg');
  });

  it('omits the transcript disclosure when the Transcript cell is empty', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      Transcript: '',
    });

    decorate(block);

    expect(block.querySelector('.video__transcript')).toBeNull();
    expect(within(block).queryByText('View transcript')).toBeNull();
  });

  it('omits the transcript disclosure when the Transcript row is missing', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    expect(block.querySelector('.video__transcript')).toBeNull();
  });

  it('builds a closed View transcript disclosure from the authored cell', () => {
    const transcript = 'Hello from the talk.';
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      Transcript: transcript,
    });

    decorate(block);

    const details = within(block).getByRole('group');
    expect(details).toHaveClass('video__transcript');
    expect(details.open).toBe(false);
    expect(within(details).getByText('View transcript')).toBeTruthy();
    expect(details.querySelector('.video__transcript-panel')).toHaveTextContent(transcript);
  });

  it('preserves authored paragraphs and headings in the transcript panel', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      Transcript: '<h2>Chapter</h2><p>First line.</p>',
    });

    decorate(block);

    const panel = block.querySelector('.video__transcript-panel');
    expect(panel.querySelector('h2')).toHaveTextContent('Chapter');
    expect(panel.querySelector('p')).toHaveTextContent('First line.');
  });

  it('keeps the transcript disclosure after play', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      Transcript: '<p>Hello from the talk.</p>',
    });

    decorate(block);
    within(block).getByRole('button', { name: `Play YouTube video ${VIDEO_ID}` }).click();

    expect(block.querySelector('iframe')).toBeTruthy();
    expect(within(block).getByRole('group')).toHaveClass('video__transcript');
    expect(within(block).getByText('View transcript')).toBeTruthy();
    expect(block.querySelector('.video__transcript-panel')).toHaveTextContent('Hello from the talk.');
  });

  it('opens the transcript disclosure on summary click', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
      Transcript: '<p>Hello from the talk.</p>',
    });

    decorate(block);
    within(block).getByText('View transcript').click();

    expect(block.querySelector('.video__transcript').open).toBe(true);
  });
});
