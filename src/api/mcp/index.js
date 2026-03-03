/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-02
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-02
 * @FilePath     : /ChatLLM/src/api/mcp/index.js
 * @Description  : MCP Streamable HTTP 客户端
 */

const DEFAULT_TIMEOUT_MS = 20000
const PROTOCOL_VERSION = '2025-06-18'
const FALLBACK_PROTOCOL_VERSIONS = ['2025-03-26', '2024-11-05']
const MCP_DYNAMIC_PROXY_PATH = '/mcp-proxy'
const MCP_TARGET_HEADER = 'X-MCP-Target'
const MCP_PROXY_RESPONSE_HEADER = 'x-mcp-proxy'
const initializedServerRuntimeKeys = new Set()
const runtimeStateMap = new Map()
let rpcIdSeed = Date.now()

const generateRpcId = () => {
  rpcIdSeed += 1
  return rpcIdSeed
}

const getRuntimeKey = server => {
  const safeServer = server || {}
  return JSON.stringify({
    id: safeServer.id || '',
    endpoint: safeServer.endpoint || '',
    apiKey: safeServer.apiKey || '',
    headers: safeServer.headers || {}
  })
}

const normalizeTimeout = timeoutMs => {
  const timeout = Number(timeoutMs)
  if (!Number.isFinite(timeout) || timeout <= 0) {
    return DEFAULT_TIMEOUT_MS
  }
  return Math.floor(timeout)
}

const isAbsoluteHttpUrl = value => /^https?:\/\/.+/i.test((value || '').trim())

const parseJsonSafely = raw => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const getRuntimeState = runtimeKey => {
  if (!runtimeKey) return null
  return runtimeStateMap.get(runtimeKey) || null
}

const setRuntimeState = (runtimeKey, nextState = {}) => {
  if (!runtimeKey) return
  const previousState = getRuntimeState(runtimeKey) || {}
  runtimeStateMap.set(runtimeKey, {
    ...previousState,
    ...nextState
  })
}

