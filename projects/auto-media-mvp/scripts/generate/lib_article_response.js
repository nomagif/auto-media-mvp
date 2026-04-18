function now() {
  return new Date().toISOString();
}

function buildArticleErrorResponse(request, code, message, rawResponse, retryable = true) {
  return {
    ok: false,
    version: request?.version || 'v0.1',
    item_id: request?.item?.id || null,
    generated_at: now(),
    error: { code, message, retryable },
    meta: {
      prompt_file: request?.prompt_file || 'prompts/article.md',
      raw_response: rawResponse ?? null,
      status: 'error'
    }
  };
}

function parseRawArticleResponse(rawText, request) {
  try {
    return JSON.parse(rawText);
  } catch {
    return buildArticleErrorResponse(request, 'INVALID_RESPONSE_JSON', 'Failed to parse article output as JSON', rawText, true);
  }
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function normalizeParsedArticleResponse(parsed, request, rawText) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return buildArticleErrorResponse(request, 'INVALID_RESPONSE_SHAPE', 'Parsed response is not a JSON object', rawText, true);
  }

  const articleObj = parsed.article && typeof parsed.article === 'object' ? parsed.article : {};
  const title = pickFirst(articleObj.title, parsed.title);
  const lead = pickFirst(articleObj.lead, parsed.lead);
  const sections = Array.isArray(articleObj.sections) ? articleObj.sections : [];
  const closing = pickFirst(articleObj.closing, parsed.closing, '');
  const itemId = pickFirst(parsed.item_id, parsed.id, request?.item?.id);
  const version = pickFirst(parsed.version, request?.version, 'v0.1');
  const model = pickFirst(parsed.model, request?.target_model, 'GPT');
  const promptFile = pickFirst(parsed?.meta?.prompt_file, request?.prompt_file, 'prompts/article.md');
  const generatedAt = pickFirst(parsed.generated_at, now());
  const successLike = parsed.ok === true || parsed.status === 'success';

  if (successLike && itemId && title && lead && sections.length > 0) {
    return {
      ok: true,
      version,
      item_id: itemId,
      model,
      generated_at: generatedAt,
      article: { title, lead, sections, closing },
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
        message: pickFirst(parsed?.error?.message, parsed.message, 'Unknown article generation error'),
        retryable: parsed?.error?.retryable ?? true
      },
      meta: {
        prompt_file: promptFile,
        raw_response: rawText,
        status: 'error'
      }
    };
  }

  return buildArticleErrorResponse(request, 'INVALID_RESPONSE_SHAPE', 'Response did not match article success or error schema', rawText, true);
}

function normalizeArticleResponse(rawText, request) {
  const parsedOrError = parseRawArticleResponse(rawText, request);
  if (parsedOrError && parsedOrError.ok === false && parsedOrError.error?.code === 'INVALID_RESPONSE_JSON') {
    return parsedOrError;
  }
  return normalizeParsedArticleResponse(parsedOrError, request, rawText);
}

module.exports = {
  buildArticleErrorResponse,
  parseRawArticleResponse,
  normalizeParsedArticleResponse,
  normalizeArticleResponse
};
