import {
  fetchCaptionsForVideo,
  getAccessToken,
  pickCaptionTracks,
  resetAccessTokenCache,
  trackScore,
} from './captions.js';
import { isAllowedOrigin } from './cors.js';

describe('pickCaptionTracks', () => {
  it('prefers serving English standard tracks over ASR', () => {
    const items = [
      { id: 'asr', snippet: { language: 'en', trackKind: 'asr', status: 'serving' } },
      { id: 'std', snippet: { language: 'en', trackKind: 'standard', status: 'serving' } },
      { id: 'fr', snippet: { language: 'fr', trackKind: 'standard', status: 'serving' } },
    ];
    expect(pickCaptionTracks(items).map((item) => item.id)).toEqual(['std', 'asr', 'fr']);
  });

  it('scores English serving tracks above others', () => {
    expect(trackScore({ language: 'en-US', trackKind: 'standard', status: 'serving' }))
      .toBeGreaterThan(trackScore({ language: 'de', trackKind: 'standard', status: 'serving' }));
  });
});

describe('getAccessToken', () => {
  afterEach(() => {
    resetAccessTokenCache();
  });

  it('caches the access token until expiry', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'tok-1', expires_in: 3600 }),
    });
    const creds = {
      clientId: 'id',
      clientSecret: 'secret',
      refreshToken: 'refresh',
      fetchImpl,
    };
    await expect(getAccessToken(creds)).resolves.toBe('tok-1');
    await expect(getAccessToken(creds)).resolves.toBe('tok-1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('fetchCaptionsForVideo', () => {
  it('tries the next track when download returns 403', async () => {
    const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello';
    const fetchImpl = jest.fn(async (input) => {
      const href = String(input);
      if (href.includes('/captions?') || href.endsWith('/captions')) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: 'blocked', snippet: { language: 'en', trackKind: 'standard', status: 'serving' } },
              { id: 'ok', snippet: { language: 'en', trackKind: 'asr', status: 'serving' } },
            ],
          }),
        };
      }
      if (href.includes('/blocked')) {
        return { ok: false, text: async () => '' };
      }
      return { ok: true, text: async () => vtt };
    });

    const payload = await fetchCaptionsForVideo('1F-5bZC_M7Q', 'token', fetchImpl);
    expect(payload).toMatchObject({
      videoId: '1F-5bZC_M7Q',
      language: 'en',
      trackKind: 'asr',
      transcript: 'Hello',
    });
    expect(payload.cues[0].text).toBe('Hello');
  });

  it('returns null when the list request fails', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(fetchCaptionsForVideo('1F-5bZC_M7Q', 'token', fetchImpl)).resolves.toBeNull();
  });
});

describe('isAllowedOrigin', () => {
  it('allows labs, localhost, and AEM preview hosts', () => {
    expect(isAllowedOrigin('https://labs.adobe.com')).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('https://main--adobe-labs-website--adobe.aem.page')).toBe(true);
  });

  it('rejects unknown hosts', () => {
    expect(isAllowedOrigin('https://example.com')).toBe(false);
    expect(isAllowedOrigin('')).toBe(false);
  });
});
