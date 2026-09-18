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
const DEFAULT_PLAY_LABEL = 'Play YouTube video';
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
 * video ID until the YouTube title is fetched.
 *
 * @param {Element} [urlCell] YouTube URL value cell
 * @param {string} videoId YouTube video ID
 * @returns {string}
 */
function getPlayLabel(urlCell, videoId) {
  if (hasCustomLinkText(urlCell)) return `Play ${getCellText(urlCell)}`;
  return videoId ? `${DEFAULT_PLAY_LABEL} ${videoId}` : DEFAULT_PLAY_LABEL;
}

/**
 * Iframe title derived from the play control name.
 *
 * @param {string} playLabel Button accessible name
 * @returns {string}
 */
function getPlayerTitle(playLabel) {
  return playLabel.replace(/^Play\s+/i, '').trim() || 'YouTube video';
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
 * @returns {object} Authored href, video ID, play label, custom-label flag, poster media, and transcript cell
 */
export function getVideoData(block) {
  const cells = getAuthoredCells(block);
  const urlCell = cells['youtube-url'];
  const href = getCellLinkHref(urlCell) || toSafeHttpUrl(getCellText(urlCell));
  const videoId = getYoutubeId(href);
  return {
    href,
    videoId,
    playLabel: getPlayLabel(urlCell, videoId),
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
 * Fetches the public YouTube title via oEmbed. Returns an empty string on
 * network or payload failure so the play control keeps its fallback name.
 *
 * @param {string} videoId YouTube video ID
 * @returns {Promise<string>}
 */
async function fetchYoutubeTitle(videoId) {
  const url = new URL('https://www.youtube.com/oembed');
  url.searchParams.set('format', 'json');
  url.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
  try {
    const resp = await window.fetch(url);
    if (!resp.ok) return '';
    const payload = await resp.json();
    if (typeof payload.title !== 'string') return '';
    return payload.title.replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

/**
 * Replaces the poster with a privacy-enhanced YouTube iframe and focuses it.
 * Only the stage is replaced so a transcript disclosure stays in the block.
 *
 * @param {Element} block The video block
 * @param {{ videoId: string, playLabel: string }} data
 */
function loadEmbed(block, { videoId, playLabel }) {
  const playerTitle = getPlayerTitle(playLabel);
  const autoplay = !prefersReducedMotion();
  const params = new URLSearchParams({ rel: '0', cc_load_policy: '1' });
  if (autoplay) params.set('autoplay', '1');

  const player = document.createElement('div');
  player.className = 'video__player';

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;
  iframe.title = playerTitle;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('tabindex', '-1');

  const status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  status.textContent = 'Video player loaded';

  player.append(iframe);
  const stage = block.querySelector('.video__stage') || block;
  stage.replaceChildren(player, status);
  iframe.focus();
}

/**
 * Builds poster + play control markup and writes it into `block`.
 *
 * @param {{ videoId: string, playLabel: string, posterMedia: Element|null, transcriptCell?: Element }} data
 * @param {Element} block The video block
 */
function buildVideo(data, block) {
  const { videoId, posterMedia, hasCustomPlayLabel, transcriptCell } = data;
  let { playLabel } = data;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'video__poster';
  button.setAttribute('aria-label', playLabel);

  const media = document.createElement('span');
  media.className = 'video__media';
  media.setAttribute('aria-hidden', 'true');
  media.append(posterMedia || buildYoutubePoster(videoId));
  button.append(media);

  const { icon } = buildPlayIcon();
  button.append(icon);

  button.addEventListener('click', () => {
    loadEmbed(block, { videoId, playLabel });
  });

  const stage = document.createElement('div');
  stage.className = 'video__stage';
  stage.append(button);

  const transcript = buildTranscript(transcriptCell);
  block.replaceChildren(stage);
  if (transcript) block.append(transcript);

  if (hasCustomPlayLabel) return;
  fetchYoutubeTitle(videoId).then((title) => {
    if (!title || !block.contains(button)) return;
    playLabel = `Play ${title}`;
    button.setAttribute('aria-label', playLabel);
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
  console.log(`video: broken YouTube link${href ? ` (${href})` : ''}`);
  const wrapper = block.parentElement;
  block.remove();
  if (wrapper?.classList.contains('video-wrapper') && !wrapper.children.length) {
    wrapper.remove();
  }
}

/**
 * Decorates a video block: a YouTube URL becomes a poster with a play control
 * that swaps in an embedded player on activation. An authored Transcript row
 * becomes a closed “View transcript” disclosure. Unusable URLs are not rendered.
 *
 * @param {Element} block The video block element
 */
export default function decorate(block) {
  if (block.querySelector('.video__poster, .video__player')) return;
  const data = getVideoData(block);
  if (!data.videoId) {
    discardBrokenBlock(block, data.href);
    return;
  }
  buildVideo(data, block);
}
