const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'state');
const LOGS_DIR = path.join(ROOT, 'logs');
const PUBLISH_QUEUE_FILE = path.join(STATE_DIR, 'publish_queue.json');
const PUBLISH_RESULT_LOG_FILE = path.join(LOGS_DIR, 'publish_results.jsonl');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function now() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isPublishQueueEntry(item) {
  return item && typeof item === 'object' && typeof item.item_id === 'string' && typeof item.platform === 'string';
}

function loadPublishQueue() {
  return readJson(PUBLISH_QUEUE_FILE, []).filter(isPublishQueueEntry);
}

function savePublishQueue(queue) {
  writeJson(PUBLISH_QUEUE_FILE, queue);
}

function findQueueItem(queue, itemId, platform) {
  return queue.find((item) => item.item_id === itemId && item.platform === platform);
}

function normalizeError(error) {
  if (!error) return null;
  if (typeof error === 'string') return { message: error };
  return {
    message: error.message || 'unknown error',
    code: error.code || undefined,
    retryable: typeof error.retryable === 'boolean' ? error.retryable : undefined
  };
}

function appendPublishResultLog(result, meta = {}) {
  ensureDir(LOGS_DIR);
  const record = {
    logged_at: now(),
    item_id: result.item_id,
    platform: result.platform,
    status: result.status,
    published_at: result.published_at || null,
    external_post_id: result.external_post_id || null,
    error: normalizeError(result.error),
    meta
  };
  fs.appendFileSync(PUBLISH_RESULT_LOG_FILE, JSON.stringify(record) + '\n', 'utf8');
  return record;
}

function applyPublishResult(queue, result) {
  const item = findQueueItem(queue, result.item_id, result.platform);
  if (!item) {
    throw new Error(`queue item not found: ${result.item_id}:${result.platform}`);
  }

  item.status = result.status;
  item.published_at = result.published_at || null;
  item.external_post_id = result.external_post_id || null;
  item.error = normalizeError(result.error);
  if (Object.prototype.hasOwnProperty.call(item, 'last_error')) {
    delete item.last_error;
  }
  item.updated_at = now();

  return item;
}

function getQueueItemsByStatus(queue, filters = {}) {
  const { itemId = null, platform = null, statuses = ['approved'] } = filters;
  const allowedStatuses = new Set(statuses);

  return queue.filter((item) => {
    if (!allowedStatuses.has(item.status)) return false;
    if (itemId && item.item_id !== itemId) return false;
    if (platform && item.platform !== platform) return false;
    return true;
  });
}

module.exports = {
  ROOT,
  PUBLISH_QUEUE_FILE,
  loadPublishQueue,
  savePublishQueue,
  findQueueItem,
  applyPublishResult,
  appendPublishResultLog,
  getQueueItemsByStatus,
  normalizeError,
  now,
  PUBLISH_RESULT_LOG_FILE
};
