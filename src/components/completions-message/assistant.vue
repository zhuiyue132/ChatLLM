<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-22
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-11-05
 * @FilePath     : /ChatLLM/src/components/completions-message/assistant.vue
 * @Description  : 助手消息组件
 * 
-->
<template>
  <div :id="`assistant-${messageId}`" class="assistant-message">
    <LoadingComponent v-if="loading && !hasSegmentFlow" />
    <template v-else>
      <!-- 模型信息头部 -->
      <div class="model-header">
        <div class="model-info">
          <!-- 模型logo -->
          <div class="model-logo">
            <ModelIcon :name="model" :size="26" />
          </div>
          <!-- 模型名称标签 -->
          <div class="model-name-tag">
            <span>{{ modelDisplayName }}</span>
          </div>
        </div>
      </div>

      <div v-if="filePercent" class="oversize-tips">
        超出字数限制，{{ modelDisplayName }} 只阅读了前
        {{ Math.ceil(Number(filePercent) * 100) + '%' }}
      </div>

      <template v-if="hasSegmentFlow">
        <div class="assistant-segments">
          <div
            v-for="(segment, index) in normalizedSegments"
            :key="segment.id || index"
            class="assistant-segment"
            :class="{
              'assistant-segment-text': segment.type !== 'mcp',
              'assistant-segment-mcp': segment.type === 'mcp'
            }"
          >
            <template v-if="segment.type === 'mcp'">
              <div class="mcp-log-message">
                <button
                  type="button"
                  class="mcp-log-toggle"
                  @click="toggleMcpSegment(segment, index)"
                >
                  <div class="mcp-log-meta">
                    <div class="mcp-log-title">
                      <i class="icon-mcp-custom"></i>
                      <span class="mcp-log-label">MCP 调用</span>
                      <span class="mcp-log-title-separator">/</span>
                      <span class="mcp-log-title-text">{{ getMcpDisplayName(segment) }}</span>
                    </div>
                    <span class="mcp-status" :class="getMcpStatus(segment.status)">
                      {{ getMcpStatusText(segment.status) }}
                    </span>
                    <span class="mcp-duration">
                      {{
                        getMcpStatus(segment.status) === 'pending'
                          ? '进行中'
                          : formatDuration(segment.durationMs)
                      }}
                    </span>
                  </div>
                  <i
                    class="iconfont icon-arrowDown toggle-icon"
                    :class="{ expanded: isMcpSegmentExpanded(segment, index) }"
                  ></i>
                </button>

                <div v-show="isMcpSegmentExpanded(segment, index)" class="mcp-log-detail">
                  <div v-if="formatMcpArguments(segment.arguments)" class="mcp-log-block">
                    <div class="mcp-log-block-title">参数</div>
                    <pre>{{ formatMcpArguments(segment.arguments) }}</pre>
                  </div>

                  <div class="mcp-log-block">
                    <div class="mcp-log-block-title">{{ getMcpOutputTitle(segment.status) }}</div>
                    <pre>{{ getMcpOutputContent(segment) }}</pre>
                  </div>
                </div>
              </div>
            </template>

            <template v-else>
              <div v-if="segment.reasoningContent" class="thinking-section">
                <div class="thinking-header" @click="toggleSegmentThinking(segment, index)">
                  <div class="thinking-status">
                    <i class="iconfont icon-shendusikao"></i>
                    <span class="thinking-text">
                      {{ getThinkingText(segment.reasoningDuration) }}
                    </span>
                  </div>

                  <i
                    class="iconfont icon-arrowRight"
                    :class="[
                      'arrow-icon',
                      { 'arrow-up': isSegmentThinkingVisible(segment, index) }
                    ]"
                  ></i>
                </div>
                <div v-show="isSegmentThinkingVisible(segment, index)" class="thinking-content">
                  <div class="thinking-text-content">
                    <MarkdownRenderer :content="segment.reasoningContent" />
                  </div>
                </div>
              </div>

              <div v-if="segment.error || segment.content" class="message-content">
                <div class="message-text markdown-body">
                  <div v-if="segment.error" class="error-content">
                    内容生成时出现错误，请稍后重试！
                  </div>
                  <MarkdownRenderer v-else :content="segment.content" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 思考过程（如果有） -->
        <div v-if="thinkingContent" class="thinking-section">
          <div class="thinking-header" @click="toggleThinking">
            <div class="thinking-status">
              <i class="iconfont icon-shendusikao"></i>
              <span class="thinking-text">{{ thinkingText }}</span>
            </div>

            <i
              class="iconfont icon-arrowRight"
              :class="['arrow-icon', { 'arrow-up': showThinking }]"
            ></i>
          </div>
          <div v-show="showThinking" class="thinking-content">
            <div class="thinking-text-content">
              <MarkdownRenderer :content="thinkingContent" />
            </div>
          </div>
        </div>

        <!-- 消息正文内容 -->
        <div v-if="!imageList.length" class="message-content">
          <div class="message-text markdown-body">
            <div v-if="error" class="error-content">内容生成时出现错误，请稍后重试！</div>
            <MarkdownRenderer v-else :content="normalizedMessageText" />
          </div>
        </div>
        <!-- 图片内容 -->
        <template v-else>
          <div class="message-content">
            <div class="message-text markdown-body">
              {{
                imageList?.some?.(item => item.loading)
                  ? '图片创建中...'
                  : imageList?.every?.(item => item.error)
                    ? '图片创建失败'
                    : '图片已创建'
              }}
            </div>
          </div>

          <div class="image-result-container">
            <ImageItem
              v-for="(item, index) in imageList || []"
              :key="`${item.src}-${index}`"
              :image-list="imageList || []"
              :loading="item.loading"
              :src="item.src"
              :error="item.error"
            />
          </div>
        </template>
      </template>

      <!-- 操作按钮栏，只在消息完成时显示 -->
      <div v-if="finished" class="message-actions">
        <div class="action-button">
          <i v-title="'复制内容'" class="icon-copy" @click.stop="copyMessage"></i>
        </div>

        <div class="action-button" @click="regenerateMessage">
          <!-- <span class="export-icon"> -->
          <i v-title="'重新生成'" class="icon-shuaxin"></i>
          <!-- </span> -->
        </div>

        <!-- 分页控件 -->
        <div v-if="totalPages > 1" class="pagination-controls">
          <el-icon
            class="pagination-arrow"
            :class="{ disabled: isFirstPage }"
            @click="handlePrevPage"
          >
            <ArrowLeft />
          </el-icon>
          <span class="pagination-text">{{ paginationText }}</span>
          <el-icon
            class="pagination-arrow"
            :class="{ disabled: isLastPage }"
            @click="handleNextPage"
          >
            <ArrowRight />
          </el-icon>
        </div>

        <!-- Token 使用量 -->
        <span v-if="tokenUsageText" class="token-usage">{{ tokenUsageText }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import MarkdownRenderer from '../x-markdown/markdown-renderer.vue'
import ModelIcon from '../model-icon/index.vue'
import { onCopy } from '@/utils'
import { ref, computed, watch } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import ChatMessageItemLoading from './loading.vue'
import ImageItem from './image-item.vue'
import { showMessage } from '@/hooks'

defineOptions({
  name: 'CompletionsAssistantMessage'
})

const props = defineProps({
  message: {
    type: [String, Array],
    default: ''
  },
  segments: {
    type: Array,
    default: () => []
  },
  // 是否正在加载, 即对话输出前的loading
  loading: {
    type: Boolean,
    default: true
  },
  receiving: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  finished: {
    type: Boolean,
    default: true
  },
  // 模型标识
  model: {
    type: String,
    default: 'deepseek-chat'
  },
  // 思考过程内容
  thinkingContent: {
    type: String,
    default: ''
  },
  // 思考耗时（ms）
  thinkingDuration: {
    type: Number,
    default: 0
  },

  conversationId: {
    type: [String, Number],
    default: ''
  },

  messageId: {
    type: [String, Number],
    default: ''
  },
  parentId: {
    type: [String, Number],
    default: ''
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  filePercent: {
    type: [String, Number],
    default: null
  },
  imageList: {
    type: Array,
    default: () => []
  },
  // Token 使用情况
  usage: {
    type: Object,
    default: null
  },
  mcpLogs: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['regenerate', 'prev', 'next'])

const LoadingComponent = computed(() => {
  return ChatMessageItemLoading
})

// 默认收起思考过程
const showThinking = ref(false)
const segmentThinkingVisibility = ref({})
const mcpSegmentExpanded = ref({})

const normalizeAssistantText = value => {
  if (typeof value === 'string') {
    return value
  }

  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && typeof item.content === 'string') {
        return item.content
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

const normalizeAssistantSegment = (segment, index, prefix = 'segment') => {
  const fallbackId = `${prefix}-${index}`

  if (typeof segment === 'string') {
    return {
      id: fallbackId,
      type: 'assistant',
      content: segment,
      reasoningContent: '',
      reasoningDuration: 0,
      error: false
    }
  }

  if (!segment || typeof segment !== 'object') {
    return null
  }

  const segmentType = `${segment.type || segment.role || ''}`.toLowerCase()
  if (segmentType === 'mcp' || segmentType === 'mcp-log') {
    return {
      id: segment.id || fallbackId,
      type: 'mcp',
      model: segment.model || '',
      status: segment.status || 'pending',
      serverName: segment.serverName || '',
      toolName: segment.toolName || '',
      durationMs: Number(segment.durationMs || 0),
      arguments: segment.arguments ?? {},
      result: segment.result ?? null,
      toolError: segment.toolError || segment.error || ''
    }
  }

  return {
    id: segment.id || fallbackId,
    type: 'assistant',
    content: normalizeAssistantText(segment.content),
    reasoningContent: normalizeAssistantText(segment.reasoningContent),
    reasoningDuration: Number(segment.reasoningDuration || 0),
    error: !!segment.error
  }
}

const normalizedSegments = computed(() => {
  const directSegments = Array.isArray(props.segments) ? props.segments : []
  if (directSegments.length > 0) {
    return directSegments
      .map((segment, index) => normalizeAssistantSegment(segment, index, 'assistant'))
      .filter(Boolean)
  }

  if (Array.isArray(props.message)) {
    return props.message
      .map((segment, index) => normalizeAssistantSegment(segment, index, 'message'))
      .filter(Boolean)
  }

  if (Array.isArray(props.mcpLogs) && props.mcpLogs.length > 0) {
    const legacySegments = []
    const textSegment = normalizeAssistantSegment(
      {
        type: 'assistant',
        content: props.message,
        reasoningContent: props.thinkingContent,
        reasoningDuration: props.thinkingDuration,
        error: props.error
      },
      0,
      'legacy-text'
    )

    if (textSegment && (textSegment.content || textSegment.reasoningContent || textSegment.error)) {
      legacySegments.push(textSegment)
    }

    props.mcpLogs.forEach((logItem, index) => {
      const mcpSegment = normalizeAssistantSegment(
        {
          ...logItem,
          type: 'mcp'
        },
        index,
        'legacy-mcp'
      )
      if (mcpSegment) {
        legacySegments.push(mcpSegment)
      }
    })

    return legacySegments
  }

  return []
})

const hasSegmentFlow = computed(() => normalizedSegments.value.length > 0)
const normalizedMessageText = computed(() => normalizeAssistantText(props.message))

const buildCopyableMessage = () => {
  if (!hasSegmentFlow.value) {
    return normalizedMessageText.value
  }

  const segmentText = normalizedSegments.value
    .filter(segment => segment.type !== 'mcp')
    .map(segment => segment.content)
    .filter(Boolean)
    .join('\n')

  return segmentText || normalizedMessageText.value
}

const copyableMessage = computed(() => buildCopyableMessage())

const getSegmentKey = (segment, index) => {
  const segmentId = segment?.id || index
  return `${segment?.type || 'assistant'}-${segmentId}`
}

// 监听思考内容变化：有新内容时展开
watch(
  () => props.thinkingContent,
  (newVal, oldVal) => {
    // 思考内容从无到有，或者内容在增加（流式输出中），自动展开
    if (newVal && newVal.length > (oldVal?.length || 0)) {
      showThinking.value = true
    }
  }
)

watch(
  normalizedSegments,
  segments => {
    const nextThinkingVisibility = { ...segmentThinkingVisibility.value }
    const nextMcpExpanded = { ...mcpSegmentExpanded.value }

    segments.forEach((segment, index) => {
      const segmentKey = getSegmentKey(segment, index)
      if (segment.type === 'mcp') {
        if (nextMcpExpanded[segmentKey] === undefined) {
          nextMcpExpanded[segmentKey] = true
        }
        return
      }

      if (segment.reasoningContent && nextThinkingVisibility[segmentKey] === undefined) {
        nextThinkingVisibility[segmentKey] = Number(segment.reasoningDuration || 0) === 0
      }
    })

    segmentThinkingVisibility.value = nextThinkingVisibility
    mcpSegmentExpanded.value = nextMcpExpanded
  },
  {
    immediate: true,
    deep: true
  }
)

// 监听推理耗时：推理结束时收起思考
watch(
  () => props.thinkingDuration,
  (newVal, oldVal) => {
    // 推理耗时从 0 变为大于 0，说明推理结束，收起思考过程
    if (newVal > 0 && (!oldVal || oldVal === 0)) {
      showThinking.value = false
    }
  }
)

// 获取模型显示名称
const modelDisplayName = computed(() => {
  // 直接使用 model prop，如果没有则显示默认值
  return props.model || 'AI'
})

const getThinkingText = duration => {
  if (Number(duration || 0) > 0) {
    return `已深度思考（用时${Math.ceil(Number(duration || 0) / 1000)}秒）`
  }
  return '深度思考中...'
}

// 思考状态文本
const thinkingText = computed(() => {
  return getThinkingText(props.thinkingDuration)
})

// 切换思考过程显示
const toggleThinking = () => {
  showThinking.value = !showThinking.value
}

const isSegmentThinkingVisible = (segment, index) => {
  const key = getSegmentKey(segment, index)
  if (segmentThinkingVisibility.value[key] !== undefined) {
    return segmentThinkingVisibility.value[key]
  }
  return true
}

const toggleSegmentThinking = (segment, index) => {
  const key = getSegmentKey(segment, index)
  segmentThinkingVisibility.value[key] = !isSegmentThinkingVisible(segment, index)
}

const isMcpSegmentExpanded = (segment, index) => {
  const key = getSegmentKey(segment, index)
  if (mcpSegmentExpanded.value[key] !== undefined) {
    return mcpSegmentExpanded.value[key]
  }
  return true
}

const toggleMcpSegment = (segment, index) => {
  const key = getSegmentKey(segment, index)
  mcpSegmentExpanded.value[key] = !isMcpSegmentExpanded(segment, index)
}

const getMcpDisplayName = segment => {
  const safeServerName = segment?.serverName || 'MCP'
  const safeToolName = segment?.toolName || 'tool'
  return `${safeServerName} / ${safeToolName}`
}

// 复制消息
const copyMessage = async () => {
  await onCopy(copyableMessage.value || '')
}

// 分页相关计算属性
const paginationText = computed(() => {
  return `${props.currentPage}/${props.totalPages}`
})

const isFirstPage = computed(() => {
  return props.currentPage <= 1
})

const isLastPage = computed(() => {
  return props.currentPage >= props.totalPages
})

// Token 使用量显示文本
const tokenUsageText = computed(() => {
  if (!props.usage) return ''
  const { prompt_tokens, completion_tokens } = props.usage
  if (prompt_tokens !== undefined && completion_tokens !== undefined) {
    return `提示 ${prompt_tokens} / 补全 ${completion_tokens} tokens`
  }
  return ''
})

const formatDuration = durationMs => {
  const safeDuration = Number(durationMs)
  if (!Number.isFinite(safeDuration) || safeDuration < 0) {
    return '--'
  }
  return `${Math.max(0, Math.round(safeDuration))}ms`
}

const formatMcpArguments = args => {
  if (!args || (typeof args === 'object' && Object.keys(args).length === 0)) {
    return ''
  }
  if (typeof args === 'string') return args
  try {
    return JSON.stringify(args, null, 2)
  } catch {
    return `${args}`
  }
}

const formatMcpResult = result => {
  if (typeof result === 'string') return result
  if (result === undefined || result === null) return ''
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return `${result}`
  }
}

const getMcpStatus = status => {
  if (status === 'success' || status === 'error') {
    return status
  }
  return 'pending'
}

const getMcpStatusText = status => {
  const normalizedStatus = getMcpStatus(status)
  if (normalizedStatus === 'success') return '成功'
  if (normalizedStatus === 'error') return '失败'
  return '调用中'
}

const getMcpOutputTitle = status => {
  const normalizedStatus = getMcpStatus(status)
  if (normalizedStatus === 'success') return '返回'
  if (normalizedStatus === 'error') return '错误'
  return '状态'
}

const getMcpOutputContent = log => {
  const normalizedStatus = getMcpStatus(log?.status)
  if (normalizedStatus === 'success') {
    return formatMcpResult(log?.result)
  }
  if (normalizedStatus === 'error') {
    return log?.toolError || log?.error || '工具调用失败'
  }
  return '调用中...'
}

// 处理上一页
const handlePrevPage = () => {
  if (!isFirstPage.value) {
    emit('prev')
  }
}

// 处理下一页
const handleNextPage = () => {
  if (!isLastPage.value) {
    emit('next')
  }
}

// 重新生成消息
const regenerateMessage = () => {
  if (props.receiving) {
    return showMessage('正在生成回答中,请稍后再试', { type: 'warning' })
  }
  emit('regenerate', {
    messageId: props.messageId,
    parentId: props.parentId
  })
}
</script>

<style lang="scss" scoped>
.image-result-container {
  display: flex;
  flex-wrap: wrap;
  padding-top: 8px;

  @include flex-gap(16px, both);
}

.assistant-segments {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 10px;

  .assistant-segment {
    width: 100%;
  }
}

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
    flex: 0 0 auto;
    justify-content: center;
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
    flex: 1;
    min-width: 0;
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
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .mcp-log-label,
  .mcp-log-title-separator {
    flex: 0 0 auto;
  }

  .mcp-status {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    justify-content: center;
    min-width: 42px;
    height: 20px;
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
    color: var(--text-dblight-color);
    font-size: 12px;
    line-height: 20px;
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

.export-icon {
  outline: none;
}

.oversize-tips {
  color: var(--text-dblight-color);
  font-size: 13px;
  line-height: 26px;
}

.assistant-message {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;

  @include flex-gap(8px, column);

  // 模型信息头部
  .model-header {
    display: flex;
    flex-direction: column;
    width: 100%;

    @include flex-gap(4px, column);

    .model-info {
      display: flex;
      align-items: center;

      @include flex-gap(12px, row);

      .model-logo {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .model-name-tag {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 0 4px;
        border-radius: 2px;
        background: var(--bg-tag);

        span {
          white-space: nowrap;
          color: var(--text-dblight-color);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.6;
        }
      }
    }
  }

  // 思考过程部分
  .thinking-section {
    width: 100%;

    .thinking-header {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      width: auto;
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
      border-radius: 2px;
      background: var(--bg-highlight);

      @include flex-gap(12px, row);

      .thinking-status {
        display: flex;
        align-items: center;

        .icon-shendusikao {
          font-size: 16px;
        }

        @include flex-gap(4px, row);

        .thinking-text {
          color: var(--text-normal-color);
          font-size: 14px;
          font-weight: 400;
          line-height: 14px;
        }
      }

      .arrow-icon {
        transition: transform 0.3s ease;
        // transform: rotate(-90deg);
        color: var(--text-normal-color);
        font-size: 14px;

        &.arrow-up {
          transform: rotate(90deg);
        }
      }
    }

    .thinking-content {
      display: flex;
      padding-top: 12px;
      padding-bottom: 20px;
      padding-left: 18px;

      .thinking-text-content {
        flex: 1;
        width: 100%;
        padding-left: 12px;
        white-space: pre-wrap;
        word-break: break-all;
        color: var(--text-light-color);
        border-left: 1px var(--border-color-strong) solid;
        font-size: 15px;
        font-weight: 400;
        line-height: 1.2;

        :deep(.elx-xmarkdown-container) {
          ol,
          ul {
            li {
              list-style: none;
            }
          }
        }
      }
    }
  }

  .message-content {
    display: flex;
    align-items: center;
    flex: 1;
    width: 100%;

    @include flex-gap(12px, row);

    .message-text {
      flex: 1;
      width: 100%;
      text-align: justify;
      color: var(--text-normal-color);
      font-weight: 400;
      // line-height: 1.6;

      .error-content {
        display: inline-flex;
        align-items: center;
        margin: 2px 0 8px !important;
        padding: 8px;
        color: var(--error-text);
        border: 1px solid var(--error-border);
        border-radius: 4px;
        background: var(--error-bg);
        font-size: 14px;
        font-weight: 400;
        font-style: normal;
        line-height: 16px;

        /* 88.889% */

        @include flex-gap(8px, row);
      }
    }
  }

  .message-actions {
    display: flex;
    align-items: center;

    @include flex-gap(16px, row);

    .action-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      cursor: pointer;
      transition: all 0.2s ease;

      i {
        color: var(--text-dblight-color);
        font-size: 16px;
      }

      &:hover {
        opacity: 0.8;
      }
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      color: var(--text-light-color);

      .pagination-arrow {
        cursor: pointer;
        transition: color 0.2s;

        &:hover:not(.disabled) {
          color: var(--main-color);
        }

        &.disabled {
          cursor: not-allowed;
          opacity: 0.3;
        }
      }

      .pagination-text {
        white-space: nowrap;
        letter-spacing: 0.96px;
        color: var(--text-dblight-color);
        font-size: 15px;
      }
    }

    .token-usage {
      white-space: nowrap;
      color: var(--text-tblight-color);
      font-size: 12px;
    }
  }
}

@include mobile {
  .assistant-message {
    .thinking-section .thinking-content {
      padding-left: 8px;

      .thinking-text-content {
        padding-left: 8px;
      }
    }

    .message-actions {
      .action-button {
        @include touch-target;
      }

      .pagination-controls .pagination-arrow {
        @include touch-target;
      }
    }
  }
}
</style>
