<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-29
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/index.vue
 * @Description  : 设置弹窗 - 包含 API 配置、模型选择、默认模型、知识库设置
 *
-->

<template>
  <bi-dialog
    v-model="dialogVisible"
    title="设置"
    width="900px"
    :show-footer="false"
    :close-on-click-modal="false"
    append-to-body
    custom-class="settings-dialog"
  >
    <div class="settings-container">
      <!-- 左侧菜单 -->
      <div class="settings-sidebar">
        <div
          v-for="item in menuList"
          :key="item.key"
          class="sidebar-item"
          :class="{ active: activeMenu === item.key }"
          @click="activeMenu = item.key"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="settings-content">
        <!-- API 配置 -->
        <div v-show="activeMenu === 'api'" class="content-panel">
          <div class="panel-title">API 配置</div>
          <div class="panel-desc">配置 OpenAI 兼容的 API 地址和密钥</div>

          <el-form
            ref="apiFormRef"
            :model="formData"
            :rules="formRules"
            label-position="top"
            class="settings-form"
          >
            <el-form-item label="API Base URL" prop="baseURL">
              <el-input
                v-model="formData.baseURL"
                placeholder="例如: https://api.openai.com/v1"
                clearable
              />
              <div class="form-item-tip">请输入 OpenAI 兼容的 API 地址</div>
            </el-form-item>

            <el-form-item label="API Key" prop="apiKey">
              <el-input
                v-model="formData.apiKey"
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
              <div class="form-item-tip">密钥将安全存储在本地浏览器中</div>
            </el-form-item>

            <div class="form-actions">
              <el-button
                :loading="fetchingModels"
                :disabled="!canFetchModels"
                @click="handleFetchModels"
              >
                {{ fetchingModels ? '获取中...' : '获取模型列表' }}
              </el-button>
              <el-button type="primary" @click="handleSaveApiConfig">保存</el-button>
            </div>

            <div v-if="fetchError" class="fetch-error">{{ fetchError }}</div>
            <div v-else-if="availableModels.length" class="fetch-success">
              <i class="iconfont icon-check-circle"></i>
              已获取 {{ availableModels.length }} 个模型
            </div>
          </el-form>
        </div>

        <!-- 模型选择 -->
        <div v-show="activeMenu === 'models'" class="content-panel">
          <div class="panel-title">
            模型选择
            <span v-if="localSelectedModels.length" class="selected-count">
              已选 {{ localSelectedModels.length }} 个
            </span>
          </div>
          <div class="panel-desc">选择要在对话中使用的模型</div>

          <!-- 搜索框 -->
          <el-input
            v-model="modelSearchKeyword"
            placeholder="搜索模型..."
            clearable
            class="model-search"
          >
            <template #prefix>
              <i class="iconfont icon-sousuo"></i>
            </template>
          </el-input>

          <div v-if="!availableModels.length" class="model-empty">
            <div class="empty-tip">请先在「API 配置」中获取模型列表</div>
          </div>

          <template v-else>
            <div class="model-list">
              <el-checkbox-group v-model="localSelectedModels">
                <div
                  v-for="model in filteredModels"
                  :key="model.id"
                  class="model-item"
                  :class="{ selected: localSelectedModels.includes(model.id) }"
                >
                  <el-checkbox :value="model.id">
                    <div class="model-info">
                      <ModelIcon :name="model.id" :size="20" />
                      <span class="model-name">{{ model.id }}</span>
                    </div>
                  </el-checkbox>
                </div>
              </el-checkbox-group>
            </div>

            <div class="panel-footer">
              <div class="model-actions">
                <el-button size="small" text @click="handleSelectAll">全选</el-button>
                <el-button size="small" text @click="handleClearSelection">清空</el-button>
              </div>
              <el-button type="primary" @click="handleSaveModels">保存</el-button>
            </div>
          </template>
        </div>

        <!-- 默认模型设置 -->
        <div v-show="activeMenu === 'defaults'" class="content-panel">
          <div class="panel-title">默认模型设置</div>
          <div class="panel-desc">设置各种场景下的默认模型</div>

          <el-form label-position="top" class="settings-form">
            <el-form-item label="默认对话模型">
              <el-select
                v-model="defaultModels.chat"
                placeholder="选择默认对话模型"
                filterable
                clearable
                class="full-width"
              >
                <el-option
                  v-for="model in savedSelectedModels"
                  :key="model"
                  :label="model"
                  :value="model"
                >
                  <div class="model-option">
                    <ModelIcon :name="model" :size="18" />
                    <span>{{ model }}</span>
                  </div>
                </el-option>
              </el-select>
              <div class="form-item-tip">新建对话时默认使用的模型</div>
            </el-form-item>

            <el-form-item label="标题总结模型">
              <el-select
                v-model="defaultModels.summary"
                placeholder="选择标题总结模型"
                filterable
                clearable
                class="full-width"
              >
                <el-option
                  v-for="model in savedSelectedModels"
                  :key="model"
                  :label="model"
                  :value="model"
                >
                  <div class="model-option">
                    <ModelIcon :name="model" :size="18" />
                    <span>{{ model }}</span>
                  </div>
                </el-option>
              </el-select>
              <div class="form-item-tip">用于自动生成对话标题的模型</div>
            </el-form-item>

            <el-form-item label="翻译模型">
              <el-select
                v-model="defaultModels.translate"
                placeholder="选择翻译模型"
                filterable
                clearable
                class="full-width"
              >
                <el-option
                  v-for="model in savedSelectedModels"
                  :key="model"
                  :label="model"
                  :value="model"
                >
                  <div class="model-option">
                    <ModelIcon :name="model" :size="18" />
                    <span>{{ model }}</span>
                  </div>
                </el-option>
              </el-select>
              <div class="form-item-tip">用于文本翻译功能的模型</div>
            </el-form-item>
          </el-form>

          <div v-if="!savedSelectedModels.length" class="no-models-tip">
            <i class="iconfont icon-info-circle"></i>
            请先在「模型选择」中选择并保存要使用的模型
          </div>

          <div v-else class="panel-footer">
            <div></div>
            <el-button type="primary" @click="handleSaveDefaultModels">保存</el-button>
          </div>
        </div>

        <!-- 知识库设置 -->
        <div v-show="activeMenu === 'knowledge'" class="content-panel">
          <div class="panel-title">知识库设置</div>
          <div class="panel-desc">配置知识库连接以启用 RAG 功能</div>

          <el-form label-position="top" class="settings-form">
            <el-form-item>
              <el-switch
                v-model="knowledgeConfig.enabled"
                active-text="启用知识库"
                inactive-text=""
              />
            </el-form-item>

            <template v-if="knowledgeConfig.enabled">
              <el-form-item label="知识库 API 地址">
                <el-input
                  v-model="knowledgeConfig.apiUrl"
                  placeholder="例如: https://your-knowledge-base.com/api"
                  clearable
                />
              </el-form-item>

              <el-form-item label="知识库 API Key">
                <el-input
                  v-model="knowledgeConfig.apiKey"
                  :type="showKbApiKey ? 'text' : 'password'"
                  placeholder="请输入知识库 API Key"
                  clearable
                >
                  <template #suffix>
                    <el-icon class="toggle-password" @click="showKbApiKey = !showKbApiKey">
                      <i :class="showKbApiKey ? 'iconfont icon-eye' : 'iconfont icon-eye-close'" />
                    </el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item label="默认知识库">
                <el-input
                  v-model="knowledgeConfig.defaultCollection"
                  placeholder="输入默认知识库名称或 ID"
                  clearable
                />
                <div class="form-item-tip">对话时默认查询的知识库</div>
              </el-form-item>
            </template>
          </el-form>

          <div class="panel-footer">
            <div></div>
            <el-button type="primary" @click="handleSaveKnowledge">保存</el-button>
          </div>
        </div>

        <!-- 数据备份 -->
        <div v-show="activeMenu === 'backup'" class="content-panel">
          <div class="panel-title">数据备份</div>
          <div class="panel-desc">导入、导出您的对话数据</div>

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
      </div>
    </div>
  </bi-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import BiDialog from '@/components/dialog/index.vue'
