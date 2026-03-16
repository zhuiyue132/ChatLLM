<template>
  <div class="chat-page" :class="{ 'is-preview-visible': previewVisible }">
    <div ref="chatMainRef" class="chat-main">
      <!-- 聊天记录内容 -->
      <div
        ref="chatHistoryContainerRef"
        v-xs-loading="chatHistoryLoading"
        class="chat-history-container"
      >
        <div v-if="!chatHistoryLoading" class="chat-messages">
          <div
            v-for="msg in displayChatHistory"
            :id="`message-${msg.id}`"
            :key="msg.id || roomId"
            :data-search-message-ids="formatSearchMessageIds(msg.searchMessageIds)"
            class="message-wrapper"
            :class="{
              'user-log': msg.role.toLowerCase() === 'user',
              'assistant-log': shouldRenderAssistantMessage(msg)
            }"
          >
            <!-- 用户消息 -->
            <CompletionsUserMessage
              v-if="msg.role.toLowerCase() === 'user'"
              :key="`${msg.id || roomId}`"
              :current-page="Number(msg.pageIndex || 0) + 1"
              :total-pages="msg.siblingCount || 1"
              :message="msg.content"
              :file-list="msg.fileList || []"
              :edit-mode="editingMessageId === msg.id"
              :loading="loading || isReceiving"
              @edit="handleEditUserMessage(msg.id)"
              @cancel-edit="handleCancelEditUserMessage"
              @send-edit="
                handleSendEditedUserMessage({
                  messageId: msg.id,
                  editedContent: $event
                })
              "
              @prev="handleUserPrevPage(msg.id)"
              @next="handleUserNextPage(msg.id)"
            />

            <!-- 助手消息 -->
            <CompletionsAssistantMessage
              v-else-if="shouldRenderAssistantMessage(msg)"
              :key="`assistant-${msg.id || roomId}`"
              :message="msg.content"
              :finished="msg.finished"
              :loading="isAssistantMessageLoading(msg)"
              :message-id="msg.sourceMessageId || msg.id"
              :parent-id="msg.parentId"
              :model="msg.model"
              :error="msg.error"
              :receiving="isReceiving"
              :thinking-content="msg.reasoningContent"
              :thinking-duration="msg.reasoningTime"
              :current-page="Number(msg.pageIndex || 0) + 1"
              :total-pages="msg.siblingCount || 1"
              :usage="msg.usage"
              :segments="msg.assistantSegments"
              @regenerate="handleRegenerateAnswer"
              @prev="handleAssistantPrevPage(msg.parentId)"
              @next="handleAssistantNextPage(msg.parentId)"
            />
          </div>
        </div>
      </div>
    </div>

    <aside
      ref="codePreviewPanelRef"
      class="code-preview-panel"
      :class="{ 'is-open': previewVisible }"
    >
      <div v-if="previewVisible" class="code-preview-inner">
        <div class="code-preview-header">
          <div class="code-preview-title">
            <span class="title-text">{{ previewState.title || '代码预览' }}</span>
            <span v-if="previewState.language" class="title-language">
              {{ previewState.language }}
            </span>
          </div>
          <div class="code-preview-actions">
            <button type="button" class="preview-action-btn" @click="handleRefreshPreview">
              刷新
            </button>
            <button type="button" class="preview-action-btn" @click="handleTogglePreviewFullscreen">
              {{ isPreviewFullscreen ? '退出全屏' : '全屏' }}
            </button>
            <button type="button" class="preview-action-btn" @click="handleClosePreview">
              关闭
            </button>
          </div>
        </div>

        <div class="code-preview-body">
          <iframe
            v-if="previewVisible"
            :key="iframeRenderKey"
            ref="previewIframeRef"
            class="code-preview-iframe"
            :style="previewIframeStyle"
            :srcdoc="previewSrcDoc"
            sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads allow-pointer-lock allow-presentation allow-top-navigation-by-user-activation"
            title="代码预览"
          />
        </div>
      </div>
    </aside>

    <div ref="inputContainerRef" class="input-container">
      <div class="input-container-content">
        <AgentSender
          ref="senderRef"
          v-model="message"
          v-model:model="currentModelValue"
          v-model:mcp-session-enabled="mcpSessionEnabled"
          v-model:mcp-server-ids="mcpSelectedServerIds"
          :model-list="models"
          :mcp-server-list="availableMcpServers"
          :mcp-global-enabled="mcpSettingsStore.globalEnabled"
          :mcp-supported="isCurrentModelSupportsToolCall"
          :float-button-enable="floatButtonEnable && !loading && !isReceiving"
          :loading="loading || isReceiving"
          :placeholder="PLACEHOLDER_MAP.DEFAULT"
          :disabled="lastMessageHasError"
          :allow-empty-message="false"
          :hidden-input-when-files="false"
          :min-rows="2"
          :show-image-btn="isCurrentModelSupportsVision"
          :show-mcp-selector="isCurrentModelSupportsToolCall"
          :scroll-container="chatHistoryContainerRef"
          show-model-select
          show-mention-model
          @submit="handleSendMessage"
          @stop="handleManualStop"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onBeforeUnmount, nextTick, watch } from 'vue'
