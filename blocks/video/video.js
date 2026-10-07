import {
  buildPlayIcon,
  getAuthoredCells,
  getCellLinkHref,
  getCellMedia,
  getCellText,
  toSafeHttpUrl,
} from '../../scripts/utils/utils.js';

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_POSTER_PLACEHOLDER_WIDTH = 120;
const ADOBE_VIDEO_ORIGIN = 'https://video.tv.adobe.com';
const ADOBE_VIDEO_HOST = 'video.tv.adobe.com';
const ADOBE_POSTER_HOST = 'images-tv.adobe.com';
/** Numeric ID with an optional registered tracking suffix, e.g. 3477418t1. */
const ADOBE_VIDEO_PATH_REGEX = /^\/v\/(\d+(?:t\d+)?)(?:\/|$)/;
const DEFAULT_PLAY_LABEL = 'Play video';
const TRANSCRIPT_LABEL = 'View transcript';
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Extracts an 11-character YouTube video ID from a URL.
 * Supports watch, youtu.be, embed, and shorts URLs.
 *
 * @param {string} href Candidate URL
 * @returns {string} Video ID, or an empty string
 */
export function getYoutubeId(href) {
  if (!href) return '';
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';

    if (host === 'youtu.be') {
      [id] = url.pathname.split('/').filter(Boolean);
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') || '';
      if (!id) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
          [, id] = parts;
        }
      }
    }

    return YOUTUBE_ID_RE.test(id) ? id : '';
  } catch {
    return '';
  }
}

/**
 * Extracts an Adobe Video Publishing Cloud ID from a video.tv.adobe.com URL.
 * Supports /v/{id}, /v/{id}/, extra path segments, query strings, and the
 * t{n} tracking suffix, which is kept because it is part of a valid embed URL.
 *
 * @param {string} href Candidate URL
 * @returns {string} Video ID such as `3503885` or `3477418t1`, or an empty string
 */
export function getAdobeVideoId(href) {
  if (!href) return '';
  try {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (url.hostname.toLowerCase() !== ADOBE_VIDEO_HOST) return '';
    return url.pathname.match(ADOBE_VIDEO_PATH_REGEX)?.[1] || '';
  } catch {
    return '';
  }
}

/**
 * Identifies the video provider and ID for an authored URL.
 *
 * @param {string} href Candidate URL
 * @returns {{ provider: 'youtube'|'adobe', id: string, params: URLSearchParams }|null}
 * Provider, video ID, and the author's query params; null when unsupported
 */
export function getVideoSource(href) {
  const youtubeId = getYoutubeId(href);
  if (youtubeId) return { provider: 'youtube', id: youtubeId, params: new URLSearchParams() };
  const adobeId = getAdobeVideoId(href);
  if (adobeId) return { provider: 'adobe', id: adobeId, params: new URL(href).searchParams };
  return null;
}

/**
 * Whether the URL cell has human link text rather than the raw URL.
 *
 * @param {Element} [urlCell] YouTube URL value cell
 * @returns {boolean}
 */
function hasCustomLinkText(urlCell) {
  const href = getCellLinkHref(urlCell);
  const text = getCellText(urlCell);
  return Boolean(text) && text !== href && !/^https?:\/\//i.test(text);
}

/**
 * Accessible play-control name from the authored URL cell.
 * Uses custom link text when it is not the raw URL; otherwise includes the
 * video ID until the oEmbed title is fetched.
 *
 * @param {Element} [urlCell] Video URL value cell
 * @param {string} videoId Video ID
 * @returns {string}
 */
function getPlayLabel(urlCell, videoId) {
  if (hasCustomLinkText(urlCell)) return `Play video: ${getCellText(urlCell)}`;
  return videoId ? `${DEFAULT_PLAY_LABEL} ${videoId}` : DEFAULT_PLAY_LABEL;
}

/**
 * Iframe title derived from the play control name.
 *
 * @param {string} playLabel Button accessible name
 * @returns {string}
 */
function getPlayerTitle(playLabel) {
  return playLabel.replace(/^Play\s+/i, '').trim() || 'video';
}

