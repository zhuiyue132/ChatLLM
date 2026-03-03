/*
 * @Author       : zhuiyue132
 * @Date         : 2026-02-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-27
 * @FilePath     : /ChatLLM/src/utils/webdav.js
 * @Description  : WebDAV 基础请求工具
 */

const encodeBasicAuth = (username, password) => {
  if (!username && !password) return ''
  const token = `${username || ''}:${password || ''}`
  return `Basic ${window.btoa(unescape(encodeURIComponent(token)))}`
}

const WEBDAV_DYNAMIC_PROXY_PATH = '/webdav-proxy'
const WEBDAV_TARGET_HEADER = 'X-WebDAV-Target'
const WEBDAV_PROXY_RESPONSE_HEADER = 'x-webdav-proxy'

const isAbsoluteHttpUrl = value => /^https?:\/\/.+/i.test((value || '').trim())

const buildWebdavUrl = (baseUrl, path = '') => {
  const safeBase = (baseUrl || '').trim().replace(/\/+$/, '')
  const safePath = (path || '').trim().replace(/^\/+/, '')
  if (!safeBase) {
    throw new Error('WebDAV 地址不能为空')
  }
  return safePath ? `${safeBase}/${safePath}` : safeBase
}

const normalizeBackupPath = path => {
  const trimmed = (path || '').trim()
  if (!trimmed) return ''
  if (trimmed.endsWith('/')) {
    return `${trimmed}chatllm-backup.json`
  }
  return trimmed
}

const buildHeaders = (username, password, extraHeaders = {}) => {
  const headers = { ...extraHeaders }
  const auth = encodeBasicAuth(username, password)
  if (auth) headers.Authorization = auth
  return headers
}

const buildRequestContext = ({ baseUrl, path = '', headers = {}, ensureTrailingSlash = false }) => {
  let targetUrl = buildWebdavUrl(baseUrl, path)
  if (ensureTrailingSlash && !targetUrl.endsWith('/')) {
    targetUrl = `${targetUrl}/`
  }

  if (!isAbsoluteHttpUrl(baseUrl)) {
    return {
      requestUrl: targetUrl,
      targetUrl,
      requestHeaders: headers,
      originalHeaders: headers,
      useDynamicProxy: false
    }
  }

  return {
    requestUrl: WEBDAV_DYNAMIC_PROXY_PATH,
    targetUrl,
    requestHeaders: {
      ...headers,
      [WEBDAV_TARGET_HEADER]: targetUrl
    },
    originalHeaders: headers,
    useDynamicProxy: true
  }
}

const requestWebdav = async ({ baseUrl, path = '', ensureTrailingSlash = false, ...options } = {}) => {
  const { headers = {}, ...restOptions } = options
  const context = buildRequestContext({ baseUrl, path, headers, ensureTrailingSlash })
  let response = await fetch(context.requestUrl, {
    ...restOptions,
    headers: context.requestHeaders
  })

  // 开发环境若未挂载 /webdav-proxy，可回退到直连（前提是目标端允许 CORS）。
  if (
    context.useDynamicProxy &&
    response.status === 404 &&
    response.headers.get(WEBDAV_PROXY_RESPONSE_HEADER) !== '1'
  ) {
    response = await fetch(context.targetUrl, {
      ...restOptions,
      headers: context.originalHeaders
    })
  }

  if (!response.ok) {
    const message = `${response.status} ${response.statusText}`.trim()
    throw new Error(message || 'WebDAV 请求失败')
  }
  return response
}

const ensureWebdavDirectory = async ({ baseUrl, backupPath, username, password }) => {
  const normalizedPath = normalizeBackupPath(backupPath)
  const directory = normalizedPath.split('/').slice(0, -1).filter(Boolean)
  if (!directory.length) return

  let currentPath = ''
  for (const segment of directory) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    try {
      await requestWebdav({
        baseUrl,
        path: currentPath,
        method: 'MKCOL',
        headers: buildHeaders(username, password)
      })
    } catch (error) {
      if (
        !error.message.includes('405') &&
        !error.message.includes('409') &&
        !error.message.includes('301') &&
        !error.message.includes('302')
      ) {
        throw error
      }
    }
  }
}

export const uploadWebdavJson = async ({ baseUrl, backupPath, username, password, data }) => {
  const normalizedPath = normalizeBackupPath(backupPath)
  if (!normalizedPath) {
    throw new Error('备份路径不能为空')
  }
  await ensureWebdavDirectory({ baseUrl, backupPath: normalizedPath, username, password })
  const body = JSON.stringify(data, null, 2)
  await requestWebdav({
    baseUrl,
    path: normalizedPath,
    method: 'PUT',
    headers: buildHeaders(username, password, {
      'Content-Type': 'application/json'
    }),
    body
  })
}

export const downloadWebdavJson = async ({ baseUrl, backupPath, username, password }) => {
  const normalizedPath = normalizeBackupPath(backupPath)
  if (!normalizedPath) {
    throw new Error('备份路径不能为空')
  }
  const response = await requestWebdav({
    baseUrl,
    path: normalizedPath,
    method: 'GET',
    headers: buildHeaders(username, password)
  })
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error('WebDAV 备份文件不是有效的 JSON')
  }
}

export const testWebdavConnection = async ({ baseUrl, backupPath, username, password }) => {
  const normalizedPath = normalizeBackupPath(backupPath)
  const directory = normalizedPath.split('/').slice(0, -1).filter(Boolean).join('/')
  const testPath = directory ? `${directory}/` : ''
  const ensureTrailingSlash = !directory
  try {
    await requestWebdav({
      baseUrl,
      path: testPath,
      ensureTrailingSlash,
      method: 'PROPFIND',
      headers: buildHeaders(username, password, {
        Depth: '0'
      })
    })
  } catch (error) {
    await requestWebdav({
      baseUrl,
      path: testPath,
      ensureTrailingSlash,
      method: 'OPTIONS',
      headers: buildHeaders(username, password)
    })
  }
}

export const resolveWebdavBackupPath = normalizeBackupPath
