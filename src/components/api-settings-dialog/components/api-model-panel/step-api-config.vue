<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/api-model-panel/step-api-config.vue
 * @Description  : 步骤1 - API 配置
-->

<template>
  <div class="step-api-config">
    <el-form
      ref="formRef"
      :model="config"
      :rules="formRules"
      label-position="top"
      class="settings-form"
    >
      <el-form-item label="API Base URL" prop="baseURL">
        <el-input
          :model-value="config.baseURL"
          placeholder="例如: https://api.openai.com/v1"
          clearable
          @update:model-value="handleUpdate('baseURL', $event)"
        />
        <div class="form-item-tip">请输入 OpenAI 兼容的 API 地址</div>
      </el-form-item>

      <el-form-item label="API Key" prop="apiKey">
        <el-input
          :model-value="config.apiKey"
          :type="localShowApiKey ? 'text' : 'password'"
          placeholder="请输入 API Key"
          clearable
          @update:model-value="handleUpdate('apiKey', $event)"
        >
          <template #suffix>
            <el-icon class="toggle-password" @click="localShowApiKey = !localShowApiKey">
              <i :class="localShowApiKey ? 'iconfont icon-eye' : 'iconfont icon-eye-close'" />
            </el-icon>
          </template>
        </el-input>
        <div class="form-item-tip">密钥将安全存储在本地浏览器中</div>
      </el-form-item>

      <div class="form-actions">
        <el-button :loading="fetching" :disabled="!canFetch" @click="$emit('fetchModels')">
          {{ fetching ? '获取中...' : '获取模型列表' }}
        </el-button>
      </div>

      <div v-if="fetchError" class="fetch-error">{{ fetchError }}</div>
      <div v-else-if="modelsCount > 0" class="fetch-success">
        <i class="iconfont icon-check-circle"></i>
        已获取 {{ modelsCount }} 个模型
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineOptions({
  name: 'StepApiConfig'
})

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  showApiKey: {
    type: Boolean,
    default: false
  },
  fetching: {
    type: Boolean,
    default: false
  },
  fetchError: {
    type: String,
    default: ''
  },
  modelsCount: {
    type: Number,
    default: 0
  },
  canFetch: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:config', 'update:showApiKey', 'fetchModels'])

const formRef = ref(null)
const localShowApiKey = ref(props.showApiKey)

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

const handleUpdate = (key, value) => {
  emit('update:config', { ...props.config, [key]: value })
}

// 暴露表单验证方法
const validate = () => formRef.value?.validate()
defineExpose({ validate })
</script>

<style lang="scss" scoped>
.settings-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;

    .el-form-item__label {
      padding-bottom: 6px;
      color: var(--text-normal-color);
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
      transition: color 0.2s;
      color: var(--text-dblight-color);
      font-size: 16px;

      &:hover {
        color: var(--text-light-color);
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
  color: var(--error-text);
  border-radius: 6px;
  background-color: var(--error-bg);
  font-size: 13px;
}

.fetch-success {
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding: 10px 12px;
  color: var(--success-text);
  border-radius: 6px;
  background-color: var(--success-bg);
  font-size: 13px;
  gap: 6px;

  .iconfont {
    font-size: 16px;
  }
}
</style>
