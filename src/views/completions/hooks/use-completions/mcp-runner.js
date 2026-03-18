/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions/mcp-runner.js
 * @Description  : MCP 工具调用流程（含 OpenAI tool calls 解析/执行/回传）
 */

import { listMcpTools, callMcpTool, stringifyMcpToolResult } from '@/api/mcp'

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

export const createMcpRunner = ({
  mcpSettingsStore,
  chatRoomsStore,
  getRoomId,
  getIsViewingReceivingBranch = () => false,
  scrollToBottom = () => {},
  syncAssistantStreamingMessage = () => {},
  requestOpenAICompletion,
  throwIfMcpAborted = () => {},
  isMcpAbortError = () => false
} = {}) => {
  const safeGetRoomId = typeof getRoomId === 'function' ? getRoomId : () => ''
  const safeRequestOpenAICompletion =
    typeof requestOpenAICompletion === 'function'
      ? requestOpenAICompletion
      : () => {
          throw new Error('[MCP] requestOpenAICompletion is not available')
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

  const runMcpToolCalls = async ({
    assistantMessageId,
    model,
    openAIMessages,
    serverIds,
    signal = null
  } = {}) => {
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
    const assistantMcpLogs = []

    const normalizeTimelineItem = item => ({
      content: typeof item?.content === 'string' ? item.content : '',
      reasoningContent: typeof item?.reasoningContent === 'string' ? item.reasoningContent : '',
      reasoningDuration: Number(item?.reasoningDuration || 0),
      logIds: Array.isArray(item?.logIds) ? item.logIds.filter(Boolean) : []
    })

    const updateAssistantTimeline = timeline => {
      const roomId = safeGetRoomId()
      if (!roomId || !activeAssistantMessageId) return
      chatRoomsStore.updateMessage(roomId, activeAssistantMessageId, {
        mcpTimeline: timeline.map(normalizeTimelineItem)
      })
    }

    const normalizeMcpLogItem = item => {
      return {
        id: item?.id || `mcp-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        model: item?.model || model || null,
        status: item?.status || 'pending',
        serverId: item?.serverId || '',
        serverName: item?.serverName || 'MCP',
        toolName: item?.toolName || 'tool',
        arguments: item?.arguments ?? {},
        durationMs: Number(item?.durationMs || 0),
        result: item?.result ?? null,
        toolError: item?.toolError || '',
        createdAt: item?.createdAt || new Date().toISOString(),
        finished: true,
        error: false
      }
    }

    const syncAssistantMcpLogs = () => {
      const roomId = safeGetRoomId()
      if (!roomId || !activeAssistantMessageId) return
      chatRoomsStore.updateMessage(roomId, activeAssistantMessageId, {
        mcpLogs: assistantMcpLogs.map(log => ({
          ...log
        }))
      })
    }

    const appendMcpLogMessage = ({ parentMessageId = '', baseLog = {} } = {}) => {
      const roomId = safeGetRoomId()
      if (!roomId) return null

      const parentExists = parentMessageId
        ? !!chatRoomsStore.getMessageById(roomId, parentMessageId)
        : false
      const fallbackParentExists = mcpLogParentId
        ? !!chatRoomsStore.getMessageById(roomId, mcpLogParentId)
        : false
      const resolvedParentId = parentExists
        ? parentMessageId
        : fallbackParentExists
          ? mcpLogParentId
          : null

      const messageId =
        baseLog.id || `mcp-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const pendingLog = normalizeMcpLogItem({
        id: messageId,
        ...baseLog,
        status: 'pending',
        durationMs: 0,
        result: null,
        toolError: ''
      })
      const addedMessage = chatRoomsStore.addMessage(
        roomId,
        {
          ...pendingLog,
          role: 'mcp',
          messageType: 'mcp-log',
          content: ''
        },
        resolvedParentId
      )

      if (!chatRoomsStore.getMessageById(roomId, messageId)) {
        return null
      }

      const existingLogIndex = assistantMcpLogs.findIndex(log => log.id === messageId)
      if (existingLogIndex >= 0) {
        assistantMcpLogs[existingLogIndex] = {
          ...assistantMcpLogs[existingLogIndex],
          ...pendingLog
        }
      } else {
        assistantMcpLogs.push(pendingLog)
      }
      syncAssistantMcpLogs()

      if (getIsViewingReceivingBranch()) {
        scrollToBottom()
      }
      return addedMessage || null
    }

    const updateMcpLogMessage = (messageId, patch = {}) => {
      if (!messageId) return
      const roomId = safeGetRoomId()
      if (!roomId) return
      chatRoomsStore.updateMessage(roomId, messageId, patch)

      const existingLogIndex = assistantMcpLogs.findIndex(log => log.id === messageId)
      if (existingLogIndex >= 0) {
        assistantMcpLogs[existingLogIndex] = {
          ...assistantMcpLogs[existingLogIndex],
          ...patch
        }
      } else {
        assistantMcpLogs.push(
          normalizeMcpLogItem({
            id: messageId,
            ...patch
          })
        )
      }
      syncAssistantMcpLogs()

      if (getIsViewingReceivingBranch()) {
        scrollToBottom()
      }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      throwIfMcpAborted(signal)
      let roundDisplayContent = ''
      let roundDisplayReasoningContent = ''
      let roundDisplayReasoningDuration = 0

      const { message: responseMessage, usage: responseUsage } = await safeRequestOpenAICompletion({
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

  return {
    buildMcpToolContext,
    runMcpToolCalls
  }
}
