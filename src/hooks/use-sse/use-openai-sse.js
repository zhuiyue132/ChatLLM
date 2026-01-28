/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/hooks/use-sse/use-openai-sse.js
 * @Description  : OpenAI API SSE 请求钩子，支持标准 v1/chat/completions 接口
 */

import { ref, reactive, onUnmounted, shallowRef } from 'vue'

/**
 * SSE 连接状态
 */
export const OpenAISSEStatus = {
  IDLE: 'idle', // 空闲
  CONNECTING: 'connecting', // 正在连接
  STREAMING: 'streaming', // 正在接收流
  DONE: 'done', // 完成
  ERROR: 'error', // 错误
  ABORTED: 'aborted' // 用户主动停止
}

/**
 * 创建一个独立的 SSE 请求实例
 * 每个实例有独立的状态，互不干扰
 *
 * @param {Object} options 配置项
 * @returns {Object} 请求实例
 */
export const createOpenAISSERequest = (options = {}) => {
  const {
    baseURL = '',
    apiKey = '',
    defaultHeaders = {},
    onStart = () => {},
    onToken = () => {},
    onDone = () => {},
    onError = () => {},
    onAbort = () => {}
  } = options

  console.log('baseURL', baseURL)
  console.log('apiKey', apiKey)
  console.log('defaultHeaders', defaultHeaders)
  console.log('onStart', onStart)
  console.log('onToken', onToken)
  console.log('onDone', onDone)
  console.log('onError', onError)
  console.log('onAbort', onAbort)
  console.log('options', options)

  // 请求 ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  // 当前连接状态
  const status = ref(OpenAISSEStatus.IDLE)
  // 错误对象
  const error = shallowRef(null)
  // AbortController 用于取消请求
  let abortController = null
  // 累积的完整内容
  const content = ref('')
  // 累积的推理内容（用于 o1 等模型）
  const reasoningContent = ref('')
  // token 使用情况
  const usage = shallowRef(null)

  /**
   * 解析 SSE 数据行
   */
  const parseSSELine = line => {
    if (!line || line.startsWith(':')) {
      return null
    }

    if (line.startsWith('data: ')) {
      const data = line.slice(6)
      if (data === '[DONE]') {
        return { done: true }
      }
      try {
        return JSON.parse(data)
      } catch {
        return null
      }
    }
    return null
  }

  /**
   * 处理 SSE 流中的 chunk
   */
  const processChunk = chunk => {
    if (!chunk || chunk.done) return

    const choice = chunk.choices?.[0]
    if (!choice) return

    const delta = choice.delta || {}

    if (delta.content) {
      content.value += delta.content
      onToken({
        token: delta.content,
        content: content.value,
        reasoning_content: reasoningContent.value,
        requestId
      })
    }

    if (delta.reasoning_content) {
      reasoningContent.value += delta.reasoning_content
      onToken({
        token: delta.reasoning_content,
        content: content.value,
        reasoning_content: reasoningContent.value,
        isReasoning: true,
        requestId
      })
    }

    // 处理图片数据，转换为 HTML img 标签
    if (delta.images && Array.isArray(delta.images)) {
      const imageHtml = delta.images
        .map(img => {
          const url = img.image_url?.url || img.url || ''
          return url
            ? `<div class="sse-image-wrapper"><img src="${url}" style="max-width: 512px; max-height: 512px;" /></div>`
            : ''
        })
        .filter(Boolean)
        .join('\n')

      if (imageHtml) {
        content.value += `\n\n${imageHtml}\n\n`
        onToken({
          token: imageHtml,
          content: content.value,
          reasoning_content: reasoningContent.value,
          requestId
        })
      }
    }

    if (chunk.usage) {
      usage.value = chunk.usage
    }
  }

  /**
   * 发送请求
   */
  const send = async params => {
    const {
      model,
      messages,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      headers = {},
      endpoint = '/v1/chat/completions',
      extraBody = {}
    } = params

    if (status.value === OpenAISSEStatus.CONNECTING || status.value === OpenAISSEStatus.STREAMING) {
      return
    }

    status.value = OpenAISSEStatus.CONNECTING
    error.value = null
    content.value = ''
    reasoningContent.value = ''
    usage.value = null

    abortController = new AbortController()

    const body = {
      model,
      messages,
      stream: true,
      ...extraBody
    }

    if (temperature !== undefined) body.temperature = temperature
    if (max_tokens !== undefined) body.max_tokens = max_tokens
    if (top_p !== undefined) body.top_p = top_p
    if (frequency_penalty !== undefined) body.frequency_penalty = frequency_penalty
    if (presence_penalty !== undefined) body.presence_penalty = presence_penalty

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...headers
    }

    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`
    }

    try {
      onStart({ requestId })

      console.log(`${baseURL}${endpoint}`)
      console.log('requestHeaders', requestHeaders)
      console.log('body', JSON.stringify(body))
      console.log('abortController.signal', abortController.signal)

      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(body),
        signal: abortController.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const contentType = response.headers.get('Content-Type') || ''
      if (!contentType.includes('text/event-stream')) {
        const data = await response.json()
        content.value = data.choices?.[0]?.message?.content || ''
        reasoningContent.value = data.choices?.[0]?.message?.reasoning_content || ''
        usage.value = data.usage
        status.value = OpenAISSEStatus.DONE
        onDone({
          content: content.value,
          reasoning_content: reasoningContent.value,
          usage: usage.value,
          requestId
        })
        return
      }

      status.value = OpenAISSEStatus.STREAMING

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          const parsed = parseSSELine(trimmedLine)
          if (parsed?.done) break
          if (parsed) processChunk(parsed)
        }
      }

      if (buffer.trim()) {
        const parsed = parseSSELine(buffer.trim())
        if (parsed && !parsed.done) processChunk(parsed)
      }

      status.value = OpenAISSEStatus.DONE
      onDone({
        content: content.value,
        reasoning_content: reasoningContent.value,
        usage: usage.value,
        requestId
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        status.value = OpenAISSEStatus.ABORTED
        onAbort({
          content: content.value,
          reasoning_content: reasoningContent.value,
          requestId
        })
        return
      }

      status.value = OpenAISSEStatus.ERROR
      error.value = err
      onError({ error: err, requestId })
    }
  }

  /**
   * 停止请求
   */
  const stop = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    stop()
    status.value = OpenAISSEStatus.IDLE
    error.value = null
    content.value = ''
    reasoningContent.value = ''
    usage.value = null
  }

  return {
    requestId,
    status,
    error,
    content,
    reasoningContent,
    usage,
    send,
    stop,
    reset
  }
}

/**
 * OpenAI SSE 请求管理器
 * 支持同时管理多个独立的请求
 *
 * @param {Object} options 配置项
 * @param {string} options.baseURL API 基础地址
 * @param {string} options.apiKey API 密钥
 * @param {Object} options.defaultHeaders 默认请求头
 * @returns {Object} 请求管理器
 */
export const useOpenAISSE = (options = {}) => {
  const { baseURL = '', apiKey = '', defaultHeaders = {} } = options

  // 存储所有活跃的请求实例 Map<requestId, request>
  const requests = reactive(new Map())

  /**
   * 创建并发送一个新请求
   * @param {Object} params 请求参数
   * @param {Object} callbacks 回调函数
   * @returns {Object} 请求实例
   */
  const send = (params, callbacks = {}) => {
    const request = createOpenAISSERequest({
      baseURL,
      apiKey,
      defaultHeaders,
      onStart: data => {
        callbacks.onStart?.(data)
      },
      onToken: data => {
        callbacks.onToken?.(data)
      },
      onDone: data => {
        callbacks.onDone?.(data)
        // 完成后从活跃请求中移除
        requests.delete(request.requestId)
      },
      onError: data => {
        callbacks.onError?.(data)
        requests.delete(request.requestId)
      },
      onAbort: data => {
        callbacks.onAbort?.(data)
        requests.delete(request.requestId)
      }
    })

    // 添加到活跃请求
    requests.set(request.requestId, request)

    // 发送请求
    request.send(params)

    return request
  }

  /**
   * 停止指定请求
   * @param {string} requestId 请求 ID
   */
  const stop = requestId => {
    const request = requests.get(requestId)
    if (request) {
      request.stop()
    }
  }

  /**
   * 停止所有请求
   */
  const stopAll = () => {
    requests.forEach(request => {
      request.stop()
    })
  }

  /**
   * 获取指定请求
   * @param {string} requestId 请求 ID
   * @returns {Object|undefined} 请求实例
   */
  const getRequest = requestId => {
    return requests.get(requestId)
  }

  /**
   * 获取所有活跃请求的 ID
   * @returns {string[]} 请求 ID 列表
   */
  const getActiveRequestIds = () => {
    return Array.from(requests.keys())
  }

  /**
   * 检查是否有活跃请求
   * @returns {boolean}
   */
  const hasActiveRequests = () => {
    return requests.size > 0
  }

  // 组件卸载时停止所有请求
  onUnmounted(() => {
    stopAll()
  })

  return {
    requests,
    send,
    stop,
    stopAll,
    getRequest,
    getActiveRequestIds,
    hasActiveRequests
  }
}

/**
 * 单请求模式的 hook（简化版）
 * 适用于只需要管理单个请求的场景
 *
 * @param {Object} options 配置项
 * @returns {Object} 请求控制对象
 */
export const useOpenAISSESingle = (options = {}) => {
  const {
    baseURL = '',
    apiKey = '',
    defaultHeaders = {},
    onStart = () => {},
    onToken = () => {},
    onDone = () => {},
    onError = () => {},
    onAbort = () => {}
  } = options

  // 当前请求实例
  let currentRequest = null

  // 暴露的响应式状态
  const status = ref(OpenAISSEStatus.IDLE)
  const error = shallowRef(null)
  const content = ref('')
  const reasoningContent = ref('')
  const usage = shallowRef(null)
  const requestId = ref(null)

  /**
   * 发送请求（会自动停止之前的请求）
   */
  const send = async params => {
    // 停止之前的请求
    if (currentRequest) {
      currentRequest.stop()
    }

    // 创建新请求
    currentRequest = createOpenAISSERequest({
      baseURL,
      apiKey,
      defaultHeaders,
      onStart: data => {
        requestId.value = data.requestId
        onStart(data)
      },
      onToken: data => {
        // 同步状态
        content.value = data.content
        reasoningContent.value = data.reasoning_content
        onToken(data)
      },
      onDone: data => {
        status.value = OpenAISSEStatus.DONE
        usage.value = data.usage
        onDone(data)
      },
      onError: data => {
        status.value = OpenAISSEStatus.ERROR
        error.value = data.error
        onError(data)
      },
      onAbort: data => {
        status.value = OpenAISSEStatus.ABORTED
        onAbort(data)
      }
    })

    // 同步初始状态
    status.value = currentRequest.status.value
    error.value = null
    content.value = ''
    reasoningContent.value = ''
    usage.value = null

    // 监听状态变化（简单的同步方式）
    const syncStatus = () => {
      if (currentRequest) {
        status.value = currentRequest.status.value
      }
    }

    // 发送请求
    await currentRequest.send(params)
    syncStatus()
  }

  /**
   * 停止当前请求
   */
  const stop = () => {
    if (currentRequest) {
      currentRequest.stop()
    }
  }

  /**
   * 重置状态
   */
  const reset = () => {
    stop()
    currentRequest = null
    status.value = OpenAISSEStatus.IDLE
    error.value = null
    content.value = ''
    reasoningContent.value = ''
    usage.value = null
    requestId.value = null
  }

  // 组件卸载时停止请求
  onUnmounted(() => {
    stop()
  })

  return {
    status,
    error,
    content,
    reasoningContent,
    usage,
    requestId,
    send,
    stop,
    reset
  }
}

export default useOpenAISSE
