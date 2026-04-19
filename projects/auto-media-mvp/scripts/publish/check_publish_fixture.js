#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const args = { command: null, input: null, expected: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--command' && argv[i + 1]) {
      args.command = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--input' && argv[i + 1]) {
      args.input = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--expected' && argv[i + 1]) {
      args.expected = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function isPlaceholder(value) {
  return typeof value === 'string' && value.startsWith('<') && value.endsWith('>');
}

function compareExpected(expected, actual, currentPath = '$', diffs = []) {
  if (isPlaceholder(expected)) {
    if (expected === '<omitted>') return diffs;
    if (expected === '<iso8601>') {
      if (typeof actual !== 'string' || Number.isNaN(Date.parse(actual))) {
        diffs.push(`${currentPath}: expected iso8601 string`);
      }
      return diffs;
    }
    if (expected === '<number>') {
      if (typeof actual !== 'number') {
        diffs.push(`${currentPath}: expected number`);
      }
      return diffs;
    }
    return diffs;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      diffs.push(`${currentPath}: expected array`);
      return diffs;
    }
    if (expected.length !== actual.length) {
      diffs.push(`${currentPath}: expected array length ${expected.length}, got ${actual.length}`);
      return diffs;
    }
    expected.forEach((value, index) => compareExpected(value, actual[index], `${currentPath}[${index}]`, diffs));
    return diffs;
  }

  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
      diffs.push(`${currentPath}: expected object`);
      return diffs;
    }
    for (const key of Object.keys(expected)) {
      compareExpected(expected[key], actual[key], `${currentPath}.${key}`, diffs);
    }
    return diffs;
  }

  if (expected !== actual) {
    diffs.push(`${currentPath}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
  return diffs;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || !args.input || !args.expected) {
    console.error('Usage: node scripts/publish/check_publish_fixture.js --command <script> --input <json> --expected <json>');
    process.exit(1);
  }

  const scriptPath = path.resolve(ROOT, args.command);
  const inputPath = path.resolve(ROOT, args.input);
  const expectedPath = path.resolve(ROOT, args.expected);

  const stdout = execFileSync('node', [scriptPath, inputPath], { encoding: 'utf8' });
  const actual = JSON.parse(stdout);
  const expected = readJson(expectedPath);
  const diffs = compareExpected(expected, actual);

  if (diffs.length > 0) {
    console.error(JSON.stringify({ ok: false, diffs }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, checked: path.relative(ROOT, expectedPath) }, null, 2));
}

main();
