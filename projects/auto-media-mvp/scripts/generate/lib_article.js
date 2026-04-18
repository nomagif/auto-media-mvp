const ARTICLE_PROMPT_VERSION = 'v0.1';

function buildArticleInput(item) {
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

function buildArticleRequest(input) {
  return {
    job_type: 'article_generation',
    version: ARTICLE_PROMPT_VERSION,
    requested_at: new Date().toISOString(),
    target_model: 'GPT',
    prompt_file: 'prompts/article.md',
    item: input
  };
}

async function generateArticleDraft(request) {
  const title = request.item.title_original || request.item.id;
  return {
    ok: true,
    version: ARTICLE_PROMPT_VERSION,
    item_id: request.item.id,
    model: request.target_model,
    generated_at: new Date().toISOString(),
    article: {
      title: `${title} を読み解く`,
      lead: `${title} に関する日本語向け導入文のプレースホルダ。`,
      sections: [
        { heading: '何が起きたか', body: request.item.summary_ja || '要点をここに入れる。' },
        { heading: '背景', body: request.item.background_ja || '背景をここに入れる。' },
        { heading: 'なぜ重要か', body: request.item.why_it_matters_ja || '重要性をここに入れる。' }
      ],
      closing: 'まとめのプレースホルダ。'
    },
    meta: {
      prompt_file: request.prompt_file,
      raw_response: null,
      status: 'placeholder'
    }
  };
}

module.exports = {
  ARTICLE_PROMPT_VERSION,
  buildArticleInput,
  buildArticleRequest,
  generateArticleDraft
};
