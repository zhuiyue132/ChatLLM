/*
 * @Author       : zhuiyue132
 * @Date         : 2026-02-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-27
 * @FilePath     : /ChatLLM/src/hooks/use-webdav-backup.js
 * @Description  : WebDAV 备份逻辑
 */

import { ref, watch, onBeforeUnmount } from 'vue'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { useBackupSettingsStore } from '@/stores/backup-settings'
import { useThemeStore } from '@/stores/theme'
import { useUserProfileStore } from '@/stores/user-profile'
import { exportAppBackup, importAppBackup } from '@/utils/data-backup'
import {
  uploadWebdavJson,
  downloadWebdavJson,
  testWebdavConnection,
  resolveWebdavBackupPath
} from '@/utils/webdav'

const isBackingUp = ref(false)
const isRestoring = ref(false)
const isTesting = ref(false)
let autoTimer = null
let autoWatchStarted = false

const getConfigSnapshot = backupSettingsStore => ({
  baseUrl: backupSettingsStore.baseUrl,
  username: backupSettingsStore.username,
  password: backupSettingsStore.password,
  backupPath: resolveWebdavBackupPath(backupSettingsStore.backupPath)
})

const validateConfig = config => {
  if (!config.baseUrl) return '请填写 WebDAV 地址'
  if (!config.backupPath) return '请填写备份路径'
  return ''
}

