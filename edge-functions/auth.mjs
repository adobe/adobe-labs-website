#!/usr/bin/env node
/**
 * One-time Google OAuth for YouTube captions.download.
 * Prints a refresh token to paste into Cloud Manager as
 * YOUTUBE_OAUTH_REFRESH_TOKEN.
 *
 * Loads credentials from, in order:
 *   1. YOUTUBE_OAUTH_CLIENT_ID / YOUTUBE_OAUTH_CLIENT_SECRET
 *   2. edge-functions/.env
 *   3. --json <google-client-secret.json>
 */

import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.YOUTUBE_OAUTH_PORT || 8788);
const LOCAL_REDIRECT = `http://127.0.0.1:${PORT}/oauth/callback`;
const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

/**
 * Loads KEY=value pairs from a .env file into process.env without overwriting.
 *
 * @param {string} path Env file path
 */
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  readFileSync(path, 'utf8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  });
}

/**
 * Reads a Google Cloud OAuth client JSON (web or installed).
 *
 * @param {string} path Client secret JSON path
 * @returns {{ clientId: string, clientSecret: string, redirectUris: string[] }}
 */
function loadGoogleClientJson(path) {
  const payload = JSON.parse(readFileSync(path, 'utf8'));
  const client = payload.web || payload.installed || {};
  return {
    clientId: client.client_id || '',
    clientSecret: client.client_secret || '',
    redirectUris: client.redirect_uris || [],
  };
}

loadEnvFile(join(ROOT, '.env'));

const jsonFlag = process.argv.indexOf('--json');
const jsonPath = jsonFlag >= 0
  ? process.argv[jsonFlag + 1]
  : [
    join(ROOT, 'client_secret.json'),
    join(ROOT, '..', '..', 'Downloads', 'client_secret.json'),
  ].find((path) => existsSync(path));

let jsonClient = { clientId: '', clientSecret: '', redirectUris: [] };
if (jsonPath && existsSync(jsonPath)) {
  jsonClient = loadGoogleClientJson(jsonPath);
}

const CLIENT_ID = process.env.YOUTUBE_OAUTH_CLIENT_ID || jsonClient.clientId;
const CLIENT_SECRET = process.env.YOUTUBE_OAUTH_CLIENT_SECRET || jsonClient.clientSecret;

if (!CLIENT_ID || !CLIENT_SECRET) {
  process.stderr.write('Set YOUTUBE_OAUTH_CLIENT_ID and YOUTUBE_OAUTH_CLIENT_SECRET, or pass --json <client_secret.json>.\n');
  process.exit(1);
}

const redirectFromJson = jsonClient.redirectUris.find((uri) => uri.includes('127.0.0.1') || uri.includes('localhost'));
const REDIRECT_URI = process.env.YOUTUBE_OAUTH_REDIRECT_URI || redirectFromJson || LOCAL_REDIRECT;

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

if (REDIRECT_URI !== LOCAL_REDIRECT) {
  process.stderr.write(
    `This OAuth client’s redirect URI is ${REDIRECT_URI}.\n`
    + `Add ${LOCAL_REDIRECT} in Google Cloud Console (APIs & Services → Credentials → the OAuth client), then re-run.\n`,
  );
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', LOCAL_REDIRECT);
  if (url.pathname !== '/oauth/callback') {
    res.writeHead(404);
    res.end();
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Missing code');
    return;
  }
  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const payload = await tokenResp.json();
    if (!payload.refresh_token) {
      throw new Error(payload.error_description || 'No refresh_token in response');
    }
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Refresh token received. You can close this tab.');
    process.stdout.write(`YOUTUBE_OAUTH_REFRESH_TOKEN=${payload.refresh_token}\n`);
  } catch (err) {
    res.writeHead(500);
    res.end('Token exchange failed');
    process.stderr.write(`${err.message}\n`);
  } finally {
    server.close();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`Open this URL and authorize YouTube captions access:\n${authUrl.href}\n`);
});
