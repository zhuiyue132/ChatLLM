<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-03-02
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-02
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/mcp-panel/index.vue
 * @Description  : MCP 设置面板
-->

<template>
  <div class="mcp-panel">
    <div class="panel-header">
      <div class="panel-title">MCP 设置</div>
      <div class="panel-desc">配置并管理 Streamable HTTP MCP 服务</div>
    </div>

    <div class="panel-body">
      <div class="global-switch-card">
        <div class="switch-info">
          <div class="switch-title">全局 MCP 开关</div>
          <div class="switch-desc">新建会话默认使用该状态，会话中可单独覆盖</div>
        </div>
        <el-switch v-model="globalEnabled" />
      </div>

      <div class="toolbar">
        <el-button type="primary" @click="startCreateServer">新增 MCP</el-button>
        <el-button @click="handleImport">导入</el-button>
        <el-button @click="handleExport">导出</el-button>
        <span class="server-count">共 {{ servers.length }} 个服务</span>
      </div>

      <div class="server-list-card">
        <div v-if="servers.length === 0" class="empty-state">尚未添加 MCP 服务，请先新增</div>

        <div v-else class="server-list">
          <div v-for="server in servers" :key="server.id" class="server-item">
            <div class="server-main" @click="startEditServer(server.id)">
              <div class="server-name">{{ server.name || '未命名服务' }}</div>
              <div class="server-endpoint">{{ server.endpoint }}</div>
            </div>

            <div class="server-actions" @click.stop>
              <el-switch
                :model-value="server.enabled"
                size="small"
                @update:model-value="toggleServerEnabled(server.id, $event)"
              />
              <el-button link size="small" @click="startEditServer(server.id)">编辑</el-button>
              <el-button
                link
                size="small"
                :loading="testingServerId === server.id"
                @click="handleTestConnection(server)"
              >
                测试
              </el-button>
              <el-button link size="small" type="danger" @click="handleDeleteServer(server.id)">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="editorDialogVisible"
      :title="editorDialogTitle"
      width="560px"
      append-to-body
      destroy-on-close
      class="mcp-editor-dialog"
      @closed="handleEditorDialogClosed"
    >
      <div class="editor-body">
        <el-form label-position="top" class="editor-form">
          <el-form-item label="名称">
            <el-input v-model="editorForm.name" placeholder="例如：内网工具集" clearable />
          </el-form-item>

          <el-form-item label="Streamable HTTP 地址">
            <el-input
              v-model="editorForm.endpoint"
              placeholder="例如：https://mcp.example.com/mcp 或 /mcp"
              clearable
            />
          </el-form-item>

          <el-form-item label="API Key（可选）">
            <el-input
              v-model="editorForm.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              placeholder="请输入 API Key"
              clearable
            >
              <template #suffix>
                <el-icon class="toggle-password" @click="showApiKey = !showApiKey">
                  <i :class="showApiKey ? 'iconfont icon-eye' : 'iconfont icon-eye-close'" />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="自定义请求头（JSON，可选）">
            <el-input
              v-model="editorForm.headersText"
              type="textarea"
              :rows="5"
              placeholder='例如：{"x-env":"dev"}'
            />
          </el-form-item>

          <el-form-item label="请求超时（毫秒）">
            <el-input-number
              v-model="editorForm.timeoutMs"
              :min="1000"
              :max="120000"
              :step="1000"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item>
            <el-switch v-model="editorForm.enabled" active-text="启用该 MCP" inactive-text="" />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="editor-footer">
          <div class="editor-actions">
            <el-button @click="editorDialogVisible = false">取消</el-button>
            <el-button :loading="testingServerId === EDITOR_TEST_ID" @click="handleTestEditor">
              测试连接
            </el-button>
            <el-button type="primary" @click="handleSaveServer">
              {{ isEditing ? '保存' : '添加' }}
            </el-button>
            <el-button @click="handleResetEditor">重置</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, h, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMcpSettingsStore } from '@/stores/mcp-settings'
import { selectJsonFile, readFileAsText, downloadJson } from '@/utils/data-backup'
import { testMcpConnection } from '@/api/mcp'

defineOptions({
  name: 'McpPanel'
})

const EDITOR_TEST_ID = 'editor'

const mcpSettingsStore = useMcpSettingsStore()

const globalEnabled = computed({
  get: () => mcpSettingsStore.globalEnabled,
  set: value => mcpSettingsStore.setGlobalEnabled(value)
})

const servers = computed(() => mcpSettingsStore.servers)
const editorDialogTitle = computed(() => (isEditing.value ? '编辑 MCP' : '新增 MCP'))

