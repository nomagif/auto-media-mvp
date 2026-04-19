const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, 'state');
const PUBLISH_QUEUE_FILE = path.join(STATE_DIR, 'publish_queue.json');

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

function getApprovedQueueItems(queue, filters = {}) {
  const { itemId = null, platform = null } = filters;
  return queue.filter((item) => {
    if (item.status !== 'approved') return false;
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
  getApprovedQueueItems,
  normalizeError,
  now
};
