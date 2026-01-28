/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/stores/api-settings/index.js
 * @Description  : API 配置状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useApiSettingsStore = defineStore(
  'api-settings',
  () => {
    const baseURL = ref('')
    const apiKey = ref('')
    const defaultModel = ref('')
    // 用户选择的模型列表
    const selectedModels = ref([])

    // 获取配置对象
    const settings = computed(() => ({
      baseURL: baseURL.value,
      apiKey: apiKey.value,
      defaultModel: defaultModel.value
    }))

    // 是否已配置
    const isConfigured = computed(() => !!baseURL.value && !!apiKey.value)

    // 是否有可用模型
    const hasModels = computed(() => selectedModels.value.length > 0)

    // 更新配置
    const updateSettings = ({ baseURL: url, apiKey: key, defaultModel: model }) => {
      if (url !== undefined) baseURL.value = url
      if (key !== undefined) apiKey.value = key
      if (model !== undefined) defaultModel.value = model
    }

    // 更新选择的模型列表
    const updateSelectedModels = models => {
      selectedModels.value = models || []
    }

    // 重置配置
    const resetSettings = () => {
      baseURL.value = ''
      apiKey.value = ''
      defaultModel.value = ''
      selectedModels.value = []
    }

    return {
      baseURL,
      apiKey,
      defaultModel,
      selectedModels,
      settings,
      isConfigured,
      hasModels,
      updateSettings,
      updateSelectedModels,
      resetSettings
    }
  },
  {
    persist: {
      key: 'chat-llm-api-settings'
    }
  }
)
