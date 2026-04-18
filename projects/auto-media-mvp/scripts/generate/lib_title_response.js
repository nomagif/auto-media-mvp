function now() {
  return new Date().toISOString();
}

function buildTitleErrorResponse(request, code, message, rawResponse, retryable = true) {
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
      prompt_file: request?.prompt_file || 'prompts/title_candidates.md',
      raw_response: rawResponse ?? null,
      status: 'error'
    }
  };
}

function parseRawTitleResponse(rawText, request) {
  try {
    return JSON.parse(rawText);
  } catch {
    return buildTitleErrorResponse(
      request,
      'INVALID_RESPONSE_JSON',
      'Failed to parse title output as JSON',
      rawText,
      true
    );
  }
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function normalizeParsedTitleResponse(parsed, request, rawText) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return buildTitleErrorResponse(
      request,
      'INVALID_RESPONSE_SHAPE',
      'Parsed response is not a JSON object',
      rawText,
      true
    );
  }

  const titlesObj = parsed.titles && typeof parsed.titles === 'object' ? parsed.titles : {};
  const candidates = Array.isArray(titlesObj.candidates)
    ? titlesObj.candidates
    : Array.isArray(parsed.candidates)
      ? parsed.candidates
      : [];

  const itemId = pickFirst(parsed.item_id, parsed.id, request?.item?.id);
  const version = pickFirst(parsed.version, request?.version, 'v0.1');
  const model = pickFirst(parsed.model, request?.target_model, 'GPT');
  const promptFile = pickFirst(parsed?.meta?.prompt_file, request?.prompt_file, 'prompts/title_candidates.md');
  const generatedAt = pickFirst(parsed.generated_at, now());
  const successLike = parsed.ok === true || parsed.status === 'success';

  if (successLike && itemId && candidates.length > 0) {
    return {
      ok: true,
      version,
      item_id: itemId,
      model,
      generated_at: generatedAt,
      titles: {
        candidates
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
        message: pickFirst(parsed?.error?.message, parsed.message, 'Unknown title generation error'),
        retryable: parsed?.error?.retryable ?? true
      },
      meta: {
        prompt_file: promptFile,
        raw_response: rawText,
        status: 'error'
      }
    };
  }

  return buildTitleErrorResponse(
    request,
    'INVALID_RESPONSE_SHAPE',
    'Response did not match title success or error schema',
    rawText,
    true
  );
}

function normalizeTitleResponse(rawText, request) {
  const parsedOrError = parseRawTitleResponse(rawText, request);
  if (parsedOrError && parsedOrError.ok === false && parsedOrError.error?.code === 'INVALID_RESPONSE_JSON') {
    return parsedOrError;
  }
  return normalizeParsedTitleResponse(parsedOrError, request, rawText);
}

module.exports = {
  buildTitleErrorResponse,
  parseRawTitleResponse,
  normalizeParsedTitleResponse,
  normalizeTitleResponse
};
