/*
 * @Description  : 模型默认能力推断（参考 src/models/*.ts 规则）
 */

const EMBEDDING_REGEX =
  /(?:^text-|embed|bge-|e5-|llm2vec|retrieval|uae-|gte-|jina-clip|jina-embeddings|voyage-)/i
const RERANKING_REGEX = /(?:rerank|re-rank|re-ranker|re-ranking|retrieval|retriever)/i

const VISION_ALLOWED_MODELS = [
  'llava',
  'moondream',
  'minicpm',
  'gemini-1\\.5',
  'gemini-2\\.0',
  'gemini-2\\.5',
  'gemini-3(?:\\.\\d)?-(?:flash|pro)(?:-preview)?',
  'gemini-(flash|pro|flash-lite)-latest',
  'gemini-exp',
  'claude-3',
  'claude-haiku-4',
  'claude-sonnet-4',
  'claude-opus-4',
  'vision',
  'glm-4(?:\\.\\d+)?v(?:-[\\w-]+)?',
  'qwen-vl',
  'qwen2-vl',
  'qwen2.5-vl',
  'qwen3-vl',
  'qwen3\\.5(?:-[\\w-]+)?',
  'qwen2.5-omni',
  'qwen3-omni(?:-[\\w-]+)?',
  'qvq',
  'internvl2',
  'grok-vision-beta',
  'grok-4(?:-[\\w-]+)?',
  'pixtral',
  'gpt-4(?:-[\\w-]+)',
  'gpt-4.1(?:-[\\w-]+)?',
  'gpt-4o(?:-[\\w-]+)?',
  'gpt-4.5(?:-[\\w-]+)',
  'gpt-5(?:-[\\w-]+)?',
  'chatgpt-4o(?:-[\\w-]+)?',
  'o1(?:-[\\w-]+)?',
  'o3(?:-[\\w-]+)?',
  'o4(?:-[\\w-]+)?',
  'deepseek-vl(?:[\\w-]+)?',
  'kimi-k2.5',
  'kimi-latest',
  'gemma-3(?:-[\\w-]+)',
  'doubao-seed-1[.-][68](?:-[\\w-]+)?',
  'doubao-seed-2[.-]0(?:-[\\w-]+)?',
  'doubao-seed-code(?:-[\\w-]+)?',
  'kimi-thinking-preview',
  'gemma3(?:[-:\\w]+)?',
  'kimi-vl-a3b-thinking(?:-[\\w-]+)?',
  'llama-guard-4(?:-[\\w-]+)?',
  'llama-4(?:-[\\w-]+)?',
  'step-1o(?:.*vision)?',
  'step-1v(?:-[\\w-]+)?',
  'qwen-omni(?:-[\\w-]+)?',
  'mistral-large-(2512|latest)',
  'mistral-medium-(2508|latest)',
  'mistral-small-(2506|latest)'
]

const VISION_EXCLUDED_MODELS = [
  'gpt-4-\\d+-preview',
  'gpt-4-turbo-preview',
  'gpt-4-32k',
  'gpt-4-\\d+',
  'o1-mini',
  'o3-mini',
  'o1-preview',
  'aidc-ai/marco-o1'
]

const VISION_REGEX = new RegExp(
  `\\b(?!(?:${VISION_EXCLUDED_MODELS.join('|')})\\b)(${VISION_ALLOWED_MODELS.join('|')})\\b`,
  'i'
)

const IMAGE_ENHANCEMENT_MODELS = [
  'grok-2-image(?:-[\\w-]+)?',
  'qwen-image-edit',
  'gpt-image-1',
  'gemini-2.5-flash-image(?:-[\\w-]+)?',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-3(?:\\.\\d+)?-pro-image(?:-[\\w-]+)?'
]
const IMAGE_ENHANCEMENT_MODELS_REGEX = new RegExp(IMAGE_ENHANCEMENT_MODELS.join('|'), 'i')

const DEDICATED_IMAGE_MODELS = [
  'dall-e(?:-[\\w-]+)?',
  'gpt-image(?:-[\\w-]+)?',
  'grok-2-image(?:-[\\w-]+)?',
  'imagen(?:-[\\w-]+)?',
  'flux(?:-[\\w-]+)?',
  'stable-?diffusion(?:-[\\w-]+)?',
  'stabilityai(?:-[\\w-]+)?',
  'sd-[\\w-]+',
  'sdxl(?:-[\\w-]+)?',
  'cogview(?:-[\\w-]+)?',
  'qwen-image(?:-[\\w-]+)?',
  'janus(?:-[\\w-]+)?',
  'midjourney(?:-[\\w-]+)?',
  'mj-[\\w-]+',
  'z-image(?:-[\\w-]+)?',
  'longcat-image(?:-[\\w-]+)?',
  'hunyuanimage(?:-[\\w-]+)?',
  'seedream(?:-[\\w-]+)?',
  'kandinsky(?:-[\\w-]+)?'
]
const DEDICATED_IMAGE_MODEL_REGEX = new RegExp(DEDICATED_IMAGE_MODELS.join('|'), 'i')

