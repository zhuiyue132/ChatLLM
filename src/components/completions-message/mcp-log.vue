<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-03-03
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-03
 * @FilePath     : /ChatLLM/src/components/completions-message/mcp-log.vue
 * @Description  : MCP 调用日志消息节点
-->
<template>
  <div class="mcp-log-message">
    <button type="button" class="mcp-log-toggle" @click="toggleExpanded">
      <div class="mcp-log-meta">
        <div class="mcp-log-title">
          <i class="icon-mcp-custom"></i>
          <span class="mcp-log-label">MCP 调用</span>
          <span class="mcp-log-title-separator">/</span>
          <span class="mcp-log-title-text">{{ mcpDisplayName }}</span>
        </div>
        <span class="mcp-status" :class="normalizedStatus">
          {{ statusText }}
        </span>
        <span class="mcp-duration">
          {{ normalizedStatus === 'pending' ? '进行中' : formatDuration(durationMs) }}
        </span>
      </div>
      <i class="iconfont icon-arrowDown toggle-icon" :class="{ expanded: isExpanded }"></i>
    </button>

    <div v-show="isExpanded" class="mcp-log-detail">
      <div v-if="formattedArguments" class="mcp-log-block">
        <div class="mcp-log-block-title">参数</div>
        <pre>{{ formattedArguments }}</pre>
      </div>

      <div class="mcp-log-block">
        <div class="mcp-log-block-title">{{ outputTitle }}</div>
        <pre>{{ outputContent }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

defineOptions({
  name: 'CompletionsMcpLogMessage'
})

const props = defineProps({
  status: {
    type: String,
    default: 'pending'
  },
  serverName: {
    type: String,
    default: ''
  },
  toolName: {
    type: String,
    default: ''
  },
  durationMs: {
    type: Number,
    default: 0
  },
  arguments: {
    type: [Object, Array, String],
    default: () => ({})
  },
  result: {
    type: [Object, Array, String, Number, Boolean],
    default: null
  },
  toolError: {
    type: String,
    default: ''
  }
})

const normalizedStatus = computed(() => {
  if (props.status === 'success' || props.status === 'error') {
    return props.status
  }
  return 'pending'
})

const statusText = computed(() => {
  if (normalizedStatus.value === 'success') return '成功'
  if (normalizedStatus.value === 'error') return '失败'
  return '调用中'
})

const outputTitle = computed(() => {
  if (normalizedStatus.value === 'success') return '返回'
  if (normalizedStatus.value === 'error') return '错误'
  return '状态'
})

const mcpDisplayName = computed(() => {
  const safeServerName = props.serverName || 'MCP'
  const safeToolName = props.toolName || 'tool'
  return `${safeServerName} / ${safeToolName}`
})

const formatDuration = duration => {
  const safeDuration = Number(duration)
  if (!Number.isFinite(safeDuration) || safeDuration < 0) {
    return '--'
  }
  return `${Math.max(0, Math.round(safeDuration))}ms`
}

const formatJsonText = value => {
  if (typeof value === 'string') return value
  if (value === undefined || value === null) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return `${value}`
  }
}

const formattedArguments = computed(() => {
  const value = props.arguments
  if (!value) return ''
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
    return ''
  }
  return formatJsonText(value)
})

const outputContent = computed(() => {
  if (normalizedStatus.value === 'success') {
    return formatJsonText(props.result)
  }
  if (normalizedStatus.value === 'error') {
    return props.toolError || '工具调用失败'
  }
  return '调用中...'
})

const isExpanded = ref(true)
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style lang="scss" scoped>
.mcp-log-message {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color-muted);
  border-radius: 10px;
  background: var(--bg-panel);

  .mcp-log-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    min-height: 24px;
    padding: 0;
    cursor: pointer;
    border: 0;
    background: transparent;
  }

  .mcp-log-meta {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    gap: 8px;
  }

  .toggle-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    transition: transform 0.2s ease;
    color: var(--text-dblight-color);
    font-size: 12px;

    &.expanded {
      transform: rotate(180deg);
    }
  }

  .mcp-log-detail {
    margin-top: 8px;
  }

  .mcp-log-title {
    display: flex;
    align-items: center;
    min-width: 0;
    flex: 1;
    color: var(--text-normal-color);
    font-size: 13px;
    font-weight: 500;
    gap: 6px;

    .icon-mcp-custom {
      flex: 0 0 auto;
    }
  }

  .mcp-log-title-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mcp-log-label,
  .mcp-log-title-separator {
    flex: 0 0 auto;
  }

  .mcp-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 20px;
    flex: 0 0 auto;
    text-align: center;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;

    &.success {
      color: var(--success-text);
      background: var(--success-bg);
    }

    &.error {
      color: var(--error-text);
      background: var(--error-bg);
    }

    &.pending {
      color: var(--text-dblight-color);
      background: var(--bg-muted);
    }
  }

  .mcp-duration {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    margin-right: 8px;
    line-height: 20px;
    color: var(--text-dblight-color);
    font-size: 12px;
  }

  .mcp-log-block {
    &:not(:first-child) {
      margin-top: 8px;
    }

    .mcp-log-block-title {
      margin-bottom: 4px;
      color: var(--text-dblight-color);
      font-size: 12px;
    }

    pre {
      overflow: auto;
      max-height: 200px;
      margin: 0;
      padding: 8px;
      white-space: pre-wrap;
      color: var(--text-normal-color);
      border-radius: 6px;
      background: var(--bg-muted);
      font-size: 12px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
  }
}
</style>