const showApiKey = ref(false)
const testingServerId = ref('')
const editorDialogVisible = ref(false)

const createEmptyEditorForm = () => ({
  id: '',
  name: '',
  endpoint: '',
  apiKey: '',
  headersText: '',
  enabled: true,
  timeoutMs: 20000
})

const editorForm = reactive(createEmptyEditorForm())

const isEditing = computed(() => !!editorForm.id)

const parseHeadersText = headersText => {
  const raw = `${headersText || ''}`.trim()
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('请求头必须为 JSON 对象')
    }
    return parsed
  } catch (error) {
    throw new Error(`自定义请求头格式错误: ${error.message || 'JSON 解析失败'}`)
  }
}

const fillEditorForm = server => {
  const target = server || createEmptyEditorForm()
  editorForm.id = target.id || ''
  editorForm.name = target.name || ''
  editorForm.endpoint = target.endpoint || ''
  editorForm.apiKey = target.apiKey || ''
  editorForm.headersText = JSON.stringify(target.headers || {}, null, 2)
  editorForm.enabled = target.enabled !== false
  editorForm.timeoutMs = Number(target.timeoutMs) || 20000
  showApiKey.value = false
}

const startCreateServer = () => {
  fillEditorForm()
  editorDialogVisible.value = true
}

const startEditServer = serverId => {
  const server = mcpSettingsStore.getServerById(serverId)
  if (!server) return
  fillEditorForm(server)
  editorDialogVisible.value = true
}

const buildServerPayload = () => {
  const name = `${editorForm.name || ''}`.trim()
  const endpoint = `${editorForm.endpoint || ''}`.trim()
  const apiKey = `${editorForm.apiKey || ''}`.trim()

  if (!name) {
    throw new Error('请输入 MCP 名称')
  }
  const isAbsoluteHttpUrl = /^https?:\/\/.+/.test(endpoint)
  const isRelativePath = /^\/.+/.test(endpoint)
  if (!endpoint || (!isAbsoluteHttpUrl && !isRelativePath)) {
    throw new Error('请输入合法的 Streamable HTTP 地址（支持 https://... 或 /mcp）')
  }

  return {
    name,
    endpoint,
    apiKey,
    headers: parseHeadersText(editorForm.headersText),
    enabled: !!editorForm.enabled,
    timeoutMs: editorForm.timeoutMs
  }
}

const handleSaveServer = () => {
  try {
    const payload = buildServerPayload()
    if (isEditing.value) {
      mcpSettingsStore.updateServer(editorForm.id, payload)
      ElMessage.success('MCP 配置已保存')
    } else {
      mcpSettingsStore.addServer(payload)
      ElMessage.success('MCP 配置已添加')
    }
    editorDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

const handleResetEditor = () => {
  if (isEditing.value) {
    const server = mcpSettingsStore.getServerById(editorForm.id)
    fillEditorForm(server)
    return
  }
  fillEditorForm()
}

const handleEditorDialogClosed = () => {
  testingServerId.value = ''
  showApiKey.value = false
}

const toggleServerEnabled = (serverId, enabled) => {
  mcpSettingsStore.toggleServerEnabled(serverId, enabled)
}

const handleDeleteServer = async serverId => {
  const confirmed = await ElMessageBox.confirm('删除后不可恢复，是否继续？', '确认删除', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  })
    .then(() => true)
    .catch(() => false)

  if (!confirmed) return

  const deleted = mcpSettingsStore.deleteServer(serverId)
  if (!deleted) return

  if (editorForm.id === serverId) {
    fillEditorForm()
    editorDialogVisible.value = false
  }

  ElMessage.success('已删除 MCP 配置')
}

const runConnectionTest = async (server, testId) => {
  testingServerId.value = testId
  const result = await testMcpConnection(server)
  testingServerId.value = ''

  const summarizeEntityNames = (items = []) => {
    const names = (Array.isArray(items) ? items : [])
      .map(item => `${item?.name || ''}`.trim())
      .filter(Boolean)

    if (!names.length) return '无'
    if (names.length <= 8) {
      return names.join('、')
    }
    return `${names.slice(0, 8).join('、')} 等 ${names.length} 项`
  }

  if (result.ok) {
    const detailLines = [
      `耗时：${result.durationMs}ms`,
      `工具（${result.toolsCount}）：${summarizeEntityNames(result.tools)}`,
      result.promptsSupported
        ? `提示（${result.promptsCount}）：${summarizeEntityNames(result.prompts)}`
        : '提示：服务端未实现 prompts/list'
    ]
    if (Array.isArray(result.warnings) && result.warnings.length > 0) {
      detailLines.push(`说明：${result.warnings.join('；')}`)
    }

    await ElMessageBox.alert(
      h(
        'div',
        {
          style: 'white-space: pre-line;'
        },
        detailLines.join('\n')
      ),
      'MCP 测试结果',
      {
        confirmButtonText: '知道了'
      }
    )
    return
  }

  await ElMessageBox.alert(result.error || '连接失败', 'MCP 测试失败', {
    confirmButtonText: '知道了',
    type: 'error'
  })
}

const handleTestConnection = async server => {
  await runConnectionTest(server, server.id)
}

const handleTestEditor = async () => {
  try {
    const payload = buildServerPayload()
    await runConnectionTest(payload, EDITOR_TEST_ID)
  } catch (error) {
    ElMessage.error(error.message || '测试失败')
  }
}

const handleExport = () => {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    globalEnabled: mcpSettingsStore.globalEnabled,
    servers: mcpSettingsStore.servers
  }
  const filename = `chatllm-mcp-${new Date().toISOString().slice(0, 10)}.json`
  downloadJson(exportData, filename)
  ElMessage.success('MCP 配置导出成功')
}

