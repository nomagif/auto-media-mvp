const IMAGE_PROMPT_VERSION = 'v0.1';
const { attachModelPlan } = require('./lib_model_routing');

function buildImagePromptInput(item) {
  return {
    id: item.id,
    source_name: item.source_name || null,
    source_type: item.source_type || null,
    source_url: item.source_url || null,
    summary_ja: item.summary_ja || '',
    background_ja: item.background_ja || '',
    why_it_matters_ja: item.why_it_matters_ja || '',
    article_title: item.article_title || ''
  };
}

function buildImagePromptRequest(input) {
  return attachModelPlan({
    job_type: 'image_prompt_generation',
    version: IMAGE_PROMPT_VERSION,
    requested_at: new Date().toISOString(),
    prompt_file: 'prompts/image_prompt.md',
    item: input
  }, 'image_prompt');
}

async function generateImagePrompt(request) {
  const seed = request.item.article_title || request.item.summary_ja || request.item.id;
  return {
    ok: true,
    version: IMAGE_PROMPT_VERSION,
    item_id: request.item.id,
    model: request.target_model,
    generated_at: new Date().toISOString(),
    image: {
      image_prompt: `${seed}, tech editorial illustration, clean infographic, high contrast, minimal text, modern composition`
    },
    meta: {
      prompt_file: request.prompt_file,
      raw_response: null,
      status: 'placeholder'
    }
  };
}

module.exports = {
  IMAGE_PROMPT_VERSION,
  buildImagePromptInput,
  buildImagePromptRequest,
  generateImagePrompt
};
