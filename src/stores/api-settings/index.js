/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-29
 * @FilePath     : /ChatLLM/src/stores/api-settings/index.js
 * @Description  : API 配置状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const MODEL_CAPABILITY_KEYS = ['vision', 'tool_call', 'rerank', 'embedding']

const normalizeModelCapabilities = capabilityMap => {
  if (!capabilityMap || typeof capabilityMap !== 'object') {
    return {}
  }

  const normalizedMap = {}
  for (const [modelId, capabilities] of Object.entries(capabilityMap)) {
    if (!modelId) continue
    const normalizedCapabilities = Array.from(
      new Set(
        (Array.isArray(capabilities) ? capabilities : []).filter(capability =>
          MODEL_CAPABILITY_KEYS.includes(capability)
        )
      )
    )
    normalizedMap[modelId] = normalizedCapabilities
  }
  return normalizedMap
}

// 从环境变量获取默认值
const getDefaultApiConfig = () => ({
  baseURL: import.meta.env.VITE_APP_API_BASE_URL || '',
  apiKey: import.meta.env.VITE_APP_API_KEY || ''
})

export const useApiSettingsStore = defineStore(
  'api-settings',
  () => {
    // 获取默认配置
    const defaultConfig = getDefaultApiConfig()

    // API 配置（使用环境变量作为默认值）
    const baseURL = ref(defaultConfig.baseURL)
    const apiKey = ref(defaultConfig.apiKey)
    const apiValidationPassed = ref(false)

    // 用户选择的模型列表（可用模型）
    const selectedModels = ref([])
    // 最近一次拉取到的完整模型列表（含未选中）
    const availableModels = ref([])
    // 模型能力映射：{ [modelId]: ['vision', 'tool_call'] }
    const modelCapabilities = ref({})

    // 默认模型设置
    const defaultChatModel = ref('') // 默认对话模型
    const defaultSummaryModel = ref('') // 标题总结模型
    const defaultTranslateModel = ref('') // 翻译模型

    // 知识库设置
    const knowledgeBase = ref({
      enabled: false,
      apiUrl: '',
      apiKey: '',
      defaultCollection: ''
    })

    // 兼容旧版本的 defaultModel
    const defaultModel = computed({
      get: () => defaultChatModel.value,
      set: val => {
        defaultChatModel.value = val
      }
    })

    // 获取配置对象
    const settings = computed(() => ({
      baseURL: baseURL.value,
      apiKey: apiKey.value,
      apiValidationPassed: apiValidationPassed.value,
      defaultModel: defaultChatModel.value,
      defaultChatModel: defaultChatModel.value,
      defaultSummaryModel: defaultSummaryModel.value,
      defaultTranslateModel: defaultTranslateModel.value,
      availableModels: availableModels.value,
      modelCapabilities: modelCapabilities.value
    }))

    // 是否已配置
    const isConfigured = computed(() => !!baseURL.value && !!apiKey.value)

    // 是否有可用模型
    const hasModels = computed(() => selectedModels.value.length > 0)

    // 获取有效的默认对话模型（如果设置的默认模型不在列表中，返回列表第一个）
    const effectiveDefaultChatModel = computed(() => {
      const models = selectedModels.value
      if (!models.length) return ''
      if (defaultChatModel.value && models.includes(defaultChatModel.value)) {
        return defaultChatModel.value
      }
      return models[0]
    })

    // 更新 API 配置
    const updateApiConfig = ({ baseURL: url, apiKey: key }) => {
      let hasSensitiveChanged = false

      if (url !== undefined && url !== baseURL.value) {
        hasSensitiveChanged = true
      }
      if (key !== undefined && key !== apiKey.value) {
        hasSensitiveChanged = true
      }

      if (url !== undefined) baseURL.value = url
      if (key !== undefined) apiKey.value = key

      if (hasSensitiveChanged) {
        apiValidationPassed.value = false
        availableModels.value = []
      }
    }

    const setApiValidationPassed = passed => {
      apiValidationPassed.value = !!passed
    }

    // 更新默认模型设置
    const updateDefaultModels = ({ chat, summary, translate }) => {
      if (chat !== undefined) defaultChatModel.value = chat
      if (summary !== undefined) defaultSummaryModel.value = summary
      if (translate !== undefined) defaultTranslateModel.value = translate
    }

    // 更新配置（兼容旧接口）
    const updateSettings = ({ baseURL: url, apiKey: key, defaultModel: model }) => {
      if (url !== undefined) baseURL.value = url
      if (key !== undefined) apiKey.value = key
      if (model !== undefined) defaultChatModel.value = model
    }

    // 更新选择的模型列表
    const updateSelectedModels = models => {
      selectedModels.value = models || []
    }

    // 更新完整模型列表
    const updateAvailableModels = models => {
      availableModels.value = models || []
    }

    // 更新完整模型能力映射
    const updateModelCapabilitiesMap = capabilityMap => {
      modelCapabilities.value = normalizeModelCapabilities(capabilityMap)
    }

    // 更新单个模型的能力列表
    const updateModelCapabilities = (modelId, capabilities) => {
      if (!modelId) return

      const normalizedMap = normalizeModelCapabilities({
        [modelId]: capabilities
      })

      const nextMap = {
        ...(modelCapabilities.value || {})
      }
      nextMap[modelId] = normalizedMap[modelId] || []
      modelCapabilities.value = nextMap
    }

    const toggleModelCapability = (modelId, capability) => {
      if (!modelId || !MODEL_CAPABILITY_KEYS.includes(capability)) return
      const currentCapabilities = modelCapabilities.value[modelId] || []
      const hasCapability = currentCapabilities.includes(capability)
      const nextCapabilities = hasCapability
        ? currentCapabilities.filter(item => item !== capability)
        : [...currentCapabilities, capability]

      updateModelCapabilities(modelId, nextCapabilities)
    }

    const getModelCapabilities = modelId => {
      if (!modelId) return []
      return modelCapabilities.value[modelId] || []
    }

    const modelSupportsCapability = (modelId, capability) => {
      return getModelCapabilities(modelId).includes(capability)
    }

    // 更新知识库设置
    const updateKnowledgeBase = config => {
      if (config) {
        knowledgeBase.value = { ...knowledgeBase.value, ...config }
      }
    }

    // 重置配置（恢复到环境变量默认值）
    const resetSettings = () => {
      const defaultConfig = getDefaultApiConfig()
      baseURL.value = defaultConfig.baseURL
      apiKey.value = defaultConfig.apiKey
      defaultChatModel.value = ''
      defaultSummaryModel.value = ''
      defaultTranslateModel.value = ''
      selectedModels.value = []
      availableModels.value = []
      modelCapabilities.value = {}
      apiValidationPassed.value = false
      knowledgeBase.value = {
        enabled: false,
        apiUrl: '',
        apiKey: '',
        defaultCollection: ''
      }
    }

    return {
      // 状态
      baseURL,
      apiKey,
      apiValidationPassed,
      defaultModel,
      defaultChatModel,
      defaultSummaryModel,
      defaultTranslateModel,
      selectedModels,
      availableModels,
      modelCapabilities,
      knowledgeBase,
      // 计算属性
      settings,
      isConfigured,
      hasModels,
      effectiveDefaultChatModel,
      // 方法
      updateApiConfig,
      setApiValidationPassed,
      updateDefaultModels,
      updateSettings,
      updateSelectedModels,
      updateAvailableModels,
      updateModelCapabilitiesMap,
      updateModelCapabilities,
      toggleModelCapability,
      getModelCapabilities,
      modelSupportsCapability,
      updateKnowledgeBase,
      resetSettings
    }
  },
  {
    persist: {
      key: 'chat-llm-api-settings'
    }
  }
)
