<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/backup-panel/index.vue
 * @Description  : 数据备份面板（本地导入导出）
-->

<template>
  <div class="backup-panel">
    <div class="panel-header">
      <div class="panel-title">数据备份</div>
      <div class="panel-desc">导入导出本地 JSON 备份文件</div>
    </div>

    <div class="panel-body">
      <div class="backup-section">
        <div class="backup-item">
          <div class="backup-info">
            <div class="backup-title">全量数据导出</div>
            <div class="backup-desc">导出设置与所有对话数据</div>
          </div>
          <el-button type="primary" @click="handleExportFull">导出</el-button>
        </div>

        <div class="backup-item">
          <div class="backup-info">
            <div class="backup-title">全量数据导入</div>
            <div class="backup-desc">导入设置并合并对话数据</div>
          </div>
          <el-button :loading="importing" @click="handleImportFull">导入</el-button>
        </div>

        <div class="backup-item">
          <div class="backup-info">
            <div class="backup-title">对话数据导出</div>
            <div class="backup-desc">将所有对话数据导出为 JSON 文件</div>
          </div>
          <el-button @click="handleExportChat">导出</el-button>
        </div>

        <div class="backup-item">
          <div class="backup-info">
            <div class="backup-title">对话数据导入</div>
            <div class="backup-desc">从 JSON 文件恢复对话数据</div>
          </div>
          <el-button :loading="importing" @click="handleImportChat">导入</el-button>
        </div>

        <div class="backup-item">
          <div class="backup-info">
            <div class="backup-title">导入 Cherry Studio 数据</div>
            <div class="backup-desc">从 Cherry Studio 导出的数据转换导入</div>
          </div>
          <el-button :loading="importing" @click="handleImportCherry">导入</el-button>
        </div>
      </div>

      <div class="backup-warning">
        <i class="iconfont icon-info-circle"></i>
        <span>导入对话数据会与现有数据合并，不会覆盖已有对话；全量导入会覆盖当前设置。</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useBackupSettingsStore } from '@/stores/backup-settings'
import { useThemeStore } from '@/stores/theme'
import { resolveWebdavBackupPath } from '@/utils/webdav'
import {
  selectJsonFile,
  readFileAsText,
  downloadJson,
  exportChatData,
  exportAppBackup,
  importNativeData,
  importAppBackup,
  convertCherryStudioData
} from '@/utils/data-backup'

defineOptions({
  name: 'BackupPanel'
})

const chatRoomsStore = useChatRoomsStore()
const apiSettingsStore = useApiSettingsStore()
const backupSettingsStore = useBackupSettingsStore()
const themeStore = useThemeStore()

const importing = ref(false)

const buildApiSettingsSnapshot = () => {
  return {
    baseURL: apiSettingsStore.baseURL,
    apiKey: apiSettingsStore.apiKey,
    apiValidationPassed: apiSettingsStore.apiValidationPassed,
    selectedModels: [...(apiSettingsStore.selectedModels || [])],
    availableModels: [...(apiSettingsStore.availableModels || [])],
    defaultModel: apiSettingsStore.defaultChatModel,
    defaultChatModel: apiSettingsStore.defaultChatModel,
    defaultSummaryModel: apiSettingsStore.defaultSummaryModel,
    defaultTranslateModel: apiSettingsStore.defaultTranslateModel,
    knowledgeBase: {
      ...(apiSettingsStore.knowledgeBase || {})
    }
  }
}

const buildBackupSettingsSnapshot = () => {
  const backupSnapshot = {
    ...(backupSettingsStore.exportableSettings || {})
  }
  if (backupSnapshot.backupPath) {
    backupSnapshot.backupPath = resolveWebdavBackupPath(backupSnapshot.backupPath)
  }
  return backupSnapshot
}

const applyAppSettings = appSettings => {
  if (!appSettings) return

  const { apiSettings, backupSettings, themeSettings } = appSettings

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
}

const handleExportChat = () => {
  const data = exportChatData(chatRoomsStore.rooms, chatRoomsStore.messages)
  const filename = `chatllm-backup-${new Date().toISOString().slice(0, 10)}.json`
  downloadJson(data, filename)
  ElMessage.success('对话数据导出成功')
}

const handleExportFull = () => {
  const data = exportAppBackup({
    apiSettings: buildApiSettingsSnapshot(),
    backupSettings: buildBackupSettingsSnapshot(),
    themeSettings: {
      themeMode: themeStore.themeMode
    },
    rooms: chatRoomsStore.rooms,
    messages: chatRoomsStore.messages
  })
  const filename = `chatllm-full-backup-${new Date().toISOString().slice(0, 10)}.json`
  downloadJson(data, filename)
  ElMessage.success('全量数据导出成功')
}

const handleImportChat = async () => {
  try {
    importing.value = true
    const file = await selectJsonFile()
    const text = await readFileAsText(file)
    const jsonData = JSON.parse(text)
    const { rooms, messages } = importNativeData(jsonData)

    const importedCount = chatRoomsStore.importData(rooms, messages)
    ElMessage.success(`成功导入 ${importedCount} 个对话`)
  } catch (e) {
    ElMessage.error(`导入失败: ${e.message}`)
  } finally {
    importing.value = false
  }
}

const handleImportFull = async () => {
  const confirmed = await ElMessageBox.confirm(
    '全量导入会覆盖当前设置，并将备份中的对话与当前数据合并，是否继续？',
    '确认全量导入',
    {
      type: 'warning',
      confirmButtonText: '继续导入',
      cancelButtonText: '取消'
    }
  )
    .then(() => true)
    .catch(() => false)

  if (!confirmed) return

  try {
    importing.value = true
    const file = await selectJsonFile()
    const text = await readFileAsText(file)
    const jsonData = JSON.parse(text)
    const { appSettings, rooms, messages } = importAppBackup(jsonData)
    const importedCount = chatRoomsStore.importData(rooms, messages)

    if (appSettings) {
      applyAppSettings(appSettings)
      ElMessage.success(`成功导入 ${importedCount} 个对话，并恢复应用设置`)
    } else {
      ElMessage.success(`成功导入 ${importedCount} 个对话`)
    }
  } catch (e) {
    ElMessage.error(`导入失败: ${e.message}`)
  } finally {
    importing.value = false
  }
}

const handleImportCherry = async () => {
  try {
    importing.value = true
    const file = await selectJsonFile()
    const text = await readFileAsText(file)
    const cherryData = JSON.parse(text)
    const { rooms, messages } = convertCherryStudioData(cherryData)

    const importedCount = chatRoomsStore.importData(rooms, messages)
    ElMessage.success(`成功导入 ${importedCount} 个 Cherry Studio 对话`)
  } catch (e) {
    ElMessage.error(`导入失败: ${e.message}`)
  } finally {
    importing.value = false
  }
}
</script>

<style lang="scss" scoped>
.backup-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.panel-header {
  flex-shrink: 0;
  margin-bottom: 24px;

  .panel-title {
    margin-bottom: 8px;
    color: var(--text-normal-color);
    font-size: 18px;
    font-weight: 600;
  }

  .panel-desc {
    color: var(--text-dblight-color);
    font-size: 14px;
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-right: 4px;
}

.backup-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.backup-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--border-color-muted);
  border-radius: 8px;

  .backup-info {
    .backup-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-normal-color);
      margin-bottom: 4px;
    }

    .backup-desc {
      font-size: 12px;
      color: var(--text-dblight-color);
    }
  }
}

.backup-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-dblight-color);
  background: var(--bg-panel);
  border-radius: 6px;

  .iconfont {
    color: var(--warning-accent);
  }
}
</style>
