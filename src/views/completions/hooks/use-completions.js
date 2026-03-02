/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-03
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
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
import { listMcpTools, callMcpTool, stringifyMcpToolResult } from '@/api/mcp'
import { ILLEGAL_UNICODE_REG } from '../config'

/**
 * 单模型对话 Hook
 * @param {Object} options - 配置项
 * @param {import('vue').Ref<string>|string} options.roomId - 房间 ID（响应式引用或普通值）
 */
export function useCompletions({ roomId }) {
  const apiSettingsStore = useApiSettingsStore()
  const mcpSettingsStore = useMcpSettingsStore()
  const chatRoomsStore = useChatRoomsStore()

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

  const markReceivingStarted = () => {
    if (!receivingMessageId.value) return
    loading.value = false
    isReceiving.value = true
  }

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
    computed(() => shouldShowLoading.value && chatHistory.value.length > 0)
  )

  // 创建 OpenAI SSE 请求实例
  const { send: sendSSE, stop: stopSSE } = useOpenAISSESingle({
    baseURL: apiSettingsStore.baseURL,
    apiKey: apiSettingsStore.apiKey,
    onStart: () => {
      console.log('[OpenAI SSE] 请求开始')
    },
    onToken: ({ content, reasoning_content, reasoning_duration }) => {
      const id = getRoomId()
      if (!id || !receivingMessageId.value) return

      const hasDisplayPayload =
        (typeof content === 'string' && content.trim()) ||
        (typeof reasoning_content === 'string' && reasoning_content.trim())

      if (hasDisplayPayload) {
        markReceivingStarted()
      }

      // 更新 assistant 消息内容
      const updates = {}
      if (content) {
        updates.content = content.replaceAll(ILLEGAL_UNICODE_REG, '')
      }
      if (reasoning_content) {
        updates.reasoningContent = reasoning_content
      }
      if (reasoning_duration !== undefined) {
        updates.reasoningTime = reasoning_duration
      }

      chatRoomsStore.updateMessage(id, receivingMessageId.value, updates)

      // 滚动到底部
      if (isViewingReceivingBranch.value) {
        scrollToBottom()
      }
    },
    onDone: async ({ content, reasoning_content, reasoning_duration, usage }) => {
      console.log('[OpenAI SSE] 请求完成', {
        content,
        reasoning_content,
        reasoning_duration,
        usage
      })

      const id = getRoomId()
      const doneMessageId = receivingMessageId.value

      if (id && doneMessageId) {
        chatRoomsStore.updateMessage(id, doneMessageId, {
          finished: true,
          error: false,
          reasoningTime: reasoning_duration || 0,
          usage: usage || null
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

      loading.value = false
      isReceiving.value = false
      receivingMessageId.value = null
    }
  })

  const getImageFiles = fileList => {
    if (!Array.isArray(fileList)) return []
    return fileList.filter(file => file?.type === 'image' || file?.belong === 'image')
  }

  const getImageDataUrls = fileList => {
    return getImageFiles(fileList)
      .map(file => {
        if (typeof file?.base64 === 'string' && file.base64.startsWith('data:image/')) {
          return file.base64
        }
        if (
          typeof file?.previewBase64 === 'string' &&
          file.previewBase64.startsWith('data:image/')
        ) {
          return file.previewBase64
        }
        if (typeof file?.url === 'string' && file.url.startsWith('data:image/')) {
          return file.url
        }
        return ''
      })
      .filter(Boolean)
  }

  const sanitizeFileListForStorage = fileList => {
    if (!Array.isArray(fileList)) return []

    return fileList
      .map(file => {
        if (!file || typeof file !== 'object') return null

        const commonFields = {
          type: file.type || (file.belong === 'image' ? 'image' : 'file'),
          belong: file.belong || (file.type === 'image' ? 'image' : 'file'),
          name: file.name || '',
          size: file.size || 0,
          extension: file.extension || '',
          mimeType: file.mimeType || ''
        }

        if (commonFields.type === 'image' || commonFields.belong === 'image') {
          const previewUrlCandidate = [file.previewBase64, file.url].find(
            url => typeof url === 'string' && url.startsWith('data:image/')
          )
          const previewUrl =
            typeof previewUrlCandidate === 'string' ? previewUrlCandidate.trim() : ''

          return {
            ...commonFields,
            type: 'image',
            belong: 'image',
            url: previewUrl || null
          }
        }

        return {
          ...commonFields,
          url: typeof file.url === 'string' ? file.url : null,
          fileId: file.fileId || null,
          tokens: file.tokens || 0
        }
      })
      .filter(Boolean)
  }

  const buildOpenAIContent = (msg, options = {}) => {
    const { overrideImageDataUrls = [] } = options
    const textContent = typeof msg?.content === 'string' ? msg.content : ''

    if (msg?.role !== 'user' || !currentModelSupportsVision.value) {
      return textContent
    }

    const imageDataUrls = overrideImageDataUrls.length
      ? overrideImageDataUrls
      : getImageDataUrls(msg.fileList)
    if (!imageDataUrls.length) {
      return textContent
    }

    const content = []
    if (textContent.trim()) {
      content.push({
        type: 'text',
        text: textContent
      })
    }

    imageDataUrls.forEach(url => {
      content.push({
        type: 'image_url',
        image_url: {
          url
        }
      })
    })

    return content
  }

  const buildOpenAIMessages = (messages = [], options = {}) => {
    const { excludeAssistantId = '', overrideImageDataUrlsByMessageId = {} } = options

    return messages
      .filter(msg => {
        if (!msg?.role) return false
        if (excludeAssistantId && msg.id === excludeAssistantId && !msg.content) {
          return false
        }
        return true
      })
      .map(msg => ({
        role: msg.role,
        content: buildOpenAIContent(msg, {
          overrideImageDataUrls: Array.isArray(overrideImageDataUrlsByMessageId[msg.id])
            ? overrideImageDataUrlsByMessageId[msg.id]
            : []
        })
      }))
  }

  const requestOpenAICompletion = async ({ model, messages, tools = [] } = {}) => {
    if (!apiSettingsStore.baseURL || !apiSettingsStore.apiKey) {
      throw new Error('API 配置不完整，无法调用 MCP 工具')
    }

    const body = {
      model,
      messages,
      stream: false
    }

    if (Array.isArray(tools) && tools.length > 0) {
      body.tools = tools
      body.tool_choice = 'auto'
    }

    const response = await fetch(`${apiSettingsStore.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiSettingsStore.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText || '请求失败'}`
      )
    }

    const data = await response.json()
    return data?.choices?.[0]?.message || null
  }

  const formatServerNameForTool = name => {
    return `${name || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 16)
  }

  const formatToolNameForOpenAI = ({ server, tool }) => {
    const rawToolName = `${tool?.name || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 32)
    const rawServerName = formatServerNameForTool(server?.name || server?.id)
    const name = `mcp_${rawServerName}_${rawToolName}`.slice(0, 64)
    return name || `mcp_${Date.now()}`
  }

  const resolveMcpEnabledByRoom = () => {
    if (typeof currentRoom.value?.mcpEnabled === 'boolean') {
      return currentRoom.value.mcpEnabled
    }
    return mcpSettingsStore.globalEnabled
  }

  const resolveActiveMcpServerIds = requestedServerIds => {
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

  const buildMcpToolContext = async serverIds => {
    const availableServers = serverIds
      .map(serverId => mcpSettingsStore.getServerById(serverId))
      .filter(Boolean)
    if (!availableServers.length) {
      return { tools: [], mapping: {} }
    }

    const tools = []
    const mapping = {}

    for (const server of availableServers) {
      try {
        const toolList = await listMcpTools(server)
        toolList.forEach(tool => {
          if (!tool?.name) return
          let openAIToolName = formatToolNameForOpenAI({
            server,
            tool
          })
          if (mapping[openAIToolName]) {
            openAIToolName = `${openAIToolName}_${tools.length}`.slice(0, 64)
          }

          tools.push({
            type: 'function',
            function: {
              name: openAIToolName,
              description: `${server.name}: ${tool.description || tool.name}`.slice(0, 512),
              parameters:
                tool.inputSchema && typeof tool.inputSchema === 'object'
                  ? tool.inputSchema
                  : {
                      type: 'object',
                      properties: {}
                    }
            }
          })

          mapping[openAIToolName] = {
            serverId: server.id,
            serverName: server.name,
            toolName: tool.name
          }
        })
      } catch (error) {
        console.warn(`[MCP] 获取工具列表失败（${server.name}）`, error)
      }
    }

    return {
      tools,
      mapping
    }
  }

  const parseToolArguments = rawArguments => {
    if (!rawArguments) return {}
    if (typeof rawArguments === 'object') {
      return rawArguments
    }
    if (typeof rawArguments !== 'string') {
      return {}
    }

    try {
      const parsed = JSON.parse(rawArguments)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  const runMcpToolCalls = async ({ assistantMessageId, model, openAIMessages, serverIds }) => {
    const mcpLogs = []
    const toolContext = await buildMcpToolContext(serverIds)
    if (!toolContext.tools.length) {
      return {
        requestMessages: openAIMessages,
        mcpLogs
      }
    }

    const MAX_MCP_TOOL_ROUNDS = 6
    let requestMessages = [...openAIMessages]

    const syncMcpLogs = () => {
      if (!mcpLogs.length) return
      markReceivingStarted()
      chatRoomsStore.updateMessage(getRoomId(), assistantMessageId, {
        mcpLogs
      })
    }

    for (let roundIndex = 0; roundIndex < MAX_MCP_TOOL_ROUNDS; roundIndex += 1) {
      const responseMessage = await requestOpenAICompletion({
        model,
        messages: requestMessages,
        tools: toolContext.tools
      })
      const toolCalls = Array.isArray(responseMessage?.tool_calls) ? responseMessage.tool_calls : []

      if (!toolCalls.length) {
        return {
          requestMessages,
          mcpLogs
        }
      }

      const normalizedToolCalls = toolCalls.map((toolCall, index) => ({
        ...(toolCall || {}),
        id: toolCall?.id || `tool_call_${Date.now()}_${roundIndex}_${index}`
      }))

      const toolMessages = []
      const assistantToolCallMessage = {
        role: 'assistant',
        content: responseMessage?.content || '',
        tool_calls: normalizedToolCalls
      }

      for (const toolCall of normalizedToolCalls) {
        const startedAt = Date.now()
        const functionName = toolCall?.function?.name || ''
        const mapping = toolContext.mapping[functionName]
        const toolArguments = parseToolArguments(toolCall?.function?.arguments)
        const baseLog = {
          id: toolCall?.id || `${assistantMessageId}-tool-${startedAt}`,
          serverId: mapping?.serverId || '',
          serverName: mapping?.serverName || functionName,
          toolName: mapping?.toolName || functionName,
          arguments: toolArguments,
          durationMs: 0
        }

        if (!mapping) {
          mcpLogs.push({
            ...baseLog,
            status: 'error',
            error: '未匹配到 MCP 工具'
          })
          continue
        }

        const server = mcpSettingsStore.getServerById(mapping.serverId)
        if (!server || !server.enabled) {
          mcpLogs.push({
            ...baseLog,
            status: 'error',
            error: 'MCP 服务不可用'
          })
          continue
        }

        try {
          const toolResult = await callMcpTool(server, {
            name: mapping.toolName,
            arguments: toolArguments
          })
          const durationMs = Date.now() - startedAt
          const toolResultText = stringifyMcpToolResult(toolResult)
          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultText || ''
          })
          mcpLogs.push({
            ...baseLog,
            status: 'success',
            durationMs,
            result: toolResult
          })
        } catch (error) {
          mcpLogs.push({
            ...baseLog,
            status: 'error',
            durationMs: Date.now() - startedAt,
            error: error?.message || '工具调用失败'
          })
        }
      }

      syncMcpLogs()

      if (!toolMessages.length) {
        return {
          requestMessages,
          mcpLogs
        }
      }

      requestMessages = [...requestMessages, assistantToolCallMessage, ...toolMessages]
    }

    mcpLogs.push({
      id: `${assistantMessageId}-tool-limit`,
      serverId: '',
      serverName: 'MCP',
      toolName: 'tool_round_guard',
      arguments: {},
      durationMs: 0,
      status: 'error',
      error: `MCP 链式调用超过最大轮次限制（${MAX_MCP_TOOL_ROUNDS}）`
    })
    syncMcpLogs()

    return {
      requestMessages,
      mcpLogs
    }
  }

  const sendMessageWithMcp = async ({
    assistantMessageId,
    model,
    openAIMessages,
    mcpServerIds
  }) => {
    const activeServerIds = resolveActiveMcpServerIds(mcpServerIds)

    if (!activeServerIds.length) {
      sendSSE({
        model,
        messages: openAIMessages
      })
      return
    }

    try {
      const { requestMessages } = await runMcpToolCalls({
        assistantMessageId,
        model,
        openAIMessages,
        serverIds: activeServerIds
      })

      sendSSE({
        model,
        messages: requestMessages
      })
    } catch (error) {
      console.warn('[MCP] 调用流程失败，已降级为普通对话', error)
      sendSSE({
        model,
        messages: openAIMessages
      })
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
    const sentMcpServerIds = Array.isArray(payload.mcpServerIds) ? [...payload.mcpServerIds] : []
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
      mcpServerIds: sentMcpServerIds,
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
      excludeAssistantId: assistantMessageId,
      overrideImageDataUrlsByMessageId: {
        [userMessageId]: getImageDataUrls(sentFileList)
      }
    })

    await sendMessageWithMcp({
      assistantMessageId,
      model: targetModel,
      openAIMessages,
      mcpServerIds: sentMcpServerIds
    })
  }

  /**
   * 停止对话
   */
  const handleStopSSE = () => {
    stopSSE()
  }

  /**
   * 重新生成回答
   * @param {Object} params - 参数对象
   * @param {string} params.parentId - 父消息(用户消息)的 ID
   */
  const handleRegenerateAnswer = ({ parentId }) => {
    if (loading.value || isReceiving.value) {
      showMessage('正在生成回答中，请稍后再试', { type: 'warning' })
      return
    }

    const id = getRoomId()
    if (!id || !parentId) {
      showMessage('无法找到对应的用户消息', { type: 'error' })
      return
    }

    const tree = chatRoomsStore.getMessageTree(id)
    const userMessageNode = chatRoomsStore.findNodeById(tree, parentId)

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
      const userMsgIndex = allMessages.findIndex(msg => msg.id === parentId)
      const openAIMessages = buildOpenAIMessages(allMessages.slice(0, userMsgIndex + 1))

      await sendMessageWithMcp({
        assistantMessageId: newAssistantMessageId,
        model: currentModelValue.value,
        openAIMessages,
        mcpServerIds: Array.isArray(userMessageNode.mcpServerIds)
          ? userMessageNode.mcpServerIds
          : []
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

    const tree = chatRoomsStore.getMessageTree(id)
    const userMessageNode = chatRoomsStore.findNodeById(tree, parentId)

    if (userMessageNode && userMessageNode.children && userMessageNode.children.length > 0) {
      const currentIndex = userMessageNode.currentIndex ?? 0
      if (currentIndex > 0) {
        userMessageNode.currentIndex = currentIndex - 1

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

    const tree = chatRoomsStore.getMessageTree(id)
    const userMessageNode = chatRoomsStore.findNodeById(tree, parentId)

    if (userMessageNode && userMessageNode.children && userMessageNode.children.length > 0) {
      const currentIndex = userMessageNode.currentIndex ?? 0
      if (currentIndex < userMessageNode.children.length - 1) {
        userMessageNode.currentIndex = currentIndex + 1

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

    const tree = chatRoomsStore.getMessageTree(id)
    const parentNode = chatRoomsStore.findParentNode(tree, messageId)

    if (parentNode && parentNode.children && parentNode.children.length > 0) {
      const currentIndex = parentNode.currentIndex ?? 0
      if (currentIndex > 0) {
        parentNode.currentIndex = currentIndex - 1
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

    const tree = chatRoomsStore.getMessageTree(id)
    const parentNode = chatRoomsStore.findParentNode(tree, messageId)

    if (parentNode && parentNode.children && parentNode.children.length > 0) {
      const currentIndex = parentNode.currentIndex ?? 0
      if (currentIndex < parentNode.children.length - 1) {
        parentNode.currentIndex = currentIndex + 1
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

    const tree = chatRoomsStore.getMessageTree(id)
    const currentUserMessageNode = chatRoomsStore.findNodeById(tree, messageId)

    if (!currentUserMessageNode) {
      showMessage('无法找到对应的消息', { type: 'error' })
      return
    }

    const parentNode = chatRoomsStore.findParentNode(tree, messageId)
    if (!parentNode) {
      showMessage('无法找到父节点', { type: 'error' })
      return
    }

    // 创建新的用户消息和助手消息
    const newUserMessageId = `user-${Date.now()}`
    const newAssistantMessageId = `assistant-${Date.now()}`

    const newUserMessage = {
      id: newUserMessageId,
      role: 'user',
      content: editedContent,
      fileList: Array.isArray(currentUserMessageNode.fileList)
        ? [...currentUserMessageNode.fileList]
        : [],
      mcpServerIds: Array.isArray(currentUserMessageNode.mcpServerIds)
        ? [...currentUserMessageNode.mcpServerIds]
        : [],
      createdAt: new Date().toISOString(),
      parentId: parentNode === tree ? null : parentNode.id,
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

    // 将助手消息添加到新用户消息
    newUserMessage.children.push(newAssistantMessage)

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
      const openAIMessages = buildOpenAIMessages(allMessages.slice(0, userMsgIndex + 1))

      await sendMessageWithMcp({
        assistantMessageId: newAssistantMessageId,
        model: currentModelValue.value,
        openAIMessages,
        mcpServerIds: Array.isArray(newUserMessage.mcpServerIds) ? newUserMessage.mcpServerIds : []
      })
    })
  }

  /**
   * 获取聊天历史（兼容旧接口）
   */
  const fetchChatHistory = () => {
    // 从 store 获取，无需额外请求
    return Promise.resolve()
  }

  return {
    // 状态
    message,
    loading,
    isReceiving,
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

    // 旧接口兼容（设为不可见以隐藏相关 UI）
    isDeepThinkButtonVisible: computed(() => false),
    isFileButtonVisible: computed(() => false),
    isUploadFileButtonVisible: computed(() => false),
    isCreateImageButtonVisible: computed(() => false),
    isCreateImageCountVisible: computed(() => false),
    enableCreateImage: ref(false),
    createImageCount: ref(1),

    // 方法
    sendMessage,
    stopSSE: handleStopSSE,
    fetchChatHistory,
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
