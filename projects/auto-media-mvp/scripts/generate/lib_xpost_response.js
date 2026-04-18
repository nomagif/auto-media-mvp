function now() {
  return new Date().toISOString();
}

function buildXPostErrorResponse(request, code, message, rawResponse, retryable = true) {
  return {
    ok: false,
    version: request?.version || 'v0.1',
    item_id: request?.item?.id || null,
    generated_at: now(),
    error: {
      code,
      message,
      retryable
    },
    meta: {
      prompt_file: request?.prompt_file || 'prompts/x_post.md',
      raw_response: rawResponse ?? null,
      status: 'error'
    }
  };
}

function parseRawXPostResponse(rawText, request) {
  try {
    return JSON.parse(rawText);
  } catch {
    return buildXPostErrorResponse(request, 'INVALID_RESPONSE_JSON', 'Failed to parse x post output as JSON', rawText, true);
  }
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function normalizeParsedXPostResponse(parsed, request, rawText) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return buildXPostErrorResponse(request, 'INVALID_RESPONSE_SHAPE', 'Parsed response is not a JSON object', rawText, true);
  }

  const socialObj = parsed.social && typeof parsed.social === 'object' ? parsed.social : {};
  const xPost = pickFirst(socialObj.x_post, parsed.x_post);
  const itemId = pickFirst(parsed.item_id, parsed.id, request?.item?.id);
  const version = pickFirst(parsed.version, request?.version, 'v0.1');
  const model = pickFirst(parsed.model, request?.target_model, 'GPT');
  const promptFile = pickFirst(parsed?.meta?.prompt_file, request?.prompt_file, 'prompts/x_post.md');
  const generatedAt = pickFirst(parsed.generated_at, now());
  const successLike = parsed.ok === true || parsed.status === 'success';

  if (successLike && itemId && xPost) {
    return {
      ok: true,
      version,
      item_id: itemId,
      model,
      generated_at: generatedAt,
      social: {
        x_post: xPost
      },
      meta: {
        prompt_file: promptFile,
        raw_response: rawText,
        status: 'success'
      }
    };
  }

  if (parsed.ok === false || parsed.status === 'error' || parsed.error) {
    return {
      ok: false,
      version,
      item_id: itemId,
      generated_at: generatedAt,
      error: {
        code: pickFirst(parsed?.error?.code, 'GENERATION_FAILED'),
        message: pickFirst(parsed?.error?.message, parsed.message, 'Unknown x post generation error'),
        retryable: parsed?.error?.retryable ?? true
      },
      meta: {
        prompt_file: promptFile,
        raw_response: rawText,
        status: 'error'
      }
    };
  }

  return buildXPostErrorResponse(request, 'INVALID_RESPONSE_SHAPE', 'Response did not match x post success or error schema', rawText, true);
}

function normalizeXPostResponse(rawText, request) {
  const parsedOrError = parseRawXPostResponse(rawText, request);
  if (parsedOrError && parsedOrError.ok === false && parsedOrError.error?.code === 'INVALID_RESPONSE_JSON') {
    return parsedOrError;
  }
  return normalizeParsedXPostResponse(parsedOrError, request, rawText);
}

module.exports = {
  buildXPostErrorResponse,
  parseRawXPostResponse,
  normalizeParsedXPostResponse,
  normalizeXPostResponse
};