import ModelIcon from '@/components/model-icon/index.vue'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { getModelListWithConfig } from '@/api/completions'
import {
  selectJsonFile,
  readFileAsText,
  downloadJson,
  exportChatData,
  importNativeData,
  convertCherryStudioData
} from '@/utils/data-backup'

defineOptions({
  name: 'ApiSettingsDialog'
})

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const apiSettingsStore = useApiSettingsStore()
const chatRoomsStore = useChatRoomsStore()

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => {
    emit('update:modelValue', value)
  }
})

// 菜单配置
const menuList = [
  { key: 'api', label: 'API 配置', icon: 'iconfont icon-api' },
  { key: 'models', label: '模型选择', icon: 'iconfont icon-moxing-lora' },
  { key: 'defaults', label: '默认模型', icon: 'iconfont icon-setting' },
  { key: 'knowledge', label: '知识库', icon: 'iconfont icon-zhishiku' },
  { key: 'backup', label: '数据备份', icon: 'iconfont icon-download' }
]

const activeMenu = ref('api')

// API 配置表单
const apiFormRef = ref(null)
const showApiKey = ref(false)
const showKbApiKey = ref(false)
const fetchingModels = ref(false)
const fetchError = ref('')
const availableModels = ref([])
const localSelectedModels = ref([])
const modelSearchKeyword = ref('')

