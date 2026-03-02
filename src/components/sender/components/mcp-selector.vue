<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-03-02
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-02
 * @FilePath     : /ChatLLM/src/components/sender/components/mcp-selector.vue
 * @Description  : Sender MCP 选择器（会话开关 + 本条消息服务选择）
-->

<template>
  <el-popover
    trigger="click"
    placement="top-start"
    :width="320"
    popper-class="mcp-selector-popper"
    :disabled="disabled"
  >
    <template #reference>
      <button
        type="button"
        class="mcp-trigger"
        :class="{ active: sessionEnabled && selectedCount > 0, disabled: disabled }"
      >
        <i class="iconfont icon-fuwu"></i>
        <span>MCP</span>
        <span v-if="sessionEnabled && selectedCount > 0" class="selected-count">
          {{ selectedCount }}
        </span>
      </button>
    </template>

    <div class="mcp-selector-content">
      <div class="mcp-session-row">
        <div class="session-text">会话 MCP</div>
        <el-switch :model-value="sessionEnabled" @update:model-value="handleSessionToggle" />
      </div>

      <div v-if="!globalEnabled" class="global-tip">全局已关闭，本会话设置优先级更高</div>

      <div v-if="!sessionEnabled" class="state-tip">开启后可为本条消息选择 MCP 服务</div>

      <template v-else>
        <div v-if="availableServers.length === 0" class="state-tip">暂无可用 MCP 服务</div>

        <template v-else>
          <el-checkbox-group
            :model-value="safeSelectedIds"
            class="server-checkboxes"
            @update:model-value="handleSelectChange"
          >
            <el-checkbox
              v-for="server in availableServers"
              :key="server.id"
              :value="server.id"
              class="server-checkbox-item"
            >
              <span class="server-name">{{ server.name }}</span>
            </el-checkbox>
          </el-checkbox-group>

          <div class="mcp-actions">
            <el-button text size="small" @click="handleSelectAll">全选</el-button>
            <el-button text size="small" @click="handleClear">清空</el-button>
          </div>
        </template>
      </template>
    </div>
  </el-popover>
</template>

<script setup>
import { computed, watch } from 'vue'

defineOptions({
  name: 'SenderMcpSelector'
})

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  sessionEnabled: {
    type: Boolean,
    default: false
  },
  globalEnabled: {
    type: Boolean,
    default: false
  },
  serverList: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'update:sessionEnabled'])

const availableServers = computed(() => {
  return (props.serverList || []).filter(server => server?.id && server?.enabled !== false)
})

const availableServerIdSet = computed(() => {
  return new Set(availableServers.value.map(server => server.id))
})

const safeSelectedIds = computed(() => {
  const selectedIds = Array.isArray(props.modelValue) ? props.modelValue : []
  return selectedIds.filter(serverId => availableServerIdSet.value.has(serverId))
})

const selectedCount = computed(() => safeSelectedIds.value.length)

const handleSessionToggle = enabled => {
  emit('update:sessionEnabled', !!enabled)
  if (!enabled) {
    emit('update:modelValue', [])
  }
}

const handleSelectChange = selectedIds => {
  const safeIds = (selectedIds || []).filter(serverId => availableServerIdSet.value.has(serverId))
  emit('update:modelValue', safeIds)
}

const handleSelectAll = () => {
  emit(
    'update:modelValue',
    availableServers.value.map(server => server.id)
  )
}

const handleClear = () => {
  emit('update:modelValue', [])
}

watch(
  () => [props.sessionEnabled, safeSelectedIds.value.join(',')],
  () => {
    if (!props.sessionEnabled && safeSelectedIds.value.length > 0) {
      emit('update:modelValue', [])
      return
    }

    if (safeSelectedIds.value.length !== (props.modelValue || []).length) {
      emit('update:modelValue', safeSelectedIds.value)
    }
  }
)
</script>

<style lang="scss" scoped>
.mcp-trigger {
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

  .iconfont {
    font-size: 14px;
  }

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

.mcp-selector-content {
  .mcp-session-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .session-text {
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 500;
    }
  }

  .global-tip {
    margin-bottom: 8px;
    color: var(--warning-accent);
    font-size: 12px;
  }

  .state-tip {
    color: var(--text-dblight-color);
    font-size: 12px;
  }

  .server-checkboxes {
    display: flex;
    overflow: auto;
    flex-direction: column;
    max-height: 180px;
    padding-right: 6px;
    gap: 6px;
  }

  .server-checkbox-item {
    margin-right: 0;
    margin-left: 0;

    .server-name {
      color: var(--text-normal-color);
      font-size: 13px;
    }
  }

  .mcp-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
    gap: 4px;
  }
}
</style>
