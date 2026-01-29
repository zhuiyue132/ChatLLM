<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/index.vue
 * @Description  : API 配置弹窗
 *
-->

<template>
  <bi-dialog
    v-model="dialogVisible"
    title="API 配置"
    width="800px"
    :show-footer="true"
    :close-on-click-modal="false"
    append-to-body
    @confirm="handleSave"
    @cancel="handleCancel"
  >
    <div class="api-settings-container">
      <!-- 左侧：API 配置 -->
      <div class="api-config-section">
        <div class="section-title">API 配置</div>
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-position="top"
          class="api-form"
        >
          <el-form-item label="API Base URL" prop="baseURL">
            <el-input
              v-model="formData.baseURL"
              placeholder="例如: https://api.openai.com/v1"
              clearable
            />
            <div class="form-item-tip">OpenAI 兼容的 API 地址</div>
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

          <el-button
            type="primary"
            :loading="fetchingModels"
            :disabled="!canFetchModels"
            @click="handleFetchModels"
          >
            {{ fetchingModels ? '获取中...' : '获取模型列表' }}
          </el-button>
        </el-form>
      </div>

      <!-- 右侧：模型选择 -->
      <div class="model-select-section">
        <div class="section-title">
          模型选择
          <span v-if="localSelectedModels.length" class="selected-count">
            已选 {{ localSelectedModels.length }} 个
          </span>
        </div>

        <div v-if="!availableModels.length" class="model-empty">
          <template v-if="fetchError">
            <div class="error-message">{{ fetchError }}</div>
          </template>
          <template v-else>
            <div class="empty-tip">请先配置 API 并获取模型列表</div>
          </template>
        </div>

        <div v-else class="model-list">
          <el-checkbox-group v-model="localSelectedModels">
            <div
              v-for="model in availableModels"
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

        <div v-if="availableModels.length" class="model-actions">
          <el-button size="small" text @click="handleSelectAll">全选</el-button>
          <el-button size="small" text @click="handleClearSelection">清空</el-button>
        </div>
      </div>
    </div>
  </bi-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import BiDialog from '@/components/dialog/index.vue'
import ModelIcon from '@/components/model-icon/index.vue'
import { useApiSettingsStore } from '@/stores/api-settings'
import { getModelListWithConfig } from '@/api/completions'

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

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => {
    emit('update:modelValue', value)
  }
})

const formRef = ref(null)
const showApiKey = ref(false)
const fetchingModels = ref(false)
const fetchError = ref('')
const availableModels = ref([])
const localSelectedModels = ref([])

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

const canFetchModels = computed(() => {
  return formData.baseURL && formData.apiKey && /^https?:\/\/.+/.test(formData.baseURL)
})

// 从 store 加载配置
const loadSettings = () => {
  formData.baseURL = apiSettingsStore.baseURL
  formData.apiKey = apiSettingsStore.apiKey
  localSelectedModels.value = [...apiSettingsStore.selectedModels]
}

// 弹窗打开时加载配置
watch(dialogVisible, visible => {
  if (visible) {
    loadSettings()
    showApiKey.value = false
    fetchError.value = ''
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
  localSelectedModels.value = availableModels.value.map(m => m.id)
}

// 清空选择
const handleClearSelection = () => {
  localSelectedModels.value = []
}

const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    apiSettingsStore.updateSettings({
      baseURL: formData.baseURL,
      apiKey: formData.apiKey,
      defaultModel: localSelectedModels.value[0] || ''
    })
    apiSettingsStore.updateSelectedModels(localSelectedModels.value)
    emit('save', {
      ...formData,
      selectedModels: localSelectedModels.value
    })
    dialogVisible.value = false
  } catch (e) {
    // 校验失败
  }
}

const handleCancel = () => {
  dialogVisible.value = false
}
</script>

<style lang="scss" scoped>
.api-settings-container {
  display: flex;
  gap: 24px;
  padding: 24px;
  min-height: 400px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  color: #262626;
  font-size: 16px;
  font-weight: 600;

  .selected-count {
    color: #1890ff;
    font-size: 12px;
    font-weight: normal;
  }
}

.api-config-section {
  flex: 0 0 320px;
  padding-right: 24px;
  border-right: 1px solid #f0f0f0;

  .api-form {
    :deep(.el-form-item) {
      margin-bottom: 16px;

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
          border-radius: 4px;
        }
      }
    }
  }

  .form-item-tip {
    margin-top: 4px;
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

.model-select-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.model-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8c8c8c;
  font-size: 14px;

  .error-message {
    color: #ff4d4f;
  }

  .empty-tip {
    text-align: center;
  }
}

.model-list {
  flex: 1;
  max-height: 360px;
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
      border-color: #1890ff;
      background-color: #f0f7ff;
    }

    &.selected {
      border-color: #1890ff;
      background-color: #e6f4ff;
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

    .model-owner {
      flex-shrink: 0;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #8c8c8c;
      background-color: #f5f5f5;
    }
  }
}

.model-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
</style>
