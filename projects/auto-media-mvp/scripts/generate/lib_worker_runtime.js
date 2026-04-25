const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function taskEnvKey(taskName) {
  return `WORKER_${String(taskName || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_EXECUTOR_CMD`;
}

function resolveExecutorCommand(taskName) {
  return process.env[taskEnvKey(taskName)] || process.env.WORKER_EXECUTOR_CMD || '';
}

function mapRetryReason(response) {
  const code = String(response?.error?.code || '').trim().toUpperCase();
  if (code === 'INVALID_RESPONSE_JSON') return 'invalid_json';
  if (code === 'INVALID_RESPONSE_SHAPE') return 'schema_mismatch';
  if (code === 'EMPTY_RESPONSE') return 'empty_output';
  return null;
}

function shouldRetry(response, request, attemptIndex, models) {
  if (response?.ok) return false;
  if (attemptIndex >= models.length - 1) return false;
  if (response?.error?.retryable === false) return false;

  const retryOn = Array.isArray(request?.model_plan?.retry_on)
    ? request.model_plan.retry_on
    : ['invalid_json', 'schema_mismatch', 'empty_output'];

  const reason = mapRetryReason(response);
  return Boolean(reason && retryOn.includes(reason));
}

function buildAttemptRequest(request, model, attemptIndex, models) {
  return {
    ...request,
    target_model: model,
    model_plan: {
      ...(request.model_plan || {}),
      active_model: model,
      attempt_index: attemptIndex,
      attempted_models: models.slice(0, attemptIndex + 1),
      available_models: models
    }
  };
}

function writeTempRequestFile(taskName, request) {
  const file = path.join(os.tmpdir(), `auto-media-mvp-${taskName}-${request?.item?.id || 'unknown'}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(request, null, 2) + '\n', 'utf8');
  return file;
}

function executeCommand(command, env) {
  return spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env
    },
    maxBuffer: 10 * 1024 * 1024
  });
}

function attachAttemptMeta(response, details) {
  const meta = response?.meta && typeof response.meta === 'object' ? response.meta : {};
  return {
    ...response,
    meta: {
      ...meta,
      execution: details
    }
  };
}

function runModelPlanTask({
  taskName,
  request,
  rawFile,
  normalizeResponse,
  buildErrorResponse,
  notImplementedMessage
}) {
  if (rawFile) {
    const rawText = fs.readFileSync(path.resolve(rawFile), 'utf8');
    return normalizeResponse(rawText, request);
  }

  const command = resolveExecutorCommand(taskName);
  if (!command) {
    return buildErrorResponse(request, 'NOT_IMPLEMENTED', notImplementedMessage, null, true);
  }

  const models = [
    request?.model_plan?.primary_model || request?.target_model,
    ...(Array.isArray(request?.model_plan?.fallback_models) ? request.model_plan.fallback_models : [])
  ].filter(Boolean);

  let lastResponse = null;

  for (let attemptIndex = 0; attemptIndex < models.length; attemptIndex += 1) {
    const model = models[attemptIndex];
    const attemptRequest = buildAttemptRequest(request, model, attemptIndex, models);
    const tempRequestFile = writeTempRequestFile(taskName, attemptRequest);

    try {
      const result = executeCommand(command, {
        WORKER_TASK: taskName,
        WORKER_MODEL: model,
        WORKER_REQUEST_FILE: tempRequestFile,
        WORKER_ATTEMPT_INDEX: String(attemptIndex),
        WORKER_ATTEMPT_COUNT: String(models.length)
      });

      const rawText = (result.stdout || '').trim();
      const stderr = (result.stderr || '').trim();

      let response;
      if (result.error) {
        response = buildErrorResponse(attemptRequest, 'EXECUTION_FAILED', result.error.message, stderr || null, true);
      } else if (result.status !== 0) {
        response = buildErrorResponse(attemptRequest, 'EXECUTION_FAILED', stderr || `Executor exited with status ${result.status}`, rawText || stderr || null, true);
      } else if (!rawText) {
        response = buildErrorResponse(attemptRequest, 'EMPTY_RESPONSE', 'Executor returned empty stdout', stderr || null, true);
      } else {
        response = normalizeResponse(rawText, attemptRequest);
      }

      response = attachAttemptMeta(response, {
        task: taskName,
        command,
        model,
        attempt_index: attemptIndex,
        attempted_models: models.slice(0, attemptIndex + 1),
        exit_code: result.status,
        stderr: stderr || null,
        used_executor: true
      });

      lastResponse = response;
      if (!shouldRetry(response, attemptRequest, attemptIndex, models)) {
        return response;
      }
    } finally {
      try { fs.unlinkSync(tempRequestFile); } catch {}
    }
  }

  return lastResponse || buildErrorResponse(request, 'EXECUTION_FAILED', 'Executor did not produce a response', null, true);
}

module.exports = {
  ensureDir,
  runModelPlanTask
};
