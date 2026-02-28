<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-02-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/webdav-panel/index.vue
 * @Description  : WebDAV 备份面板
-->

<template>
  <div class="webdav-panel">
    <div class="panel-header">
      <div class="panel-title">WebDAV 备份</div>
      <div class="panel-desc">配置 WebDAV 后可手动或定时备份数据</div>
    </div>

    <div class="panel-body">
      <div class="webdav-section">
        <el-form label-position="top" class="settings-form">
          <el-form-item>
            <el-switch v-model="webdavForm.webdavEnabled" active-text="启用 WebDAV 备份" />
          </el-form-item>

          <template v-if="webdavForm.webdavEnabled">
            <el-form-item label="WebDAV 地址">
              <el-input
                v-model="webdavForm.baseUrl"
                placeholder="例如: /webdav 或 https://dav.example.com/remote.php/dav/files/username"
                clearable
              />
              <div class="form-item-tip">使用代理时可填写 /webdav</div>
            </el-form-item>

            <el-form-item label="用户名">
              <el-input v-model="webdavForm.username" placeholder="如无需认证可留空" clearable />
            </el-form-item>

            <el-form-item label="密码">
              <el-input
                v-model="webdavForm.password"
                :type="showWebdavPassword ? 'text' : 'password'"
                placeholder="如无需认证可留空"
                clearable
              >
                <template #suffix>
                  <el-icon
                    class="toggle-password"
                    @click="showWebdavPassword = !showWebdavPassword"
                  >
                    <i
                      :class="showWebdavPassword ? 'iconfont icon-eye' : 'iconfont icon-eye-close'"
                    />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="备份路径">
              <el-input
                v-model="webdavForm.backupPath"
                placeholder="/chatllm/backup.json"
                clearable
              />
              <div class="form-item-tip">路径包含文件名，末尾带 / 会自动补全文件名</div>
            </el-form-item>

            <el-form-item>
              <el-switch v-model="webdavForm.autoBackupEnabled" active-text="定时备份" />
            </el-form-item>

            <template v-if="webdavForm.autoBackupEnabled">
              <el-form-item label="备份频率">
                <el-select v-model="webdavForm.intervalMinutes" placeholder="选择间隔">
                  <el-option
                    v-for="option in intervalOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <div class="form-item-tip">浏览器关闭后计时会暂停</div>
              </el-form-item>
            </template>

            <div class="webdav-meta">
              <div>最近备份：{{ lastBackupText }}</div>
              <div v-if="lastBackupError" class="webdav-error">失败原因：{{ lastBackupError }}</div>
              <div>最近恢复：{{ lastRestoreText }}</div>
              <div v-if="lastRestoreError" class="webdav-error">
                失败原因：{{ lastRestoreError }}
              </div>
            </div>

            <div class="webdav-actions">
              <el-button
                :loading="isTesting"
                :disabled="!webdavReady || !webdavForm.webdavEnabled"
                @click="handleTest"
              >
                测试连接
              </el-button>
              <el-button
                :loading="isBackingUp"
                :disabled="!webdavReady || !webdavForm.webdavEnabled"
                @click="handleWebdavBackup"
              >
                立即备份
              </el-button>
              <el-button
                :loading="isRestoring"
                :disabled="!webdavReady || !webdavForm.webdavEnabled"
                @click="handleWebdavRestore"
              >
                从 WebDAV 恢复
              </el-button>
            </div>
          </template>
        </el-form>
      </div>
    </div>

    <div class="panel-footer">
      <div></div>
      <el-button type="primary" @click="handleSave">保存配置</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { useBackupSettingsStore } from '@/stores/backup-settings'
import { useWebdavBackup } from '@/hooks/use-webdav-backup'
import { resolveWebdavBackupPath } from '@/utils/webdav'

defineOptions({
  name: 'WebdavPanel'
})

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const backupSettingsStore = useBackupSettingsStore()
const {
  isBackingUp,
  isRestoring,
  isTesting,
  backupToWebdav,
  restoreFromWebdav,
  checkWebdavConnection
} = useWebdavBackup()

const showWebdavPassword = ref(false)

const intervalOptions = [
  { label: '30 分钟', value: 30 },
  { label: '1 小时', value: 60 },
  { label: '6 小时', value: 360 },
  { label: '12 小时', value: 720 },
  { label: '1 天', value: 1440 }
]

const webdavForm = reactive({
  webdavEnabled: false,
  autoBackupEnabled: false,
  intervalMinutes: 60,
  baseUrl: '',
  username: '',
  password: '',
  backupPath: '/chatllm/backup.json'
})

