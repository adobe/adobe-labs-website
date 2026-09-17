/**
 * CORS allowlist for the captions edge function.
 *
 * @param {string} origin Request Origin header
 * @returns {boolean}
 */
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'labs.adobe.com') return true;
    return hostname.endsWith('.aem.page') || hostname.endsWith('.aem.live');
  } catch {
    return false;
  }
}
