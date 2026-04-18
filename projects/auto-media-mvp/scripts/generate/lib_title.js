const TITLE_PROMPT_VERSION = 'v0.1';

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
  return {
    job_type: 'title_generation',
    version: TITLE_PROMPT_VERSION,
    requested_at: new Date().toISOString(),
    target_model: 'GPT',
    prompt_file: 'prompts/title_candidates.md',
    item: input
  };
}

async function generateTitleCandidates(request) {
  const original = request.item.title_original || request.item.id;
  return {
    ok: true,
    version: TITLE_PROMPT_VERSION,
    item_id: request.item.id,
    model: request.target_model,
    generated_at: new Date().toISOString(),
    titles: {
      candidates: [
        `${original} を3分で振り返る`,
        `${original} の要点を整理`,
        `${original} が意味するもの`
      ]
    },
    meta: {
      prompt_file: request.prompt_file,
      raw_response: null,
      status: 'placeholder'
    }
  };
}

module.exports = {
  TITLE_PROMPT_VERSION,
  buildTitleInput,
  buildTitleRequest,
  generateTitleCandidates
};