/**
 * Whether motion should be reduced. Unknown or unsupported preference is
 * treated as reduced until `prefers-reduced-motion: no-preference` matches.
 *
 * @returns {boolean}
 */
function prefersReducedMotion() {
  if (typeof window.matchMedia !== 'function') return true;
  return !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

/**
 * YouTube thumbnail URL for a video ID.
 *
 * @param {string} id YouTube video ID
 * @param {'maxresdefault'|'hqdefault'} [quality='maxresdefault']
 * @returns {string}
 */
function youtubePosterUrl(id, quality = 'maxresdefault') {
  return `https://img.youtube.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
}

/**
 * First picture or img in the block that is not in the YouTube URL cell.
 *
 * @param {Element} block The video block
 * @param {Element} [urlCell] YouTube URL value cell to skip
 * @returns {Element|null}
 */
function getAuthoredPosterMedia(block, urlCell) {
  return [...block.children]
    .flatMap((row) => [...row.children])
    .filter((cell) => cell !== urlCell)
    .map(getCellMedia)
    .find(Boolean) || null;
}

/**
 * Reads authored key/value rows from a video block.
 *
 * @param {Element} block The block element
 * @returns {object} Authored href, video source and ID, play label,
 * custom-label flag, poster media, and transcript cell
 */
export function getVideoData(block) {
  const cells = getAuthoredCells(block);
  const urlCell = cells['video-url'] ?? cells['youtube-url'];
  const href = getCellLinkHref(urlCell) || toSafeHttpUrl(getCellText(urlCell));
  const source = getVideoSource(href);
  return {
    href,
    source,
    videoId: source?.id || '',
    playLabel: getPlayLabel(urlCell, source?.id),
    hasCustomPlayLabel: hasCustomLinkText(urlCell),
    posterMedia: getAuthoredPosterMedia(block, urlCell),
    transcriptCell: cells.transcript,
  };
}

/**
 * 10px right-pointing chevron for the transcript disclosure.
 *
 * @returns {HTMLSpanElement}
 */
function buildTranscriptChevron() {
  const wrap = document.createElement('span');
  wrap.className = 'video__transcript-icon';
  wrap.setAttribute('aria-hidden', 'true');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  svg.setAttribute('width', '10');
  svg.setAttribute('height', '10');
  svg.setAttribute('focusable', 'false');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute(
    'd',
    'M3.25 1.22a.75.75 0 0 1 1.06 0l3.47 3.47a.75.75 0 0 1 0 1.06L4.31 9.22a.75.75 0 1 1-1.06-1.06L6.19 5.22 3.25 2.28a.75.75 0 0 1 0-1.06z',
  );
  svg.append(path);
  wrap.append(svg);
  return wrap;
}

/**
 * Quiet “View transcript” disclosure from the authored Transcript cell.
 * Closed by default. Omits when the cell is empty.
 *
 * @param {Element} [cell] Transcript value cell
 * @returns {HTMLDetailsElement|null}
 */
function buildTranscript(cell) {
  if (!getCellText(cell)) return null;

  const details = document.createElement('details');
  details.className = 'video__transcript';

  const summary = document.createElement('summary');
  summary.append(buildTranscriptChevron(), document.createTextNode(TRANSCRIPT_LABEL));

  const panel = document.createElement('div');
  panel.className = 'video__transcript-panel';
  panel.append(...cell.childNodes);

  details.append(summary, panel);
  return details;
}

/**
 * YouTube CDN poster that falls back to hqdefault when maxres is missing.
 *
 * @param {string} videoId YouTube video ID
 * @returns {HTMLImageElement}
 */
function buildYoutubePoster(videoId) {
  const img = document.createElement('img');
  img.src = youtubePosterUrl(videoId);
  img.alt = '';
  img.width = 1280;
  img.height = 720;
  img.decoding = 'async';
  img.loading = 'lazy';

  let fallbackApplied = false;
  const useHqDefault = () => {
    if (fallbackApplied) return;
    fallbackApplied = true;
    img.src = youtubePosterUrl(videoId, 'hqdefault');
  };

  img.addEventListener('error', useHqDefault);
  img.addEventListener('load', () => {
    if (img.naturalWidth <= YOUTUBE_POSTER_PLACEHOLDER_WIDTH) useHqDefault();
  });

  return img;
}

/**
 * Adobe Video Publishing Cloud poster. The `format=jpeg` frame is small, so it
 * is shown first and upgraded from oEmbed `thumbnail_url` when available.
 *
 * @param {string} videoId Adobe video ID
 * @returns {HTMLImageElement}
 */
function buildAdobePoster(videoId) {
  const img = document.createElement('img');
  img.src = `${ADOBE_VIDEO_ORIGIN}/v/${encodeURIComponent(videoId)}?format=jpeg`;
  img.alt = '';
  img.width = 1280;
  img.height = 720;
  img.decoding = 'async';
  img.loading = 'lazy';
  return img;
}

/**
 * Adobe oEmbed thumbnail URL, only when it is an https image on the Adobe
 * video image CDN.
 *
 * @param {unknown} value Candidate thumbnail URL from oEmbed
 * @returns {string}
 */
function getAdobeThumbnailUrl(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === ADOBE_POSTER_HOST ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * Per-provider poster, oEmbed endpoint, and iframe settings.
 */
const PROVIDERS = {
  youtube: {
    buildPoster: buildYoutubePoster,
    oembedUrl(id) {
      const url = new URL('https://www.youtube.com/oembed');
      url.searchParams.set('format', 'json');
      url.searchParams.set('url', `https://www.youtube.com/watch?v=${id}`);
      return url;
    },
    embedSrc(id, authorParams, autoplay) {
      const params = new URLSearchParams({ rel: '0', cc_load_policy: '1' });
      if (autoplay) params.set('autoplay', '1');
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`;
    },
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
  },
  adobe: {
    buildPoster: buildAdobePoster,
    oembedUrl(id) {
      const url = new URL(`${ADOBE_VIDEO_ORIGIN}/oembed`);
      url.searchParams.set('format', 'json');
      url.searchParams.set('url', `${ADOBE_VIDEO_ORIGIN}/v/${id}/`);
      return url;
    },
    embedSrc(id, authorParams, autoplay) {
      // Keep authored player options (e.g. t, learn); autoplay follows motion prefs.
      const params = new URLSearchParams(authorParams);
      if (!params.has('hidetitle')) params.set('hidetitle', '1');
      if (!params.has('captions')) params.set('captions', '1');
      params.delete('autoplay');
      if (autoplay) params.set('autoplay', '1');
      return `${ADOBE_VIDEO_ORIGIN}/v/${encodeURIComponent(id)}/?${params}`;
    },
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
  },
};

/**
 * Fetches public oEmbed metadata. Returns empty fields on network or payload
 * failure so the play control and poster keep their fallbacks.
 *
 * @param {URL} url oEmbed endpoint URL
 * @returns {Promise<{ title: string, thumbnailUrl: unknown }>}
 */
async function fetchOembed(url) {
  const empty = { title: '', thumbnailUrl: '' };
  try {
    const resp = await window.fetch(url);
    if (!resp.ok) return empty;
    const payload = await resp.json();
    return {
      title: typeof payload.title === 'string' ? payload.title.replace(/\s+/g, ' ').trim() : '',
      thumbnailUrl: payload.thumbnail_url,
    };
  } catch {
    return empty;
  }
}

/**
 * Visually hidden live region used to announce player load.
 *
 * @returns {HTMLParagraphElement}
 */
function buildStatus() {
  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  return status;
}

/**
 * Replaces the poster with the provider's iframe (privacy-enhanced for
 * YouTube) and focuses it. Only the stage is replaced so a transcript
 * disclosure stays in the block.
 *
 * @param {Element} block The video block
 * @param {{ source: object, playLabel: string }} data
 */
function loadEmbed(block, { source, playLabel }) {
  const provider = PROVIDERS[source.provider];
  // Autoplay only when the visitor has not asked for reduced motion.
  const autoplay = !prefersReducedMotion();

  const player = document.createElement('div');
  player.className = 'video__player';

  // Provider-specific player iframe.
  const iframe = document.createElement('iframe');
  iframe.src = provider.embedSrc(source.id, source.params, autoplay);
  iframe.title = getPlayerTitle(playLabel);
  iframe.allow = provider.allow;
  iframe.setAttribute('allowfullscreen', '');
  if (source.provider === 'adobe') iframe.setAttribute('scrolling', 'no');

  // Announce the load to screen readers.
  const status = block.querySelector('[role="status"]') || buildStatus();
  status.textContent = 'Video player loaded';

  // Swap the poster for the player, keeping the transcript in place.
  player.append(iframe);
  const stage = block.querySelector('.video__stage');
  if (stage) {
    stage.replaceChildren(player);
    if (!block.contains(status)) stage.after(status);
  } else {
    block.replaceChildren(player, status);
  }
  // Move focus into the player so keyboard users can control it.
  iframe.focus();
}

/**
 * Builds poster + play control markup and writes it into `block`.
 *
 * @param {object} data Authored video fields including optional transcript cell
 * @param {Element} block The video block
 */
function buildVideo(data, block) {
  const {
    source, posterMedia, hasCustomPlayLabel, transcriptCell,
  } = data;
  let { playLabel } = data;
  const provider = PROVIDERS[source.provider];
  // Use authored poster if it exists; otherwise use the provider's thumbnail.
  const poster = posterMedia || provider.buildPoster(source.id);

  // Poster button that loads the player on click.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video__poster';
  button.setAttribute('aria-label', playLabel);

  // Decorative poster image; the button label names the video.
  const media = document.createElement('span');
  media.className = 'video__media';
  media.setAttribute('aria-hidden', 'true');
  media.append(poster);
  button.append(media);

  const { icon } = buildPlayIcon();
  button.append(icon);

  button.addEventListener('click', () => {
    loadEmbed(block, { source, playLabel });
  });

  // Write stage, live region, and optional transcript into the block.
  const stage = document.createElement('div');
  stage.className = 'video__stage';
  stage.append(button);

  const transcript = buildTranscript(transcriptCell);
  block.replaceChildren(stage, buildStatus());
  if (transcript) block.append(transcript);

  // Fetch oEmbed data only when it's needed; when the label or poster
  // image size can be improved.
  const canUpgradePoster = source.provider === 'adobe' && !posterMedia;
  if (hasCustomPlayLabel && !canUpgradePoster) return;

  fetchOembed(provider.oembedUrl(source.id)).then(({ title, thumbnailUrl }) => {
    // Skip if the player already replaced the poster.
    if (!block.contains(button)) return;
    // Name the button with the video's real title.
    if (title && !hasCustomPlayLabel) {
      playLabel = `Play video: ${title}`;
      button.setAttribute('aria-label', playLabel);
    }
    // Swap the small Adobe poster for the hi-res thumbnail.
    const hiResPoster = canUpgradePoster && getAdobeThumbnailUrl(thumbnailUrl);
    if (hiResPoster) poster.src = hiResPoster;
  });
}

/**
 * Removes an unusable video block and its empty wrapper.
 *
 * @param {Element} block The video block element
 * @param {string} [href] Authored URL, if any
 */
function discardBrokenBlock(block, href) {
  // eslint-disable-next-line no-console
  console.warn(`Video block: contains a broken video link${href ? ` (${href})` : ''}. Skipped rendering of the block.`);
  const wrapper = block.parentElement;
  block.remove();
  if (wrapper?.classList.contains('video-wrapper') && !wrapper.children.length) {
    wrapper.remove();
  }
}

/**
 * Decorates a video block: a YouTube or Adobe Video Publishing Cloud
 * (video.tv.adobe.com) URL becomes a poster with a play control that swaps in
 * an embedded player on activation. An authored Transcript row becomes a
 * closed “View transcript” disclosure. Unusable URLs are not rendered.
 *
 * @param {Element} block The video block element
 */
export default function decorate(block) {
  if (block.querySelector('.video__poster, .video__player')) return;
  const data = getVideoData(block);
  if (!data.source) {
    discardBrokenBlock(block, data.href);
    return;
  }
  buildVideo(data, block);
}
