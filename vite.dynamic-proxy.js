import { Readable } from 'node:stream'

const isValidHttpUrl = value => {
  try {
    const url = new URL(value || '')
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const resolveHeaderValue = (headers, name) => {
  const rawValue = headers?.[`${name || ''}`.toLowerCase()]
  return `${Array.isArray(rawValue) ? rawValue[0] : rawValue || ''}`.trim()
}

const buildForwardHeaders = (headers, blockedHeaders = []) => {
  const blocked = new Set(
    [
      'host',
      'connection',
      'content-length',
      ...blockedHeaders.map(key => `${key}`.toLowerCase())
    ].filter(Boolean)
  )

  const nextHeaders = new Headers()
  Object.entries(headers || {}).forEach(([key, value]) => {
    if (!value) return
    if (blocked.has(`${key}`.toLowerCase())) return
    if (Array.isArray(value)) {
      nextHeaders.set(key, value.join(', '))
      return
    }
    nextHeaders.set(key, value)
  })
  return nextHeaders
}

export const createDynamicHeaderProxyPlugin = (options = {}) => {
  const {
    name = '',
    routePath = '',
    targetHeader = '',
    proxyMarkerHeader = '',
    invalidTargetMessage = 'Invalid proxy target',
    proxyErrorPrefix = 'Proxy failed'
  } = options

  if (!name || !routePath || !targetHeader || !proxyMarkerHeader) {
    throw new Error(
      'createDynamicHeaderProxyPlugin: name/routePath/targetHeader/proxyMarkerHeader 必填'
    )
  }

  return {
    name,
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestPath = `${req.url || ''}`.split('?')[0]
        if (requestPath !== routePath) {
          next()
          return
        }

        const target = resolveHeaderValue(req.headers, targetHeader)
        if (!isValidHttpUrl(target)) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.setHeader(proxyMarkerHeader, '1')
          res.end(invalidTargetMessage)
          return
        }

        const method = `${req.method || 'GET'}`.toUpperCase()
        const hasBody = method !== 'GET' && method !== 'HEAD'
        const headers = buildForwardHeaders(req.headers, [targetHeader])
        const controller = new AbortController()
        req.on('aborted', () => controller.abort())

        try {
          const response = await fetch(target, {
            method,
            headers,
            body: hasBody ? req : undefined,
            duplex: hasBody ? 'half' : undefined,
            redirect: 'manual',
            signal: controller.signal
          })

          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            const lowerKey = `${key}`.toLowerCase()
            if (lowerKey === 'transfer-encoding' || lowerKey === 'connection') {
              return
            }
            res.setHeader(key, value)
          })
          res.setHeader(proxyMarkerHeader, '1')

          if (!response.body) {
            res.end()
            return
          }

          Readable.fromWeb(response.body).pipe(res)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.setHeader(proxyMarkerHeader, '1')
          res.end(`${proxyErrorPrefix}: ${error?.message || 'unknown error'}`)
        }
      })
    }
  }
}