const handleImport = async () => {
  const confirmed = await ElMessageBox.confirm('导入会覆盖当前 MCP 配置，是否继续？', '确认导入', {
    type: 'warning',
    confirmButtonText: '继续导入',
    cancelButtonText: '取消'
  })
    .then(() => true)
    .catch(() => false)

  if (!confirmed) return

  try {
    const file = await selectJsonFile()
    const text = await readFileAsText(file)
    const parsed = JSON.parse(text)

    if (!Array.isArray(parsed?.servers)) {
      throw new Error('导入文件格式错误，缺少 servers 字段')
    }

    mcpSettingsStore.replaceAllSettings({
      globalEnabled: parsed.globalEnabled,
      servers: parsed.servers
    })

    if (editorDialogVisible.value) {
      fillEditorForm()
      editorDialogVisible.value = false
    }

    ElMessage.success(`导入成功，共 ${mcpSettingsStore.servers.length} 条 MCP 配置`)
  } catch (error) {
    ElMessage.error(`导入失败: ${error.message || '未知错误'}`)
  }
}
</script>

<style lang="scss" scoped>
.mcp-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.panel-header {
  flex-shrink: 0;
  margin-bottom: 20px;

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
  display: flex;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
  gap: 14px;
}

.global-switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border: 1px solid var(--border-color-muted);
  border-radius: 8px;
  background: var(--bg-panel);

  .switch-info {
    .switch-title {
      margin-bottom: 4px;
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 500;
    }

    .switch-desc {
      color: var(--text-dblight-color);
      font-size: 12px;
    }
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;

  .server-count {
    margin-left: auto;
    color: var(--text-dblight-color);
    font-size: 12px;
  }
}

.server-list-card {
  display: flex;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
  border: 1px solid var(--border-color-muted);
  border-radius: 8px;
  background: var(--bg-panel);
}

.server-list {
  overflow-y: auto;
  flex: 1;
  padding: 10px;
}

.server-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  transition: all 0.2s;
  border: 1px solid var(--border-color-muted);
  border-radius: 8px;

  &:not(:first-child) {
    margin-top: 8px;
  }

  &:hover {
    border-color: var(--main-color, #007e54);
    background-color: rgb(0 126 84 / 4%);
  }

  .server-main {
    overflow: hidden;
    flex: 1;
    min-width: 0;
    margin-right: 8px;
    cursor: pointer;

    .server-name {
      overflow: hidden;
      margin-bottom: 4px;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 500;
    }

    .server-endpoint {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--text-dblight-color);
      font-size: 12px;
    }
  }

  .server-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: var(--text-dblight-color);
  font-size: 13px;
}

.editor-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;

    .el-form-item__label {
      padding-bottom: 4px;
      font-size: 13px;
      line-height: 20px;
    }
  }

  .toggle-password {
    cursor: pointer;

    .iconfont {
      color: var(--text-dblight-color);
      font-size: 16px;
    }
  }
}

.editor-body {
  padding: 0;
}

.editor-footer {
  padding: 0;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@include mobile {
  .mcp-panel {
    padding: 16px;
  }

  .toolbar {
    flex-wrap: wrap;

    .server-count {
      width: 100%;
      margin-left: 0;
    }
  }
}
</style>

<style lang="scss">
.mcp-editor-dialog {
  --el-dialog-padding-primary: 12px !important;

  .el-dialog__header {
    margin-right: 0;
    padding: 12px 24px;
  }

  .el-dialog__footer {
    padding: 24px;
    padding-top: 0;
  }
}
</style>