import AgentSender from '@/components/sender/index.vue'
import CompletionsUserMessage from '@/components/completions-message/user.vue'
import CompletionsAssistantMessage from '@/components/completions-message/assistant.vue'
import { PLACEHOLDER_MAP } from '@/config/agent-placeholder'
import { FETCH_CHAR_HISTORY } from '@/config/symbol'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useMcpSettingsStore } from '@/stores/mcp-settings'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { useThemeStore } from '@/stores/theme'
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router'
import { useCodePreview } from '@/hooks/use-code-preview'
import { useSidebar } from '@/hooks/use-sidebar'
import { tryOnMounted, useElementSize, useEventListener, useEventBus } from '@vueuse/core'
import { useCompletions } from './hooks/use-completions'
import { consumePendingCompletionsMessage } from './utils'

defineOptions({
  name: 'CompletionsChatPage'
})

const PREVIEW_HEIGHT_EVENT_KEY = '__CHATLLM_PREVIEW_HEIGHT__'
const PREVIEW_MIN_IFRAME_HEIGHT = 420
const PREVIEW_MAX_IFRAME_HEIGHT = 8000
const SCRIPT_CLOSE_TAG = '</scr' + 'ipt>'
const SEARCH_TARGET_HIGHLIGHT_CLASS = 'is-search-target'
const SEARCH_TARGET_HIGHLIGHT_DURATION = 2200

const route = useRoute()
const router = useRouter()
const apiSettingsStore = useApiSettingsStore()
const mcpSettingsStore = useMcpSettingsStore()
const chatRoomsStore = useChatRoomsStore()
const themeStore = useThemeStore()
const { closeSidebar } = useSidebar()

const roomId = computed(() => route.query.roomId)
const senderRef = ref(null)
const chatMainRef = ref(null)

const chatHistoryContainerRef = ref(null)
const inputContainerRef = ref(null)
const codePreviewPanelRef = ref(null)
const previewIframeRef = ref(null)

const previewFrameHeight = ref(0)
const isPreviewFullscreen = ref(false)
let searchTargetHighlightTimer = null
let isClearingSearchTargetParam = false

const { height: chatHistoryContainerHeight } = useElementSize(chatHistoryContainerRef)

const { previewVisible, previewState, previewVersion, closePreview, refreshPreview, resetPreview } =
  useCodePreview()

const resolveThemeBridge = () => {
  const rootStyle = window.getComputedStyle(document.documentElement)
  const fallbackBg = themeStore.isDark ? '#0f1115' : '#ffffff'
  const fallbackText = themeStore.isDark ? '#f5f7fa' : '#000000'
  const fallbackLink = themeStore.isDark ? '#4ea1ff' : '#0969da'

  return {
    background: rootStyle.getPropertyValue('--bg-app').trim() || fallbackBg,
    text: rootStyle.getPropertyValue('--text-normal-color').trim() || fallbackText,
    link: fallbackLink,
    colorScheme: themeStore.isDark ? 'dark' : 'light'
  }
}

const ensurePreviewHtmlStructure = source => {
  let content = source

  if (!/<html[\s>]/i.test(content)) {
    if (/<head[\s>]/i.test(content) || /<body[\s>]/i.test(content)) {
      content = `<html>${content}</html>`
    } else {
      content = `<html><head></head><body>${content}</body></html>`
    }
  }

  if (!/<head[\s>]/i.test(content)) {
    content = content.replace(/<html[^>]*>/i, match => `${match}<head></head>`)
  }

  if (!/<body[\s>]/i.test(content)) {
    if (/<\/head>/i.test(content)) {
      content = content.replace(/<\/head>/i, '</head><body></body>')
    } else {
      content = content.replace(/<html[^>]*>/i, match => `${match}<body></body>`)
    }
  }

  if (!/<\/html>/i.test(content)) {
    content = `${content}</html>`
  }

  if (!/<!doctype\s+html>/i.test(content)) {
    content = `<!doctype html>\n${content}`
  }

  return content
}

const buildPreviewBridgeScript = () => {
  return `<script>
(function () {
  const EVENT_KEY = '${PREVIEW_HEIGHT_EVENT_KEY}'
  const postHeight = () => {
    const doc = document.documentElement
    const body = document.body
    const nextHeight = Math.max(
      doc ? doc.scrollHeight : 0,
      doc ? doc.offsetHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    )
    window.parent.postMessage({ event: EVENT_KEY, height: nextHeight }, '*')
  }

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(postHeight)
    if (document.documentElement) {
      observer.observe(document.documentElement)
    }
  }

  window.addEventListener('load', postHeight)
  window.addEventListener('resize', postHeight)
  setTimeout(postHeight, 0)
  setTimeout(postHeight, 120)
  setTimeout(postHeight, 300)
})()
${SCRIPT_CLOSE_TAG}`
}

