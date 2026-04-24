const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function appendJsonl(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(value) + '\n', 'utf8');
}

function isoDate(input = new Date()) {
  return new Date(input).toISOString().slice(0, 10);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

module.exports = {
  ensureDir,
  readJson,
  writeJson,
  appendJsonl,
  isoDate,
  sha256,
  slugify
};
