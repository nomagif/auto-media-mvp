const XPOST_PROMPT_VERSION = 'v0.1';
const { attachModelPlan } = require('./lib_model_routing');

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
  return attachModelPlan({
    job_type: 'x_post_generation',
    version: XPOST_PROMPT_VERSION,
    requested_at: new Date().toISOString(),
    prompt_file: 'prompts/x_post.md',
    item: input
  }, 'xpost');
}

function pickHashtags(item) {
  const tags = [];
  const text = `${item.source_name || ''} ${item.source_type || ''} ${item.summary_ja || ''} ${item.why_it_matters_ja || ''}`.toLowerCase();
  if (/(ai|openai|anthropic|claude|chatgpt|sora)/.test(text)) tags.push('#AI');
  if (/(tech|technology|product|startup|company)/.test(text)) tags.push('#TechNews');
  if (/(macro|market|econom|rates|inflation|jobs)/.test(text)) tags.push('#MarketSignals');
  return [...new Set(tags)].slice(0, 2);
}

function trim280(text) {
  const s = String(text || '').trim();
  if (s.length <= 280) return s;
  return `${s.slice(0, 277).trim()}…`;
}

async function generateXPost(request) {
  const item = request.item || {};
  const source = item.source_name || '記事';
  const headline = (item.summary_ja || item.title_original || item.id || '').split(/\n+/)[0].replace(/[。.!?]+$/,'').slice(0, 80);
  const why = (item.why_it_matters_ja || '').replace(/\s+/g, ' ').replace(/[。.!?]+$/,'').trim();
  const hashtags = pickHashtags(item);

  const candidates = [
    `${source}の要点: ${headline}${why ? `。${why}` : '。'}\n\n${hashtags.join(' ')}`,
    `${source}のこの話、${headline}${why ? `。${why}` : '。'}\n\n${hashtags.join(' ')}`,
    `${headline}${why ? `。${why}` : ''}\n\n${source}の動きとして押さえておきたい。\n\n${hashtags.join(' ')}`
  ].map((text) => trim280([text, hashtags.join(' ')].filter(Boolean).join('\n\n')));

  const xPost = candidates.find((text) => text.length <= 280) || trim280(`${headline}\n\n${hashtags.join(' ')}`);

  return {
    ok: true,
    version: XPOST_PROMPT_VERSION,
    item_id: item.id,
    model: request.target_model,
    generated_at: new Date().toISOString(),
    social: {
      x_post: xPost
    },
    meta: {
      prompt_file: request.prompt_file,
      raw_response: null,
      status: 'heuristic'
    }
  };
}

module.exports = {
  XPOST_PROMPT_VERSION,
  buildXPostInput,
  buildXPostRequest,
  generateXPost
};
