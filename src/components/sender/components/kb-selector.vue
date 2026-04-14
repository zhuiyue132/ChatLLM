<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/components/sender/components/kb-selector.vue
 * @Description  : Sender 知识库选择器
-->

<template>
  <el-popover
    trigger="click"
    placement="top-start"
    :width="320"
    popper-class="kb-selector-popper"
    :disabled="disabled"
  >
    <template #reference>
      <button
        type="button"
        class="kb-trigger"
        :class="{ active: selectedCount > 0, disabled: disabled }"
      >
        <KnowledgeBaseIcon :size="14" />
        <span>知识库</span>
        <span v-if="selectedCount > 0" class="selected-count">
          {{ selectedCount }}
        </span>
      </button>
    </template>

    <div class="kb-selector-content">
      <div v-if="availableKbs.length === 0" class="state-tip">暂无可用知识库</div>

      <template v-else>
        <el-checkbox-group
          :model-value="safeSelectedIds"
          class="kb-checkboxes"
          @update:model-value="handleSelectChange"
        >
          <el-checkbox
            v-for="kb in availableKbs"
            :key="kb.id"
            :value="kb.id"
            class="kb-checkbox-item"
          >
            <div class="kb-option">
              <span class="kb-option-name">{{ kb.name }}</span>
              <span class="kb-option-meta">{{ kb.chunkCount }} 分块</span>
            </div>
          </el-checkbox>
        </el-checkbox-group>

        <div class="kb-actions">
          <el-button text size="small" @click="handleSelectAll">全选</el-button>
          <el-button text size="small" @click="handleClear">清空</el-button>
        </div>
      </template>
    </div>
  </el-popover>
</template>

<script setup>
import { computed } from 'vue'
import KnowledgeBaseIcon from '@/components/icons/knowledge-base-icon.vue'

defineOptions({
  name: 'SenderKbSelector'
})

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  kbList: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const availableKbs = computed(() => {
  return (props.kbList || []).filter(kb => kb?.id && kb?.enabled !== false)
})

const availableKbIdSet = computed(() => {
  return new Set(availableKbs.value.map(kb => kb.id))
})

const safeSelectedIds = computed(() => {
  const selectedIds = Array.isArray(props.modelValue) ? props.modelValue : []
  return selectedIds.filter(kbId => availableKbIdSet.value.has(kbId))
})

const selectedCount = computed(() => safeSelectedIds.value.length)

const handleSelectChange = selectedIds => {
  const safeIds = (selectedIds || []).filter(kbId => availableKbIdSet.value.has(kbId))
  emit('update:modelValue', safeIds)
}

const handleSelectAll = () => {
  emit(
    'update:modelValue',
    availableKbs.value.map(kb => kb.id)
  )
}

const handleClear = () => {
  emit('update:modelValue', [])
}
</script>

<style lang="scss" scoped>
.kb-trigger {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-light-color);
  border: 1px solid var(--border-color-muted);
  border-radius: 16px;
  background: var(--bg-panel);
  font-size: 13px;
  gap: 4px;

  .selected-count {
    min-width: 16px;
    height: 16px;
    text-align: center;
    color: var(--text-white-color);
    border-radius: 8px;
    background: var(--main-color);
    font-size: 12px;
    line-height: 16px;
  }

  &:hover {
    color: var(--main-color);
    border-color: var(--main-color);
  }

  &.active {
    color: var(--main-color);
    border-color: var(--main-color);
    background: rgb(0 126 84 / 6%);
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.kb-selector-content {
  .state-tip {
    color: var(--text-dblight-color);
    font-size: 12px;
  }

  .kb-checkboxes {
    display: flex;
    overflow: auto;
    flex-direction: column;
    max-height: 180px;
    padding-right: 6px;
    gap: 6px;
  }

  .kb-checkbox-item {
    margin-right: 0;
    margin-left: 0;

    .kb-option {
      display: flex;
      align-items: center;
      gap: 6px;

      .kb-option-name {
        color: var(--text-normal-color);
        font-size: 13px;
      }

      .kb-option-meta {
        color: var(--text-dblight-color);
        font-size: 11px;
      }
    }
  }

  .kb-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
    gap: 4px;
  }
}
</style>