const buildPreviewSrcDoc = rawSource => {
  const source = `${rawSource || ''}`.trim()
  if (!source) {
    return ''
  }

  const theme = resolveThemeBridge()
  const themeStyle = `<style id="chatllm-preview-theme">
:root {
  color-scheme: ${theme.colorScheme};
}

html,
body {
  margin: 0;
  padding: 0;
  background: ${theme.background};
  color: ${theme.text};
}

a {
  color: ${theme.link};
}
</style>`

  const bridgeScript = buildPreviewBridgeScript()
  let withStructure = ensurePreviewHtmlStructure(source)

  withStructure = withStructure.replace(/<head[^>]*>/i, match => `${match}\n${themeStyle}\n`)

  if (/<\/body>/i.test(withStructure)) {
    withStructure = withStructure.replace(/<\/body>/i, `${bridgeScript}\n</body>`)
  } else {
    withStructure = `${withStructure}\n${bridgeScript}`
  }

  return withStructure
}

const previewSrcDoc = computed(() => {
  if (!previewVisible.value) {
    return ''
  }
  return buildPreviewSrcDoc(previewState.value.source)
})

const iframeRenderKey = computed(() => {
  const themeKey = themeStore.isDark ? 'dark' : 'light'
  return `${previewVersion.value}-${previewState.value.openedAt}-${themeKey}`
})

const previewIframeStyle = computed(() => {
  if (!previewFrameHeight.value) {
    return {}
  }

  return {
    height: `${previewFrameHeight.value}px`
  }
})

const teardownPreviewFullscreen = async () => {
  if (document.fullscreenElement === codePreviewPanelRef.value) {
    try {
      await document.exitFullscreen()
    } catch (error) {
      console.warn('[Completions] 退出代码预览全屏失败', error)
    }
  }
}

const handleClosePreview = () => {
  closePreview()
}

const handleRefreshPreview = () => {
  refreshPreview()
}

const handleTogglePreviewFullscreen = async () => {
  const panelElement = codePreviewPanelRef.value
  if (!panelElement) {
    return
  }

  try {
    if (document.fullscreenElement === panelElement) {
      await document.exitFullscreen()
    } else {
      await panelElement.requestFullscreen()
    }
  } catch (error) {
    console.warn('[Completions] 切换代码预览全屏失败', error)
  }
}

const handlePreviewMessage = event => {
  if (event.source !== previewIframeRef.value?.contentWindow) {
    return
  }

  const payload = event.data
  if (!payload || payload.event !== PREVIEW_HEIGHT_EVENT_KEY) {
    return
  }

  const nextHeight = Number(payload.height)
  if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
    return
  }

  previewFrameHeight.value = Math.min(
    PREVIEW_MAX_IFRAME_HEIGHT,
    Math.max(PREVIEW_MIN_IFRAME_HEIGHT, Math.ceil(nextHeight))
  )
}

watch(previewVisible, async visible => {
  if (visible) {
    closeSidebar()
    return
  }

  previewFrameHeight.value = 0
  await teardownPreviewFullscreen()
})

watch(previewVersion, () => {
  previewFrameHeight.value = 0
})

const {
  models,
  currentModelValue,
  currentRoom,
  message,
  loading,
  chatHistory,
  isReceiving,
  receivingMessageId,
  chatHistoryLoading,
  editingMessageId,
  scrollToBottom,
  enableAutoScroll,
  stopSSE,
  sendMessage,
  fetchChatHistory,
  handleRegenerateAnswer,
  handleAssistantPrevPage,
  handleAssistantNextPage,
  handleUserPrevPage,
  handleUserNextPage,
  handleEditUserMessage,
  handleCancelEditUserMessage,
  handleSendEditedUserMessage
} = useCompletions({
  roomId,
  scrollContainer: chatHistoryContainerRef
})

const mcpSessionEnabled = computed({
  get: () => {
    if (typeof currentRoom.value?.mcpEnabled === 'boolean') {
      return currentRoom.value.mcpEnabled
    }
    return mcpSettingsStore.globalEnabled
  },
  set: value => {
    if (!currentRoom.value?.id) return
    chatRoomsStore.updateRoomMcpEnabled(currentRoom.value.id, value)
  }
})

const mcpSelectedServerIds = computed({
  get: () => {
    return Array.isArray(currentRoom.value?.mcpServerIds) ? currentRoom.value.mcpServerIds : []
  },
  set: value => {
    if (!currentRoom.value?.id) return
    chatRoomsStore.updateRoomMcpServerIds(currentRoom.value.id, value)
  }
})

const availableMcpServers = computed(() => {
  return mcpSettingsStore.servers.filter(server => server.enabled)
})

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

