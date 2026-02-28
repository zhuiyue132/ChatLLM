<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/api-model-panel/index.vue
 * @Description  : API与模型配置面板（左侧菜单分步）
-->

<template>
  <div class="api-model-panel">
    <div class="panel-header">
      <div class="panel-title">{{ panelMeta.title }}</div>
      <div class="panel-desc">{{ panelMeta.desc }}</div>
    </div>

    <div v-if="panelKey === 'api-config'" class="panel-body">
      <el-form :model="wizard.apiConfig" label-position="top" class="settings-form">
        <el-form-item label="API Base URL">
          <el-input
            :model-value="wizard.apiConfig.baseURL"
            placeholder="例如: https://api.openai.com/v1"
            clearable
            @update:model-value="handleApiFieldUpdate('baseURL', $event)"
          />
          <div class="form-item-tip">请输入 OpenAI 兼容的 API 地址</div>
        </el-form-item>

        <el-form-item label="API Key">
          <el-input
            :model-value="wizard.apiConfig.apiKey"
            :type="wizard.showApiKey.value ? 'text' : 'password'"
            placeholder="请输入 API Key"
            clearable
            @update:model-value="handleApiFieldUpdate('apiKey', $event)"
          >
            <template #suffix>
              <el-icon class="toggle-password" @click="wizard.toggleShowApiKey()">
                <i
                  :class="wizard.showApiKey.value ? 'iconfont icon-eye' : 'iconfont icon-eye-close'"
                />
              </el-icon>
            </template>
          </el-input>
          <div class="form-item-tip">密钥将安全存储在本地浏览器中</div>
        </el-form-item>

        <div class="form-actions">
          <el-button
            :loading="wizard.fetchingModels.value"
            :disabled="!wizard.canFetchModels.value"
            @click="handleFetchModels"
          >
            {{ wizard.fetchingModels.value ? '获取中...' : '获取模型列表' }}
          </el-button>
        </div>

        <div v-if="wizard.fetchError.value" class="fetch-error">{{ wizard.fetchError.value }}</div>
        <div v-else-if="wizard.availableModels.value.length > 0" class="fetch-success">
          <i class="iconfont icon-check-circle"></i>
          已获取 {{ wizard.availableModels.value.length }} 个模型
        </div>
      </el-form>
    </div>

    <div v-else-if="panelKey === 'model-list'" class="panel-body">
      <el-input
        :model-value="wizard.modelSearchKeyword.value"
        placeholder="搜索模型..."
        clearable
        class="model-search"
        @update:model-value="wizard.setModelSearchKeyword"
      >
        <template #prefix>
          <i class="iconfont icon-sousuo"></i>
        </template>
      </el-input>

      <div class="model-list">
        <el-checkbox-group
          :model-value="wizard.selectedModels.value"
          @update:model-value="wizard.updateSelectedModels"
        >
          <div
            v-for="model in wizard.filteredModels.value"
            :key="model.id"
            class="model-item"
            :class="{ selected: wizard.selectedModels.value.includes(model.id) }"
          >
            <el-checkbox :value="model.id">
              <div class="model-info">
                <ModelIcon :name="model.id" :size="18" />
                <div class="model-name">{{ model.id }}</div>
              </div>
              <div class="model-capabilities" @click.stop>
                <button
                  v-for="capability in wizard.modelCapabilityOptions"
                  :key="`${model.id}-${capability.value}`"
                  type="button"
                  class="capability-tag"
                  :class="{ active: isModelCapabilityEnabled(model.id, capability.value) }"
                  @click.stop="handleToggleModelCapability(model.id, capability.value)"
                >
                  {{ capability.label }}
                </button>
              </div>
            </el-checkbox>
          </div>
        </el-checkbox-group>

        <div v-if="!wizard.availableModels.value.length" class="empty-tip">
          当前无模型列表，请先到「API设定」获取模型
        </div>
      </div>

      <div class="model-actions">
        <el-button size="small" text @click="wizard.selectAllModels">全选</el-button>
        <el-button size="small" text @click="wizard.clearModelSelection">清空</el-button>
        <span class="selected-count">已选 {{ wizard.selectedModels.value.length }} 个</span>
      </div>
    </div>

    <div v-else class="panel-body">
      <el-form label-position="top" class="settings-form">
        <el-form-item label="默认对话模型">
          <el-select
            :model-value="wizard.defaultModels.chat"
            placeholder="选择默认对话模型"
            filterable
            clearable
            class="full-width"
            @update:model-value="handleDefaultModelChange('chat', $event)"
          >
            <el-option
              v-for="model in wizard.selectedModels.value"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-select>
          <div class="form-item-tip">新建对话时默认使用的模型</div>
        </el-form-item>

        <el-form-item label="标题总结模型">
          <el-select
            :model-value="wizard.defaultModels.summary"
            placeholder="选择标题总结模型"
            filterable
            clearable
            class="full-width"
            @update:model-value="handleDefaultModelChange('summary', $event)"
          >
            <el-option
              v-for="model in wizard.selectedModels.value"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-select>
          <div class="form-item-tip">用于自动生成对话标题的模型</div>
        </el-form-item>

        <el-form-item label="翻译模型">
          <el-select
            :model-value="wizard.defaultModels.translate"
            placeholder="选择翻译模型"
            filterable
            clearable
            class="full-width"
            @update:model-value="handleDefaultModelChange('translate', $event)"
          >
            <el-option
              v-for="model in wizard.selectedModels.value"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-select>
          <div class="form-item-tip">用于文本翻译功能的模型</div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ModelIcon from '@/components/model-icon/index.vue'

