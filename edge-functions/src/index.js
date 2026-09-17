import { SecretStoreManager } from './lib/config.js';
import { json, notFound, error } from './lib/response.js';
import { isAllowedOrigin } from './cors.js';
import {
  YOUTUBE_ID_RE,
  fetchCaptionsForVideo,
  getAccessToken,
} from './captions.js';

addEventListener('fetch', (event) => event.respondWith(handleRequest(event)));

/**
 * CORS headers for a request, if the Origin is allowed.
 *
 * @param {Request} request Incoming request
 * @returns {HeadersInit}
 */
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (!isAllowedOrigin(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  };
}

/**
 * Merges CORS onto a response.
 *
 * @param {Response} response Base response
 * @param {Request} request Incoming request
 * @returns {Response}
 */
function withCors(response, request) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(request)).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Handles GET /api/youtube-captions?videoId=.
 *
 * @param {FetchEvent} event Edge fetch event
 * @returns {Promise<Response>}
 */
export async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }), req);
  }

  if (url.pathname !== '/api/youtube-captions' || req.method !== 'GET') {
    return withCors(notFound(), req);
  }

  const videoId = url.searchParams.get('videoId') || '';
  if (!YOUTUBE_ID_RE.test(videoId)) {
    return withCors(notFound(), req);
  }

  try {
    const [clientId, clientSecret, refreshToken] = await Promise.all([
      SecretStoreManager.getSecret('YOUTUBE_OAUTH_CLIENT_ID'),
      SecretStoreManager.getSecret('YOUTUBE_OAUTH_CLIENT_SECRET'),
      SecretStoreManager.getSecret('YOUTUBE_OAUTH_REFRESH_TOKEN'),
    ]);
    const accessToken = await getAccessToken({ clientId, clientSecret, refreshToken });
    const payload = await fetchCaptionsForVideo(videoId, accessToken);
    if (!payload) return withCors(notFound(), req);
    return withCors(json(payload), req);
  } catch {
    return withCors(error(), req);
  }
}
