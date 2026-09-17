import { waitFor, within } from '@testing-library/dom';
import { getMetadata } from '../../scripts/aem.js';
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
const CAPTIONS_PAYLOAD = {
  videoId: VIDEO_ID,
  language: 'en',
  trackKind: 'standard',
  cues: [{ start: 0, duration: 1.2, text: 'Hello from captions' }],
};

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

function isOembedUrl(value) {
  return String(value).includes('youtube.com/oembed');
}

function isCaptionsUrl(value) {
  return String(value).includes('/api/youtube-captions')
    || String(value).includes('youtube-captions');
}

function mockFetch({ oembed, captions } = {}) {
  window.fetch = jest.fn((input) => {
    const href = String(input);
    if (isOembedUrl(href)) {
      return Promise.resolve({
        ok: Boolean(oembed?.ok),
        json: async () => oembed?.json || {},
      });
    }
    if (isCaptionsUrl(href)) {
      return Promise.resolve({
        ok: Boolean(captions?.ok),
        status: captions?.status ?? (captions?.ok ? 200 : 500),
        json: async () => captions?.json || {},
      });
    }
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
}

describe('video block', () => {
  let warn;

  beforeEach(() => {
    getMetadata.mockReturnValue('');
    mockFetch();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    delete window.fetch;
    warn.mockRestore();
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
    expect(window.fetch.mock.calls.every(([url]) => !isOembedUrl(url))).toBe(true);
    expect(window.fetch.mock.calls.some(([url]) => isCaptionsUrl(url))).toBe(true);
  });

  it('uses the YouTube oEmbed title for the play control', async () => {
    mockFetch({
      oembed: { ok: true, json: { title: 'How Creatives are thinking about AI' } },
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

    const requested = window.fetch.mock.calls.map(([url]) => String(url));
    expect(requested.some((url) => isOembedUrl(url) && url.includes(VIDEO_ID))).toBe(true);

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
    expect(window.fetch).not.toHaveBeenCalled();
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

  it('logs captions when the captions API returns cues', async () => {
    mockFetch({ captions: { ok: true, json: CAPTIONS_PAYLOAD } });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(`video: captions (${VIDEO_ID})`, 'Hello from captions');
    });
    expect(log).toHaveBeenCalledWith(`video: captions cues (${VIDEO_ID})`, {
      ...CAPTIONS_PAYLOAD,
      transcript: 'Hello from captions',
    });
    const requested = window.fetch.mock.calls.map(([url]) => String(url));
    expect(requested.some((url) => url.startsWith('http://127.0.0.1:7676/api/youtube-captions') && url.includes(VIDEO_ID))).toBe(true);
    expect(within(block).getByRole('button', { name: `Play YouTube video ${VIDEO_ID}` })).toBeTruthy();
    log.mockRestore();
  });

  it('logs a flattened transcript for overlapping ASR cues', async () => {
    mockFetch({
      captions: {
        ok: true,
        json: {
          videoId: VIDEO_ID,
          language: 'en',
          trackKind: 'asr',
          cues: [
            { start: 2, duration: 2.3, text: 'Hello friends, Randy here. I am showing' },
            { start: 4.3, duration: 0.01, text: 'Hello friends, Randy here. I am showing' },
            { start: 4.32, duration: 4.63, text: 'Hello friends, Randy here. I am showing a video of the parallax effects um for' },
            { start: 8.95, duration: 0.01, text: 'a video of the parallax effects um for' },
            { start: 8.96, duration: 2.23, text: 'a video of the parallax effects um for Adobe Labs.' },
          ],
        },
      },
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        `video: captions (${VIDEO_ID})`,
        'Hello friends, Randy here. I am showing a video of the parallax effects um for Adobe Labs.',
      );
    });
    log.mockRestore();
  });

  it('stays silent when the captions API returns no cues', async () => {
    mockFetch({ captions: { ok: true, json: { videoId: VIDEO_ID, cues: [] } } });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    await waitFor(() => {
      expect(window.fetch.mock.calls.some(([url]) => isCaptionsUrl(url))).toBe(true);
    });
    expect(log.mock.calls.every(([message]) => !String(message).startsWith('video: captions'))).toBe(true);
    log.mockRestore();
  });

  it('stays silent when the captions API responds with an error', async () => {
    mockFetch({ captions: { ok: false } });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    await waitFor(() => {
      expect(window.fetch.mock.calls.some(([url]) => isCaptionsUrl(url))).toBe(true);
    });
    expect(log.mock.calls.every(([message]) => !String(message).startsWith('video: captions'))).toBe(true);
    log.mockRestore();
  });

  it('stays silent when the captions API responds with 404', async () => {
    mockFetch({ captions: { ok: false, status: 404 } });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    await waitFor(() => {
      expect(window.fetch.mock.calls.some(([url]) => isCaptionsUrl(url))).toBe(true);
    });
    expect(log.mock.calls.every(([message]) => !String(message).startsWith('video: captions'))).toBe(true);
    expect(warn).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('uses youtube-captions-api metadata as the captions endpoint', async () => {
    getMetadata.mockImplementation((name) => (
      name === 'youtube-captions-api' ? 'http://127.0.0.1:7676/api/youtube-captions' : ''
    ));
    mockFetch({ captions: { ok: true, json: CAPTIONS_PAYLOAD } });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });

    decorate(block);

    await waitFor(() => {
      expect(log).toHaveBeenCalledWith(`video: captions (${VIDEO_ID})`, 'Hello from captions');
    });
    expect(getMetadata).toHaveBeenCalledWith('youtube-captions-api');
    const requested = window.fetch.mock.calls.map(([url]) => String(url));
    expect(requested.some((url) => url.startsWith('http://127.0.0.1:7676/api/youtube-captions') && url.includes(VIDEO_ID))).toBe(true);
    log.mockRestore();
  });
});
