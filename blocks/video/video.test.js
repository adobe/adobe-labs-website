import { waitFor, within } from '@testing-library/dom';
import decorate, { getAdobeVideoId } from './video.js';

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

    const button = within(block).getByRole('button', { name: `Play video ${VIDEO_ID}` });
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

  it('leaves an authored size variant class untouched', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL),
    });
    block.classList.add('lg');

    decorate(block);

    expect(block).toHaveClass('video', 'lg');
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

    expect(within(block).getByRole('button', { name: 'Play video: Keynote' })).toBeTruthy();
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
        name: 'Play video: How Creatives are thinking about AI',
      })).toBeTruthy();
    });

    const requested = String(window.fetch.mock.calls[0][0]);
    expect(requested).toContain('youtube.com/oembed');
    expect(requested).toContain(VIDEO_ID);

    within(block).getByRole('button', {
      name: 'Play video: How Creatives are thinking about AI',
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
    within(block).getByRole('button', { name: `Play video ${VIDEO_ID}` }).click();

    const iframe = block.querySelector('iframe');
    expect(within(block).queryByRole('button')).toBeNull();
    expect(block.querySelector('.video__player')).toBeTruthy();
    expect(iframe.src).toContain(`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?`);
    expect(iframe.src).toContain('autoplay=1');
    expect(iframe.src).toContain('rel=0');
    expect(iframe.src).toContain('cc_load_policy=1');
    expect(iframe).toHaveAttribute('title', `video ${VIDEO_ID}`);
    expect(iframe.allow).toContain('fullscreen');
    expect(iframe).not.toHaveAttribute('allowfullscreen');
    expect(iframe).not.toHaveAttribute('tabindex');
    expect(within(block).getByRole('status')).toHaveTextContent('Video player loaded');
  });

  it('titles the iframe from custom link text', () => {
    const block = createBlock({
      'YouTube URL': youtubeLink(WATCH_URL, 'Keynote'),
    });

    decorate(block);
    within(block).getByRole('button', { name: 'Play video: Keynote' }).click();

    expect(block.querySelector('iframe')).toHaveAttribute('title', 'Keynote');
  });

  it('removes the block and logs when the YouTube URL is invalid', () => {
    const log = jest.spyOn(console, 'warn').mockImplementation(() => {});
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
    expect(log).toHaveBeenCalledWith(
      `Video block: contains a broken video link (${href}). Skipped rendering of the block.`,
    );
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
    within(block).getByRole('button', { name: `Play video ${VIDEO_ID}` }).click();

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

  describe('Adobe Video Publishing Cloud', () => {
    const ADOBE_ID = '3503885';
    const ADOBE_URL = `https://video.tv.adobe.com/v/${ADOBE_ID}/`;
    const OEMBED_THUMB = 'https://images-tv.adobe.com/mpcv3/1024/3503885/poster-1920x1080.jpg';

    it.each([
      [`https://video.tv.adobe.com/v/${ADOBE_ID}`, ADOBE_ID],
      [`https://video.tv.adobe.com/v/${ADOBE_ID}/`, ADOBE_ID],
      [`https://video.tv.adobe.com/v/${ADOBE_ID}?hidetitle=true`, ADOBE_ID],
      [`https://video.tv.adobe.com/v/${ADOBE_ID}/?quality=12&learn=on`, ADOBE_ID],
      [`https://video.tv.adobe.com/v/${ADOBE_ID}/embed`, ADOBE_ID],
      [`http://video.tv.adobe.com/v/${ADOBE_ID}/`, ADOBE_ID],
      ['https://VIDEO.TV.ADOBE.COM/v/17417', '17417'],
      ['https://video.tv.adobe.com/v/3477418t1/?hidetitle=true', '3477418t1'],
    ])('extracts an ID from %s', (href, expected) => {
      expect(getAdobeVideoId(href)).toBe(expected);
    });

    it.each([
      `https://tv.adobe.com/embed/${ADOBE_ID}/`,
      'https://video.tv.adobe.com/v/abc/',
      'https://video.tv.adobe.com/oembed?url=3503885',
      `https://example.com/v/${ADOBE_ID}/`,
      `ftp://video.tv.adobe.com/v/${ADOBE_ID}/`,
      '',
    ])('rejects %s', (href) => {
      expect(getAdobeVideoId(href)).toBe('');
    });

    it('builds an Adobe poster and play control from a video URL', () => {
      const block = createBlock({ 'Video URL': youtubeLink(ADOBE_URL) });

      decorate(block);

      const button = within(block).getByRole('button', { name: `Play video ${ADOBE_ID}` });
      expect(button.querySelector('img')).toHaveAttribute(
        'src',
        `https://video.tv.adobe.com/v/${ADOBE_ID}?format=jpeg`,
      );
    });

    it('accepts a plain-text URL', () => {
      const block = createBlock({ 'Video URL': ADOBE_URL });

      decorate(block);

      expect(within(block).getByRole('button', { name: `Play video ${ADOBE_ID}` })).toBeTruthy();
    });

    it('uses the Adobe oEmbed title and hi-res thumbnail', async () => {
      window.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ title: 'Adobe Labs, Trust your own eyes', thumbnail_url: OEMBED_THUMB }),
      });
      const block = createBlock({ 'Video URL': youtubeLink(ADOBE_URL) });

      decorate(block);

      await waitFor(() => {
        expect(within(block).getByRole('button', {
          name: 'Play video: Adobe Labs, Trust your own eyes',
        })).toBeTruthy();
      });
      expect(block.querySelector('img')).toHaveAttribute('src', OEMBED_THUMB);
      const requested = String(window.fetch.mock.calls[0][0]);
      expect(requested).toContain('https://video.tv.adobe.com/oembed?');
      expect(requested).toContain(encodeURIComponent(`https://video.tv.adobe.com/v/${ADOBE_ID}/`));
    });

    it('ignores an oEmbed thumbnail from another host', async () => {
      window.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ title: 'Clip', thumbnail_url: 'https://evil.example/x.jpg' }),
      });
      const block = createBlock({ 'Video URL': youtubeLink(ADOBE_URL) });

      decorate(block);

      await waitFor(() => {
        expect(within(block).getByRole('button', { name: 'Play video: Clip' })).toBeTruthy();
      });
      expect(block.querySelector('img').src).toContain('?format=jpeg');
    });

    it('fetches oEmbed for the poster even with custom link text', async () => {
      window.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ title: 'Ignored', thumbnail_url: OEMBED_THUMB }),
      });
      const block = createBlock({ 'Video URL': youtubeLink(ADOBE_URL, 'Keynote') });

      decorate(block);

      await waitFor(() => {
        expect(block.querySelector('img')).toHaveAttribute('src', OEMBED_THUMB);
      });
      expect(within(block).getByRole('button', { name: 'Play video: Keynote' })).toBeTruthy();
    });

    it('does not fetch oEmbed with custom link text and an authored poster', () => {
      const block = createBlock({
        'Video URL': youtubeLink(ADOBE_URL, 'Keynote'),
        'Custom poster image (optional)': '<picture><img src="/poster.jpg" alt=""></picture>',
      });

      decorate(block);

      expect(block.querySelector('img')).toHaveAttribute('src', '/poster.jpg');
      expect(window.fetch).not.toHaveBeenCalled();
    });

    it('replaces the poster with an Adobe player iframe on play', () => {
      const block = createBlock({ 'Video URL': youtubeLink(ADOBE_URL) });

      decorate(block);
      within(block).getByRole('button', { name: `Play video ${ADOBE_ID}` }).click();

      const iframe = block.querySelector('iframe');
      const src = new URL(iframe.src);
      expect(`${src.origin}${src.pathname}`).toBe(`https://video.tv.adobe.com/v/${ADOBE_ID}/`);
      expect(src.searchParams.get('hidetitle')).toBe('1');
      expect(src.searchParams.get('captions')).toBe('1');
      expect(src.searchParams.get('autoplay')).toBe('1');
      expect(iframe.allow).toContain('autoplay');
      expect(iframe.allow).toContain('fullscreen');
      expect(iframe).not.toHaveAttribute('allowfullscreen');
      expect(iframe).toHaveAttribute('title', `video ${ADOBE_ID}`);
      expect(within(block).getByRole('status')).toHaveTextContent('Video player loaded');
    });

    it('keeps authored player params and the tracking suffix', () => {
      const block = createBlock({
        'Video URL': youtubeLink('https://video.tv.adobe.com/v/3477418t1?t=30&hidetitle=false&autoplay=0'),
      });

      decorate(block);
      block.querySelector('button').click();

      const src = new URL(block.querySelector('iframe').src);
      expect(src.pathname).toBe('/v/3477418t1/');
      expect(src.searchParams.get('t')).toBe('30');
      expect(src.searchParams.get('hidetitle')).toBe('false');
      expect(src.searchParams.get('autoplay')).toBe('1');
    });
  });
});
