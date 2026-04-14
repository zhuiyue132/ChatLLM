/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions-entry.js
 * @Description  : Completions 首页输入逻辑（创建房间 / 预存待发送消息）
 */

import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEventBus } from '@vueuse/core'
import { OPEN_SETTINGS_COMMAND } from '@/config/symbol'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useMcpSettingsStore } from '@/stores/mcp-settings'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { useKnowledgeBaseStore } from '@/stores/knowledge-base'
import { setPendingCompletionsMessage } from '../utils'

const WILL_SEND_SESSION_KEY = 'COMPLETIONS_WILL_SEND_MESSAGE'

export const useCompletionsEntry = () => {
  const router = useRouter()
  const apiSettingsStore = useApiSettingsStore()
  const mcpSettingsStore = useMcpSettingsStore()
  const chatRoomsStore = useChatRoomsStore()
  const kbStore = useKnowledgeBaseStore()

  const senderRef = ref(null)
  const showSettingsDialog = ref(false)
  const inputMessage = ref('')
  const sessionMcpEnabled = ref(mcpSettingsStore.globalEnabled)
  const selectedMcpServerIds = ref([])
  const selectedKbIds = ref([])

  const currentModel = ref(apiSettingsStore.effectiveDefaultChatModel || '')
  const isCurrentModelSupportsVision = computed(() => {
    return apiSettingsStore.modelSupportsCapability(currentModel.value, 'vision')
  })
  const isCurrentModelSupportsToolCall = computed(() => {
    return apiSettingsStore.modelSupportsCapability(currentModel.value, 'tool_call')
  })

  // 监听打开设置事件
  const eventBus = useEventBus(OPEN_SETTINGS_COMMAND)
  eventBus.on(() => {
    showSettingsDialog.value = true
  })

  // 监听默认模型变化，如果当前模型是默认值且用户没有手动修改过，则更新
  watch(
    () => apiSettingsStore.effectiveDefaultChatModel,
    newModel => {
      if (newModel && newModel !== currentModel.value) {
        currentModel.value = newModel
      }
    },
    { immediate: false }
  )

  watch(
    () => mcpSettingsStore.globalEnabled,
    enabled => {
      sessionMcpEnabled.value = !!enabled
    }
  )

  const modelList = computed(() => {
    return apiSettingsStore.selectedModels.map(model => ({
      code: model,
      name: model
    }))
  })

  const availableMcpServers = computed(() => {
    return mcpSettingsStore.servers.filter(server => server.enabled)
  })

  const availableKnowledgeBases = computed(() => {
    return kbStore.enabledKnowledgeBases
  })

  const handleMessageSubmit = (payload = {}) => {
    const { message, fileList = [], mcpServerIds = [], kbIds = [] } = payload
    const safeMessage = typeof message === 'string' ? message : ''
    const model = currentModel.value || apiSettingsStore.effectiveDefaultChatModel
    const safeMcpServerIds = Array.isArray(mcpServerIds)
      ? mcpServerIds
      : [...selectedMcpServerIds.value]
    const effectiveMcpServerIds = isCurrentModelSupportsToolCall.value ? safeMcpServerIds : []

    if (!safeMessage.trim() && (!Array.isArray(fileList) || fileList.length === 0)) {
      return
    }

    // 检查是否有可用模型
    if (!apiSettingsStore.hasModels) {
      // 不显示错误提示，因为按钮已经不可用
      return
    }

    // 1. 创建新房间，使用用户第一句话作为标题（截取前50个字符）
    const title = safeMessage.trim() ? safeMessage.trim().slice(0, 50) : '图片识别'
    const safeKbIds = Array.isArray(kbIds) ? kbIds : [...selectedKbIds.value]
    const roomId = chatRoomsStore.createRoom(model, title, {
      mcpEnabled: !!sessionMcpEnabled.value,
      mcpServerIds: effectiveMcpServerIds,
      kbIds: safeKbIds
    })

    // 2. 存储待发送的消息到 sessionStorage
    setPendingCompletionsMessage({
      message: safeMessage,
      model,
      fileList,
      mcpServerIds: effectiveMcpServerIds,
      kbIds: safeKbIds
    })
    try {
      window.sessionStorage.setItem(
        WILL_SEND_SESSION_KEY,
        JSON.stringify({
          message: safeMessage,
          model,
          mcpServerIds: effectiveMcpServerIds,
          kbIds: safeKbIds
        })
      )
    } catch (error) {
      console.warn('[Completions] 存储待发送消息失败，将使用内存缓存', error)
    }

    // 3. 跳转到对话页面
    router.push({
      name: 'CompletionsChat',
      query: { roomId }
    })
  }

  return {
    senderRef,
    showSettingsDialog,
    inputMessage,
    sessionMcpEnabled,
    selectedMcpServerIds,
    selectedKbIds,
    currentModel,
    modelList,
    availableMcpServers,
    availableKnowledgeBases,
    isCurrentModelSupportsVision,
    isCurrentModelSupportsToolCall,
    handleMessageSubmit,
    apiSettingsStore,
    mcpSettingsStore,
    kbStore
  }
}
