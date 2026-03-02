/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-02
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-02
 * @FilePath     : /ChatLLM/src/stores/mcp-settings/index.js
 * @Description  : MCP 配置状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const DEFAULT_TIMEOUT_MS = 20000

const generateId = (prefix = 'mcp-') => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const normalizeHeaders = headers => {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return {}
  }

  const normalizedHeaders = {}
  for (const [key, value] of Object.entries(headers)) {
    const headerKey = `${key || ''}`.trim()
    if (!headerKey) continue
    if (value === undefined || value === null) continue
    normalizedHeaders[headerKey] = `${value}`
  }
  return normalizedHeaders
}

const normalizeEndpoint = endpoint => {
  return `${endpoint || ''}`.trim()
}

const normalizeTimeout = timeoutMs => {
  const timeout = Number(timeoutMs)
  if (!Number.isFinite(timeout) || timeout <= 0) {
    return DEFAULT_TIMEOUT_MS
  }
  return Math.floor(timeout)
}

const normalizeServer = server => {
  const normalizedServer = server && typeof server === 'object' ? server : {}
  return {
    id: normalizedServer.id || generateId(),
    name: `${normalizedServer.name || ''}`.trim(),
    endpoint: normalizeEndpoint(normalizedServer.endpoint),
    apiKey: `${normalizedServer.apiKey || ''}`.trim(),
    headers: normalizeHeaders(normalizedServer.headers),
    enabled: normalizedServer.enabled !== false,
    timeoutMs: normalizeTimeout(normalizedServer.timeoutMs),
    createdAt: normalizedServer.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

const normalizeServers = servers => {
  if (!Array.isArray(servers)) return []

  const uniqueMap = new Map()
  for (const server of servers) {
    const normalizedServer = normalizeServer(server)
    if (!normalizedServer.name || !normalizedServer.endpoint) {
      continue
    }
    uniqueMap.set(normalizedServer.id, normalizedServer)
  }
  return Array.from(uniqueMap.values())
}

export const useMcpSettingsStore = defineStore(
  'mcp-settings',
  () => {
    const globalEnabled = ref(false)
    const servers = ref([])

    const enabledServers = computed(() => {
      return servers.value.filter(server => server.enabled)
    })

    const getServerById = serverId => {
      if (!serverId) return null
      return servers.value.find(server => server.id === serverId) || null
    }

    const setGlobalEnabled = enabled => {
      globalEnabled.value = !!enabled
    }

    const addServer = server => {
      const normalizedServer = normalizeServer(server)
      if (!normalizedServer.name || !normalizedServer.endpoint) {
        return null
      }
      servers.value.push(normalizedServer)
      return normalizedServer
    }

    const updateServer = (serverId, updates = {}) => {
      const index = servers.value.findIndex(server => server.id === serverId)
      if (index === -1) return null

      const currentServer = servers.value[index]
      const mergedServer = normalizeServer({
        ...currentServer,
        ...updates,
        id: currentServer.id,
        createdAt: currentServer.createdAt
      })

      servers.value[index] = mergedServer
      return mergedServer
    }

    const deleteServer = serverId => {
      const index = servers.value.findIndex(server => server.id === serverId)
      if (index === -1) return false
      servers.value.splice(index, 1)
      return true
    }

    const toggleServerEnabled = (serverId, enabled) => {
      return updateServer(serverId, { enabled: !!enabled })
    }

    const replaceAllSettings = ({ globalEnabled: enabled, servers: nextServers } = {}) => {
      if (enabled !== undefined) {
        setGlobalEnabled(enabled)
      }
      servers.value = normalizeServers(nextServers)
    }

    const resetSettings = () => {
      globalEnabled.value = false
      servers.value = []
    }

    return {
      globalEnabled,
      servers,
      enabledServers,
      getServerById,
      setGlobalEnabled,
      addServer,
      updateServer,
      deleteServer,
      toggleServerEnabled,
      replaceAllSettings,
      resetSettings
    }
  },
  {
    persist: {
      key: 'chat-llm-mcp-settings'
    }
  }
)
