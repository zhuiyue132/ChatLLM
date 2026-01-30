<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/backup-panel/index.vue
 * @Description  : 数据备份面板
-->

<template>
  <div class="backup-panel">
    <div class="panel-header">
      <div class="panel-title">数据备份</div>
      <div class="panel-desc">导入、导出您的对话数据</div>
    </div>

    <div class="backup-section">
      <div class="backup-item">
        <div class="backup-info">
          <div class="backup-title">导出数据</div>
          <div class="backup-desc">将所有对话数据导出为 JSON 文件</div>
        </div>
        <el-button type="primary" @click="handleExport">导出</el-button>
      </div>

      <div class="backup-item">
        <div class="backup-info">
          <div class="backup-title">导入数据</div>
          <div class="backup-desc">从 JSON 文件恢复对话数据</div>
        </div>
        <el-button :loading="importing" @click="handleImport">导入</el-button>
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
      <span>导入数据会与现有数据合并，不会覆盖已有对话</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import {
  selectJsonFile,
  readFileAsText,
  downloadJson,
  exportChatData,
  importNativeData,
  convertCherryStudioData
} from '@/utils/data-backup'

defineOptions({
  name: 'BackupPanel'
})

const chatRoomsStore = useChatRoomsStore()

const importing = ref(false)

// 导出数据
const handleExport = () => {
  const data = exportChatData(chatRoomsStore.rooms, chatRoomsStore.messages)
  const filename = `chatllm-backup-${new Date().toISOString().slice(0, 10)}.json`
  downloadJson(data, filename)
  ElMessage.success('数据导出成功')
}

// 导入原生格式
const handleImport = async () => {
  try {
    importing.value = true
    const file = await selectJsonFile()
    const text = await readFileAsText(file)
    const jsonData = JSON.parse(text)
    const { rooms, messages } = importNativeData(jsonData)

    // 使用 store 方法导入
    const importedCount = chatRoomsStore.importData(rooms, messages)

    ElMessage.success(`成功导入 ${importedCount} 个对话`)
  } catch (e) {
    ElMessage.error(`导入失败: ${e.message}`)
  } finally {
    importing.value = false
  }
}

// 导入 Cherry Studio 数据
const handleImportCherry = async () => {
  try {
    importing.value = true
    const file = await selectJsonFile()
    const text = await readFileAsText(file)
    const cherryData = JSON.parse(text)
    const { rooms, messages } = convertCherryStudioData(cherryData)

    // 使用 store 方法导入
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
    color: #262626;
    font-size: 18px;
    font-weight: 600;
  }

  .panel-desc {
    color: #8c8c8c;
    font-size: 14px;
  }
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
  border: 1px solid #e8e8e8;
  border-radius: 8px;

  .backup-info {
    .backup-title {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
      margin-bottom: 4px;
    }

    .backup-desc {
      font-size: 12px;
      color: #8c8c8c;
    }
  }
}

.backup-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding: 12px 16px;
  font-size: 13px;
  color: #8c8c8c;
  background: #fafafa;
  border-radius: 6px;

  .iconfont {
    color: #faad14;
  }
}
</style>
