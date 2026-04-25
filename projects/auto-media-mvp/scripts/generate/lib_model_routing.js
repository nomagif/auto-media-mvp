const DEFAULT_PRIMARY_MODEL = process.env.MODEL_DEFAULT_PRIMARY || 'openai/gpt-4.1-mini';
const DEFAULT_FALLBACK_MODEL = process.env.MODEL_DEFAULT_FALLBACK || 'openai/gpt-5.4';

const TASK_DEFAULTS = {
  summary: {
    primaryEnv: 'MODEL_SUMMARY_PRIMARY',
    fallbackEnv: 'MODEL_SUMMARY_FALLBACK',
    thinkingEnv: 'MODEL_SUMMARY_THINKING',
    primary: DEFAULT_PRIMARY_MODEL,
    fallback: DEFAULT_FALLBACK_MODEL,
    thinking: 'low'
  },
  title: {
    primaryEnv: 'MODEL_TITLE_PRIMARY',
    fallbackEnv: 'MODEL_TITLE_FALLBACK',
    thinkingEnv: 'MODEL_TITLE_THINKING',
    primary: DEFAULT_PRIMARY_MODEL,
    fallback: DEFAULT_FALLBACK_MODEL,
    thinking: 'low'
  },
  article: {
    primaryEnv: 'MODEL_ARTICLE_PRIMARY',
    fallbackEnv: 'MODEL_ARTICLE_FALLBACK',
    thinkingEnv: 'MODEL_ARTICLE_THINKING',
    primary: 'openai/gpt-4.1-mini',
    fallback: DEFAULT_FALLBACK_MODEL,
    thinking: 'medium'
  },
  xpost: {
    primaryEnv: 'MODEL_XPOST_PRIMARY',
    fallbackEnv: 'MODEL_XPOST_FALLBACK',
    thinkingEnv: 'MODEL_XPOST_THINKING',
    primary: DEFAULT_PRIMARY_MODEL,
    fallback: DEFAULT_FALLBACK_MODEL,
    thinking: 'low'
  },
  image_prompt: {
    primaryEnv: 'MODEL_IMAGE_PROMPT_PRIMARY',
    fallbackEnv: 'MODEL_IMAGE_PROMPT_FALLBACK',
    thinkingEnv: 'MODEL_IMAGE_PROMPT_THINKING',
    primary: DEFAULT_PRIMARY_MODEL,
    fallback: DEFAULT_FALLBACK_MODEL,
    thinking: 'low'
  }
};

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildModelPlan(task) {
  const config = TASK_DEFAULTS[task];
  if (!config) throw new Error(`Unknown model task: ${task}`);

  const primary = firstNonEmpty(process.env[config.primaryEnv], config.primary, DEFAULT_PRIMARY_MODEL);
  const fallback = firstNonEmpty(process.env[config.fallbackEnv], config.fallback, DEFAULT_FALLBACK_MODEL);
  const thinking = firstNonEmpty(process.env[config.thinkingEnv], config.thinking, 'low');
  const extraFallbacks = parseList(process.env.MODEL_EXTRA_FALLBACKS);
  const fallbacks = [fallback, ...extraFallbacks].filter(Boolean).filter((value, index, arr) => arr.indexOf(value) === index && value !== primary);

  return {
    task,
    strategy: 'cheap-first-fallback-on-failure',
    primary_model: primary,
    fallback_models: fallbacks,
    thinking,
    retry_on: ['invalid_json', 'schema_mismatch', 'empty_output']
  };
}

function attachModelPlan(request, task) {
  const modelPlan = buildModelPlan(task);
  return {
    ...request,
    target_model: modelPlan.primary_model,
    model_plan: modelPlan
  };
}

module.exports = {
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODEL,
  buildModelPlan,
  attachModelPlan
};