const concatAssistantDisplayText = (baseText, incomingText) => {
  const safeBase = typeof baseText === 'string' ? baseText : ''
  const safeIncoming = typeof incomingText === 'string' ? incomingText : ''
  if (!safeIncoming) return safeBase
  if (!safeBase) return safeIncoming
  if (safeBase.endsWith('\n') || safeIncoming.startsWith('\n')) {
    return `${safeBase}${safeIncoming}`
  }
  return `${safeBase}\n${safeIncoming}`
}

const createAssistantTextSegment = ({
  id = '',
  content = '',
  reasoningContent = '',
  reasoningDuration = 0,
  error = false
} = {}) => {
  return {
    id,
    type: 'assistant',
    content: normalizeAssistantText(content),
    reasoningContent: normalizeAssistantText(reasoningContent),
    reasoningDuration: Number(reasoningDuration || 0),
    error: !!error
  }
}

const createMcpLogSegment = (message = {}, { fallbackId = '' } = {}) => {
  return {
    id: message?.id || fallbackId,
    type: 'mcp',
    model: message?.model || '',
    status: message?.status || 'pending',
    serverName: message?.serverName || '',
    toolName: message?.toolName || '',
    durationMs: Number(message?.durationMs || 0),
    arguments: message?.arguments ?? {},
    result: message?.result ?? null,
    toolError: message?.toolError || ''
  }
}

const parseAssistantContentSegments = (content, { baseId = '' } = {}) => {
  if (!Array.isArray(content)) {
    return []
  }

  return content
    .map((segment, index) => {
      const fallbackId = baseId ? `${baseId}__content_${index}` : `content-${index}`

      if (typeof segment === 'string') {
        return createAssistantTextSegment({
          id: fallbackId,
          content: segment
        })
      }

      if (!segment || typeof segment !== 'object') {
        return null
      }

      const segmentType = `${segment.type || segment.role || ''}`.toLowerCase()
      if (segmentType === 'mcp' || segmentType === 'mcp-log') {
        return createMcpLogSegment(segment, {
          fallbackId
        })
      }

      return createAssistantTextSegment({
        id: segment.id || fallbackId,
        content: segment.content,
        reasoningContent: segment.reasoningContent,
        reasoningDuration: segment.reasoningDuration,
        error: segment.error
      })
    })
    .filter(Boolean)
}

const formatSearchMessageIds = ids => {
  const normalizedIds = (Array.isArray(ids) ? ids : [])
    .map(id => `${id || ''}`.trim())
    .filter(Boolean)

  if (normalizedIds.length === 0) {
    return ''
  }

  return `|${normalizedIds.join('|')}|`
}

