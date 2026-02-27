<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/api-model-panel/index.vue
 * @Description  : API与模型面板 - 分步骤配置
-->

<template>
  <div class="api-model-panel">
    <div class="panel-header">
      <div class="panel-title">API与模型配置</div>
      <div class="panel-desc">配置 API 并选择要使用的模型</div>
    </div>

    <!-- 步骤条 -->
    <el-steps
      :active="wizard.currentStep.value"
      class="wizard-steps"
      finish-status="success"
      simple
    >
      <el-step v-for="step in WIZARD_STEPS" :key="step.key" :title="step.title" />
    </el-steps>

    <!-- 步骤内容 -->
    <div class="step-content">
      <!-- 步骤1：API 配置 -->
      <StepApiConfig
        v-if="wizard.currentStep.value === 0"
        :config="wizard.apiConfig"
        :show-api-key="wizard.showApiKey.value"
        :fetching="wizard.fetchingModels.value"
        :fetch-error="wizard.fetchError.value"
        :models-count="wizard.availableModels.value.length"
        :can-fetch="wizard.canFetchModels.value"
        @update:config="handleApiConfigUpdate"
        @fetch-models="handleFetchModels"
      />

      <!-- 步骤2：模型选择 -->
      <StepModelSelect
        v-else-if="wizard.currentStep.value === 1"
        v-model="wizard.selectedModels.value"
        :models="wizard.availableModels.value"
        :search-keyword="wizard.modelSearchKeyword.value"
        @update:search-keyword="wizard.modelSearchKeyword.value = $event"
        @select-all="wizard.selectAllModels"
        @clear-selection="wizard.clearModelSelection"
      />

      <!-- 步骤3：默认模型 -->
      <StepDefaultModels
        v-else
        :model-value="wizard.defaultModels"
        :selected-models="wizard.selectedModels.value"
        @update:model-value="handleDefaultModelsUpdate"
      />
    </div>

    <!-- 底部操作按钮 -->
    <div class="panel-footer">
      <el-button v-if="wizard.currentStep.value > 0" @click="wizard.prevStep"> 上一步 </el-button>
      <div class="footer-right">
        <el-button
          v-if="wizard.currentStep.value < 2"
          type="primary"
          :disabled="!wizard.canGoNext.value"
          @click="wizard.nextStep"
        >
          下一步
        </el-button>
        <template v-else>
          <el-button type="primary" @click="handleSave">保存设置</el-button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { WIZARD_STEPS } from '../../config'
import { useApiModelWizard } from '../../hooks/use-api-model-wizard'
import StepApiConfig from './step-api-config.vue'
import StepModelSelect from './step-model-select.vue'
import StepDefaultModels from './step-default-models.vue'

defineOptions({
  name: 'ApiModelPanel'
})

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['saved'])

const wizard = useApiModelWizard()

// 获取模型列表
const handleFetchModels = async () => {
  await wizard.fetchModels()
}

// 面板可见时加载配置
watch(
  () => props.visible,
  visible => {
    if (visible) {
      wizard.loadFromStore()
      wizard.reset()
    }
  },
  { immediate: true }
)

// 更新 API 配置
const handleApiConfigUpdate = config => {
  wizard.apiConfig.baseURL = config.baseURL
  wizard.apiConfig.apiKey = config.apiKey
}

// 更新默认模型配置
const handleDefaultModelsUpdate = models => {
  wizard.defaultModels.chat = models.chat
  wizard.defaultModels.summary = models.summary
  wizard.defaultModels.translate = models.translate
}

// 保存设置
const handleSave = () => {
  wizard.saveAll()
  emit('saved')
}

// 暴露 wizard 供外部使用
defineExpose({ wizard })
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

.wizard-steps {
  flex-shrink: 0;
  margin-bottom: 24px;
}

.step-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding-top: 16px;
  border-top: 1px solid var(--border-color-light);

  .footer-right {
    display: flex;
    gap: 12px;
    margin-left: auto;
  }
}
</style>
