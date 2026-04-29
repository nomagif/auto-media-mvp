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

loadDotEnv(path.join(__dirname, '.env'));
loadDotEnv(path.join(__dirname, '.env.local'));
loadDotEnv(path.join(__dirname, '..', '.env'));
loadDotEnv(path.join(__dirname, '..', '.env.local'));

const url = 'https://api.twitter.com/2/users/me';
const auth = {
  apiKey: process.env.X_AFFILIATE_API_KEY,
  apiSecret: process.env.X_AFFILIATE_API_SECRET,
  accessToken: process.env.X_AFFILIATE_ACCESS_TOKEN,
  accessTokenSecret: process.env.X_AFFILIATE_ACCESS_TOKEN_SECRET
};
for (const [name, value] of Object.entries(auth)) {
  if (!value) throw new Error(`Missing ${name}. Set X_AFFILIATE_* env vars first.`);
}

const oauth = new OAuth({
  consumer: { key: auth.apiKey, secret: auth.apiSecret },
  signature_method: 'HMAC-SHA1',
  hash_function(baseString, key) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
  }
});
const header = oauth.toHeader(oauth.authorize({ url, method: 'GET' }, { key: auth.accessToken, secret: auth.accessTokenSecret })).Authorization;

fetch(url, { headers: { Authorization: header } })
  .then(async (response) => {
    const text = await response.text();
    console.log(response.status, text);
    if (!response.ok) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
