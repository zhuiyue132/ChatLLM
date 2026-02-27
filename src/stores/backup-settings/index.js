/*
 * @Author       : zhuiyue132
 * @Date         : 2026-02-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-27
 * @FilePath     : /ChatLLM/src/stores/backup-settings/index.js
 * @Description  : WebDAV 备份设置状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBackupSettingsStore = defineStore(
  'backup-settings',
  () => {
    const webdavEnabled = ref(false)
    const autoBackupEnabled = ref(false)
    const intervalMinutes = ref(60)
    const baseUrl = ref('')
    const username = ref('')
    const password = ref('')
    const backupPath = ref('/chatllm/backup.json')

    const lastBackupAt = ref('')
    const lastBackupStatus = ref('')
    const lastBackupMessage = ref('')
    const lastRestoreAt = ref('')
    const lastRestoreStatus = ref('')
    const lastRestoreMessage = ref('')

    const isConfigured = computed(() => !!baseUrl.value && !!backupPath.value)

    const exportableSettings = computed(() => ({
      webdavEnabled: webdavEnabled.value,
      autoBackupEnabled: autoBackupEnabled.value,
      intervalMinutes: intervalMinutes.value,
      baseUrl: baseUrl.value,
      username: username.value,
      password: password.value,
      backupPath: backupPath.value
    }))

    const updateSettings = config => {
      if (!config) return
      if (config.webdavEnabled !== undefined) webdavEnabled.value = config.webdavEnabled
      if (config.autoBackupEnabled !== undefined) autoBackupEnabled.value = config.autoBackupEnabled
      if (config.intervalMinutes !== undefined) intervalMinutes.value = config.intervalMinutes
      if (config.baseUrl !== undefined) baseUrl.value = config.baseUrl
      if (config.username !== undefined) username.value = config.username
      if (config.password !== undefined) password.value = config.password
      if (config.backupPath !== undefined) backupPath.value = config.backupPath
    }

    const updateLastBackup = ({ at, status, message }) => {
      if (at !== undefined) lastBackupAt.value = at
      if (status !== undefined) lastBackupStatus.value = status
      if (message !== undefined) lastBackupMessage.value = message
    }

    const updateLastRestore = ({ at, status, message }) => {
      if (at !== undefined) lastRestoreAt.value = at
      if (status !== undefined) lastRestoreStatus.value = status
      if (message !== undefined) lastRestoreMessage.value = message
    }

    const resetSettings = () => {
      webdavEnabled.value = false
      autoBackupEnabled.value = false
      intervalMinutes.value = 60
      baseUrl.value = ''
      username.value = ''
      password.value = ''
      backupPath.value = '/chatllm/backup.json'
      lastBackupAt.value = ''
      lastBackupStatus.value = ''
      lastBackupMessage.value = ''
      lastRestoreAt.value = ''
      lastRestoreStatus.value = ''
      lastRestoreMessage.value = ''
    }

    return {
      webdavEnabled,
      autoBackupEnabled,
      intervalMinutes,
      baseUrl,
      username,
      password,
      backupPath,
      lastBackupAt,
      lastBackupStatus,
      lastBackupMessage,
      lastRestoreAt,
      lastRestoreStatus,
      lastRestoreMessage,
      isConfigured,
      exportableSettings,
      updateSettings,
      updateLastBackup,
      updateLastRestore,
      resetSettings
    }
  },
  {
    persist: {
      key: 'chat-llm-backup-settings'
    }
  }
)
