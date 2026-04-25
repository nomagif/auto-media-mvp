const SUMMARY_PROMPT_VERSION = 'v0.1';
const { attachModelPlan } = require('./lib_model_routing');

function buildSummaryInput(bundle) {
  return {
    id: bundle.id,
    source_name: bundle.normalized?.source_name || null,
    source_type: bundle.normalized?.source_type || null,
    title: bundle.normalized?.title || '',
    body: bundle.normalized?.body || '',
    source_url: bundle.source_url,
    draft_markdown: bundle.draft_markdown || '',
    published_at: bundle.normalized?.published_at || null,
    collected_at: bundle.normalized?.collected_at || null
  };
}

function buildSummaryRequest(input) {
  return attachModelPlan({
    job_type: 'summary_generation',
    version: SUMMARY_PROMPT_VERSION,
    requested_at: new Date().toISOString(),
    prompt_file: 'prompts/summarize.md',
    item: input
  }, 'summary');
}

async function generateSummary(request) {
  const input = request.item;
  const title = input.title || input.id;
  const bodyShort = (input.body || '').slice(0, 280);

  return {
    ok: true,
    version: SUMMARY_PROMPT_VERSION,
    item_id: input.id,
    model: request.target_model,
    generated_at: new Date().toISOString(),
    summary: {
      summary_ja: `${title} の要点を日本語で短くまとめるプレースホルダ。`,
      background_ja: `背景説明のプレースホルダ。元データ要約: ${bodyShort}`,
      why_it_matters_ja: '日本語読者にとっての意味をここに入れる。'
    },
    meta: {
      prompt_file: request.prompt_file,
      raw_response: null,
      status: 'placeholder'
    }
  };
}

module.exports = {
  SUMMARY_PROMPT_VERSION,
  buildSummaryInput,
  buildSummaryRequest,
  generateSummary
};