const formData = reactive({
  baseURL: '',
  apiKey: ''
})

const formRules = {
  baseURL: [
    { required: true, message: '请输入 API Base URL', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '请输入有效的 URL 地址',
      trigger: 'blur'
    }
  ],
  apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }]
}

// 默认模型设置
const defaultModels = reactive({
  chat: '',
  summary: '',
  translate: ''
})

// 知识库配置
const knowledgeConfig = reactive({
  enabled: false,
  apiUrl: '',
  apiKey: '',
  defaultCollection: ''
})

// 数据备份状态
const importing = ref(false)

const canFetchModels = computed(() => {
  return formData.baseURL && formData.apiKey && /^https?:\/\/.+/.test(formData.baseURL)
})

// 已保存到 store 的模型列表（用于默认模型设置）
const savedSelectedModels = computed(() => {
  return apiSettingsStore.selectedModels || []
})

// 过滤后的模型列表（根据搜索关键字）
const filteredModels = computed(() => {
  if (!modelSearchKeyword.value) {
    return availableModels.value
  }
  const keyword = modelSearchKeyword.value.toLowerCase()
  return availableModels.value.filter(model => model.id.toLowerCase().includes(keyword))
})

// 从 store 加载配置
const loadSettings = () => {
  formData.baseURL = apiSettingsStore.baseURL
  formData.apiKey = apiSettingsStore.apiKey
  localSelectedModels.value = [...apiSettingsStore.selectedModels]

  // 加载默认模型设置
  defaultModels.chat = apiSettingsStore.defaultChatModel || ''
  defaultModels.summary = apiSettingsStore.defaultSummaryModel || ''
  defaultModels.translate = apiSettingsStore.defaultTranslateModel || ''

  // 加载知识库配置
  const kb = apiSettingsStore.knowledgeBase || {}
  knowledgeConfig.enabled = kb.enabled || false
  knowledgeConfig.apiUrl = kb.apiUrl || ''
  knowledgeConfig.apiKey = kb.apiKey || ''
  knowledgeConfig.defaultCollection = kb.defaultCollection || ''
}

// 弹窗打开时加载配置
watch(dialogVisible, visible => {
  if (visible) {
    loadSettings()
    activeMenu.value = 'api'
    showApiKey.value = false
    showKbApiKey.value = false
    fetchError.value = ''
    modelSearchKeyword.value = ''
    // 如果已有配置，自动获取模型列表
    if (canFetchModels.value) {
      handleFetchModels()
    }
  } else {
    availableModels.value = []
  }
})

// 获取模型列表
const handleFetchModels = async () => {
  if (!canFetchModels.value) return

  fetchingModels.value = true
  fetchError.value = ''

  try {
    const res = await getModelListWithConfig(formData.baseURL, formData.apiKey)
    if (res?.data && Array.isArray(res.data)) {
      availableModels.value = res.data.sort((a, b) => a.id.localeCompare(b.id))
    } else {
      fetchError.value = '获取模型列表失败：返回数据格式错误'
    }
  } catch (e) {
    fetchError.value = `获取模型列表失败：${e.message || '网络错误'}`
  } finally {
    fetchingModels.value = false
  }
}

// 全选
const handleSelectAll = () => {
  localSelectedModels.value = filteredModels.value.map(m => m.id)
}

// 清空选择
const handleClearSelection = () => {
  localSelectedModels.value = []
}

// 保存 API 配置
const handleSaveApiConfig = async () => {
  if (!apiFormRef.value) return

  try {
    await apiFormRef.value.validate()
    apiSettingsStore.updateApiConfig({
      baseURL: formData.baseURL,
      apiKey: formData.apiKey
    })
    ElMessage.success('API 配置已保存')
  } catch (e) {
    // 校验失败
  }
}

// 保存模型选择
const handleSaveModels = () => {
  apiSettingsStore.updateSelectedModels(localSelectedModels.value)
  ElMessage.success('模型选择已保存')
}