const displayChatHistory = computed(() => {
  if (!Array.isArray(chatHistory.value) || chatHistory.value.length === 0) {
    return []
  }

  const mcpMessageMap = new Map()
  chatHistory.value.forEach(msg => {
    if (`${msg?.role || ''}`.toLowerCase() === 'mcp' && msg?.id) {
      mcpMessageMap.set(msg.id, msg)
    }
  })

  const consumedMcpMessageIds = new Set()
  const result = []
  let pendingAssistantNode = null

  const createPendingAssistantNode = (msg, options = {}) => {
    const { forceId = '' } = options

    return {
      ...msg,
      id: forceId || msg?.id || `assistant-${Date.now()}`,
      role: 'assistant',
      sourceMessageId: msg?.id || '',
      mergedAssistantIds: msg?.id ? [msg.id] : [],
      assistantSegments: [],
      searchMessageIds: msg?.id ? [msg.id] : [],
      content: '',
      reasoningContent: '',
      reasoningTime: 0
    }
  }

  const flushPendingAssistantNode = () => {
    if (!pendingAssistantNode) return

    const assistantSegments = Array.isArray(pendingAssistantNode.assistantSegments)
      ? pendingAssistantNode.assistantSegments
      : []
    const hasMcpSegment = assistantSegments.some(segment => segment?.type === 'mcp')
    const assistantTextSegmentCount = assistantSegments.filter(
      segment => segment?.type !== 'mcp'
    ).length

    // 大多数 assistant 仅包含一段文本，不需要走分段渲染，避免 props 变化导致整页反复解析 Markdown
    if (!hasMcpSegment && assistantTextSegmentCount <= 1) {
      pendingAssistantNode.assistantSegments = undefined
    }

    if (!pendingAssistantNode.searchMessageIds.includes(pendingAssistantNode.id)) {
      pendingAssistantNode.searchMessageIds.unshift(pendingAssistantNode.id)
    }
    result.push(pendingAssistantNode)
    pendingAssistantNode = null
  }

  const appendSearchMessageId = messageId => {
    if (!pendingAssistantNode) return
    const normalizedId = `${messageId || ''}`.trim()
    if (!normalizedId) return
    if (!pendingAssistantNode.searchMessageIds.includes(normalizedId)) {
      pendingAssistantNode.searchMessageIds.push(normalizedId)
    }
  }

  const appendAssistantTextSegment = segment => {
    if (!pendingAssistantNode || !segment) return
    const normalizedSegment = createAssistantTextSegment(segment)
    const hasDisplayPayload =
      normalizedSegment.content.trim() ||
      normalizedSegment.reasoningContent.trim() ||
      normalizedSegment.error
    if (!hasDisplayPayload) return

    pendingAssistantNode.assistantSegments.push(normalizedSegment)
    pendingAssistantNode.content = concatAssistantDisplayText(
      pendingAssistantNode.content,
      normalizedSegment.content
    )
    pendingAssistantNode.reasoningContent = concatAssistantDisplayText(
      pendingAssistantNode.reasoningContent,
      normalizedSegment.reasoningContent
    )
    pendingAssistantNode.reasoningTime =
      Number(pendingAssistantNode.reasoningTime || 0) + Number(normalizedSegment.reasoningDuration)
    appendSearchMessageId(normalizedSegment.id)
  }

  const appendMcpLogSegment = segment => {
    if (!pendingAssistantNode || !segment) return
    const normalizedSegment = createMcpLogSegment(segment)
    const normalizedSegmentId = `${normalizedSegment.id || ''}`.trim()
    if (normalizedSegmentId) {
      const alreadyExists = pendingAssistantNode.assistantSegments.some(item => {
        return item?.type === 'mcp' && `${item?.id || ''}`.trim() === normalizedSegmentId
      })
      if (alreadyExists) {
        return
      }
    }
    pendingAssistantNode.assistantSegments.push(normalizedSegment)
    appendSearchMessageId(normalizedSegment.id)
  }

  const mergeAssistantMetadata = msg => {
    if (!pendingAssistantNode || !msg) return

    pendingAssistantNode.finished = !!msg.finished
    pendingAssistantNode.error = !!pendingAssistantNode.error || !!msg.error
    pendingAssistantNode.parentId = msg.parentId
    pendingAssistantNode.sourceMessageId = msg.id || pendingAssistantNode.sourceMessageId

    if (msg.usage) {
      pendingAssistantNode.usage = msg.usage
    }
    if (msg.model) {
      pendingAssistantNode.model = msg.model
    }
    if (msg.id && !pendingAssistantNode.mergedAssistantIds.includes(msg.id)) {
      pendingAssistantNode.mergedAssistantIds.push(msg.id)
    }
    appendSearchMessageId(msg.id)
  }

  chatHistory.value.forEach(msg => {
    const role = `${msg?.role || ''}`.toLowerCase()

    if (role === 'user') {
      flushPendingAssistantNode()
      result.push({
        ...msg,
        searchMessageIds: [msg.id]
      })
      return
    }

    if (role === 'assistant') {
      if (!pendingAssistantNode) {
        pendingAssistantNode = createPendingAssistantNode(msg)
      }

      mergeAssistantMetadata(msg)

      const timeline = Array.isArray(msg?.mcpTimeline) ? msg.mcpTimeline : []
      if (timeline.length > 0) {
        timeline.forEach((item, segmentIndex) => {
          const textSegmentId = `${msg.id}__timeline_${segmentIndex}`
          appendAssistantTextSegment({
            id: textSegmentId,
            content: item?.content,
            reasoningContent: item?.reasoningContent,
            reasoningDuration: item?.reasoningDuration
          })

          const segmentLogIds = Array.isArray(item?.logIds) ? item.logIds.filter(Boolean) : []
          segmentLogIds.forEach((logId, logIndex) => {
            const logMessage = mcpMessageMap.get(logId)
            if (!logMessage) return
            appendMcpLogSegment({
              ...logMessage,
              id: logMessage.id || `${textSegmentId}__log_${logIndex}`
            })
            consumedMcpMessageIds.add(logId)
          })
        })
      } else {
        const contentSegments = parseAssistantContentSegments(msg?.content, {
          baseId: msg?.id
        })
        if (contentSegments.length > 0) {
          contentSegments.forEach(segment => {
            if (segment.type === 'mcp') {
              appendMcpLogSegment(segment)
              if (segment.id) {
                consumedMcpMessageIds.add(segment.id)
              }
              return
            }
            appendAssistantTextSegment(segment)
          })
        } else {
          appendAssistantTextSegment({
            id: msg.id,
            content: msg.content,
            reasoningContent: msg.reasoningContent,
            reasoningDuration: msg.reasoningTime,
            error: msg.error
          })
        }
      }

      if (Array.isArray(msg?.mcpLogs) && msg.mcpLogs.length > 0) {
        msg.mcpLogs.forEach((logItem, logIndex) => {
          const logId = logItem?.id || `${msg.id}__mcp_${logIndex}`
          appendMcpLogSegment({
            ...logItem,
            id: logId
          })
          consumedMcpMessageIds.add(logId)
        })
      }

      return
    }

    if (role === 'mcp') {
      if (consumedMcpMessageIds.has(msg.id)) {
        return
      }

      if (!pendingAssistantNode) {
        pendingAssistantNode = createPendingAssistantNode(
          {
            ...msg,
            id: msg.parentId || msg.id,
            parentId: msg.parentId,
            model: msg.model,
            finished: true,
            error: false
          },
          {
            forceId: msg.parentId || msg.id
          }
        )
      }

      appendMcpLogSegment(msg)
      consumedMcpMessageIds.add(msg.id)
      return
    }

    flushPendingAssistantNode()
    result.push({
      ...msg,
      searchMessageIds: [msg.id]
    })
  })

  flushPendingAssistantNode()
  return result
})