defineOptions({
  name: 'ApiModelPanel'
})

const props = defineProps({
  panelKey: {
    type: String,
    required: true
  },
  wizard: {
    type: Object,
    required: true
  }
})

const PANEL_META = {
  'api-config': {
    title: 'API设定',
    desc: '配置 API 地址与密钥，并获取可用模型列表'
  },
  'model-list': {
    title: '模型列表',
    desc: '选择可用模型，并标记模型能力以支持后续功能开发'
  },
  'default-model': {
    title: '默认模型',
    desc: '设置对话、标题总结与翻译场景的默认模型'
  }
}

const panelMeta = computed(() => PANEL_META[props.panelKey] || PANEL_META['api-config'])

const handleApiFieldUpdate = (key, value) => {
  props.wizard.updateApiConfig({
    ...props.wizard.apiConfig,
    [key]: value
  })
}

const handleDefaultModelChange = (key, value) => {
  props.wizard.updateDefaultModels({
    ...props.wizard.defaultModels,
    [key]: value
  })
}

const handleFetchModels = async () => {
  await props.wizard.fetchModels()
}

const isModelCapabilityEnabled = (modelId, capability) => {
  return props.wizard.getModelCapabilities(modelId).includes(capability)
}

const handleToggleModelCapability = (modelId, capability) => {
  props.wizard.toggleModelCapability(modelId, capability)
}
</script>

<style lang="scss" scoped>
.api-model-panel {
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
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

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

    .el-select.full-width {
      width: 100%;
    }
  }

  .form-item-tip {
    margin-top: 6px;
    color: var(--text-dblight-color);
    font-size: 12px;
    line-height: 18px;
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
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

.fetch-error {
  margin-top: 12px;
  padding: 10px 12px;
  color: var(--error-text);
  font-size: 13px;
  border-radius: 6px;
  background-color: var(--error-bg);
}

.fetch-success {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 12px;
  color: var(--success-text);
  font-size: 13px;
  border-radius: 6px;
  background-color: var(--success-bg);

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
    color: var(--text-dblight-color);
    font-size: 16px;
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
    border: 1px solid var(--border-color-muted);
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
      align-items: flex-start;

      .el-checkbox__label {
        display: block;
        flex: 1;
        overflow: hidden;
      }
    }
  }

  .model-info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    .model-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      color: var(--text-normal-color);
    }
  }

  .model-capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .capability-tag {
    border: 1px solid var(--border-color-muted);
    border-radius: 999px;
    background: var(--bg-panel);
    color: var(--text-dblight-color);
    font-size: 12px;
    line-height: 1.2;
    padding: 4px 10px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--main-color, #007e54);
      color: var(--main-color, #007e54);
    }

    &.active {
      border-color: var(--main-color, #007e54);
      background: rgb(0 126 84 / 8%);
      color: var(--main-color, #007e54);
    }
  }
}

.empty-tip {
  margin-top: 12px;
  padding: 10px 12px;
  color: var(--text-dblight-color);
  font-size: 13px;
  border-radius: 6px;
  background: var(--bg-panel);
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .selected-count {
    margin-left: auto;
    color: var(--main-color, #007e54);
    font-size: 13px;
  }
}
</style>
