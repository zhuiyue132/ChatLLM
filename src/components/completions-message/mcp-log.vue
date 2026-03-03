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
    <div class="mcp-log-meta">
      <div class="mcp-log-title">
        <i class="iconfont icon-fuwu"></i>
        <span>MCP 调用</span>
      </div>
      <span class="mcp-status" :class="normalizedStatus">
        {{ statusText }}
      </span>
      <span class="mcp-duration">
        {{ normalizedStatus === 'pending' ? '进行中' : formatDuration(durationMs) }}
      </span>
    </div>

    <div class="mcp-log-name">{{ serverName || 'MCP' }} / {{ toolName || 'tool' }}</div>

    <div v-if="formattedArguments" class="mcp-log-block">
      <div class="mcp-log-block-title">参数</div>
      <pre>{{ formattedArguments }}</pre>
    </div>

    <div class="mcp-log-block">
      <div class="mcp-log-block-title">{{ outputTitle }}</div>
      <pre>{{ outputContent }}</pre>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
</script>

<style lang="scss" scoped>
.mcp-log-message {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color-muted);
  border-radius: 10px;
  background: var(--bg-panel);

  .mcp-log-meta {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
  }

  .mcp-log-title {
    display: flex;
    align-items: center;
    color: var(--text-normal-color);
    font-size: 13px;
    font-weight: 500;
    gap: 6px;
  }

  .mcp-status {
    min-width: 42px;
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
    color: var(--text-dblight-color);
    font-size: 12px;
  }

  .mcp-log-name {
    color: var(--text-normal-color);
    font-size: 12px;
    font-weight: 500;
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
