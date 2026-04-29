#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}
const textFile = arg('--text-file');
const mediaFile = arg('--media-file');
if (!textFile || !mediaFile) throw new Error('Usage: publish_x_with_media.js --text-file <file> --media-file <png>');
const text = fs.readFileSync(textFile, 'utf8').trim();
const mediaData = fs.readFileSync(mediaFile).toString('base64');
if (text.length > 280) throw new Error(`text too long: ${text.length}`);

const auth = {
  apiKey: process.env.X_API_KEY,
  apiSecret: process.env.X_API_SECRET,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET
};
for (const [k, v] of Object.entries(auth)) if (!v) throw new Error(`missing env ${k}`);

function oauthHeader(url, method, data) {
  const oauth = new OAuth({
    consumer: { key: auth.apiKey, secret: auth.apiSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) { return crypto.createHmac('sha1', key).update(baseString).digest('base64'); }
  });
  return oauth.toHeader(oauth.authorize({ url, method, data }, { key: auth.accessToken, secret: auth.accessTokenSecret })).Authorization;
}

async function main() {
  const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
  const uploadData = { media_data: mediaData };
  const uploadBody = new URLSearchParams(uploadData).toString();
  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: oauthHeader(uploadUrl, 'POST', uploadData), 'content-type': 'application/x-www-form-urlencoded' },
    body: uploadBody
  });
  const uploadText = await upload.text();
  let uploadJson; try { uploadJson = JSON.parse(uploadText); } catch { uploadJson = { raw: uploadText }; }
  if (!upload.ok) throw new Error(`media upload failed ${upload.status}: ${uploadText}`);
  const mediaId = uploadJson.media_id_string || String(uploadJson.media_id || '');
  if (!mediaId) throw new Error(`media upload missing media_id: ${uploadText}`);

  const tweetUrl = process.env.X_API_BASE_URL || 'https://api.twitter.com/2/tweets';
  const body = { text, media: { media_ids: [mediaId] } };
  const tweet = await fetch(tweetUrl, {
    method: 'POST',
    headers: { Authorization: oauthHeader(tweetUrl, 'POST'), 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const tweetText = await tweet.text();
  let tweetJson; try { tweetJson = JSON.parse(tweetText); } catch { tweetJson = { raw: tweetText }; }
  if (!tweet.ok) throw new Error(`tweet failed ${tweet.status}: ${tweetText}`);
  console.log(JSON.stringify({ ok: true, media_id: mediaId, response: tweetJson }, null, 2));
}
main().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
