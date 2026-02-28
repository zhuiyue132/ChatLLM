/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/hooks/use-api-model-wizard.js
 * @Description  : API与模型配置状态管理 hook
 */

import { ref, reactive, computed } from 'vue'
import { useApiSettingsStore, MODEL_CAPABILITY_KEYS } from '@/stores/api-settings'
import { getModelListWithConfig } from '@/api/completions'
import { buildInitialModelCapabilitiesMap } from '@/config/model-capability-defaults'

const normalizeModelList = models => {
  return Array.from(new Set((models || []).filter(Boolean)))
}

const MODEL_CAPABILITY_OPTIONS = [
  { value: 'vision', label: '视觉' },
  { value: 'tool_call', label: '工具调用' },
  { value: 'rerank', label: '重排序' },
  { value: 'embedding', label: '嵌入' }
]

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

export const useApiModelWizard = () => {
  const apiSettingsStore = useApiSettingsStore()

  // Tab1：API 配置
  const apiConfig = reactive({
    baseURL: '',
    apiKey: ''
  })
  const showApiKey = ref(false)
  const fetchingModels = ref(false)
  const fetchError = ref('')
  const availableModels = ref([])
  const modelSearchKeyword = ref('')

  // Tab2：模型列表
  const selectedModels = ref([])
  const modelCapabilities = ref({})

  // Tab3：默认模型
  const defaultModels = reactive({
    chat: '',
    summary: '',
    translate: ''
  })

  // 基础校验：是否可以发起“获取模型列表”
  const canFetchModels = computed(() => {
    return apiConfig.baseURL && apiConfig.apiKey && /^https?:\/\/.+/.test(apiConfig.baseURL)
  })

  // API Tab 合规：已获取模型，且模型列表对应当前 API 配置
  const isApiTabValid = computed(() => {
    return canFetchModels.value && apiSettingsStore.apiValidationPassed
  })

  // 模型列表 Tab 合规：API 合规 + 至少选一个模型
  const isModelListTabValid = computed(() => {
    return isApiTabValid.value && selectedModels.value.length > 0
  })

  // 依赖关系：后一个 Tab 必须依赖前一个 Tab 合规
  const canAccessModelListTab = computed(() => isApiTabValid.value)
  const canAccessDefaultModelsTab = computed(() => isModelListTabValid.value)

  const filteredModels = computed(() => {
    if (!modelSearchKeyword.value) {
      return availableModels.value
    }
    const keyword = modelSearchKeyword.value.toLowerCase()
    return availableModels.value.filter(model => model.id.toLowerCase().includes(keyword))
  })

  const persistApiConfig = () => {
    apiSettingsStore.updateApiConfig({
      baseURL: apiConfig.baseURL,
      apiKey: apiConfig.apiKey
    })
  }

  const persistSelectedModels = () => {
    apiSettingsStore.updateSelectedModels([...selectedModels.value])
  }

  const persistModelCapabilities = () => {
    apiSettingsStore.updateModelCapabilitiesMap({
      ...(modelCapabilities.value || {})
    })
  }

  const persistDefaultModels = () => {
    apiSettingsStore.updateDefaultModels({
      chat: defaultModels.chat,
      summary: defaultModels.summary,
      translate: defaultModels.translate
    })
  }

  const sanitizeDefaultModels = () => {
    const selectedSet = new Set(selectedModels.value)
    if (defaultModels.chat && !selectedSet.has(defaultModels.chat)) {
      defaultModels.chat = ''
    }
    if (defaultModels.summary && !selectedSet.has(defaultModels.summary)) {
      defaultModels.summary = ''
    }
    if (defaultModels.translate && !selectedSet.has(defaultModels.translate)) {
      defaultModels.translate = ''
    }
  }

  const invalidateFetchedModels = () => {
    fetchError.value = ''
    modelSearchKeyword.value = ''
    availableModels.value = []
  }

  const toggleShowApiKey = () => {
    showApiKey.value = !showApiKey.value
  }

  const setModelSearchKeyword = keyword => {
    modelSearchKeyword.value = keyword || ''
  }

  const updateApiConfig = config => {
    const nextBaseURL = config.baseURL ?? ''
    const nextApiKey = config.apiKey ?? ''
    const hasChanged = nextBaseURL !== apiConfig.baseURL || nextApiKey !== apiConfig.apiKey

    apiConfig.baseURL = nextBaseURL
    apiConfig.apiKey = nextApiKey
    persistApiConfig()

    if (hasChanged) {
      invalidateFetchedModels()
    }
  }

  const updateSelectedModels = models => {
    selectedModels.value = normalizeModelList(models)
    sanitizeDefaultModels()
    persistSelectedModels()
    persistDefaultModels()
  }

  const updateDefaultModels = models => {
    defaultModels.chat = models.chat || ''
    defaultModels.summary = models.summary || ''
    defaultModels.translate = models.translate || ''
    sanitizeDefaultModels()
    persistDefaultModels()
  }

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
    persistModelCapabilities()
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

  const inferAndPersistModelCapabilities = models => {
    const normalizedCurrentMap = normalizeModelCapabilities(modelCapabilities.value)
    const nextMap = buildInitialModelCapabilitiesMap(models, normalizedCurrentMap)

    modelCapabilities.value = normalizeModelCapabilities(nextMap)
    persistModelCapabilities()
  }

  // 从 store 加载配置
  const loadFromStore = () => {
    apiConfig.baseURL = apiSettingsStore.baseURL
    apiConfig.apiKey = apiSettingsStore.apiKey
    selectedModels.value = normalizeModelList(apiSettingsStore.selectedModels)
    modelCapabilities.value = normalizeModelCapabilities(apiSettingsStore.modelCapabilities)
    defaultModels.chat = apiSettingsStore.defaultChatModel || ''
    defaultModels.summary = apiSettingsStore.defaultSummaryModel || ''
    defaultModels.translate = apiSettingsStore.defaultTranslateModel || ''
    sanitizeDefaultModels()
  }

  // 重置仅作用于弹窗过程状态，不覆盖 store 已保存配置
  const reset = () => {
    showApiKey.value = false
    fetchingModels.value = false
    invalidateFetchedModels()
    if (apiSettingsStore.apiValidationPassed) {
      const cachedModels = normalizeModelList(apiSettingsStore.availableModels)
      const fallbackModels = selectedModels.value
      const modelSource = cachedModels.length ? cachedModels : fallbackModels
      availableModels.value = modelSource.map(model => ({ id: model }))
    }
  }

  // 获取模型列表
  const fetchModels = async () => {
    if (!canFetchModels.value) return false

    fetchingModels.value = true
    fetchError.value = ''

    try {
      const res = await getModelListWithConfig(apiConfig.baseURL, apiConfig.apiKey)
      if (res?.data && Array.isArray(res.data)) {
        const models = res.data.filter(item => item?.id).sort((a, b) => a.id.localeCompare(b.id))
        availableModels.value = models

        if (!models.length) {
          apiSettingsStore.setApiValidationPassed(false)
          apiSettingsStore.updateAvailableModels([])
          fetchError.value = '获取模型列表成功，但未返回可用模型'
          return false
        }
        apiSettingsStore.setApiValidationPassed(true)
        apiSettingsStore.updateAvailableModels(models.map(item => item.id))
        inferAndPersistModelCapabilities(models)

        const availableModelSet = new Set(availableModels.value.map(item => item.id))
        const nextSelectedModels = selectedModels.value.filter(model =>
          availableModelSet.has(model)
        )
        updateSelectedModels(nextSelectedModels)

        return true
      }
      apiSettingsStore.setApiValidationPassed(false)
      fetchError.value = '获取模型列表失败：返回数据格式错误'
      return false
    } catch (e) {
      apiSettingsStore.setApiValidationPassed(false)
      fetchError.value = `获取模型列表失败：${e.message || '网络错误'}`
      return false
    } finally {
      fetchingModels.value = false
    }
  }

  const selectAllModels = () => {
    updateSelectedModels(filteredModels.value.map(model => model.id))
  }

  const clearModelSelection = () => {
    updateSelectedModels([])
  }

  return {
    // 状态
    apiConfig,
    showApiKey,
    fetchingModels,
    fetchError,
    availableModels,
    selectedModels,
    modelCapabilities,
    modelSearchKeyword,
    defaultModels,

    // 计算属性
    canFetchModels,
    canAccessModelListTab,
    canAccessDefaultModelsTab,
    filteredModels,
    modelCapabilityOptions: MODEL_CAPABILITY_OPTIONS,

    // 方法
    loadFromStore,
    reset,
    updateApiConfig,
    updateSelectedModels,
    updateDefaultModels,
    updateModelCapabilities,
    toggleModelCapability,
    getModelCapabilities,
    toggleShowApiKey,
    setModelSearchKeyword,
    fetchModels,
    selectAllModels,
    clearModelSelection
  }
}