const floatButtonEnable = computed(() => {
  // 依赖消息数量和容器尺寸变化，确保滚动状态可被重新计算
  const messageCount = displayChatHistory.value.length
  const containerHeight = chatHistoryContainerHeight.value
  if (messageCount === 0 || containerHeight <= 0) {
    return false
  }

  const containerElement = chatHistoryContainerRef.value
  if (!containerElement) {
    return false
  }

  return containerElement.scrollHeight - containerElement.clientHeight > 8
})

const isAssistantMessageLoading = msg => {
  if (!loading.value) return false
  if (!msg) return false

  const sourceMessageId = msg.sourceMessageId || msg.id
  if (sourceMessageId !== receivingMessageId.value) return false

  if (typeof msg.segmentIndex === 'number' && typeof msg.segmentCount === 'number') {
    return msg.segmentIndex === msg.segmentCount - 1
  }

  if (Array.isArray(msg.mergedAssistantIds) && msg.mergedAssistantIds.length > 0) {
    return msg.mergedAssistantIds.includes(receivingMessageId.value)
  }

  return false
}

// 最后一条消息是否有错误
const lastMessageHasError = computed(() => {
  if (displayChatHistory.value.length === 0) return false
  const lastAssistantMessage = [...displayChatHistory.value]
    .reverse()
    .find(msg => `${msg?.role || ''}`.toLowerCase() === 'assistant')
  return !!lastAssistantMessage?.error
})

const isCurrentModelSupportsVision = computed(() => {
  return apiSettingsStore.modelSupportsCapability(currentModelValue.value, 'vision')
})

const isCurrentModelSupportsToolCall = computed(() => {
  return apiSettingsStore.modelSupportsCapability(currentModelValue.value, 'tool_call')
})

const shouldRenderAssistantMessage = msg => {
  const role = `${msg?.role || ''}`.toLowerCase()
  if (role !== 'assistant') return false

  const hasAssistantSegments =
    Array.isArray(msg?.assistantSegments) && msg.assistantSegments.length > 0
  const hasTextContent = normalizeAssistantText(msg?.content).trim().length > 0
  const hasReasoningContent = normalizeAssistantText(msg?.reasoningContent).trim().length > 0
  const hasChildren = Array.isArray(msg?.children) && msg.children.length > 0

  if (hasAssistantSegments) {
    return true
  }

  // 隐藏作为 MCP 链路桥接的空 assistant 节点，避免打乱日志时序显示
  if (!hasTextContent && !hasReasoningContent && !msg?.error && !msg?.finished && hasChildren) {
    return false
  }

  return true
}

const resolveSearchTargetMessageId = () => {
  const routeChatDetailId = route.query.chatDetailId
  const rawId = Array.isArray(routeChatDetailId) ? routeChatDetailId[0] : routeChatDetailId
  return `${rawId || ''}`.trim()
}

const clearSearchTargetHighlight = () => {
  if (searchTargetHighlightTimer) {
    window.clearTimeout(searchTargetHighlightTimer)
    searchTargetHighlightTimer = null
  }
  document
    .querySelectorAll(`.message-wrapper.${SEARCH_TARGET_HIGHLIGHT_CLASS}`)
    .forEach(element => element.classList.remove(SEARCH_TARGET_HIGHLIGHT_CLASS))
}

const clearSearchTargetRouteParam = async () => {
  const targetMessageId = resolveSearchTargetMessageId()
  if (!targetMessageId || isClearingSearchTargetParam) return

  const nextQuery = {
    ...route.query
  }
  delete nextQuery.chatDetailId

  isClearingSearchTargetParam = true
  try {
    await router.replace({
      path: route.path,
      query: nextQuery
    })
  } catch (error) {
    console.warn('[Completions] 清理搜索定位参数失败', error)
  } finally {
    isClearingSearchTargetParam = false
  }
}

const syncConversationBranchBySearchTarget = () => {
  const targetRoomId = `${roomId.value || ''}`.trim()
  const targetMessageId = resolveSearchTargetMessageId()
  if (!targetRoomId || !targetMessageId) return
  chatRoomsStore.setCurrentIndexByMessageId(targetRoomId, targetMessageId)
}

