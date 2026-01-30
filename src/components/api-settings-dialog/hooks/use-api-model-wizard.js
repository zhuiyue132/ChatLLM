/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/hooks/use-api-model-wizard.js
 * @Description  : API与模型分步骤状态管理 hook
 */

import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useApiSettingsStore } from '@/stores/api-settings'
import { getModelListWithConfig } from '@/api/completions'

export const useApiModelWizard = () => {
  const apiSettingsStore = useApiSettingsStore()

  // 当前步骤（0: API配置, 1: 模型选择, 2: 默认模型）
  const currentStep = ref(0)

  // 步骤1：API 配置
  const apiConfig = reactive({
    baseURL: '',
    apiKey: ''
  })

  // API 状态
  const showApiKey = ref(false)
  const fetchingModels = ref(false)
  const fetchError = ref('')
  const availableModels = ref([])

  // 步骤2：选中的模型
  const selectedModels = ref([])
  const modelSearchKeyword = ref('')

  // 步骤3：默认模型
  const defaultModels = reactive({
    chat: '',
    summary: '',
    translate: ''
  })

  // 计算属性：是否可以获取模型列表
  const canFetchModels = computed(() => {
    return apiConfig.baseURL && apiConfig.apiKey && /^https?:\/\/.+/.test(apiConfig.baseURL)
  })

  // 计算属性：过滤后的模型列表
  const filteredModels = computed(() => {
    if (!modelSearchKeyword.value) {
      return availableModels.value
    }
    const keyword = modelSearchKeyword.value.toLowerCase()
    return availableModels.value.filter(model => model.id.toLowerCase().includes(keyword))
  })

  // 计算属性：是否可以进入下一步
  const canGoNext = computed(() => {
    if (currentStep.value === 0) {
      return availableModels.value.length > 0
    }
    if (currentStep.value === 1) {
      return selectedModels.value.length > 0
    }
    return true
  })

  // 从 store 加载配置
  const loadFromStore = () => {
    apiConfig.baseURL = apiSettingsStore.baseURL
    apiConfig.apiKey = apiSettingsStore.apiKey
    selectedModels.value = [...apiSettingsStore.selectedModels]
    defaultModels.chat = apiSettingsStore.defaultChatModel || ''
    defaultModels.summary = apiSettingsStore.defaultSummaryModel || ''
    defaultModels.translate = apiSettingsStore.defaultTranslateModel || ''
  }

  // 重置状态
  const reset = () => {
    currentStep.value = 0
    showApiKey.value = false
    fetchingModels.value = false
    fetchError.value = ''
    availableModels.value = []
    modelSearchKeyword.value = ''
  }

  // 获取模型列表
  const fetchModels = async () => {
    if (!canFetchModels.value) return false

    fetchingModels.value = true
    fetchError.value = ''

    try {
      const res = await getModelListWithConfig(apiConfig.baseURL, apiConfig.apiKey)
      if (res?.data && Array.isArray(res.data)) {
        availableModels.value = res.data.sort((a, b) => a.id.localeCompare(b.id))
        return true
      } else {
        fetchError.value = '获取模型列表失败：返回数据格式错误'
        return false
      }
    } catch (e) {
      fetchError.value = `获取模型列表失败：${e.message || '网络错误'}`
      return false
    } finally {
      fetchingModels.value = false
    }
  }

  // 下一步
  const nextStep = () => {
    if (currentStep.value === 0 && availableModels.value.length === 0) {
      ElMessage.warning('请先获取模型列表')
      return false
    }
    if (currentStep.value === 1 && selectedModels.value.length === 0) {
      ElMessage.warning('请至少选择一个模型')
      return false
    }
    if (currentStep.value < 2) {
      currentStep.value++
      return true
    }
    return false
  }

  // 上一步
  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--
      return true
    }
    return false
  }

  // 跳转到指定步骤（只能跳转到已完成的步骤）
  const goToStep = step => {
    // 步骤0总是可以返回
    if (step === 0) {
      currentStep.value = 0
      return true
    }
    // 步骤1需要已获取模型列表
    if (step === 1 && availableModels.value.length > 0) {
      currentStep.value = 1
      return true
    }
    // 步骤2需要已选择模型
    if (step === 2 && selectedModels.value.length > 0) {
      currentStep.value = 2
      return true
    }
    return false
  }

  // 全选模型
  const selectAllModels = () => {
    selectedModels.value = filteredModels.value.map(m => m.id)
  }

  // 清空模型选择
  const clearModelSelection = () => {
    selectedModels.value = []
  }

  // 保存所有设置
  const saveAll = () => {
    // 保存 API 配置
    apiSettingsStore.updateApiConfig({
      baseURL: apiConfig.baseURL,
      apiKey: apiConfig.apiKey
    })

    // 保存选中的模型
    apiSettingsStore.updateSelectedModels(selectedModels.value)

    // 保存默认模型设置
    apiSettingsStore.updateDefaultModels({
      chat: defaultModels.chat,
      summary: defaultModels.summary,
      translate: defaultModels.translate
    })

    ElMessage.success('设置已保存')
    return true
  }

  return {
    // 状态
    currentStep,
    apiConfig,
    showApiKey,
    fetchingModels,
    fetchError,
    availableModels,
    selectedModels,
    modelSearchKeyword,
    defaultModels,

    // 计算属性
    canFetchModels,
    filteredModels,
    canGoNext,

    // 方法
    loadFromStore,
    reset,
    fetchModels,
    nextStep,
    prevStep,
    goToStep,
    selectAllModels,
    clearModelSelection,
    saveAll
  }
}
