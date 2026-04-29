#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(path.join(__dirname, '..', '.env'));
loadDotEnv(path.join(__dirname, '..', '.env.local'));

function arg(name) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; }
const text = (arg('--text') || (arg('--text-file') ? fs.readFileSync(arg('--text-file'), 'utf8') : '')).trim();
const mediaFile = arg('--media-file');
if (!text) throw new Error('post text is required: --text or --text-file');
if (text.length > 280) throw new Error(`post exceeds 280 chars: ${text.length}`);

const auth = {
  apiKey: process.env.X_AFFILIATE_API_KEY,
  apiSecret: process.env.X_AFFILIATE_API_SECRET,
  accessToken: process.env.X_AFFILIATE_ACCESS_TOKEN,
  accessTokenSecret: process.env.X_AFFILIATE_ACCESS_TOKEN_SECRET
};
for (const [name, value] of Object.entries(auth)) if (!value) throw new Error(`Missing ${name}. Use X_AFFILIATE_* env vars.`);

function oauthHeader(url, method, data) {
  const oauth = new OAuth({
    consumer: { key: auth.apiKey, secret: auth.apiSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) { return crypto.createHmac('sha1', key).update(baseString).digest('base64'); }
  });
  return oauth.toHeader(oauth.authorize({ url, method, data }, { key: auth.accessToken, secret: auth.accessTokenSecret })).Authorization;
}

async function uploadMedia(file) {
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  const data = { media_data: fs.readFileSync(file).toString('base64') };
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: oauthHeader(uploadUrl, 'POST', data),
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(data).toString()
  });
  const body = await response.text();
  let json; try { json = JSON.parse(body); } catch { json = { raw: body }; }
  if (!response.ok) throw new Error(`media upload failed ${response.status}: ${body}`);
  const mediaId = json.media_id_string || String(json.media_id || '');
  if (!mediaId) throw new Error(`media upload missing media_id: ${body}`);
  return mediaId;
}

(async () => {
  const mediaId = mediaFile ? await uploadMedia(mediaFile) : null;
  const url = 'https://api.twitter.com/2/tweets';
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader(url, 'POST'), 'content-type': 'application/json' },
    body: JSON.stringify(mediaId ? { text, media: { media_ids: [mediaId] } } : { text })
  });
  const body = await response.text();
  let json; try { json = JSON.parse(body); } catch { json = { raw: body }; }
  console.log(JSON.stringify({ ok: response.ok, status: response.status, response: json }, null, 2));
  if (!response.ok) process.exitCode = 1;
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
