function now() {
  return new Date().toISOString();
}

function buildSummaryErrorResponse(request, code, message, rawResponse, retryable = true) {
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
      prompt_file: request?.prompt_file || 'prompts/summarize.md',
      raw_response: rawResponse ?? null,
      status: 'error'
    }
  };
}

function parseRawSummaryResponse(rawText, request) {
  try {
    return JSON.parse(rawText);
  } catch {
    return buildSummaryErrorResponse(
      request,
      'INVALID_RESPONSE_JSON',
      'Failed to parse subagent output as JSON',
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

function extraMeta(parsed) {
  const meta = parsed?.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
  const { prompt_file, raw_response, status, ...rest } = meta;
  return rest;
}

function normalizeParsedSummaryResponse(parsed, request, rawText) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return buildSummaryErrorResponse(
      request,
      'INVALID_RESPONSE_SHAPE',
      'Parsed response is not a JSON object',
      rawText,
      true
    );
  }

  const summaryObj = parsed.summary && typeof parsed.summary === 'object' ? parsed.summary : {};
  const summary_ja = pickFirst(summaryObj.summary_ja, parsed.summary_ja);
  const background_ja = pickFirst(summaryObj.background_ja, parsed.background_ja);
  const why_it_matters_ja = pickFirst(summaryObj.why_it_matters_ja, parsed.why_it_matters_ja);
  const itemId = pickFirst(parsed.item_id, parsed.id, request?.item?.id);
  const version = pickFirst(parsed.version, request?.version, 'v0.1');
  const model = pickFirst(parsed.model, request?.target_model, 'GPT');
  const promptFile = pickFirst(parsed?.meta?.prompt_file, request?.prompt_file, 'prompts/summarize.md');
  const generatedAt = pickFirst(parsed.generated_at, now());
  const successLike = parsed.ok === true || parsed.status === 'success';

  if (successLike && itemId && summary_ja) {
    return {
      ok: true,
      version,
      item_id: itemId,
      model,
      generated_at: generatedAt,
      summary: {
        summary_ja,
        background_ja: background_ja || '',
        why_it_matters_ja: why_it_matters_ja || ''
      },
      meta: {
        prompt_file: promptFile,
        raw_response: rawText,
        status: 'success',
        ...extraMeta(parsed)
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
        message: pickFirst(parsed?.error?.message, parsed.message, 'Unknown generation error'),
        retryable: parsed?.error?.retryable ?? true
      },
      meta: {
        prompt_file: promptFile,
        raw_response: rawText,
        status: 'error',
        ...extraMeta(parsed)
      }
    };
  }

  return buildSummaryErrorResponse(
    request,
    'INVALID_RESPONSE_SHAPE',
    'Response did not match success or error schema',
    rawText,
    true
  );
}

function normalizeSummaryResponse(rawText, request) {
  const parsedOrError = parseRawSummaryResponse(rawText, request);
  if (parsedOrError && parsedOrError.ok === false && parsedOrError.error?.code === 'INVALID_RESPONSE_JSON') {
    return parsedOrError;
  }
  return normalizeParsedSummaryResponse(parsedOrError, request, rawText);
}

module.exports = {
  buildSummaryErrorResponse,
  parseRawSummaryResponse,
  normalizeParsedSummaryResponse,
  normalizeSummaryResponse
};
