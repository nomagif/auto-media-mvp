function now() { return new Date().toISOString(); }

function buildImagePromptErrorResponse(request, code, message, rawResponse, retryable = true) {
  return {
    ok: false,
    version: request?.version || 'v0.1',
    item_id: request?.item?.id || null,
    generated_at: now(),
    error: { code, message, retryable },
    meta: {
      prompt_file: request?.prompt_file || 'prompts/image_prompt.md',
      raw_response: rawResponse ?? null,
      status: 'error'
    }
  };
}

function parseRawImagePromptResponse(rawText, request) {
  try { return JSON.parse(rawText); }
  catch { return buildImagePromptErrorResponse(request, 'INVALID_RESPONSE_JSON', 'Failed to parse image prompt output as JSON', rawText, true); }
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function normalizeParsedImagePromptResponse(parsed, request, rawText) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return buildImagePromptErrorResponse(request, 'INVALID_RESPONSE_SHAPE', 'Parsed response is not a JSON object', rawText, true);
  }

  const imageObj = parsed.image && typeof parsed.image === 'object' ? parsed.image : {};
  const imagePrompt = pickFirst(imageObj.image_prompt, parsed.image_prompt);
  const itemId = pickFirst(parsed.item_id, parsed.id, request?.item?.id);
  const version = pickFirst(parsed.version, request?.version, 'v0.1');
  const model = pickFirst(parsed.model, request?.target_model, 'GPT');
  const promptFile = pickFirst(parsed?.meta?.prompt_file, request?.prompt_file, 'prompts/image_prompt.md');
  const generatedAt = pickFirst(parsed.generated_at, now());
  const successLike = parsed.ok === true || parsed.status === 'success';

  if (successLike && itemId && imagePrompt) {
    return {
      ok: true,
      version,
      item_id: itemId,
      model,
      generated_at: generatedAt,
      image: { image_prompt: imagePrompt },
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
        message: pickFirst(parsed?.error?.message, parsed.message, 'Unknown image prompt generation error'),
        retryable: parsed?.error?.retryable ?? true
      },
      meta: {
        prompt_file: promptFile,
        raw_response: rawText,
        status: 'error'
      }
    };
  }

  return buildImagePromptErrorResponse(request, 'INVALID_RESPONSE_SHAPE', 'Response did not match image prompt success or error schema', rawText, true);
}

function normalizeImagePromptResponse(rawText, request) {
  const parsedOrError = parseRawImagePromptResponse(rawText, request);
  if (parsedOrError && parsedOrError.ok === false && parsedOrError.error?.code === 'INVALID_RESPONSE_JSON') return parsedOrError;
  return normalizeParsedImagePromptResponse(parsedOrError, request, rawText);
}

module.exports = {
  buildImagePromptErrorResponse,
  parseRawImagePromptResponse,
  normalizeParsedImagePromptResponse,
  normalizeImagePromptResponse
};
