# YouTube captions edge function

This folder is an [AEM Edge Function](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/edge-functions). It exchanges a Google refresh token for an access token, calls YouTube `captions.list` and `captions.download`, and returns cue JSON. The video block fetches that JSON and logs it in the console. Visitors never sign in.

OAuth secrets live in Cloud Manager. They are not committed to this repository.

## Cloud Manager pipeline

Merging `main` still ships site JavaScript through Edge Delivery. Cloud Manager does not replace that. The Edge Delivery configuration pipeline deploys [`config/cdn.yaml`](../config/cdn.yaml) and [`config/edgeFunctions.yaml`](../config/edgeFunctions.yaml).

Prerequisites:

1. A Cloud Manager program with an Edge Delivery site and a mapped custom domain.
2. This GitHub repository connected to that program.
3. The Deployment Manager role (or equivalent).

Create the pipeline in Cloud Manager: **Pipelines** → **Add Edge Delivery Pipeline**. Point it at this repository, a branch, and code location `config`.

Then add secret pipeline variables (applied on deploy):

| Secret | Purpose |
| --- | --- |
| `YOUTUBE_OAUTH_CLIENT_ID` | Google OAuth client ID |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `YOUTUBE_OAUTH_REFRESH_TOKEN` | Refresh token from the one-time consent step |

Create the secrets before the first pipeline run. `${{YOUTUBE_OAUTH_CLIENT_ID}}` (and the other two names) fail if the secret is missing.

## One-time Google consent

1. In Google Cloud, enable YouTube Data API v3.
2. Create an OAuth client. Add `http://127.0.0.1:8788/oauth/callback` as an authorized redirect URI (the downloaded client JSON currently lists only OAuth Playground).
3. Put the client ID and secret in `edge-functions/.env` (gitignored), then from this folder run:

```sh
node auth.mjs
```

You can also pass the Google client JSON directly:

```sh
node auth.mjs --json /path/to/client_secret.json
```

4. Open the printed URL, authorize with the Google account that owns the videos, and paste the printed refresh token into Cloud Manager **and** into local `fastly.toml` as `YOUTUBE_OAUTH_REFRESH_TOKEN`.

## Local development

Install the Adobe I/O CLI and the Edge Functions plugin, then log in:

```sh
npm install -g @adobe/aio-cli
aio plugins install @adobe/aio-cli-plugin-aem-edge-functions
aio login
aio aem edge-functions setup
```

Copy [`fastly.toml.example`](fastly.toml.example) to `fastly.toml` (gitignored) and fill in the three secret store values, then:

```sh
aio aem edge-functions serve
```

The function listens at `http://127.0.0.1:7676`. On `localhost`, the video block calls that URL automatically. Set Document Authoring metadata `youtube-captions-api` only if you need a different origin.

For local captions without the Adobe I/O CLI, from this folder run:

```sh
node ./dev-server.mjs
```

Then reload `http://localhost:3000/sneaks/example-sneaks-article` and look for `video: captions` in the browser console.

## Deploy

```sh
aio aem edge-functions build
aio aem edge-functions deploy youtube-captions
```

Run the Cloud Manager pipeline so CDN routing and secret bindings exist. Production traffic uses same-origin `GET /api/youtube-captions?videoId=<id>`.

## Request and response

`GET /api/youtube-captions?videoId=<11-character id>`

A `200` body looks like:

```json
{
  "videoId": "1F-5bZC_M7Q",
  "language": "en",
  "trackKind": "standard",
  "cues": [{ "start": 0, "duration": 1.2, "text": "…" }],
  "transcript": "…"
}
```

`cues` keep timing for later on-page display. `transcript` is the same track flattened for reading: auto-generated (ASR) captions repeat and grow, so overlapping lines are merged. YouTube has no separate transcript endpoint — `captions.download` with `tfmt=vtt` is the source.

Missing tracks, invalid IDs, and download failures return `404` with no Google error payload.
