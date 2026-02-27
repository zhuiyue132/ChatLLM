<!-- src/components/ModelIcon.vue -->
<template>
  <img
    v-if="!allFailed"
    :src="url"
    :width="size"
    :height="size"
    class="model-icon"
    @error="tryNext"
  />
  <span
    v-else
    class="fallback"
    :style="{ fontSize: size * 0.6 + 'px', width: size + 'px', height: size + 'px' }"
  >
    🤖
  </span>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 24 },
  color: { type: Boolean, default: true }
})

const CDN_BASE = 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/light'

// 模型名关键词 -> 图标名映射
const MODEL_ICON_MAP = {
  // OpenAI
  gpt: 'openai',
  chatgpt: 'openai',
  o1: 'openai',
  o3: 'openai',
  dall: 'dalle',
  whisper: 'openai',

  // Anthropic
  claude: 'claude',

  // Google
  gemini: 'gemini',
  gemma: 'gemma',
  palm: 'palm',

  // Meta
  llama: 'meta',

  // Mistral
  mistral: 'mistral',
  mixtral: 'mistral',

  // 国内厂商
  qwen: 'qwen',
  tongyi: 'qwen',
  deepseek: 'deepseek',
  glm: 'zhipu',
  chatglm: 'chatglm',
  zhipu: 'zhipu',
  moonshot: 'moonshot',
  kimi: 'kimi',
  baichuan: 'baichuan',
  minimax: 'minimax',
  abab: 'minimax',
  yi: 'yi',
  spark: 'spark',
  wenxin: 'wenxin',
  ernie: 'wenxin',
  doubao: 'doubao',
  hunyuan: 'hunyuan',
  sensetime: 'sensenova',
  sensenova: 'sensenova',

  // 其他
  cohere: 'cohere',
  command: 'cohere',
  groq: 'groq',
  perplexity: 'perplexity',
  ollama: 'ollama',
  together: 'together',
  fireworks: 'fireworks',
  replicate: 'replicate',
  huggingface: 'huggingface',
  nvidia: 'nvidia',
  aws: 'aws',
  bedrock: 'bedrock',
  azure: 'azure',
  vertex: 'vertexai'
}

const tryIndex = ref(0)
const allFailed = ref(false)

// 从模型名匹配图标名
const matchIcon = modelName => {
  const name = modelName?.toLowerCase() || ''

  // 1. 先尝试映射表精确匹配
  for (const [keyword, icon] of Object.entries(MODEL_ICON_MAP)) {
    if (name.includes(keyword)) {
      return icon
    }
  }

  // 2. 提取首个字母段作为候选
  const firstSegment = name.match(/^[a-z]+/)?.[0]
  return firstSegment || 'openai'
}

// 生成候选 URL 列表
const candidates = computed(() => {
  const icon = matchIcon(props.name)
  const results = []

  // 彩色版本优先
  if (props.color) {
    results.push(`${icon}-color`)
  }
  results.push(icon)

  // 兜底
  if (icon !== 'openai') {
    if (props.color) {
      results.push('openai-color')
    }
    results.push('openai')
  }

  return results
})

const url = computed(() => {
  return `${CDN_BASE}/${candidates.value[tryIndex.value]}.png`
})

const tryNext = () => {
  if (tryIndex.value < candidates.value.length - 1) {
    tryIndex.value++
  } else {
    allFailed.value = true
  }
}

watch(
  () => props.name,
  () => {
    tryIndex.value = 0
    allFailed.value = false
  }
)
</script>

<style scoped>
.model-icon {
  object-fit: contain;
  vertical-align: middle;
}

.fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-panel);
  border-radius: 4px;
}
</style>
