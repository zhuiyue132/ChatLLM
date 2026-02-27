<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/api-model-panel/step-default-models.vue
 * @Description  : 步骤3 - 默认模型设置
-->

<template>
  <div class="step-default-models">
    <div class="optional-tip">
      <i class="iconfont icon-info-circle"></i>
      此步骤为可选设置，您可以直接保存或跳过
    </div>

    <el-form label-position="top" class="settings-form">
      <el-form-item label="默认对话模型">
        <el-select
          :model-value="modelValue.chat"
          placeholder="选择默认对话模型"
          filterable
          clearable
          class="full-width"
          @update:model-value="handleUpdate('chat', $event)"
        >
          <el-option v-for="model in selectedModels" :key="model" :label="model" :value="model">
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
          :model-value="modelValue.summary"
          placeholder="选择标题总结模型"
          filterable
          clearable
          class="full-width"
          @update:model-value="handleUpdate('summary', $event)"
        >
          <el-option v-for="model in selectedModels" :key="model" :label="model" :value="model">
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
          :model-value="modelValue.translate"
          placeholder="选择翻译模型"
          filterable
          clearable
          class="full-width"
          @update:model-value="handleUpdate('translate', $event)"
        >
          <el-option v-for="model in selectedModels" :key="model" :label="model" :value="model">
            <div class="model-option">
              <ModelIcon :name="model" :size="18" />
              <span>{{ model }}</span>
            </div>
          </el-option>
        </el-select>
        <div class="form-item-tip">用于文本翻译功能的模型</div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import ModelIcon from '@/components/model-icon/index.vue'

defineOptions({
  name: 'StepDefaultModels'
})

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      chat: '',
      summary: '',
      translate: ''
    })
  },
  selectedModels: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const handleUpdate = (key, value) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style lang="scss" scoped>
.step-default-models {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.optional-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  color: var(--text-dblight-color);
  font-size: 13px;
  background: var(--bg-panel);
  border-radius: 6px;

  .iconfont {
    color: var(--warning-accent);
    font-size: 16px;
  }
}

.settings-form {
  flex: 1;
  overflow-y: auto;

  :deep(.el-form-item) {
    margin-bottom: 20px;

    .el-form-item__label {
      padding-bottom: 6px;
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 500;
      line-height: 22px;
    }

    .el-select {
      &.full-width {
        width: 100%;
      }
    }
  }

  .form-item-tip {
    margin-top: 6px;
    color: var(--text-dblight-color);
    font-size: 12px;
    line-height: 18px;
  }
}

.model-option {
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    font-size: 14px;
  }
}
</style>
