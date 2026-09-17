/**
 * YouTube Data API v3 captions helpers. No Fastly imports so unit tests can
 * run this module with Jest.
 */

import { cuesToTranscript, parseVtt } from './vtt.js';

export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAPTIONS_LIST_URL = 'https://www.googleapis.com/youtube/v3/captions';
const TOKEN_EXPIRY_SKEW_MS = 60000;

let cachedToken = '';
let cachedTokenExpiresAt = 0;

/**
 * Rank a caption track. Higher is better.
 *
 * @param {object} snippet YouTube caption snippet
 * @returns {number}
 */
export function trackScore(snippet = {}) {
  let score = 0;
  if (snippet.status === 'serving') score += 8;
  const lang = String(snippet.language || '').toLowerCase();
  if (lang === 'en' || lang.startsWith('en-')) score += 4;
  if (snippet.trackKind === 'standard') score += 2;
  else if (snippet.trackKind === 'asr') score += 1;
  return score;
}

/**
 * Caption tracks ordered from most to least preferred.
 *
 * @param {object[]} items `captions.list` items
 * @returns {object[]}
 */
export function pickCaptionTracks(items) {
  return [...(items || [])]
    .filter((item) => item?.id && item.snippet)
    .sort((a, b) => trackScore(b.snippet) - trackScore(a.snippet));
}

/**
 * Exchanges a refresh token for an access token. Caches until near expiry.
 *
 * @param {{ clientId: string, clientSecret: string, refreshToken: string, fetchImpl?: typeof fetch }} creds
 * @returns {Promise<string>}
 */
export async function getAccessToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = fetch,
}) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const resp = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error('token request failed');
  const payload = await resp.json();
  if (typeof payload.access_token !== 'string' || !payload.access_token) {
    throw new Error('token missing');
  }
  cachedToken = payload.access_token;
  const expiresInMs = Number(payload.expires_in || 3600) * 1000;
  cachedTokenExpiresAt = Date.now() + Math.max(0, expiresInMs - TOKEN_EXPIRY_SKEW_MS);
  return cachedToken;
}

/**
 * Clears the cached access token. Used by tests.
 */
export function resetAccessTokenCache() {
  cachedToken = '';
  cachedTokenExpiresAt = 0;
}

/**
 * Downloads one caption track as VTT and parses cues.
 *
 * @param {object} track A captions.list item
 * @param {string} accessToken OAuth access token
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<object[]>}
 */
async function downloadTrackCues(track, accessToken, fetchImpl) {
  const downloadUrl = new URL(`${CAPTIONS_LIST_URL}/${encodeURIComponent(track.id)}`);
  downloadUrl.searchParams.set('tfmt', 'vtt');
  const downloadResp = await fetchImpl(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!downloadResp.ok) return [];
  return parseVtt(await downloadResp.text());
}

/**
 * Downloads the best available caption track as cue JSON.
 *
 * @param {string} videoId YouTube video ID
 * @param {string} accessToken OAuth access token
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ videoId: string, language: string, trackKind: string, cues: object[], transcript: string }|null>}
 */
export async function fetchCaptionsForVideo(videoId, accessToken, fetchImpl = fetch) {
  const listUrl = new URL(CAPTIONS_LIST_URL);
  listUrl.searchParams.set('part', 'snippet');
  listUrl.searchParams.set('videoId', videoId);
  const listResp = await fetchImpl(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listResp.ok) return null;
  const listPayload = await listResp.json();
  const tracks = pickCaptionTracks(listPayload.items);

  return tracks.reduce(async (pending, track) => {
    const found = await pending;
    if (found) return found;
    const cues = await downloadTrackCues(track, accessToken, fetchImpl);
    if (!cues.length) return null;
    return {
      videoId,
      language: track.snippet.language || 'en',
      trackKind: track.snippet.trackKind || 'standard',
      cues,
      transcript: cuesToTranscript(cues),
    };
  }, Promise.resolve(null));
}