const findSearchTargetElement = targetMessageId => {
  if (!targetMessageId) return null
  const exactElement = document.getElementById(`message-${targetMessageId}`)
  if (exactElement) return exactElement

  const mergedElement = Array.from(
    document.querySelectorAll('.message-wrapper[data-search-message-ids]')
  ).find(element => {
    const aliases = `${element.dataset.searchMessageIds || ''}`
    return aliases.includes(`|${targetMessageId}|`)
  })
  if (mergedElement) {
    return mergedElement
  }

  return null
}

const locateSearchTargetMessage = () => {
  const targetMessageId = resolveSearchTargetMessageId()
  if (!targetMessageId) {
    return
  }

  syncConversationBranchBySearchTarget()
  nextTick(() => {
    const targetElement = findSearchTargetElement(targetMessageId)
    if (!targetElement) return

    clearSearchTargetHighlight()
    targetElement.classList.add(SEARCH_TARGET_HIGHLIGHT_CLASS)
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
    clearSearchTargetRouteParam()

    searchTargetHighlightTimer = window.setTimeout(() => {
      targetElement.classList.remove(SEARCH_TARGET_HIGHLIGHT_CLASS)
      searchTargetHighlightTimer = null
    }, SEARCH_TARGET_HIGHLIGHT_DURATION)
  })
}

watch(
  [roomId, () => route.query.chatDetailId],
  () => {
    syncConversationBranchBySearchTarget()
    locateSearchTargetMessage()
  },
  { immediate: true }
)

watch(
  () => displayChatHistory.value.length,
  () => {
    if (resolveSearchTargetMessageId()) {
      locateSearchTargetMessage()
    }
  }
)

// 页面加载时获取数据
tryOnMounted(async () => {
  let willSendMessage = null
  const willSendMessageRaw = window.sessionStorage.getItem('COMPLETIONS_WILL_SEND_MESSAGE') || ''
  if (willSendMessageRaw) {
    window.sessionStorage.removeItem('COMPLETIONS_WILL_SEND_MESSAGE')
    try {
      willSendMessage = JSON.parse(willSendMessageRaw)
    } catch (error) {
      console.warn('[Completions] 解析待发送消息失败，已忽略', error)
    }
  }

  const pendingMessage = consumePendingCompletionsMessage()
  if (pendingMessage && Object.keys(pendingMessage).length > 0) {
    message.value = pendingMessage.message || ''
    sendMessage({ ...pendingMessage })
    return
  }

  if (willSendMessage && Object.keys(willSendMessage).length > 0) {
    message.value = willSendMessage.message || ''
    sendMessage({ ...willSendMessage })
  } else {
    await fetchChatHistory()

    nextTick(() => {
      // 如果聊天记录为空，则跳转至首页
      if (chatHistory.value.length === 0) {
        router.replace({
          name: 'Completions'
        })
      } else {
        if (resolveSearchTargetMessageId()) {
          locateSearchTargetMessage()
        } else {
          // 有聊天记录时，滚动到底部
          enableAutoScroll()
          scrollToBottom(true)
        }
      }
    })
  }
})

// 监听侧边栏点击切换对话事件
const eventBusOfHistory = useEventBus(FETCH_CHAR_HISTORY)
eventBusOfHistory.on(payload => {
  nextTick(() => {
    if (payload?.chatDetailId || resolveSearchTargetMessageId()) {
      locateSearchTargetMessage()
      return
    }
    if (chatHistory.value.length > 0) {
      enableAutoScroll()
      scrollToBottom(true)
    }
  })
})

const handleSendMessage = (payload = {}) => {
  if (senderRef.value) {
    senderRef.value.filesUploaded = []
  }
  sendMessage(payload)
}

const handleManualStop = async () => {
  stopSSE()
  loading.value = false
  isReceiving.value = false
}

useEventListener(window, 'message', handlePreviewMessage)

useEventListener(document, 'fullscreenchange', () => {
  isPreviewFullscreen.value = document.fullscreenElement === codePreviewPanelRef.value
})

useEventListener(window, 'beforeunload', async () => {
  loading.value = false
  await handleManualStop()
})

// 组件卸载前停止对话
onBeforeUnmount(async () => {
  clearSearchTargetHighlight()
  loading.value = false
  await handleManualStop()
  await teardownPreviewFullscreen()
  resetPreview()
})

// 路由离开前停止对话
onBeforeRouteLeave(async (_to, _from, next) => {
  loading.value = false
  await handleManualStop()
  await teardownPreviewFullscreen()
  resetPreview()
  next()
})
</script>

<style lang="scss" scoped>
.chat-page {
  display: grid;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: minmax(0, 1fr) auto;
  align-items: stretch;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: calc(100vh - 72px);
  padding: 32px 0 16px;
  background-color: var(--bg-app);
  row-gap: 12px;
}

.chat-main {
  display: flex;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  min-height: 0;
  transition: transform 0.32s ease;
  grid-column: 1;
  grid-row: 1;
}

