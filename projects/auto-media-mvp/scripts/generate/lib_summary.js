const SUMMARY_PROMPT_VERSION = 'v0.1';

function buildSummaryInput(bundle) {
  return {
    id: bundle.id,
    source_name: bundle.normalized?.source_name || null,
    source_type: bundle.normalized?.source_type || null,
    title: bundle.normalized?.title || '',
    body: bundle.normalized?.body || '',
    source_url: bundle.source_url,
    draft_markdown: bundle.draft_markdown || ''
  };
}

async function generateSummary(input) {
  const title = input.title || input.id;
  const bodyShort = (input.body || '').slice(0, 280);

  return {
    summary_ja: `${title} の要点を日本語で短くまとめるプレースホルダ。`,
    background_ja: `背景説明のプレースホルダ。元データ要約: ${bodyShort}`,
    why_it_matters_ja: '日本語読者にとっての意味をここに入れる。',
    meta: {
      prompt_version: SUMMARY_PROMPT_VERSION,
      model: 'GPT',
      generated_at: new Date().toISOString(),
      raw_response: null,
      status: 'placeholder'
    }
  };
}

module.exports = {
  SUMMARY_PROMPT_VERSION,
  buildSummaryInput,
  generateSummary
};
