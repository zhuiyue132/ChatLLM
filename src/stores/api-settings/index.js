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

export const useApiSettingsStore = defineStore(
  'api-settings',
  () => {
    // API 配置
    const baseURL = ref('')
    const apiKey = ref('')

    // 用户选择的模型列表（可用模型）
    const selectedModels = ref([])

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
      defaultModel: defaultChatModel.value,
      defaultChatModel: defaultChatModel.value,
      defaultSummaryModel: defaultSummaryModel.value,
      defaultTranslateModel: defaultTranslateModel.value
    }))

    // 是否已配置
    const isConfigured = computed(() => !!baseURL.value && !!apiKey.value)

    // 是否有可用模型
    const hasModels = computed(() => selectedModels.value.length > 0)

    // 更新 API 配置
    const updateApiConfig = ({ baseURL: url, apiKey: key }) => {
      if (url !== undefined) baseURL.value = url
      if (key !== undefined) apiKey.value = key
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

    // 更新知识库设置
    const updateKnowledgeBase = config => {
      if (config) {
        knowledgeBase.value = { ...knowledgeBase.value, ...config }
      }
    }

    // 重置配置
    const resetSettings = () => {
      baseURL.value = ''
      apiKey.value = ''
      defaultChatModel.value = ''
      defaultSummaryModel.value = ''
      defaultTranslateModel.value = ''
      selectedModels.value = []
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
      defaultModel,
      defaultChatModel,
      defaultSummaryModel,
      defaultTranslateModel,
      selectedModels,
      knowledgeBase,
      // 计算属性
      settings,
      isConfigured,
      hasModels,
      // 方法
      updateApiConfig,
      updateDefaultModels,
      updateSettings,
      updateSelectedModels,
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