.chat-page.is-preview-visible {
  .chat-main {
    transition: transform 0.32s ease;
    transform: translateX(-8px);
  }

  .input-container-content {
    transition: transform 0.32s ease;
    transform: translateX(-8px);
  }
}

/* 聊天记录页样式 */
.chat-history-container {
  position: relative;
  display: flex;
  overflow: hidden auto;
  flex: 1;
  flex-direction: column;
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}

.chat-messages {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 16px 24px;
  padding-bottom: 120px;
  transition: transform 0.32s ease;

  .message-wrapper {
    &.is-search-target {
      animation: search-target-glow 2.2s ease;
      border: 1px solid var(--main-color);
      border-radius: 10px;
      background: var(--bg-highlight);
      box-shadow: 0 0 0 1px var(--main-color);
    }

    &.user-log {
      margin-bottom: 24px;
    }

    &.assistant-log {
      + .message-wrapper {
        :deep(.assistant-message) {
          .model-header {
            display: none;
          }
        }
      }
    }
  }
}

@keyframes search-target-glow {
  0% {
    box-shadow: 0 0 0 3px var(--main-color);
  }

  100% {
    box-shadow: 0 0 0 1px var(--main-color);
  }
}

.code-preview-panel {
  grid-column: 2;
  grid-row: 1 / span 2;
  position: relative;
  flex: 0 0 auto;
  width: 0;
  margin-left: 0;
  transition:
    width 0.34s cubic-bezier(0.2, 0.65, 0.2, 1),
    margin-left 0.34s cubic-bezier(0.2, 0.65, 0.2, 1);

  &.is-open {
    width: min(800px, 52vw);
    margin-left: 16px;
  }
}

.code-preview-inner {
  position: fixed;
  top: 88px;
  right: 16px;
  z-index: 30;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  width: min(800px, 52vw);
  height: calc(100vh - 104px);
  transition:
    opacity 0.26s ease,
    transform 0.34s cubic-bezier(0.2, 0.65, 0.2, 1);
  transform: translateX(36px);
  pointer-events: none;
  opacity: 0;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-panel);
  box-shadow: var(--shadow-elevated);
}

.code-preview-panel.is-open .code-preview-inner {
  transform: translateX(0);
  pointer-events: auto;
  opacity: 1;
}

.code-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-subtle);

  @include flex-gap(12px, row);
}

.code-preview-title {
  display: flex;
  overflow: hidden;
  align-items: center;

  @include flex-gap(8px, row);

  .title-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--text-normal-color);
    font-size: 14px;
    font-weight: 600;
  }

  .title-language {
    flex: 0 0 auto;
    padding: 2px 8px;
    color: var(--text-dblight-color);
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--bg-app);
    font-size: 12px;
    line-height: 18px;
  }
}

.code-preview-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;

  @include flex-gap(8px, row);
}

.preview-action-btn {
  height: 28px;
  padding: 0 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-normal-color);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-app);
  font-size: 12px;
  line-height: 26px;

  &:hover {
    color: var(--main-color);
    border-color: var(--main-color-light-5);
  }
}

.code-preview-body {
  overflow: auto;
  flex: 1;
  padding: 0;
  background: var(--bg-app);
}

.code-preview-iframe {
  display: block;
  width: 100%;
  min-height: 100%;
  border: 0;
  background: transparent;
}

.code-preview-panel:fullscreen {
  width: 100vw;
  height: 100vh;
  margin: 0;
  transform: none;
  opacity: 1;
  background: var(--bg-app);
}

.code-preview-panel:fullscreen .code-preview-inner {
  position: static;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;
}

.input-container {
  grid-column: 1;
  grid-row: 2;
  position: relative;
  z-index: 11;
  padding: 0 0 8px;
  background-color: var(--bg-app);

  &-content {
    box-sizing: border-box;
    width: 100%;
    max-width: 1080px;
    margin: 0 auto;
    padding: 0 16px;
    transition: transform 0.32s ease;
  }
}

.float-button-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

@include mobile {
  .chat-page {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    height: calc(100vh - 56px);
    padding: 16px 0 0;
    row-gap: 8px;
  }

  .chat-page.is-preview-visible {
    .chat-main,
    .input-container-content {
      transform: none;
    }
  }

  .chat-history-container {
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    padding: 0 12px;
  }

  .code-preview-panel {
    position: fixed;
    top: 56px;
    right: 0;
    bottom: 0;
    z-index: 21;
    width: 0;
    margin: 0;

    &.is-open {
      width: 100vw;
      margin: 0;
    }
  }

  .code-preview-inner {
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0;
  }

  .input-container {
    grid-column: 1;
    grid-row: 2;
    padding: 0;

    @include safe-area-padding(bottom);

    &-content {
      box-sizing: border-box;
      width: 100%;
      max-width: none;
      padding: 0 12px 8px;
    }
  }
}
</style>