const webdavReady = computed(() => !!webdavForm.baseUrl?.trim() && !!webdavForm.backupPath?.trim())

const lastBackupText = computed(() => {
  if (!backupSettingsStore.lastBackupAt) return '暂无'
  const time = dayjs(backupSettingsStore.lastBackupAt).format('YYYY-MM-DD HH:mm')
  const status = backupSettingsStore.lastBackupStatus === 'success' ? '成功' : '失败'
  return `${time}（${status}）`
})

const lastBackupError = computed(() =>
  backupSettingsStore.lastBackupStatus === 'error' ? backupSettingsStore.lastBackupMessage : ''
)

const lastRestoreText = computed(() => {
  if (!backupSettingsStore.lastRestoreAt) return '暂无'
  const time = dayjs(backupSettingsStore.lastRestoreAt).format('YYYY-MM-DD HH:mm')
  const status = backupSettingsStore.lastRestoreStatus === 'success' ? '成功' : '失败'
  return `${time}（${status}）`
})

const lastRestoreError = computed(() =>
  backupSettingsStore.lastRestoreStatus === 'error' ? backupSettingsStore.lastRestoreMessage : ''
)

const loadFromStore = () => {
  webdavForm.webdavEnabled = backupSettingsStore.webdavEnabled
  webdavForm.autoBackupEnabled = backupSettingsStore.autoBackupEnabled
  webdavForm.intervalMinutes = backupSettingsStore.intervalMinutes
  webdavForm.baseUrl = backupSettingsStore.baseUrl
  webdavForm.username = backupSettingsStore.username
  webdavForm.password = backupSettingsStore.password
  webdavForm.backupPath = backupSettingsStore.backupPath
}

const applyFormToStore = () => {
  const normalizedPath = resolveWebdavBackupPath(webdavForm.backupPath) || webdavForm.backupPath
  webdavForm.backupPath = normalizedPath
  backupSettingsStore.updateSettings({
    webdavEnabled: webdavForm.webdavEnabled,
    autoBackupEnabled: webdavForm.autoBackupEnabled,
    intervalMinutes: webdavForm.intervalMinutes,
    baseUrl: webdavForm.baseUrl,
    username: webdavForm.username,
    password: webdavForm.password,
    backupPath: normalizedPath
  })
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      loadFromStore()
      showWebdavPassword.value = false
    }
  },
  { immediate: true }
)

const handleSave = () => {
  applyFormToStore()
  ElMessage.success('WebDAV 配置已保存')
}

const handleWebdavBackup = async () => {
  try {
    applyFormToStore()
    await backupToWebdav({ source: 'manual' })
    ElMessage.success('WebDAV 备份成功')
  } catch (e) {
    ElMessage.error(`WebDAV 备份失败: ${e.message}`)
  }
}

const handleWebdavRestore = async () => {
  try {
    applyFormToStore()
    const result = await restoreFromWebdav()
    ElMessage.success(`恢复成功，导入 ${result?.importedCount ?? 0} 个对话`)
  } catch (e) {
    ElMessage.error(`WebDAV 恢复失败: ${e.message}`)
  }
}

const handleTest = async () => {
  try {
    applyFormToStore()
    await checkWebdavConnection()
    ElMessage.success('WebDAV 连接成功')
  } catch (e) {
    ElMessage.error(`WebDAV 连接失败: ${e.message}`)
  }
}
</script>

<style lang="scss" scoped>
.webdav-panel {
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

.webdav-section {
  padding: 16px;
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  background: var(--bg-app);
}

.settings-form {
  :deep(.el-form-item) {
    margin-bottom: 18px;

    .el-form-item__label {
      padding-bottom: 6px;
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 500;
      line-height: 22px;
    }

    .el-input,
    .el-select {
      width: 100%;
    }

    .el-input__wrapper {
      padding: 8px 12px;
      border-radius: 6px;
    }
  }

  .form-item-tip {
    margin-top: 6px;
    color: var(--text-dblight-color);
    font-size: 12px;
    line-height: 18px;
  }

  .toggle-password {
    cursor: pointer;

    .iconfont {
      color: var(--text-dblight-color);
      font-size: 16px;
      transition: color 0.2s;

      &:hover {
        color: var(--text-light-color);
      }
    }
  }
}

.webdav-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--text-dblight-color);
  padding-top: 6px;
}

.webdav-error {
  color: var(--error-text-strong);
}

.webdav-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color-light);
  gap: 12px;
}
</style>