const buildRequestHeaders = (server, options = {}) => {
  const { runtimeKey = '', protocolVersionOverride = '', includeProtocolHeader = true } = options
  const runtimeState = getRuntimeState(runtimeKey)
  const requestHeaders = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    ...(server?.headers || {})
  }
  if (server?.apiKey && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${server.apiKey}`
  }

  const protocolVersion = protocolVersionOverride || runtimeState?.protocolVersion || ''
  if (includeProtocolHeader && protocolVersion) {
    requestHeaders['MCP-Protocol-Version'] = protocolVersion
  }

  if (runtimeState?.sessionId) {
    requestHeaders['MCP-Session-Id'] = runtimeState.sessionId
  }

  return requestHeaders
}

const buildRequestContext = (server, headers = {}) => {
  const endpoint = `${server?.endpoint || ''}`.trim()
  if (!isAbsoluteHttpUrl(endpoint)) {
    throw new Error('MCP 服务地址仅支持 http(s)://... 格式')
  }

  return {
    requestUrl: MCP_DYNAMIC_PROXY_PATH,
    requestHeaders: {
      ...headers,
      [MCP_TARGET_HEADER]: endpoint
    },
    originalHeaders: headers,
    useDynamicProxy: true
  }
}

const parseSSEPayload = async response => {
  const reader = response.body?.getReader?.()
  if (!reader) return null

  const decoder = new TextDecoder()
  let buffer = ''
  let lastPayload = null

  const handleLine = line => {
    const trimmedLine = line.trim()
    if (!trimmedLine || !trimmedLine.startsWith('data:')) {
      return
    }
    const rawData = trimmedLine.replace(/^data:\s*/, '')
    if (!rawData || rawData === '[DONE]') {
      return
    }
    const payload = parseJsonSafely(rawData)
    if (payload) {
      lastPayload = payload
    }
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    lines.forEach(handleLine)
  }

  if (buffer.trim()) {
    handleLine(buffer)
  }

  return lastPayload
}

const parseResponsePayload = async response => {
  if (response.status === 204) return null

  const contentType = (response.headers.get('Content-Type') || '').toLowerCase()
  if (contentType.includes('text/event-stream')) {
    return await parseSSEPayload(response)
  }

  const rawText = await response.text()
  if (!rawText) return null

  const payload = parseJsonSafely(rawText)
  if (payload !== null) {
    return payload
  }

  throw new Error('MCP 响应不是合法 JSON')
}

const parseRpcResult = payload => {
  if (!payload) return null
  if (Array.isArray(payload)) {
    const lastPayload = payload[payload.length - 1]
    return parseRpcResult(lastPayload)
  }
  if (payload.error) {
    const errorMessage =
      payload.error.message || payload.error.data?.message || payload.error.data || 'MCP 请求失败'
    throw new Error(errorMessage)
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'result')) {
    return payload.result
  }
  return payload
}

const isNetworkFetchError = error => {
  const message = `${error?.message || ''}`.toLowerCase()
  if (error?.name === 'TypeError') {
    return true
  }
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  )
}

const buildCorsOrNetworkErrorMessage = server => {
  const currentOrigin = window?.location?.origin || '当前页面'
  const targetEndpoint = server?.endpoint || 'MCP 地址'
  return [
    '网络请求失败（可能是 CORS 拦截）。',
    `当前页面来源：${currentOrigin}`,
    `目标 MCP 地址：${targetEndpoint}`,
    '已优先尝试通过 /mcp-proxy 动态反代访问（仅绝对 http(s) 地址）。',
    '若仍失败，请检查部署端是否已配置 /mcp-proxy 反代，或 MCP 服务端是否允许跨域并放行 OPTIONS 预检。',
    `若走直连，建议至少返回：Access-Control-Allow-Origin: ${currentOrigin}`,
    '并允许请求头 Content-Type、Authorization。'
  ].join('\n')
}

const isMethodNotSupportedError = error => {
  const message = `${error?.message || ''}`.toLowerCase()
  return (
    message.includes('method not found') ||
    message.includes('not supported') ||
    message.includes('-32601')
  )
}

const requestMcp = async (
  server,
  {
    method,
    params = {},
    notification = false,
    protocolVersionOverride = '',
    includeProtocolHeader = true
  } = {}
) => {
  if (!server?.endpoint) {
    throw new Error('MCP 服务地址不能为空')
  }
  if (!isAbsoluteHttpUrl(server.endpoint)) {
    throw new Error('MCP 服务地址仅支持 http(s)://... 格式')
  }
  if (!method) {
    throw new Error('MCP 方法名不能为空')
  }

  const controller = new AbortController()
  const timeoutMs = normalizeTimeout(server.timeoutMs)
  const timeoutId = window.setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  const requestBody = {
    jsonrpc: '2.0',
    method,
    params
  }

  if (!notification) {
    requestBody.id = generateRpcId()
  }

  const runtimeKey = getRuntimeKey(server)
  const requestHeaders = buildRequestHeaders(server, {
    runtimeKey,
    protocolVersionOverride,
    includeProtocolHeader
  })
  const requestContext = buildRequestContext(server, requestHeaders)

  try {
    let response = await fetch(requestContext.requestUrl, {
      method: 'POST',
      headers: requestContext.requestHeaders,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })

    // 开发环境若未挂载 /mcp-proxy，可回退到直连（前提是目标端允许 CORS）。
    if (
      requestContext.useDynamicProxy &&
      response.status === 404 &&
      response.headers.get(MCP_PROXY_RESPONSE_HEADER) !== '1'
    ) {
      response = await fetch(server.endpoint, {
        method: 'POST',
        headers: requestContext.originalHeaders,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(
        errorText || `HTTP ${response.status}: ${response.statusText || 'MCP 请求失败'}`
      )
    }

    if (notification) {
      return null
    }

    const payload = await parseResponsePayload(response)
    const result = parseRpcResult(payload)

    const responseSessionId =
      response.headers.get('MCP-Session-Id') ||
      response.headers.get('mcp-session-id') ||
      response.headers.get('Mcp-Session-Id') ||
      ''
    if (responseSessionId) {
      setRuntimeState(runtimeKey, {
        sessionId: responseSessionId
      })
    }

    return result
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`请求超时（>${timeoutMs}ms）`)
    }
    if (isNetworkFetchError(error)) {
      throw new Error(buildCorsOrNetworkErrorMessage(server))
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const ensureInitialized = async server => {
  const runtimeKey = getRuntimeKey(server)
  if (initializedServerRuntimeKeys.has(runtimeKey)) {
    return
  }

  const protocolVersions = [PROTOCOL_VERSION, ...FALLBACK_PROTOCOL_VERSIONS]
  const uniqueProtocolVersions = Array.from(new Set(protocolVersions.filter(Boolean)))
  const initializeHeaderModes = [
    {
      includeProtocolHeader: false
    },
    {
      includeProtocolHeader: true
    }
  ]

  let lastError = null
  let initialized = false
  for (const version of uniqueProtocolVersions) {
    for (const headerMode of initializeHeaderModes) {
      try {
        const initializeResult = await requestMcp(server, {
          method: 'initialize',
          params: {
            protocolVersion: version,
            capabilities: {},
            clientInfo: {
              name: 'ChatLLM',
              version: '0.0.1'
            }
          },
          protocolVersionOverride: headerMode.includeProtocolHeader ? version : '',
          includeProtocolHeader: headerMode.includeProtocolHeader
        })

        setRuntimeState(runtimeKey, {
          protocolVersion: initializeResult?.protocolVersion || version
        })
        initialized = true
        break
      } catch (error) {
        lastError = error
      }
    }
    if (initialized) break
  }

  if (!initialized) {
    throw new Error(lastError?.message || 'MCP initialize 失败')
  }

  try {
    await requestMcp(server, {
      method: 'notifications/initialized',
      notification: true
    })
  } catch (error) {
    console.warn('[MCP] initialized 通知失败，已忽略:', error)
  }

  initializedServerRuntimeKeys.add(runtimeKey)
}

export const listMcpTools = async server => {
  await ensureInitialized(server)
  const result = await requestMcp(server, {
    method: 'tools/list',
    params: {}
  })
  if (!Array.isArray(result?.tools)) {
    return []
  }
  return result.tools
}

export const listMcpPrompts = async server => {
  await ensureInitialized(server)
  const result = await requestMcp(server, {
    method: 'prompts/list',
    params: {}
  })
  if (!Array.isArray(result?.prompts)) {
    return []
  }
  return result.prompts
}

export const callMcpTool = async (server, { name, arguments: toolArguments = {} } = {}) => {
  if (!name) {
    throw new Error('工具名称不能为空')
  }
  await ensureInitialized(server)
  return await requestMcp(server, {
    method: 'tools/call',
    params: {
      name,
      arguments: toolArguments
    }
  })
}

export const testMcpConnection = async server => {
  const startedAt = Date.now()
  try {
    const tools = await listMcpTools(server)
    let prompts = []
    let promptsSupported = true
    const warnings = []

    try {
      prompts = await listMcpPrompts(server)
    } catch (error) {
      if (isMethodNotSupportedError(error)) {
        prompts = []
        promptsSupported = false
        warnings.push('服务端未实现 prompts/list')
      } else {
        throw error
      }
    }

    return {
      ok: true,
      durationMs: Date.now() - startedAt,
      toolsCount: tools.length,
      promptsCount: prompts.length,
      promptsSupported,
      tools,
      prompts,
      warnings
    }
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      error: error?.message || '连接失败'
    }
  }
}

export const stringifyMcpToolResult = result => {
  if (result === undefined || result === null) {
    return ''
  }

  if (typeof result === 'string') {
    return result
  }

  if (Array.isArray(result?.content)) {
    const textFragments = result.content
      .map(item => {
        if (!item || typeof item !== 'object') {
          return ''
        }
        if (item.type === 'text' && typeof item.text === 'string') {
          return item.text
        }
        if (item.type === 'json' && item.json !== undefined) {
          return JSON.stringify(item.json, null, 2)
        }
        if (item.type === 'image' && item.url) {
          return `[image] ${item.url}`
        }
        return JSON.stringify(item, null, 2)
      })
      .filter(Boolean)

    if (textFragments.length > 0) {
      return textFragments.join('\n\n')
    }
  }

  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return `${result}`
  }
}
