/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-03
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions.js
 * @Description  : 单模型对话（OpenAI API 格式）
 *
 */
import { ref, computed, nextTick, toValue } from 'vue'
import { useOpenAISSESingle } from '@/hooks/use-sse/use-openai-sse'
import { useAutoScroll, showMessage, useTitleGenerator } from '@/hooks'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useMcpSettingsStore } from '@/stores/mcp-settings'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { ILLEGAL_UNICODE_REG } from '../config'
import {
  getImageFiles,
  getImageDataUrls,
  sanitizeFileListForStorage
} from './use-completions/openai-files'
import { buildOpenAIMessages } from './use-completions/openai-messages'
import { createStreamingSync } from './use-completions/streaming-sync'
import { requestOpenAICompletion as requestOpenAICompletionRaw } from './use-completions/openai-stream'
import { createMcpRunner } from './use-completions/mcp-runner'
import { injectRAGContext } from './use-completions/rag-inject'

/**
 * 单模型对话 Hook
 * @param {Object} options - 配置项
 * @param {import('vue').Ref<string>|string} options.roomId - 房间 ID（响应式引用或普通值）
 * @param {import('vue').Ref<HTMLElement|null>|null} options.scrollContainer - 滚动容器
 */
export function useCompletions({ roomId, scrollContainer = null }) {
  const apiSettingsStore = useApiSettingsStore()
  const mcpSettingsStore = useMcpSettingsStore()
  const chatRoomsStore = useChatRoomsStore()
  const MCP_ABORT_ERROR_CODE = 'MCP_MANUAL_ABORT'
  let mcpAbortController = null

  // 初始化标题生成器
  const { generateTitleSync } = useTitleGenerator()

  // 获取当前房间 ID（支持响应式和普通值）
  const getRoomId = () => toValue(roomId)

  // 是否正在加载中
  const loading = ref(false)
  const isReceiving = ref(false)

  // 输入框消息
  const message = ref('')

  // 正在编辑的消息 ID
  const editingMessageId = ref(null)

  // 正在接收消息的 assistant 节点 ID
  const receivingMessageId = ref(null)

  const createMcpAbortError = () => {
    const abortError = new Error('用户已停止')
    abortError.name = 'AbortError'
    abortError.code = MCP_ABORT_ERROR_CODE
    return abortError
  }

  const isMcpAbortError = error => {
    return error?.name === 'AbortError' || error?.code === MCP_ABORT_ERROR_CODE
  }

  const throwIfMcpAborted = signal => {
    if (signal?.aborted) {
      throw createMcpAbortError()
    }
  }

  const startMcpAbortController = () => {
    if (mcpAbortController) {
      mcpAbortController.abort()
    }
    mcpAbortController = new AbortController()
    return mcpAbortController
  }

  const stopMcpFlow = () => {
    if (mcpAbortController) {
      mcpAbortController.abort()
      mcpAbortController = null
    }
  }

  const finishReceivingByAbort = ({ assistantMessageId = '' } = {}) => {
    const id = getRoomId()
    if (id && assistantMessageId) {
      chatRoomsStore.updateMessage(id, assistantMessageId, {
        finished: true,
        error: false
      })
    }

    loading.value = false
    isReceiving.value = false
    if (!assistantMessageId || receivingMessageId.value === assistantMessageId) {
      receivingMessageId.value = null
    }
  }

  const markReceivingStarted = () => {
    if (!receivingMessageId.value) return
    loading.value = false
    isReceiving.value = true
  }

  const finalizeAssistantMessage = async ({
    assistantMessageId,
    content = '',
    reasoningContent = '',
    reasoningDuration = 0,
    usage = null,
    mcpTimeline = null
  } = {}) => {
    const id = getRoomId()

    if (id && assistantMessageId) {
      const updates = {
        content: typeof content === 'string' ? content.replaceAll(ILLEGAL_UNICODE_REG, '') : '',
        reasoningContent: typeof reasoningContent === 'string' ? reasoningContent : '',
        finished: true,
        error: false,
        reasoningTime: reasoningDuration || 0,
        usage: usage || null
      }
      if (Array.isArray(mcpTimeline)) {
        updates.mcpTimeline = mcpTimeline
      }
      chatRoomsStore.updateMessage(id, assistantMessageId, {
        ...updates
      })
    }

    // 优先恢复交互状态，避免被标题生成请求阻塞
    loading.value = false
    isReceiving.value = false
    receivingMessageId.value = null

    if (!id) return

    // 房间标题后台异步生成，不阻塞输入框按钮状态切换
    const room = chatRoomsStore.rooms.find(r => r.id === id)
    if (!room) return

    try {
      // 获取对话历史用于生成标题
      const messages = chatRoomsStore.getMessages(id)
      if (messages.length > 0 && messages.length <= 2) {
        chatRoomsStore.updateRoomIsTitleLoading(id, true)
        const title = await generateTitleSync(messages)
        if (title && title.trim()) {
          // 更新房间标题
          chatRoomsStore.updateRoomTitle(id, title.trim())
        }
      }
    } catch (error) {
      console.warn('[OpenAI SSE] 生成标题失败:', error)
      // 生成标题失败不影响正常对话
    } finally {
      chatRoomsStore.updateRoomIsTitleLoading(id, false)
    }
  }

  const syncAssistantStreamingMessage = ({
    assistantMessageId,
    content,
    reasoningContent,
    reasoningDuration
  } = {}) => {
    const id = getRoomId()
    if (!id || !assistantMessageId) return

    const hasDisplayPayload =
      (typeof content === 'string' && content.trim()) ||
      (typeof reasoningContent === 'string' && reasoningContent.trim())

    if (hasDisplayPayload) {
      markReceivingStarted()
    }

    const updates = {}
    if (typeof content === 'string') {
      updates.content = content.replaceAll(ILLEGAL_UNICODE_REG, '')
    }
    if (typeof reasoningContent === 'string') {
      updates.reasoningContent = reasoningContent
    }
    if (typeof reasoningDuration === 'number') {
      updates.reasoningTime = reasoningDuration
    }

    if (Object.keys(updates).length > 0) {
      chatRoomsStore.updateMessage(id, assistantMessageId, updates)

      if (isViewingReceivingBranch.value) {
        scrollToBottom()
      }
    }
  }

  // 流式输出的 UI 同步节流：避免每个 token 都触发一次 store 更新 / 重新渲染
  const streamingSync = createStreamingSync({
    interval: 100,
    onSync: syncAssistantStreamingMessage
  })

  // 对话内容 - 从 store 获取
  const chatHistoryLoading = ref(false)

  // 当前房间的消息树
  const chatHistoryTree = computed(() => {
    const id = getRoomId()
    return id ? chatRoomsStore.getMessageTree(id) : null
  })

  // 当前对话路径的消息列表
  const chatHistory = computed(() => {
    const id = getRoomId()
    return id ? chatRoomsStore.getMessages(id) : []
  })

  // 当前房间
  const currentRoom = computed(() => {
    const id = getRoomId()
    return id ? chatRoomsStore.rooms.find(r => r.id === id) : null
  })

  // 当前使用的模型
  const currentModelValue = computed({
    get: () => {
      const room = currentRoom.value
      return room?.model || apiSettingsStore.effectiveDefaultChatModel
    },
    set: val => {
      const id = getRoomId()
      if (id && val) {
        chatRoomsStore.updateRoomModel(id, val)
      }
    }
  })

  // 是否启用深度思考
  const enableDeepThink = ref(true)

  // 模型列表（从 API Settings 获取）
  const models = computed(() => {
    return apiSettingsStore.selectedModels.map(model => ({
      code: model,
      name: model
    }))
  })
  const currentModelSupportsVision = computed(() => {
    return apiSettingsStore.modelSupportsCapability(currentModelValue.value, 'vision')
  })
  const currentModelSupportsToolCall = computed(() => {
    return apiSettingsStore.modelSupportsCapability(currentModelValue.value, 'tool_call')
  })

  // 判断当前显示的分支是否包含正在接收消息的节点
  const isViewingReceivingBranch = computed(() => {
    if (!receivingMessageId.value) {
      return false
    }
    return chatHistory.value.some(item => item.id === receivingMessageId.value)
  })

  // 当前分支是否显示 loading 状态
  const shouldShowLoading = computed(() => {
    return loading.value || (isReceiving.value && isViewingReceivingBranch.value)
  })

  const { scrollToBottom, enableAutoScroll } = useAutoScroll(
    computed(() => shouldShowLoading.value && chatHistory.value.length > 0),
    scrollContainer
  )

  // 创建 OpenAI SSE 请求实例
  const { send: sendSSE, stop: stopSSE } = useOpenAISSESingle({
    baseURL: apiSettingsStore.baseURL,
    apiKey: apiSettingsStore.apiKey,
    onStart: () => {
      console.log('[OpenAI SSE] 请求开始')
    },
    onToken: ({ content, reasoning_content, reasoning_duration }) => {
      streamingSync.schedule({
        assistantMessageId: receivingMessageId.value,
        content,
        reasoningContent: reasoning_content,
        reasoningDuration: reasoning_duration
      })
    },
    onDone: async ({ content, reasoning_content, reasoning_duration, usage }) => {
      console.log('[OpenAI SSE] 请求完成', {
        content,
        reasoning_content,
        reasoning_duration,
        usage
      })

      streamingSync.reset()

      const doneMessageId = receivingMessageId.value
      await finalizeAssistantMessage({
        assistantMessageId: doneMessageId,
        content,
        reasoningContent: reasoning_content,
        reasoningDuration: reasoning_duration,
        usage
      })
    },
    onError: ({ error }) => {
      console.error('[OpenAI SSE] 请求错误:', error)

      const id = getRoomId()
      if (id && receivingMessageId.value) {
        chatRoomsStore.updateMessage(id, receivingMessageId.value, {
          finished: true,
          error: true,
          content: `请求失败: ${error?.message || '未知错误'}`
        })
      }

      streamingSync.reset()

      loading.value = false
      isReceiving.value = false
      receivingMessageId.value = null

      showMessage(error?.message || '请求失败', { type: 'error' })
    },
    onAbort: ({ reasoning_duration }) => {
      console.log('[OpenAI SSE] 请求被中止')

      const id = getRoomId()
      if (id && receivingMessageId.value) {
        chatRoomsStore.updateMessage(id, receivingMessageId.value, {
          finished: true,
          error: false,
          reasoningTime: reasoning_duration || 0
        })
      }

      streamingSync.reset()

      loading.value = false
      isReceiving.value = false
      receivingMessageId.value = null
    }
  })

  const requestOpenAICompletion = (options = {}) => {
    return requestOpenAICompletionRaw({
      baseURL: apiSettingsStore.baseURL,
      apiKey: apiSettingsStore.apiKey,
      throwIfAborted: throwIfMcpAborted,
      ...options
    })
  }

  const resolveMcpEnabledByRoom = () => {
    if (typeof currentRoom.value?.mcpEnabled === 'boolean') {
      return currentRoom.value.mcpEnabled
    }
    return mcpSettingsStore.globalEnabled
  }

  const resolveRoomSelectedMcpServerIds = () => {
    return Array.isArray(currentRoom.value?.mcpServerIds) ? [...currentRoom.value.mcpServerIds] : []
  }

  const resolveRoomSelectedKbIds = () => {
    return Array.isArray(currentRoom.value?.kbIds) ? [...currentRoom.value.kbIds] : []
  }

  const resolveActiveMcpServerIds = ({ requestedServerIds, model }) => {
    if (!apiSettingsStore.modelSupportsCapability(model, 'tool_call')) {
      return []
    }

    if (!resolveMcpEnabledByRoom()) {
      return []
    }

    const safeRequestedIds = Array.isArray(requestedServerIds) ? requestedServerIds : []
    if (!safeRequestedIds.length) {
      return []
    }

    const enabledServerSet = new Set(
      mcpSettingsStore.servers.filter(server => server.enabled).map(server => server.id)
    )

    return Array.from(new Set(safeRequestedIds)).filter(serverId => enabledServerSet.has(serverId))
  }

  const { runMcpToolCalls } = createMcpRunner({
    mcpSettingsStore,
    chatRoomsStore,
    getRoomId,
    getIsViewingReceivingBranch: () => isViewingReceivingBranch.value,
    scrollToBottom,
    syncAssistantStreamingMessage,
    requestOpenAICompletion,
    throwIfMcpAborted,
    isMcpAbortError
  })

  const sendMessageWithMcp = async ({
    assistantMessageId,
    model,
    openAIMessages,
    mcpServerIds
  }) => {
    const activeServerIds = resolveActiveMcpServerIds({
      requestedServerIds: mcpServerIds,
      model
    })

    if (!activeServerIds.length) {
      sendSSE({
        model,
        messages: openAIMessages
      })
      return
    }

    const mcpController = startMcpAbortController()

    try {
      const {
        requestMessages,
        finalAssistantMessage,
        finalUsage,
        finalAssistantMessageId,
        finalDisplayContent,
        finalDisplayReasoningContent,
        finalDisplayReasoningDuration,
        finalMcpTimeline
      } = await runMcpToolCalls({
        assistantMessageId,
        model,
        openAIMessages,
        serverIds: activeServerIds,
        signal: mcpController.signal
      })

      if (finalAssistantMessage) {
        const roomId = getRoomId()
        const finalAssistantNode =
          roomId && finalAssistantMessageId
            ? chatRoomsStore.getMessageById(roomId, finalAssistantMessageId)
            : null
        const resolvedFinalContent =
          typeof finalDisplayContent === 'string' && finalDisplayContent
            ? finalDisplayContent
            : finalAssistantMessage.content || finalAssistantNode?.content || ''
        const resolvedFinalReasoningContent =
          typeof finalDisplayReasoningContent === 'string' && finalDisplayReasoningContent
            ? finalDisplayReasoningContent
            : finalAssistantMessage.reasoning_content || finalAssistantNode?.reasoningContent || ''
        const resolvedFinalReasoningDuration =
          finalDisplayReasoningDuration || finalAssistantNode?.reasoningTime || 0

        await finalizeAssistantMessage({
          assistantMessageId: finalAssistantMessageId || assistantMessageId,
          content: resolvedFinalContent,
          reasoningContent: resolvedFinalReasoningContent,
          reasoningDuration: resolvedFinalReasoningDuration,
          usage: finalUsage || null,
          mcpTimeline: Array.isArray(finalMcpTimeline) ? finalMcpTimeline : null
        })
        return
      }

      sendSSE({
        model,
        messages: requestMessages
      })
    } catch (error) {
      if (isMcpAbortError(error)) {
        finishReceivingByAbort({
          assistantMessageId
        })
        return
      }
      console.warn('[MCP] 调用流程失败，已降级为普通对话', error)
      sendSSE({
        model,
        messages: openAIMessages
      })
    } finally {
      if (mcpAbortController === mcpController) {
        mcpAbortController = null
      }
    }
  }

  const syncPagingMetaForChildren = node => {
    if (!node || !Array.isArray(node.children) || node.children.length === 0) {
      return
    }

    const siblingCount = node.children.length
    node.children.forEach((child, index) => {
      if (!child || typeof child !== 'object') return
      child.pageIndex = index
      child.siblingCount = siblingCount
    })
  }

  const fetchChatHistory = async () => {
    const id = getRoomId()
    chatHistoryLoading.value = true

    try {
      if (!id) return
      const room = chatRoomsStore.rooms.find(r => r.id === id)
      if (!room) return

      chatRoomsStore.setCurrentRoom(id)

      const tree = chatRoomsStore.getMessageTree(id)
      const walk = node => {
        if (!node || typeof node !== 'object') return
        syncPagingMetaForChildren(node)
        if (Array.isArray(node.children) && node.children.length > 0) {
          node.children.forEach(child => walk(child))
        }
      }
      walk(tree)
    } finally {
      chatHistoryLoading.value = false
    }
  }

  /**
   * 发送消息
   * @param {Object} options - 发送选项
   */
  const sendMessage = async (payload = {}) => {
    const targetModel = payload.model || currentModelValue.value
    const sentMessage = typeof payload.message === 'string' ? payload.message : message.value
    const sentFileList = Array.isArray(payload.fileList) ? [...payload.fileList] : []
    const sentMcpServerIds = Array.isArray(payload.mcpServerIds)
      ? [...payload.mcpServerIds]
      : resolveRoomSelectedMcpServerIds()
    const effectiveMcpServerIds = apiSettingsStore.modelSupportsCapability(targetModel, 'tool_call')
      ? sentMcpServerIds
      : []
    const sentKbIds = Array.isArray(payload.kbIds) ? [...payload.kbIds] : resolveRoomSelectedKbIds()
    const storedFileList = sanitizeFileListForStorage(sentFileList)

    if (!sentMessage.trim() && sentFileList.length === 0) {
      showMessage('发送消息不可为空，请输入消息', { type: 'warning' })
      return
    }

    if (!targetModel) {
      showMessage('请先选择模型', { type: 'warning' })
      return
    }

    if (
      getImageFiles(sentFileList).length > 0 &&
      !apiSettingsStore.modelSupportsCapability(targetModel, 'vision')
    ) {
      showMessage('当前模型不支持图片识别，请切换支持视觉能力的模型', { type: 'warning' })
      return
    }

    if (loading.value || isReceiving.value) {
      return
    }

    const id = getRoomId()
    if (!id) {
      showMessage('房间不存在', { type: 'error' })
      return
    }

    if (targetModel !== currentModelValue.value) {
      currentModelValue.value = targetModel
    }

    message.value = ''

    // 创建用户消息
    const userMessageId = `user-${Date.now()}`
    const assistantMessageId = `assistant-${Date.now()}`

    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: sentMessage,
      fileList: storedFileList,
      mcpServerIds: effectiveMcpServerIds,
      createdAt: new Date().toISOString(),
      children: [],
      currentIndex: 0
    }

    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      reasoningContent: '',
      reasoningTime: 0,
      finished: false,
      error: false,
      createdAt: new Date().toISOString(),
      parentId: userMessageId,
      children: [],
      currentIndex: 0,
      model: targetModel,
      mcpLogs: []
    }

    // 添加消息到 store
    chatRoomsStore.addMessage(id, userMessage)
    chatRoomsStore.addMessage(id, assistantMessage, userMessageId)

    // 发送新消息时重置自动滚动状态
    enableAutoScroll()
    scrollToBottom(true)

    loading.value = true
    isReceiving.value = false
    receivingMessageId.value = assistantMessageId

    // 获取完整的对话历史（包括刚添加的用户消息）
    const messages = chatRoomsStore.getMessages(id)
    const openAIMessages = buildOpenAIMessages(messages, {
      supportsVision: apiSettingsStore.modelSupportsCapability(targetModel, 'vision'),
      excludeAssistantId: assistantMessageId,
      overrideImageDataUrlsByMessageId: {
        [userMessageId]: getImageDataUrls(sentFileList)
      }
    })

    // RAG 知识库检索注入
    await injectRAGContext({
      query: sentMessage,
      kbIds: sentKbIds,
      openAIMessages
    })

    await sendMessageWithMcp({
      assistantMessageId,
      model: targetModel,
      openAIMessages,
      mcpServerIds: effectiveMcpServerIds
    })
  }

  /**
   * 停止对话
   */
  const handleStopSSE = () => {
    stopMcpFlow()
    stopSSE()
  }

  const resolveUserMessageNodeFromRegenerateTarget = ({
    roomId,
    messageId = '',
    parentId = ''
  }) => {
    if (!roomId) return null

    const findUserAncestor = startNode => {
      let currentNode = startNode
      while (currentNode) {
        const role = `${currentNode?.role || ''}`.toLowerCase()
        if (role === 'user') {
          return currentNode
        }
        if (!currentNode?.parentId) {
          return null
        }
        currentNode = chatRoomsStore.getMessageById(roomId, currentNode.parentId)
      }
      return null
    }

    const tryResolve = nodeId => {
      if (!nodeId) return null
      const targetNode = chatRoomsStore.getMessageById(roomId, nodeId)
      if (!targetNode) return null
      return findUserAncestor(targetNode)
    }

    return tryResolve(messageId) || tryResolve(parentId)
  }

  /**
   * 重新生成回答
   * @param {Object} params - 参数对象
   * @param {string} params.parentId - 父消息 ID（兼容历史数据，可能不是用户消息）
   * @param {string} params.messageId - 当前助手消息 ID
   */
  const handleRegenerateAnswer = ({ parentId = '', messageId = '' } = {}) => {
    if (loading.value || isReceiving.value) {
      showMessage('正在生成回答中，请稍后再试', { type: 'warning' })
      return
    }

    const id = getRoomId()
    if (!id) {
      showMessage('无法找到对应的用户消息', { type: 'error' })
      return
    }

    const userMessageNode = resolveUserMessageNodeFromRegenerateTarget({
      roomId: id,
      messageId,
      parentId
    })

    if (!userMessageNode) {
      showMessage('无法找到对应的用户消息', { type: 'error' })
      return
    }

    // 创建新的 assistant 消息
    const newAssistantMessageId = `assistant-${Date.now()}`
    const newAssistantMessage = {
      id: newAssistantMessageId,
      role: 'assistant',
      content: '',
      reasoningContent: '',
      reasoningTime: 0,
      finished: false,
      error: false,
      createdAt: new Date().toISOString(),
      parentId: userMessageNode.id,
      children: [],
      currentIndex: 0,
      model: currentModelValue.value,
      mcpLogs: []
    }

    // 添加到用户消息的 children 中
    chatRoomsStore.addMessage(id, newAssistantMessage, userMessageNode.id)

    nextTick(async () => {
      enableAutoScroll()
      scrollToBottom(true)

      loading.value = true
      isReceiving.value = false
      receivingMessageId.value = newAssistantMessageId

      // 获取到用户消息为止的对话历史
      const allMessages = chatRoomsStore.getMessages(id)
      // 找到用户消息的位置，取其之前的消息 + 用户消息本身
      const userMsgIndex = allMessages.findIndex(msg => msg.id === userMessageNode.id)
      const messagesBeforeUser =
        userMsgIndex >= 0 ? allMessages.slice(0, userMsgIndex + 1) : allMessages
      const openAIMessages = buildOpenAIMessages(messagesBeforeUser, {
        supportsVision: currentModelSupportsVision.value
      })
      const selectedMcpServerIds = currentModelSupportsToolCall.value
        ? resolveRoomSelectedMcpServerIds()
        : []

      // RAG 知识库检索注入
      const userContent = userMessageNode.content || ''
      await injectRAGContext({
        query: userContent,
        kbIds: resolveRoomSelectedKbIds(),
        openAIMessages
      })

      await sendMessageWithMcp({
        assistantMessageId: newAssistantMessageId,
        model: currentModelValue.value,
        openAIMessages,
        mcpServerIds: selectedMcpServerIds
      })
    })
  }

  /**
   * 处理助手消息的上一页
   * @param {string} parentId - 父消息（用户消息）的 ID
   */
  const handleAssistantPrevPage = parentId => {
    const id = getRoomId()
    if (!id) return

    const userMessageNode = chatRoomsStore.getMessageById(id, parentId)

    if (userMessageNode && userMessageNode.children && userMessageNode.children.length > 0) {
      const currentIndex = userMessageNode.currentIndex ?? 0
      if (currentIndex > 0) {
        userMessageNode.currentIndex = currentIndex - 1
        syncPagingMetaForChildren(userMessageNode)

        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理助手消息的下一页
   * @param {string} parentId - 父消息（用户消息）的 ID
   */
  const handleAssistantNextPage = parentId => {
    const id = getRoomId()
    if (!id) return

    const userMessageNode = chatRoomsStore.getMessageById(id, parentId)

    if (userMessageNode && userMessageNode.children && userMessageNode.children.length > 0) {
      const currentIndex = userMessageNode.currentIndex ?? 0
      if (currentIndex < userMessageNode.children.length - 1) {
        userMessageNode.currentIndex = currentIndex + 1
        syncPagingMetaForChildren(userMessageNode)

        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理用户消息的上一页
   * @param {string} messageId - 当前用户消息的 ID
   */
  const handleUserPrevPage = messageId => {
    const id = getRoomId()
    if (!id) return

    const parentNode = chatRoomsStore.getParentNodeByMessageId(id, messageId)

    if (parentNode && parentNode.children && parentNode.children.length > 0) {
      const currentIndex = parentNode.currentIndex ?? 0
      if (currentIndex > 0) {
        parentNode.currentIndex = currentIndex - 1
        syncPagingMetaForChildren(parentNode)
        loading.value = false

        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理用户消息的下一页
   * @param {string} messageId - 当前用户消息的 ID
   */
  const handleUserNextPage = messageId => {
    const id = getRoomId()
    if (!id) return

    const parentNode = chatRoomsStore.getParentNodeByMessageId(id, messageId)

    if (parentNode && parentNode.children && parentNode.children.length > 0) {
      const currentIndex = parentNode.currentIndex ?? 0
      if (currentIndex < parentNode.children.length - 1) {
        parentNode.currentIndex = currentIndex + 1
        syncPagingMetaForChildren(parentNode)
        loading.value = false

        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理用户消息编辑
   * @param {string} messageId - 用户消息的 ID
   */
  const handleEditUserMessage = messageId => {
    if (loading.value || isReceiving.value) {
      showMessage('正在生成回答中，无法编辑', { type: 'warning' })
      return
    }
    editingMessageId.value = messageId
  }

  /**
   * 取消编辑用户消息
   */
  const handleCancelEditUserMessage = () => {
    editingMessageId.value = null
  }

  /**
   * 发送编辑后的用户消息
   * @param {Object} params - 参数对象
   * @param {string} params.messageId - 当前用户消息的 ID
   * @param {string} params.editedContent - 编辑后的内容
   */
  const handleSendEditedUserMessage = ({ messageId, editedContent }) => {
    if (!editedContent || !editedContent.trim()) {
      showMessage('消息内容不能为空', { type: 'warning' })
      return
    }

    if (loading.value || isReceiving.value) {
      showMessage('正在生成回答中，请稍后再试', { type: 'warning' })
      return
    }

    const id = getRoomId()
    if (!id) return

    const currentUserMessageNode = chatRoomsStore.getMessageById(id, messageId)

    if (!currentUserMessageNode) {
      showMessage('无法找到对应的消息', { type: 'error' })
      return
    }

    const parentNode = chatRoomsStore.getParentNodeByMessageId(id, messageId)
    if (!parentNode) {
      showMessage('无法找到父节点', { type: 'error' })
      return
    }

    // 创建新的用户消息和助手消息
    const newUserMessageId = `user-${Date.now()}`
    const newAssistantMessageId = `assistant-${Date.now()}`
    const selectedMcpServerIds = currentModelSupportsToolCall.value
      ? resolveRoomSelectedMcpServerIds()
      : []

    const newUserMessage = {
      id: newUserMessageId,
      role: 'user',
      content: editedContent,
      fileList: Array.isArray(currentUserMessageNode.fileList)
        ? [...currentUserMessageNode.fileList]
        : [],
      mcpServerIds: selectedMcpServerIds,
      createdAt: new Date().toISOString(),
      parentId: parentNode?.id || null,
      children: [],
      currentIndex: 0
    }

    const newAssistantMessage = {
      id: newAssistantMessageId,
      role: 'assistant',
      content: '',
      reasoningContent: '',
      reasoningTime: 0,
      finished: false,
      error: false,
      createdAt: new Date().toISOString(),
      parentId: newUserMessageId,
      children: [],
      currentIndex: 0,
      model: currentModelValue.value,
      mcpLogs: []
    }

    // 将新用户消息添加到父节点
    if (!parentNode.children) {
      parentNode.children = []
    }
    parentNode.children.push(newUserMessage)
    parentNode.currentIndex = parentNode.children.length - 1
    syncPagingMetaForChildren(parentNode)

    // 将助手消息添加到新用户消息
    newUserMessage.children.push(newAssistantMessage)
    syncPagingMetaForChildren(newUserMessage)

    // 预热索引，避免后续 updateMessage 首次回退到递归查找
    chatRoomsStore.getMessageById(id, newUserMessageId)
    chatRoomsStore.getMessageById(id, newAssistantMessageId)

    editingMessageId.value = null

    nextTick(async () => {
      enableAutoScroll()
      scrollToBottom(true)

      loading.value = true
      isReceiving.value = false
      receivingMessageId.value = newAssistantMessageId

      // 获取到新用户消息为止的对话历史
      const allMessages = chatRoomsStore.getMessages(id)
      const userMsgIndex = allMessages.findIndex(msg => msg.id === newUserMessageId)
      const openAIMessages = buildOpenAIMessages(allMessages.slice(0, userMsgIndex + 1), {
        supportsVision: currentModelSupportsVision.value
      })

      // RAG 知识库检索注入
      await injectRAGContext({
        query: editedContent,
        kbIds: resolveRoomSelectedKbIds(),
        openAIMessages
      })

      await sendMessageWithMcp({
        assistantMessageId: newAssistantMessageId,
        model: currentModelValue.value,
        openAIMessages,
        mcpServerIds: selectedMcpServerIds
      })
    })
  }

  return {
    // 状态
    message,
    loading,
    isReceiving,
    receivingMessageId,
    shouldShowLoading,
    isViewingReceivingBranch,
    chatHistory,
    chatHistoryTree,
    chatHistoryLoading,
    editingMessageId,

    // 滚动相关
    scrollToBottom,
    enableAutoScroll,

    // 模型相关
    models,
    currentModelValue,
    currentRoom,
    enableDeepThink,

    // 方法
    fetchChatHistory,
    sendMessage,
    stopSSE: handleStopSSE,
    handleRegenerateAnswer,
    handleAssistantPrevPage,
    handleAssistantNextPage,
    handleUserPrevPage,
    handleUserNextPage,
    handleEditUserMessage,
    handleCancelEditUserMessage,
    handleSendEditedUserMessage
  }
}
