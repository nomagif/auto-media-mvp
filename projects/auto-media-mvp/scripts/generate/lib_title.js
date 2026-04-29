const TITLE_PROMPT_VERSION = 'v0.1';
const { attachModelPlan } = require('./lib_model_routing');

function buildTitleInput(item) {
  return {
    id: item.id,
    source_name: item.source_name || null,
    source_type: item.source_type || null,
    source_url: item.source_url || null,
    title_original: item.title_original || item.title || '',
    summary_ja: item.summary_ja || '',
    background_ja: item.background_ja || '',
    why_it_matters_ja: item.why_it_matters_ja || ''
  };
}

function buildTitleRequest(input) {
  return attachModelPlan({
    job_type: 'title_generation',
    version: TITLE_PROMPT_VERSION,
    requested_at: new Date().toISOString(),
    prompt_file: 'prompts/title_candidates.md',
    item: input
  }, 'title');
}

async function generateTitleCandidates(request) {
  const original = request.item.title_original || request.item.id;
  const summary = request.item.summary_ja || '';
  const lead = summary.split(/。|\n/).find(Boolean) || original;
  const originalShort = original.length > 28 ? `${original.slice(0, 28).trim()}…` : original;
  return {
    ok: true,
    version: TITLE_PROMPT_VERSION,
    item_id: request.item.id,
    model: request.target_model,
    generated_at: new Date().toISOString(),
    titles: {
      candidates: [
        `${lead.slice(0, 14)}…を整理`,
        `${originalShort} の要点`,
        `${originalShort} が示す動き`
      ].map((s) => String(s).replace(/…+$/, ''))
    },
    meta: {
      prompt_file: request.prompt_file,
      raw_response: null,
      status: 'heuristic'
    }
  };
}

module.exports = {
  TITLE_PROMPT_VERSION,
  buildTitleInput,
  buildTitleRequest,
  generateTitleCandidates
};
