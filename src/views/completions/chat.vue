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
              :rag-sources="msg.ragSources"
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
          v-model:kb-ids="selectedKbIds"
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
          :show-kb-selector="true"
          :kb-list="availableKnowledgeBases"
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
import { ref, computed } from 'vue'
import AgentSender from '@/components/sender/index.vue'
import CompletionsUserMessage from '@/components/completions-message/user.vue'
import CompletionsAssistantMessage from '@/components/completions-message/assistant.vue'
import { PLACEHOLDER_MAP } from '@/config/agent-placeholder'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useMcpSettingsStore } from '@/stores/mcp-settings'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { useKnowledgeBaseStore } from '@/stores/knowledge-base'
import { useRoute, useRouter } from 'vue-router'
import { useElementSize } from '@vueuse/core'
import { useCompletions } from './hooks/use-completions'
import { useChatPreview } from './hooks/use-chat-preview'
import { useChatDisplayHistory } from './hooks/use-chat-display-history'
import { useChatBootstrap } from './hooks/use-chat-bootstrap'
import { useChatSearchTarget } from './hooks/use-chat-search-target'
import { useChatStopGuards } from './hooks/use-chat-stop-guards'

defineOptions({
  name: 'CompletionsChatPage'
})

const route = useRoute()
const router = useRouter()
const apiSettingsStore = useApiSettingsStore()
const mcpSettingsStore = useMcpSettingsStore()
const chatRoomsStore = useChatRoomsStore()
const kbStore = useKnowledgeBaseStore()

const roomId = computed(() => route.query.roomId)
const senderRef = ref(null)
const chatMainRef = ref(null)

const chatHistoryContainerRef = ref(null)
const inputContainerRef = ref(null)

const { height: chatHistoryContainerHeight } = useElementSize(chatHistoryContainerRef)

const {
  previewVisible,
  previewState,
  iframeRenderKey,
  previewSrcDoc,
  previewIframeStyle,
  isPreviewFullscreen,
  codePreviewPanelRef,
  previewIframeRef,
  handleClosePreview,
  handleRefreshPreview,
  handleTogglePreviewFullscreen,
  teardownPreviewFullscreen,
  resetPreview
} = useChatPreview()

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

const selectedKbIds = computed({
  get: () => {
    return Array.isArray(currentRoom.value?.kbIds) ? currentRoom.value.kbIds : []
  },
  set: value => {
    if (!currentRoom.value?.id) return
    chatRoomsStore.updateRoomKbIds(currentRoom.value.id, value)
  }
})

const availableKnowledgeBases = computed(() => {
  return kbStore.enabledKnowledgeBases
})

const {
  displayChatHistory,
  formatSearchMessageIds,
  shouldRenderAssistantMessage,
  isAssistantMessageLoading,
  lastMessageHasError
} = useChatDisplayHistory({
  chatHistory,
  loading,
  receivingMessageId
})

const { resolveSearchTargetMessageId, locateSearchTargetMessage } = useChatSearchTarget({
  roomId,
  displayChatHistory,
  route,
  router,
  chatRoomsStore
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

const isCurrentModelSupportsVision = computed(() => {
  return apiSettingsStore.modelSupportsCapability(currentModelValue.value, 'vision')
})

const isCurrentModelSupportsToolCall = computed(() => {
  return apiSettingsStore.modelSupportsCapability(currentModelValue.value, 'tool_call')
})

useChatBootstrap({
  message,
  sendMessage,
  fetchChatHistory,
  chatHistory,
  router,
  enableAutoScroll,
  scrollToBottom,
  resolveSearchTargetMessageId,
  locateSearchTargetMessage
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

useChatStopGuards({
  loading,
  handleManualStop,
  teardownPreviewFullscreen,
  resetPreview
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