const FUNCTION_CALLING_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4',
  'gpt-4.5',
  'gpt-oss(?:-[\\w-]+)',
  'gpt-5(?:-[0-9-]+)?',
  'o(1|3|4)(?:-[\\w-]+)?',
  'claude',
  'qwen',
  'qwen3',
  'hunyuan',
  'deepseek',
  'glm-4(?:-[\\w-]+)?',
  'glm-4.5(?:-[\\w-]+)?',
  'glm-4.7(?:-[\\w-]+)?',
  'glm-5(?:-[\\w-]+)?',
  'learnlm(?:-[\\w-]+)?',
  'gemini(?:-[\\w-]+)?',
  'grok-3(?:-[\\w-]+)?',
  'doubao-seed-1[.-][68](?:-[\\w-]+)?',
  'doubao-seed-2[.-]0(?:-[\\w-]+)?',
  'doubao-seed-code(?:-[\\w-]+)?',
  'kimi-k2(?:-[\\w-]+)?',
  'ling-\\w+(?:-[\\w-]+)?',
  'ring-\\w+(?:-[\\w-]+)?',
  'minimax-m2(?:.1)?',
  'mimo-v2-flash'
]

const FUNCTION_CALLING_EXCLUDED_MODELS = [
  'aqa(?:-[\\w-]+)?',
  'imagen(?:-[\\w-]+)?',
  'o1-mini',
  'o1-preview',
  'aidc-ai/marco-o1',
  'gemini-1(?:\\.[\\w-]+)?',
  'qwen-mt(?:-[\\w-]+)?',
  'gpt-5-chat(?:-[\\w-]+)?',
  'glm-4\\.5v',
  'gemini-2.5-flash-image(?:-[\\w-]+)?',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-3(?:\\.\\d+)?-pro-image(?:-[\\w-]+)?',
  'deepseek-v3.2-speciale'
]

const FUNCTION_CALLING_REGEX = new RegExp(
  `\\b(?!(?:${FUNCTION_CALLING_EXCLUDED_MODELS.join('|')})\\b)(?:${FUNCTION_CALLING_MODELS.join('|')})\\b`,
  'i'
)

const CAPABILITY_ORDER = ['vision', 'tool_call', 'rerank', 'embedding']

const getLowerBaseModelName = modelId => {
  const normalizedId = `${modelId || ''}`.trim().toLowerCase()
  if (!normalizedId) return ''
  return normalizedId.split('/').pop() || normalizedId
}

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

export const inferDefaultModelCapabilities = model => {
  const modelId = `${model?.id || ''}`.trim()
  if (!modelId) return []

  const provider = `${model?.provider || model?.owned_by || ''}`.toLowerCase()
  const modelName = `${model?.name || model?.id || ''}`.toLowerCase()
  const baseModelId = getLowerBaseModelName(modelId)
  const isDoubaoModel = provider === 'doubao' || baseModelId.includes('doubao')

  const isRerank = RERANKING_REGEX.test(baseModelId)
  const isEmbedding =
    !isRerank &&
    (isDoubaoModel ? EMBEDDING_REGEX.test(modelName) : EMBEDDING_REGEX.test(baseModelId))
  const isTextToImage = DEDICATED_IMAGE_MODEL_REGEX.test(baseModelId)
  const isVision =
    !isEmbedding &&
    !isRerank &&
    (isDoubaoModel
      ? VISION_REGEX.test(modelName) || VISION_REGEX.test(baseModelId)
      : VISION_REGEX.test(baseModelId) || IMAGE_ENHANCEMENT_MODELS_REGEX.test(baseModelId))
  const isToolCall =
    !isEmbedding &&
    !isRerank &&
    !isTextToImage &&
    (isDoubaoModel
      ? FUNCTION_CALLING_REGEX.test(baseModelId) || FUNCTION_CALLING_REGEX.test(modelName)
      : FUNCTION_CALLING_REGEX.test(baseModelId))

  const detected = []
  if (isVision) detected.push('vision')
  if (isToolCall) detected.push('tool_call')
  if (isRerank) detected.push('rerank')
  if (isEmbedding) detected.push('embedding')

  return CAPABILITY_ORDER.filter(capability => detected.includes(capability))
}

export const buildInitialModelCapabilitiesMap = (models, existingMap = {}) => {
  const nextMap = {
    ...(existingMap || {})
  }

  for (const model of models || []) {
    const modelId = `${model?.id || ''}`.trim()
    if (!modelId) continue

    // 已有配置视为用户可控配置，自动初始化不覆盖。
    if (hasOwn(nextMap, modelId)) continue

    nextMap[modelId] = inferDefaultModelCapabilities(model)
  }

  return nextMap
}
