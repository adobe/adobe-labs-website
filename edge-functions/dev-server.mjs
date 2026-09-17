#!/usr/bin/env node
/**
 * Local captions proxy for `aem up` (no Adobe I/O CLI required).
 * Serves GET /api/youtube-captions?videoId= on http://127.0.0.1:7676
 * using the same YouTube OAuth helpers as the edge function.
 *
 * Usage: node ./dev-server.mjs
 */

import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  YOUTUBE_ID_RE,
  fetchCaptionsForVideo,
  getAccessToken,
} from './src/captions.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const HOST = '127.0.0.1';
const PORT = Number(process.env.CAPTIONS_DEV_PORT || 7676);

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
 * Reads a Fastly local secret_stores data value.
 *
 * @param {string} toml Fastly.toml contents
 * @param {string} key Secret key
 * @returns {string}
 */
function secretFromFastly(toml, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = toml.match(new RegExp(`key = "${escaped}"\\s+data = "([^"]+)"`));
  return match ? match[1] : '';
}

loadEnvFile(join(ROOT, '.env'));
const fastlyPath = join(ROOT, 'fastly.toml');
if (existsSync(fastlyPath)) {
  const toml = readFileSync(fastlyPath, 'utf8');
  ['YOUTUBE_OAUTH_CLIENT_ID', 'YOUTUBE_OAUTH_CLIENT_SECRET', 'YOUTUBE_OAUTH_REFRESH_TOKEN']
    .forEach((key) => {
      if (!process.env[key]) process.env[key] = secretFromFastly(toml, key);
    });
}

const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID || '';
const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET || '';
const refreshToken = process.env.YOUTUBE_OAUTH_REFRESH_TOKEN || '';

if (!clientId || !clientSecret || !refreshToken || refreshToken === 'replace-me') {
  process.stderr.write('Set YOUTUBE_OAUTH_CLIENT_ID, YOUTUBE_OAUTH_CLIENT_SECRET, and YOUTUBE_OAUTH_REFRESH_TOKEN in .env or fastly.toml.\n');
  process.exit(1);
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  if (url.pathname !== '/api/youtube-captions' || req.method !== 'GET') {
    res.writeHead(404, cors);
    res.end();
    return;
  }
  const videoId = url.searchParams.get('videoId') || '';
  if (!YOUTUBE_ID_RE.test(videoId)) {
    res.writeHead(404, cors);
    res.end();
    return;
  }
  try {
    const accessToken = await getAccessToken({ clientId, clientSecret, refreshToken });
    const payload = await fetchCaptionsForVideo(videoId, accessToken);
    if (!payload) {
      res.writeHead(404, { ...cors, 'Content-Type': 'application/json' });
      res.end();
      return;
    }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    res.writeHead(500, cors);
    res.end();
  }
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`Captions proxy http://${HOST}:${PORT}/api/youtube-captions\n`);
});
