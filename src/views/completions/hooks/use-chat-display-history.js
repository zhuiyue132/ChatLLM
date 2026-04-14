/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-chat-display-history.js
 * @Description  : Completions 聊天页消息渲染数据拼装
 */

import { computed } from 'vue'

export const useChatDisplayHistory = ({ chatHistory, loading, receivingMessageId } = {}) => {
  const normalizeAssistantText = value => {
    if (typeof value === 'string') {
      return value
    }

    if (!Array.isArray(value)) {
      return ''
    }

    return value
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && typeof item.content === 'string') {
          return item.content
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  const concatAssistantDisplayText = (baseText, incomingText) => {
    const safeBase = typeof baseText === 'string' ? baseText : ''
    const safeIncoming = typeof incomingText === 'string' ? incomingText : ''
    if (!safeIncoming) return safeBase
    if (!safeBase) return safeIncoming
    if (safeBase.endsWith('\n') || safeIncoming.startsWith('\n')) {
      return `${safeBase}${safeIncoming}`
    }
    return `${safeBase}\n${safeIncoming}`
  }

  const createAssistantTextSegment = ({
    id = '',
    content = '',
    reasoningContent = '',
    reasoningDuration = 0,
    error = false
  } = {}) => {
    return {
      id,
      type: 'assistant',
      content: normalizeAssistantText(content),
      reasoningContent: normalizeAssistantText(reasoningContent),
      reasoningDuration: Number(reasoningDuration || 0),
      error: !!error
    }
  }

  const createMcpLogSegment = (message = {}, { fallbackId = '' } = {}) => {
    return {
      id: message?.id || fallbackId,
      type: 'mcp',
      model: message?.model || '',
      status: message?.status || 'pending',
      serverName: message?.serverName || '',
      toolName: message?.toolName || '',
      durationMs: Number(message?.durationMs || 0),
      arguments: message?.arguments ?? {},
      result: message?.result ?? null,
      toolError: message?.toolError || ''
    }
  }

  const parseAssistantContentSegments = (content, { baseId = '' } = {}) => {
    if (!Array.isArray(content)) {
      return []
    }

    return content
      .map((segment, index) => {
        const fallbackId = baseId ? `${baseId}__content_${index}` : `content-${index}`

        if (typeof segment === 'string') {
          return createAssistantTextSegment({
            id: fallbackId,
            content: segment
          })
        }

        if (!segment || typeof segment !== 'object') {
          return null
        }

        const segmentType = `${segment.type || segment.role || ''}`.toLowerCase()
        if (segmentType === 'mcp' || segmentType === 'mcp-log') {
          return createMcpLogSegment(segment, {
            fallbackId
          })
        }

        return createAssistantTextSegment({
          id: segment.id || fallbackId,
          content: segment.content,
          reasoningContent: segment.reasoningContent,
          reasoningDuration: segment.reasoningDuration,
          error: segment.error
        })
      })
      .filter(Boolean)
  }

  const formatSearchMessageIds = ids => {
    const normalizedIds = (Array.isArray(ids) ? ids : [])
      .map(id => `${id || ''}`.trim())
      .filter(Boolean)

    if (normalizedIds.length === 0) {
      return ''
    }

    return `|${normalizedIds.join('|')}|`
  }

  const displayChatHistory = computed(() => {
    if (!Array.isArray(chatHistory?.value) || chatHistory.value.length === 0) {
      return []
    }

    const mcpMessageMap = new Map()
    chatHistory.value.forEach(msg => {
      if (`${msg?.role || ''}`.toLowerCase() === 'mcp' && msg?.id) {
        mcpMessageMap.set(msg.id, msg)
      }
    })

    const consumedMcpMessageIds = new Set()
    const result = []
    let pendingAssistantNode = null

    const createPendingAssistantNode = (msg, options = {}) => {
      const { forceId = '' } = options

      return {
        ...msg,
        id: forceId || msg?.id || `assistant-${Date.now()}`,
        role: 'assistant',
        sourceMessageId: msg?.id || '',
        mergedAssistantIds: msg?.id ? [msg.id] : [],
        assistantSegments: [],
        searchMessageIds: msg?.id ? [msg.id] : [],
        content: '',
        reasoningContent: '',
        reasoningTime: 0
      }
    }

    const flushPendingAssistantNode = () => {
      if (!pendingAssistantNode) return

      const assistantSegments = Array.isArray(pendingAssistantNode.assistantSegments)
        ? pendingAssistantNode.assistantSegments
        : []
      const hasMcpSegment = assistantSegments.some(segment => segment?.type === 'mcp')
      const assistantTextSegmentCount = assistantSegments.filter(
        segment => segment?.type !== 'mcp'
      ).length

      // 大多数 assistant 仅包含一段文本，不需要走分段渲染，避免 props 变化导致整页反复解析 Markdown
      if (!hasMcpSegment && assistantTextSegmentCount <= 1) {
        pendingAssistantNode.assistantSegments = undefined
      }

      if (!pendingAssistantNode.searchMessageIds.includes(pendingAssistantNode.id)) {
        pendingAssistantNode.searchMessageIds.unshift(pendingAssistantNode.id)
      }
      result.push(pendingAssistantNode)
      pendingAssistantNode = null
    }

    const appendSearchMessageId = messageId => {
      if (!pendingAssistantNode) return
      const normalizedId = `${messageId || ''}`.trim()
      if (!normalizedId) return
      if (!pendingAssistantNode.searchMessageIds.includes(normalizedId)) {
        pendingAssistantNode.searchMessageIds.push(normalizedId)
      }
    }

    const appendAssistantTextSegment = segment => {
      if (!pendingAssistantNode || !segment) return
      const normalizedSegment = createAssistantTextSegment(segment)
      const hasDisplayPayload =
        normalizedSegment.content.trim() ||
        normalizedSegment.reasoningContent.trim() ||
        normalizedSegment.error
      if (!hasDisplayPayload) return

      pendingAssistantNode.assistantSegments.push(normalizedSegment)
      pendingAssistantNode.content = concatAssistantDisplayText(
        pendingAssistantNode.content,
        normalizedSegment.content
      )
      pendingAssistantNode.reasoningContent = concatAssistantDisplayText(
        pendingAssistantNode.reasoningContent,
        normalizedSegment.reasoningContent
      )
      pendingAssistantNode.reasoningTime =
        Number(pendingAssistantNode.reasoningTime || 0) +
        Number(normalizedSegment.reasoningDuration)
      appendSearchMessageId(normalizedSegment.id)
    }

    const appendMcpLogSegment = segment => {
      if (!pendingAssistantNode || !segment) return
      const normalizedSegment = createMcpLogSegment(segment)
      const normalizedSegmentId = `${normalizedSegment.id || ''}`.trim()
      if (normalizedSegmentId) {
        const alreadyExists = pendingAssistantNode.assistantSegments.some(item => {
          return item?.type === 'mcp' && `${item?.id || ''}`.trim() === normalizedSegmentId
        })
        if (alreadyExists) {
          return
        }
      }
      pendingAssistantNode.assistantSegments.push(normalizedSegment)
      appendSearchMessageId(normalizedSegment.id)
    }

    const mergeAssistantMetadata = msg => {
      if (!pendingAssistantNode || !msg) return

      pendingAssistantNode.finished = !!msg.finished
      pendingAssistantNode.error = !!pendingAssistantNode.error || !!msg.error
      pendingAssistantNode.parentId = msg.parentId
      pendingAssistantNode.sourceMessageId = msg.id || pendingAssistantNode.sourceMessageId

      if (msg.usage) {
        pendingAssistantNode.usage = msg.usage
      }
      if (msg.model) {
        pendingAssistantNode.model = msg.model
      }
      if (Array.isArray(msg.ragSources) && msg.ragSources.length > 0) {
        pendingAssistantNode.ragSources = msg.ragSources
      }
      if (msg.id && !pendingAssistantNode.mergedAssistantIds.includes(msg.id)) {
        pendingAssistantNode.mergedAssistantIds.push(msg.id)
      }
      appendSearchMessageId(msg.id)
    }

    chatHistory.value.forEach(msg => {
      const role = `${msg?.role || ''}`.toLowerCase()

      if (role === 'user') {
        flushPendingAssistantNode()
        result.push({
          ...msg,
          searchMessageIds: [msg.id]
        })
        return
      }

      if (role === 'assistant') {
        if (!pendingAssistantNode) {
          pendingAssistantNode = createPendingAssistantNode(msg)
        }

        mergeAssistantMetadata(msg)

        const timeline = Array.isArray(msg?.mcpTimeline) ? msg.mcpTimeline : []
        if (timeline.length > 0) {
          timeline.forEach((item, segmentIndex) => {
            const textSegmentId = `${msg.id}__timeline_${segmentIndex}`
            appendAssistantTextSegment({
              id: textSegmentId,
              content: item?.content,
              reasoningContent: item?.reasoningContent,
              reasoningDuration: item?.reasoningDuration
            })

            const segmentLogIds = Array.isArray(item?.logIds) ? item.logIds.filter(Boolean) : []
            segmentLogIds.forEach((logId, logIndex) => {
              const logMessage = mcpMessageMap.get(logId)
              if (!logMessage) return
              appendMcpLogSegment({
                ...logMessage,
                id: logMessage.id || `${textSegmentId}__log_${logIndex}`
              })
              consumedMcpMessageIds.add(logId)
            })
          })
        } else {
          const contentSegments = parseAssistantContentSegments(msg?.content, {
            baseId: msg?.id
          })
          if (contentSegments.length > 0) {
            contentSegments.forEach(segment => {
              if (segment.type === 'mcp') {
                appendMcpLogSegment(segment)
                if (segment.id) {
                  consumedMcpMessageIds.add(segment.id)
                }
                return
              }
              appendAssistantTextSegment(segment)
            })
          } else {
            appendAssistantTextSegment({
              id: msg.id,
              content: msg.content,
              reasoningContent: msg.reasoningContent,
              reasoningDuration: msg.reasoningTime,
              error: msg.error
            })
          }
        }

        if (Array.isArray(msg?.mcpLogs) && msg.mcpLogs.length > 0) {
          msg.mcpLogs.forEach((logItem, logIndex) => {
            const logId = logItem?.id || `${msg.id}__mcp_${logIndex}`
            appendMcpLogSegment({
              ...logItem,
              id: logId
            })
            consumedMcpMessageIds.add(logId)
          })
        }

        return
      }

      if (role === 'mcp') {
        if (consumedMcpMessageIds.has(msg.id)) {
          return
        }

        if (!pendingAssistantNode) {
          pendingAssistantNode = createPendingAssistantNode(
            {
              ...msg,
              id: msg.parentId || msg.id,
              parentId: msg.parentId,
              model: msg.model,
              finished: true,
              error: false
            },
            {
              forceId: msg.parentId || msg.id
            }
          )
        }

        appendMcpLogSegment(msg)
        consumedMcpMessageIds.add(msg.id)
        return
      }

      flushPendingAssistantNode()
      result.push({
        ...msg,
        searchMessageIds: [msg.id]
      })
    })

    flushPendingAssistantNode()
    return result
  })

  const isAssistantMessageLoading = msg => {
    if (!loading?.value) return false
    if (!msg) return false

    const sourceMessageId = msg.sourceMessageId || msg.id
    if (sourceMessageId !== receivingMessageId?.value) return false

    if (typeof msg.segmentIndex === 'number' && typeof msg.segmentCount === 'number') {
      return msg.segmentIndex === msg.segmentCount - 1
    }

    if (Array.isArray(msg.mergedAssistantIds) && msg.mergedAssistantIds.length > 0) {
      return msg.mergedAssistantIds.includes(receivingMessageId.value)
    }

    return false
  }

  const shouldRenderAssistantMessage = msg => {
    const role = `${msg?.role || ''}`.toLowerCase()
    if (role !== 'assistant') return false

    const hasAssistantSegments =
      Array.isArray(msg?.assistantSegments) && msg.assistantSegments.length > 0
    const hasTextContent = normalizeAssistantText(msg?.content).trim().length > 0
    const hasReasoningContent = normalizeAssistantText(msg?.reasoningContent).trim().length > 0
    const hasChildren = Array.isArray(msg?.children) && msg.children.length > 0

    if (hasAssistantSegments) {
      return true
    }

    // 隐藏作为 MCP 链路桥接的空 assistant 节点，避免打乱日志时序显示
    if (!hasTextContent && !hasReasoningContent && !msg?.error && !msg?.finished && hasChildren) {
      return false
    }

    return true
  }

  const lastMessageHasError = computed(() => {
    if (displayChatHistory.value.length === 0) return false
    const lastAssistantMessage = [...displayChatHistory.value]
      .reverse()
      .find(msg => `${msg?.role || ''}`.toLowerCase() === 'assistant')
    return !!lastAssistantMessage?.error
  })

  return {
    displayChatHistory,
    formatSearchMessageIds,
    shouldRenderAssistantMessage,
    isAssistantMessageLoading,
    lastMessageHasError
  }
}