// 保存默认模型设置
const handleSaveDefaultModels = () => {
  apiSettingsStore.updateDefaultModels({
    chat: defaultModels.chat,
    summary: defaultModels.summary,
    translate: defaultModels.translate
  })
  ElMessage.success('默认模型设置已保存')
}

// 保存知识库配置
const handleSaveKnowledge = () => {
  apiSettingsStore.updateKnowledgeBase({
    enabled: knowledgeConfig.enabled,
    apiUrl: knowledgeConfig.apiUrl,
    apiKey: knowledgeConfig.apiKey,
    defaultCollection: knowledgeConfig.defaultCollection
  })
  ElMessage.success('知识库设置已保存')
}

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
.settings-container {
  display: flex;
  min-height: 500px;
}

.settings-sidebar {
  flex: 0 0 180px;
  padding: 16px 0;
  border-right: 1px solid #f0f0f0;
  background-color: #fafafa;

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 20px;
    margin: 4px 8px;
    color: #595959;
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;

    .iconfont {
      font-size: 18px;
    }

    &:hover {
      color: #262626;
      background-color: #f0f0f0;
    }

    &.active {
      color: var(--main-color, #007e54);
      font-weight: 500;
      background-color: rgb(0 126 84 / 8%);

      .iconfont {
        color: var(--main-color, #007e54);
      }
    }
  }
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 500px;
}

.content-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  overflow: hidden;

  .panel-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    margin-bottom: 8px;
    color: #262626;
    font-size: 18px;
    font-weight: 600;

    .selected-count {
      color: var(--main-color, #007e54);
      font-size: 13px;
      font-weight: normal;
    }
  }

  .panel-desc {
    flex-shrink: 0;
    margin-bottom: 24px;
    color: #8c8c8c;
    font-size: 14px;
  }
}

.settings-form {
  flex: 1;
  overflow-y: auto;

  :deep(.el-form-item) {
    margin-bottom: 20px;

    .el-form-item__label {
      padding-bottom: 6px;
      color: #262626;
      font-size: 14px;
      font-weight: 500;
      line-height: 22px;
    }

    .el-input {
      .el-input__wrapper {
        padding: 8px 12px;
        border-radius: 6px;
      }
    }

    .el-select {
      &.full-width {
        width: 100%;
      }
    }
  }

  .form-item-tip {
    margin-top: 6px;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 18px;
  }

  .toggle-password {
    cursor: pointer;

    .iconfont {
      color: #8c8c8c;
      font-size: 16px;
      transition: color 0.2s;

      &:hover {
        color: #595959;
      }
    }
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.fetch-error {
  margin-top: 12px;
  padding: 10px 12px;
  color: #ff4d4f;
  font-size: 13px;
  border-radius: 6px;
  background-color: #fff2f0;
}

.fetch-success {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 12px;
  color: #52c41a;
  font-size: 13px;
  border-radius: 6px;
  background-color: #f6ffed;

  .iconfont {
    font-size: 16px;
  }
}

.model-search {
  flex-shrink: 0;
  margin-bottom: 16px;

  :deep(.el-input__wrapper) {
    padding: 8px 12px;
    border-radius: 6px;
  }

  .iconfont {
    color: #8c8c8c;
    font-size: 16px;
  }
}

.model-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  font-size: 14px;

  .empty-tip {
    text-align: center;
  }
}

.model-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  padding-right: 8px;

  :deep(.el-checkbox-group) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .model-item {
    padding: 10px 12px;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--main-color, #007e54);
      background-color: rgb(0 126 84 / 4%);
    }

    &.selected {
      border-color: var(--main-color, #007e54);
      background-color: rgb(0 126 84 / 8%);
    }

    :deep(.el-checkbox) {
      width: 100%;
      height: auto;

      .el-checkbox__label {
        flex: 1;
        overflow: hidden;
      }
    }
  }

  .model-info {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;

    .model-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      color: #262626;
    }
  }
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.model-actions {
  display: flex;
  gap: 8px;
}

.model-option {
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    font-size: 14px;
  }
}

.no-models-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  margin-top: 16px;
  color: #8c8c8c;
  font-size: 14px;
  border-radius: 6px;
  background-color: #fafafa;

  .iconfont {
    color: #faad14;
    font-size: 16px;
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

<style lang="scss">
.settings-dialog {
  .el-dialog__body {
    padding: 0;
  }
}
</style>
