/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-03
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-03
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
      syncAssistantStreamingMessage({
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
    const supportedRoles = new Set(['system', 'user', 'assistant', 'tool'])

    return messages
      .filter(msg => {
        if (!msg?.role) return false
        const normalizedRole = `${msg.role}`.toLowerCase()
        if (!supportedRoles.has(normalizedRole)) return false
        if (
          normalizedRole === 'assistant' &&
          excludeAssistantId &&
          msg.id === excludeAssistantId &&
          !msg.content
        ) {
          return false
        }
        return true
      })
      .map(msg => {
        const normalizedRole = `${msg.role}`.toLowerCase()
        return {
          role: normalizedRole,
          content: buildOpenAIContent(msg, {
            overrideImageDataUrls: Array.isArray(overrideImageDataUrlsByMessageId[msg.id])
              ? overrideImageDataUrlsByMessageId[msg.id]
              : []
          })
        }
      })
  }

  const parseSSEDataLine = line => {
    if (!line || line.startsWith(':') || !line.startsWith('data:')) {
      return null
    }

    const data = line.slice(5).trim()
    if (!data) return null
    if (data === '[DONE]') {
      return { done: true }
    }

    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  const parseOpenAIStreamMessage = async (response, callbacks = {}, options = {}) => {
    const { onDelta = () => {}, onToolCallDetected = () => {} } = callbacks
    const { signal = null } = options
    throwIfMcpAborted(signal)
    const reader = response.body?.getReader?.()
    if (!reader) {
      const data = await response.json().catch(() => ({}))
      const message = data?.choices?.[0]?.message || null
      const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : []
      if (message) {
        onDelta({
          content: message?.content || '',
          reasoning_content: message?.reasoning_content || '',
          reasoning_duration: 0
        })
      }
      if (toolCalls.length > 0) {
        onToolCallDetected()
      }
      return {
        message,
        usage: data?.usage || null
      }
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let usage = null
    let role = 'assistant'
    let content = ''
    let reasoningContent = ''
    let hasToolCalls = false
    const toolCallChunks = new Map()
    let reasoningStartTime = null
    let reasoningDuration = 0

    const maybeEmitDelta = () => {
      if (hasToolCalls) return
      onDelta({
        content,
        reasoning_content: reasoningContent,
        reasoning_duration: reasoningDuration
      })
    }

    const applyChunk = chunk => {
      if (!chunk || chunk.done) return

      if (chunk.usage) {
        usage = chunk.usage
      }

      const choice = chunk.choices?.[0]
      if (!choice) return
      const delta = choice.delta || {}

      if (typeof delta.role === 'string' && delta.role) {
        role = delta.role
      }
      if (typeof delta.content === 'string') {
        if (reasoningStartTime && reasoningDuration === 0) {
          reasoningDuration = Date.now() - reasoningStartTime
        }
        content += delta.content
        maybeEmitDelta()
      }
      if (typeof delta.reasoning_content === 'string') {
        if (!reasoningStartTime) {
          reasoningStartTime = Date.now()
        }
        reasoningContent += delta.reasoning_content
        maybeEmitDelta()
      }

      if (Array.isArray(delta.tool_calls)) {
        if (delta.tool_calls.length > 0 && !hasToolCalls) {
          hasToolCalls = true
          onToolCallDetected()
        }
        delta.tool_calls.forEach((toolCallDelta, index) => {
          const deltaIndex = Number.isInteger(toolCallDelta?.index) ? toolCallDelta.index : index
          if (!toolCallChunks.has(deltaIndex)) {
            toolCallChunks.set(deltaIndex, {
              id: '',
              type: 'function',
              function: {
                name: '',
                arguments: ''
              }
            })
          }

          const current = toolCallChunks.get(deltaIndex)
          if (typeof toolCallDelta?.id === 'string' && toolCallDelta.id) {
            current.id = toolCallDelta.id
          }
          if (typeof toolCallDelta?.type === 'string' && toolCallDelta.type) {
            current.type = toolCallDelta.type
          }

          const functionDelta = toolCallDelta?.function
          if (functionDelta && typeof functionDelta === 'object') {
            if (typeof functionDelta.name === 'string') {
              current.function.name += functionDelta.name
            }
            if (typeof functionDelta.arguments === 'string') {
              current.function.arguments += functionDelta.arguments
            }
          }
        })
      }
    }

    const processLine = line => {
      const parsed = parseSSEDataLine(line)
      if (parsed?.done) return true
      if (parsed) applyChunk(parsed)
      return false
    }

    const buildToolCalls = () =>
      Array.from(toolCallChunks.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, toolCall], toolCallIndex) => ({
          id: toolCall.id || `tool_call_${Date.now()}_${toolCallIndex}`,
          type: toolCall.type || 'function',
          function: {
            name: toolCall.function?.name || '',
            arguments: toolCall.function?.arguments || ''
          }
        }))
        .filter(toolCall => {
          return toolCall.function?.name || (toolCall.function?.arguments || '').trim().length > 0
        })

    // eslint-disable-next-line no-constant-condition
    while (true) {
      throwIfMcpAborted(signal)
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const rawLine of lines) {
        const trimmedLine = rawLine.trim()
        if (!trimmedLine) continue
        if (processLine(trimmedLine)) {
          return {
            message: {
              role,
              content,
              reasoning_content: reasoningContent,
              tool_calls: buildToolCalls()
            },
            usage
          }
        }
      }
    }

    if (buffer.trim()) {
      processLine(buffer.trim())
    }
    throwIfMcpAborted(signal)

    if (reasoningStartTime && reasoningDuration === 0) {
      reasoningDuration = Date.now() - reasoningStartTime
      maybeEmitDelta()
    }

    const message = {
      role,
      content,
      reasoning_content: reasoningContent
    }
    const toolCalls = buildToolCalls()

    if (toolCalls.length > 0) {
      message.tool_calls = toolCalls
    }

    return {
      message,
      usage
    }
  }

  const requestOpenAICompletion = async ({
    model,
    messages,
    tools = [],
    onDelta = () => {},
    onToolCallDetected = () => {},
    signal = null
  } = {}) => {
    if (!apiSettingsStore.baseURL || !apiSettingsStore.apiKey) {
      throw new Error('API 配置不完整，无法调用 MCP 工具')
    }
    throwIfMcpAborted(signal)

    const body = {
      model,
      messages,
      stream: true
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
      body: JSON.stringify(body),
      signal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText || '请求失败'}`
      )
    }

    const contentType = response.headers.get('Content-Type') || ''
    if (!contentType.includes('text/event-stream')) {
      const data = await response.json().catch(() => ({}))
      const message = data?.choices?.[0]?.message || null
      const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : []
      if (message) {
        onDelta({
          content: message?.content || '',
          reasoning_content: message?.reasoning_content || '',
          reasoning_duration: 0
        })
      }
      if (toolCalls.length > 0) {
        onToolCallDetected()
      }

      return {
        message,
        usage: data?.usage || null
      }
    }

    return parseOpenAIStreamMessage(
      response,
      {
        onDelta,
        onToolCallDetected
      },
      {
        signal
      }
    )
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

  const resolveRoomSelectedMcpServerIds = () => {
    return Array.isArray(currentRoom.value?.mcpServerIds) ? [...currentRoom.value.mcpServerIds] : []
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

  const buildMcpToolContext = async (serverIds, { signal = null } = {}) => {
    const availableServers = serverIds
      .map(serverId => mcpSettingsStore.getServerById(serverId))
      .filter(Boolean)
    if (!availableServers.length) {
      return { tools: [], mapping: {} }
    }

    const tools = []
    const mapping = {}

    for (const server of availableServers) {
      throwIfMcpAborted(signal)
      try {
        const toolList = await listMcpTools(server, {
          signal
        })
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
        if (isMcpAbortError(error)) {
          throw error
        }
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

  const concatAssistantContent = (baseContent, incomingContent) => {
    const safeBase = typeof baseContent === 'string' ? baseContent : ''
    const safeIncoming = typeof incomingContent === 'string' ? incomingContent : ''
    if (!safeIncoming) return safeBase
    if (!safeBase) return safeIncoming
    if (safeBase.endsWith('\n') || safeIncoming.startsWith('\n')) {
      return `${safeBase}${safeIncoming}`
    }
    return `${safeBase}\n${safeIncoming}`
  }

  const runMcpToolCalls = async ({
    assistantMessageId,
    model,
    openAIMessages,
    serverIds,
    signal = null
  }) => {
    throwIfMcpAborted(signal)
    const toolContext = await buildMcpToolContext(serverIds, {
      signal
    })
    if (!toolContext.tools.length) {
      return {
        requestMessages: openAIMessages,
        finalAssistantMessage: null,
        finalUsage: null,
        finalAssistantMessageId: assistantMessageId,
        finalDisplayContent: '',
        finalDisplayReasoningContent: '',
        finalDisplayReasoningDuration: 0
      }
    }

    let requestMessages = [...openAIMessages]
    let roundIndex = 0
    const activeAssistantMessageId = assistantMessageId
    let mcpLogParentId = assistantMessageId
    let mergedDisplayContent = ''
    let mergedDisplayReasoningContent = ''
    let mergedDisplayReasoningDuration = 0
    const assistantTimeline = []

    const normalizeTimelineItem = item => ({
      content: typeof item?.content === 'string' ? item.content : '',
      reasoningContent: typeof item?.reasoningContent === 'string' ? item.reasoningContent : '',
      reasoningDuration: Number(item?.reasoningDuration || 0),
      logIds: Array.isArray(item?.logIds) ? item.logIds.filter(Boolean) : []
    })

    const updateAssistantTimeline = timeline => {
      const roomId = getRoomId()
      if (!roomId || !activeAssistantMessageId) return
      chatRoomsStore.updateMessage(roomId, activeAssistantMessageId, {
        mcpTimeline: timeline.map(normalizeTimelineItem)
      })
    }

    const appendMcpLogMessage = ({ parentMessageId = '', baseLog = {} } = {}) => {
      const roomId = getRoomId()
      if (!roomId) return null

      const tree = chatRoomsStore.getMessageTree(roomId)
      const parentExists = parentMessageId
        ? !!chatRoomsStore.findNodeById(tree, parentMessageId)
        : false
      const fallbackParentExists = mcpLogParentId
        ? !!chatRoomsStore.findNodeById(tree, mcpLogParentId)
        : false
      const resolvedParentId = parentExists
        ? parentMessageId
        : fallbackParentExists
          ? mcpLogParentId
          : null

      const messageId =
        baseLog.id || `mcp-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const addedMessage = chatRoomsStore.addMessage(
        roomId,
        {
          id: messageId,
          role: 'mcp',
          messageType: 'mcp-log',
          content: '',
          model: baseLog.model || model || null,
          status: 'pending',
          serverId: baseLog.serverId || '',
          serverName: baseLog.serverName || 'MCP',
          toolName: baseLog.toolName || 'tool',
          arguments: baseLog.arguments || {},
          durationMs: 0,
          result: null,
          toolError: '',
          createdAt: new Date().toISOString(),
          finished: true,
          error: false
        },
        resolvedParentId
      )

      if (!chatRoomsStore.findNodeById(tree, messageId)) {
        return null
      }

      if (isViewingReceivingBranch.value) {
        scrollToBottom()
      }
      return addedMessage || null
    }

    const updateMcpLogMessage = (messageId, patch = {}) => {
      if (!messageId) return
      const roomId = getRoomId()
      if (!roomId) return
      chatRoomsStore.updateMessage(roomId, messageId, patch)
      if (isViewingReceivingBranch.value) {
        scrollToBottom()
      }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      throwIfMcpAborted(signal)
      let roundDisplayContent = ''
      let roundDisplayReasoningContent = ''
      let roundDisplayReasoningDuration = 0

      const { message: responseMessage, usage: responseUsage } = await requestOpenAICompletion({
        model,
        messages: requestMessages,
        tools: toolContext.tools,
        signal,
        onDelta: ({ content, reasoning_content, reasoning_duration }) => {
          roundDisplayContent = typeof content === 'string' ? content : ''
          roundDisplayReasoningContent =
            typeof reasoning_content === 'string' ? reasoning_content : ''
          roundDisplayReasoningDuration =
            typeof reasoning_duration === 'number' ? reasoning_duration : 0

          const hasDisplayPayload =
            (typeof roundDisplayContent === 'string' && roundDisplayContent.trim()) ||
            (typeof roundDisplayReasoningContent === 'string' &&
              roundDisplayReasoningContent.trim())

          if (!hasDisplayPayload) {
            return
          }

          const streamingContent = concatAssistantContent(mergedDisplayContent, roundDisplayContent)
          const streamingReasoningContent = concatAssistantContent(
            mergedDisplayReasoningContent,
            roundDisplayReasoningContent
          )
          const streamingReasoningDuration =
            mergedDisplayReasoningDuration + roundDisplayReasoningDuration

          syncAssistantStreamingMessage({
            assistantMessageId: activeAssistantMessageId,
            content: streamingContent,
            reasoningContent: streamingReasoningContent,
            reasoningDuration: streamingReasoningDuration
          })
          updateAssistantTimeline([
            ...assistantTimeline,
            {
              content: roundDisplayContent,
              reasoningContent: roundDisplayReasoningContent,
              reasoningDuration: roundDisplayReasoningDuration,
              logIds: []
            }
          ])
        }
      })

      const resolvedRoundContent =
        roundDisplayContent ||
        (typeof responseMessage?.content === 'string' ? responseMessage.content : '')
      const resolvedRoundReasoningContent =
        roundDisplayReasoningContent ||
        (typeof responseMessage?.reasoning_content === 'string'
          ? responseMessage.reasoning_content
          : '')

      if (
        resolvedRoundContent ||
        resolvedRoundReasoningContent ||
        roundDisplayReasoningDuration > 0
      ) {
        mergedDisplayContent = concatAssistantContent(mergedDisplayContent, resolvedRoundContent)
        mergedDisplayReasoningContent = concatAssistantContent(
          mergedDisplayReasoningContent,
          resolvedRoundReasoningContent
        )
        mergedDisplayReasoningDuration += roundDisplayReasoningDuration

        syncAssistantStreamingMessage({
          assistantMessageId: activeAssistantMessageId || assistantMessageId,
          content: mergedDisplayContent,
          reasoningContent: mergedDisplayReasoningContent,
          reasoningDuration: mergedDisplayReasoningDuration
        })
      }

      const toolCalls = Array.isArray(responseMessage?.tool_calls) ? responseMessage.tool_calls : []
      const roundTimelineItem = {
        content: resolvedRoundContent,
        reasoningContent: resolvedRoundReasoningContent,
        reasoningDuration: roundDisplayReasoningDuration,
        logIds: []
      }

      if (!toolCalls.length) {
        assistantTimeline.push(roundTimelineItem)
        updateAssistantTimeline(assistantTimeline)
        return {
          requestMessages,
          finalAssistantMessage: responseMessage,
          finalUsage: responseUsage,
          finalAssistantMessageId: activeAssistantMessageId || assistantMessageId,
          finalDisplayContent:
            mergedDisplayContent || resolvedRoundContent || responseMessage?.content || '',
          finalDisplayReasoningContent:
            mergedDisplayReasoningContent ||
            resolvedRoundReasoningContent ||
            responseMessage?.reasoning_content ||
            '',
          finalDisplayReasoningDuration: mergedDisplayReasoningDuration,
          finalMcpTimeline: assistantTimeline.map(normalizeTimelineItem)
        }
      }

      const normalizedToolCalls = toolCalls.map((toolCall, index) => ({
        ...(toolCall || {}),
        id:
          toolCall?.id ||
          `tool_call_${Date.now()}_${roundIndex}_${index}_${Math.random().toString(36).slice(2, 6)}`
      }))

      const toolMessages = []
      const assistantToolCallMessage = {
        role: 'assistant',
        content: responseMessage?.content || '',
        tool_calls: normalizedToolCalls
      }
      const roundLogIds = []

      for (let callIndex = 0; callIndex < normalizedToolCalls.length; callIndex += 1) {
        throwIfMcpAborted(signal)
        const toolCall = normalizedToolCalls[callIndex]
        const startedAt = Date.now()
        const functionName = toolCall?.function?.name || ''
        const mapping = toolContext.mapping[functionName]
        const toolArguments = parseToolArguments(toolCall?.function?.arguments)
        const logId = `mcp-log-${Date.now()}-${roundIndex}-${callIndex}-${Math.random()
          .toString(36)
          .slice(2, 8)}`
        const baseLog = {
          id: logId,
          model,
          serverId: mapping?.serverId || '',
          serverName: mapping?.serverName || functionName,
          toolName: mapping?.toolName || functionName,
          arguments: toolArguments,
          durationMs: 0
        }

        const logMessage = appendMcpLogMessage({
          parentMessageId: mcpLogParentId,
          baseLog
        })
        if (logMessage?.id) {
          mcpLogParentId = logMessage.id
          roundLogIds.push(logMessage.id)
        }
        const patchCurrentLog = patch => {
          if (!logMessage?.id) return
          updateMcpLogMessage(logMessage.id, patch)
        }

        if (!mapping) {
          patchCurrentLog({
            status: 'error',
            durationMs: Date.now() - startedAt,
            toolError: '未匹配到 MCP 工具'
          })
          continue
        }

        const server = mcpSettingsStore.getServerById(mapping.serverId)
        if (!server || !server.enabled) {
          patchCurrentLog({
            status: 'error',
            durationMs: Date.now() - startedAt,
            toolError: 'MCP 服务不可用'
          })
          continue
        }

        try {
          throwIfMcpAborted(signal)
          const toolResult = await callMcpTool(
            server,
            {
              name: mapping.toolName,
              arguments: toolArguments
            },
            {
              signal
            }
          )
          const durationMs = Date.now() - startedAt
          const toolResultText = stringifyMcpToolResult(toolResult)
          toolMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolResultText || ''
          })
          patchCurrentLog({
            status: 'success',
            durationMs,
            result: toolResult,
            toolError: ''
          })
        } catch (error) {
          if (isMcpAbortError(error)) {
            patchCurrentLog({
              status: 'error',
              durationMs: Date.now() - startedAt,
              toolError: '用户已停止'
            })
            throw error
          }
          patchCurrentLog({
            status: 'error',
            durationMs: Date.now() - startedAt,
            toolError: error?.message || '工具调用失败'
          })
        }
      }

      if (!toolMessages.length) {
        roundTimelineItem.logIds = roundLogIds
        assistantTimeline.push(roundTimelineItem)
        updateAssistantTimeline(assistantTimeline)
        return {
          requestMessages,
          finalAssistantMessage: null,
          finalUsage: null,
          finalAssistantMessageId: activeAssistantMessageId || assistantMessageId,
          finalDisplayContent: mergedDisplayContent || resolvedRoundContent,
          finalDisplayReasoningContent:
            mergedDisplayReasoningContent || resolvedRoundReasoningContent,
          finalDisplayReasoningDuration: mergedDisplayReasoningDuration,
          finalMcpTimeline: assistantTimeline.map(normalizeTimelineItem)
        }
      }

      roundTimelineItem.logIds = roundLogIds
      assistantTimeline.push(roundTimelineItem)
      updateAssistantTimeline(assistantTimeline)
      requestMessages = [...requestMessages, assistantToolCallMessage, ...toolMessages]
      roundIndex += 1
    }
  }

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
        const tree = roomId ? chatRoomsStore.getMessageTree(roomId) : null
        const finalAssistantNode =
          roomId && tree && finalAssistantMessageId
            ? chatRoomsStore.findNodeById(tree, finalAssistantMessageId)
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
      excludeAssistantId: assistantMessageId,
      overrideImageDataUrlsByMessageId: {
        [userMessageId]: getImageDataUrls(sentFileList)
      }
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

  const resolveUserMessageNodeFromRegenerateTarget = ({ tree, messageId = '', parentId = '' }) => {
    if (!tree) return null

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
        currentNode = chatRoomsStore.findNodeById(tree, currentNode.parentId)
      }
      return null
    }

    const tryResolve = nodeId => {
      if (!nodeId) return null
      const targetNode = chatRoomsStore.findNodeById(tree, nodeId)
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

    const tree = chatRoomsStore.getMessageTree(id)
    const userMessageNode = resolveUserMessageNodeFromRegenerateTarget({
      tree,
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
      const openAIMessages = buildOpenAIMessages(messagesBeforeUser)
      const selectedMcpServerIds = currentModelSupportsToolCall.value
        ? resolveRoomSelectedMcpServerIds()
        : []

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
