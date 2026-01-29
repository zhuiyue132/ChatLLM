<template>
  <div ref="chatContainerRef" class="chat-page" :style="{ paddingBottom: pagePaddingBottom }">
    <!-- 聊天记录内容 -->
    <div
      ref="chatHistoryContainerRef"
      v-xs-loading="chatHistoryLoading"
      class="chat-history-container"
    >
      <div v-if="!chatHistoryLoading" class="chat-messages">
        <div
          v-for="msg in chatHistory"
          :id="`message-${msg.id}`"
          :key="msg.id || roomId"
          class="message-wrapper"
        >
          <!-- 用户消息 -->
          <CompletionsUserMessage
            v-if="msg.role.toLowerCase() === 'user'"
            :key="`${msg.id || roomId}`"
            :current-page="msg.pageIndex + 1"
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
            v-else-if="msg.role.toLowerCase() === 'assistant'"
            :key="`assistant-${msg.id || roomId}`"
            :message="msg.content"
            :finished="msg.finished"
            :loading="loading && chatHistory.indexOf(msg) === chatHistory.length - 1"
            :message-id="msg.id"
            :parent-id="msg.parentId"
            :model="msg.model"
            :error="msg.error"
            :receiving="isReceiving"
            :thinking-content="msg.reasoningContent"
            :thinking-duration="msg.reasoningTime"
            :current-page="msg.pageIndex + 1"
            :total-pages="msg.siblingCount || 1"
            :usage="msg.usage"
            @regenerate="handleRegenerateAnswer"
            @prev="handleAssistantPrevPage(msg.parentId)"
            @next="handleAssistantNextPage(msg.parentId)"
          />
        </div>
      </div>
    </div>

    <div
      ref="inputContainerRef"
      class="input-container"
      :style="{ transform: `translateX(${agentPositionX})` }"
    >
      <div class="input-container-content">
        <AgentSender
          ref="senderRef"
          v-model="message"
          v-model:model="currentModelValue"
          :model-list="models"
          :float-button-enable="floatButtonEnable && !loading && !isReceiving"
          :loading="loading || isReceiving"
          :placeholder="PLACEHOLDER_MAP.DEFAULT"
          :disabled="lastMessageHasError"
          :allow-empty-message="false"
          :hidden-input-when-files="false"
          :min-rows="2"
          show-model-select
          show-mention-model
          agent-code="completions"
          @submit="handleSendMessage"
          @stop="handleManualStop"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'
import AgentSender from '@/components/sender/index.vue'
import CompletionsUserMessage from '@/components/completions-message/user.vue'
import CompletionsAssistantMessage from '@/components/completions-message/assistant.vue'
import { PLACEHOLDER_MAP } from '@/config/agent-placeholder'
import { FETCH_CHAR_HISTORY } from '@/config/symbol'
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router'
import { tryOnMounted, useElementSize, useWindowScroll, useEventListener, useEventBus } from '@vueuse/core'
import { useCompletions } from './hooks/use-completions'

defineOptions({
  name: 'CompletionsChatPage'
})

const { x: windowScrollX } = useWindowScroll()
const agentPositionX = computed(() => {
  if (windowScrollX.value) {
    return `${-windowScrollX.value}px`
  }
  return '0'
})

const route = useRoute()
const router = useRouter()
const roomId = computed(() => route.query.roomId)
const senderRef = ref(null)
const chatContainerRef = ref(null)

const chatHistoryContainerRef = ref(null)
const inputContainerRef = ref(null)

const { height: inputContainerHeight } = useElementSize(inputContainerRef)
const { height: chatHistoryContainerHeight } = useElementSize(chatHistoryContainerRef)

const floatButtonEnable = computed(() => {
  return chatHistoryContainerHeight.value > window.innerHeight
})

// 最后一条消息是否有错误
const lastMessageHasError = computed(() => {
  if (chatHistory.value.length === 0) return false
  const lastMessage = chatHistory.value[chatHistory.value.length - 1]
  return !!lastMessage?.error
})

// 输入框高度 + 垂直padding：68 + 80：最后一条消息到输入框的距离
const pagePaddingBottom = computed(() => `${inputContainerHeight.value + 68 + 80}px`)

const {
  models,
  currentModelValue,
  message,
  loading,
  chatHistory,
  isReceiving,
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
  roomId
})

// 页面加载时获取数据
tryOnMounted(async () => {
  let willSendMessage = window.sessionStorage.getItem('COMPLETIONS_WILL_SEND_MESSAGE') || ''
  if (willSendMessage) {
    willSendMessage = JSON.parse(willSendMessage)
    window.sessionStorage.removeItem('COMPLETIONS_WILL_SEND_MESSAGE')
  }

  if (willSendMessage && Object.keys(willSendMessage).length > 0) {
    message.value = willSendMessage.message || ''
    sendMessage({ ...willSendMessage })
  } else {
    await fetchChatHistory()

    nextTick(() => {
      // 如果聊天记录为空，则跳转至首页
      console.log('chatHistory', chatHistory.value)
      if (chatHistory.value.length === 0) {
        router.replace({
          name: 'Completions'
        })
      } else {
        // 有聊天记录时，滚动到底部
        enableAutoScroll()
        scrollToBottom(true)
      }
    })
  }
})

// 监听侧边栏点击切换对话事件
const eventBusOfHistory = useEventBus(FETCH_CHAR_HISTORY)
eventBusOfHistory.on(() => {
  nextTick(() => {
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
  if (loading.value) return
  if (isReceiving.value) {
    stopSSE()
    loading.value = false
    isReceiving.value = false
  }
}

// 组件卸载前停止对话
onBeforeUnmount(async () => {
  loading.value = false
  await handleManualStop()
})

useEventListener(window, 'beforeunload', async () => {
  loading.value = false
  await handleManualStop()
})

// 路由离开前停止对话
onBeforeRouteLeave(async (to, from, next) => {
  loading.value = false
  await handleManualStop()
  next()
})
</script>

<style lang="scss" scoped>
.input-container {
  position: fixed;
  bottom: 0;
  z-index: 11;

  padding: 20px 0 48px;
  background-color: #fff;

  &-content {
    width: 1080px;
    margin: 0 auto;

    @media screen and (width <= 1440px) {
      width: 960px;
    }

    @media screen and (width > 1440px) and (width < 1920px) {
      width: 960px;
    }

    @media screen and (width >= 1920px) {
      width: 1080px;
    }
  }
}

.float-button-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.chat-page {
  display: flex;
  overflow: hidden auto;
  align-items: center;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-height: calc(100vh - 72px);
  padding: 32px 0 0; /* 增加底部padding，为固定定位的输入框留出空间 */
  background-color: #fff;
}

/* 聊天记录页样式 */
.chat-history-container {
  position: relative;
  display: flex;
  overflow-y: visible;
  flex: 1;
  flex-direction: column;
  width: 1080px;
  min-height: 100%;

  @media screen and (width <= 1440px) {
    width: 960px;
  }

  @media screen and (width > 1440px) and (width < 1920px) {
    width: 960px;
  }

  @media screen and (width >= 1920px) {
    width: 1080px;
  }
}

.chat-messages {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0;
  padding-bottom: 180px;

  .message-wrapper {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}
</style>
