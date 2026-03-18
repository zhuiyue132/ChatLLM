/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions/openai-stream.js
 * @Description  : OpenAI ChatCompletion 流式解析（用于 MCP 工具调用流程）
 */

const safeThrowIfAborted = throwIfAborted => {
  return typeof throwIfAborted === 'function' ? throwIfAborted : () => {}
}

export const parseSSEDataLine = line => {
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

export const parseOpenAIStreamMessage = async (response, callbacks = {}, options = {}) => {
  const { onDelta = () => {}, onToolCallDetected = () => {} } = callbacks
  const { signal = null, throwIfAborted } = options
  const throwIfSignalAborted = safeThrowIfAborted(throwIfAborted)
  throwIfSignalAborted(signal)

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
    throwIfSignalAborted(signal)
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
  throwIfSignalAborted(signal)

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

export const requestOpenAICompletion = async ({
  baseURL,
  apiKey,
  model,
  messages,
  tools = [],
  onDelta = () => {},
  onToolCallDetected = () => {},
  signal = null,
  throwIfAborted
} = {}) => {
  if (!baseURL || !apiKey) {
    throw new Error('API 配置不完整，无法调用 MCP 工具')
  }
  const throwIfSignalAborted = safeThrowIfAborted(throwIfAborted)
  throwIfSignalAborted(signal)

  const body = {
    model,
    messages,
    stream: true
  }

  if (Array.isArray(tools) && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(`${baseURL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
      signal,
      throwIfAborted: throwIfSignalAborted
    }
  )
}
