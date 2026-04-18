const XPOST_PROMPT_VERSION = 'v0.1';

function buildXPostInput(item) {
  return {
    id: item.id,
    source_name: item.source_name || null,
    source_type: item.source_type || null,
    source_url: item.source_url || null,
    summary_ja: item.summary_ja || '',
    background_ja: item.background_ja || '',
    why_it_matters_ja: item.why_it_matters_ja || ''
  };
}

function buildXPostRequest(input) {
  return {
    job_type: 'x_post_generation',
    version: XPOST_PROMPT_VERSION,
    requested_at: new Date().toISOString(),
    target_model: 'GPT',
    prompt_file: 'prompts/x_post.md',
    item: input
  };
}

async function generateXPost(request) {
  const summary = request.item.summary_ja || request.item.id;
  return {
    ok: true,
    version: XPOST_PROMPT_VERSION,
    item_id: request.item.id,
    model: request.target_model,
    generated_at: new Date().toISOString(),
    social: {
      x_post: `${summary} 日本語読者向けに要点を短く整理した投稿文のプレースホルダ。`
    },
    meta: {
      prompt_file: request.prompt_file,
      raw_response: null,
      status: 'placeholder'
    }
  };
}

module.exports = {
  XPOST_PROMPT_VERSION,
  buildXPostInput,
  buildXPostRequest,
  generateXPost
};
