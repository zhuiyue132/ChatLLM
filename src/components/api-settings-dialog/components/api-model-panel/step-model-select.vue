<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/api-model-panel/step-model-select.vue
 * @Description  : 步骤2 - 模型选择
-->

<template>
  <div class="step-model-select">
    <!-- 搜索框 -->
    <el-input
      v-model="localKeyword"
      placeholder="搜索模型..."
      clearable
      class="model-search"
    >
      <template #prefix>
        <i class="iconfont icon-sousuo"></i>
      </template>
    </el-input>

    <div class="model-list">
      <el-checkbox-group :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
        <div
          v-for="model in filteredModels"
          :key="model.id"
          class="model-item"
          :class="{ selected: modelValue.includes(model.id) }"
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

    <div class="model-actions">
      <el-button size="small" text @click="$emit('selectAll')">全选</el-button>
      <el-button size="small" text @click="$emit('clearSelection')">清空</el-button>
      <span class="selected-count">已选 {{ modelValue.length }} 个</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ModelIcon from '@/components/model-icon/index.vue'

defineOptions({
  name: 'StepModelSelect'
})

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  models: {
    type: Array,
    default: () => []
  },
  searchKeyword: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'update:searchKeyword', 'selectAll', 'clearSelection'])

const localKeyword = ref(props.searchKeyword)

watch(localKeyword, val => {
  emit('update:searchKeyword', val)
})

const filteredModels = computed(() => {
  if (!localKeyword.value) {
    return props.models
  }
  const keyword = localKeyword.value.toLowerCase()
  return props.models.filter(model => model.id.toLowerCase().includes(keyword))
})
</script>

<style lang="scss" scoped>
.step-model-select {
  display: flex;
  flex-direction: column;
  height: 100%;
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