export const useWebdavBackup = ({ autoStart = false } = {}) => {
  const apiSettingsStore = useApiSettingsStore()
  const chatRoomsStore = useChatRoomsStore()
  const backupSettingsStore = useBackupSettingsStore()
  const themeStore = useThemeStore()
  const userProfileStore = useUserProfileStore()
  const ownsAuto = autoStart && !autoWatchStarted

  const buildBackupPayload = () => {
    const backupSettingsSnapshot = {
      ...(backupSettingsStore.exportableSettings || {})
    }
    if (backupSettingsSnapshot.backupPath) {
      backupSettingsSnapshot.backupPath = resolveWebdavBackupPath(backupSettingsSnapshot.backupPath)
    }

    return exportAppBackup({
      apiSettings: {
        baseURL: apiSettingsStore.baseURL,
        apiKey: apiSettingsStore.apiKey,
        apiValidationPassed: apiSettingsStore.apiValidationPassed,
        selectedModels: [...(apiSettingsStore.selectedModels || [])],
        availableModels: [...(apiSettingsStore.availableModels || [])],
        modelCapabilities: {
          ...(apiSettingsStore.modelCapabilities || {})
        },
        defaultModel: apiSettingsStore.defaultChatModel,
        defaultChatModel: apiSettingsStore.defaultChatModel,
        defaultSummaryModel: apiSettingsStore.defaultSummaryModel,
        defaultTranslateModel: apiSettingsStore.defaultTranslateModel,
        knowledgeBase: {
          ...(apiSettingsStore.knowledgeBase || {})
        }
      },
      backupSettings: backupSettingsSnapshot,
      themeSettings: {
        themeMode: themeStore.themeMode
      },
      userProfileSettings: {
        username: userProfileStore.username,
        avatarBase64: userProfileStore.avatarBase64
      },
      rooms: chatRoomsStore.rooms,
      messages: chatRoomsStore.messages
    })
  }

  const applySettings = appSettings => {
    if (!appSettings) return
    const { apiSettings, backupSettings, themeSettings, userProfileSettings } = appSettings

    if (apiSettings) {
      apiSettingsStore.updateApiConfig({
        baseURL: apiSettings.baseURL,
        apiKey: apiSettings.apiKey
      })
      apiSettingsStore.updateDefaultModels({
        chat: apiSettings.defaultChatModel || apiSettings.defaultModel,
        summary: apiSettings.defaultSummaryModel,
        translate: apiSettings.defaultTranslateModel
      })
      if (apiSettings.selectedModels !== undefined) {
        apiSettingsStore.updateSelectedModels(apiSettings.selectedModels || [])
      }
      if (apiSettings.availableModels !== undefined) {
        apiSettingsStore.updateAvailableModels(apiSettings.availableModels || [])
      }
      if (apiSettings.modelCapabilities !== undefined) {
        apiSettingsStore.updateModelCapabilitiesMap(apiSettings.modelCapabilities || {})
      }
      if (apiSettings.knowledgeBase !== undefined) {
        apiSettingsStore.updateKnowledgeBase(apiSettings.knowledgeBase || {})
      }
      apiSettingsStore.setApiValidationPassed(true)
    }

    if (backupSettings) {
      backupSettingsStore.updateSettings({
        webdavEnabled: backupSettings.webdavEnabled,
        autoBackupEnabled: backupSettings.autoBackupEnabled,
        intervalMinutes: backupSettings.intervalMinutes,
        baseUrl: backupSettings.baseUrl,
        username: backupSettings.username,
        password: backupSettings.password,
        backupPath: backupSettings.backupPath
      })
    }

    if (themeSettings?.themeMode) {
      themeStore.setThemeMode(themeSettings.themeMode)
    }

    if (userProfileSettings) {
      userProfileStore.updateProfile({
        username: userProfileSettings.username,
        avatarBase64: userProfileSettings.avatarBase64
      })
    }
  }

  const backupToWebdav = async ({ silent = false, source = 'manual' } = {}) => {
    if (isBackingUp.value) {
      if (silent) return null
      throw new Error('正在执行备份，请稍候')
    }

    const config = getConfigSnapshot(backupSettingsStore)
    const errorMessage = validateConfig(config)
    if (errorMessage) {
      if (silent) return null
      throw new Error(errorMessage)
    }

    if (!backupSettingsStore.webdavEnabled) {
      if (silent) return null
      throw new Error('请先启用 WebDAV 备份')
    }

    isBackingUp.value = true
    try {
      const payload = buildBackupPayload()
      await uploadWebdavJson({ ...config, data: payload })
      backupSettingsStore.updateLastBackup({
        at: new Date().toISOString(),
        status: 'success',
        message: source === 'auto' ? '自动备份完成' : '手动备份完成'
      })
      return payload
    } catch (error) {
      backupSettingsStore.updateLastBackup({
        at: new Date().toISOString(),
        status: 'error',
        message: error.message
      })
      if (!silent) throw error
      return null
    } finally {
      isBackingUp.value = false
    }
  }

  const restoreFromWebdav = async () => {
    if (isRestoring.value) {
      throw new Error('正在执行恢复，请稍候')
    }

    const config = getConfigSnapshot(backupSettingsStore)
    const errorMessage = validateConfig(config)
    if (errorMessage) {
      throw new Error(errorMessage)
    }

    if (!backupSettingsStore.webdavEnabled) {
      throw new Error('请先启用 WebDAV 备份')
    }

    isRestoring.value = true
    try {
      const data = await downloadWebdavJson(config)
      const { appSettings, rooms, messages } = importAppBackup(data)
      const importedCount = chatRoomsStore.importData(rooms, messages)
      applySettings(appSettings)
      backupSettingsStore.updateLastRestore({
        at: new Date().toISOString(),
        status: 'success',
        message: '恢复完成'
      })
      return { importedCount }
    } catch (error) {
      backupSettingsStore.updateLastRestore({
        at: new Date().toISOString(),
        status: 'error',
        message: error.message
      })
      throw error
    } finally {
      isRestoring.value = false
    }
  }

  const checkWebdavConnection = async () => {
    if (isTesting.value) {
      throw new Error('正在测试连接，请稍候')
    }
    const config = getConfigSnapshot(backupSettingsStore)
    const errorMessage = validateConfig(config)
    if (errorMessage) {
      throw new Error(errorMessage)
    }
    isTesting.value = true
    try {
      await testWebdavConnection(config)
      return true
    } finally {
      isTesting.value = false
    }
  }

  const clearAutoTimer = () => {
    if (autoTimer) {
      clearInterval(autoTimer)
      autoTimer = null
    }
  }

  const setupAutoBackup = () => {
    clearAutoTimer()
    const config = getConfigSnapshot(backupSettingsStore)
    if (!backupSettingsStore.webdavEnabled || !backupSettingsStore.autoBackupEnabled) {
      return
    }
    if (validateConfig(config)) return

    const interval = Math.max(5, Number(backupSettingsStore.intervalMinutes) || 60)
    const lastBackupAt = backupSettingsStore.lastBackupAt
    const lastTimestamp = lastBackupAt ? new Date(lastBackupAt).getTime() : 0
    if (!lastTimestamp || Date.now() - lastTimestamp >= interval * 60 * 1000) {
      backupToWebdav({ silent: true, source: 'auto' })
    }
    autoTimer = setInterval(
      () => {
        backupToWebdav({ silent: true, source: 'auto' })
      },
      interval * 60 * 1000
    )
  }

  if (ownsAuto) {
    autoWatchStarted = true
    watch(
      () => [
        backupSettingsStore.webdavEnabled,
        backupSettingsStore.autoBackupEnabled,
        backupSettingsStore.intervalMinutes,
        backupSettingsStore.baseUrl,
        backupSettingsStore.username,
        backupSettingsStore.password,
        backupSettingsStore.backupPath
      ],
      setupAutoBackup,
      { immediate: true }
    )
  }

  onBeforeUnmount(() => {
    if (ownsAuto) {
      clearAutoTimer()
      autoWatchStarted = false
    }
  })

  return {
    isBackingUp,
    isRestoring,
    isTesting,
    backupToWebdav,
    restoreFromWebdav,
    checkWebdavConnection
  }
}
