<template>
  <div
    ref="chatContainerRef"
    class="chat-page"
    :style="{ paddingBottom: pagePaddingBottom }"
  >
    <!-- 聊天记录内容 -->
    <div
      ref="chatHistoryContainerRef"
      v-xs-loading="chatHistoryLoading"
      class="chat-history-container"
    >
      <div v-if="!chatHistoryLoading" class="chat-messages">
        <div
          v-for="(msg, index) in chatHistory"
          :id="`message-${msg.id}`"
          :key="msg.id || conversationId"
          class="message-wrapper"
          :class="{
            'active-message-item':
              Number(msg.id) && Number(msg.id) === Number(chatDetailId),
          }"
        >
          <!-- 用户消息 -->
          <CompletionsUserMessage
            v-if="msg.role.toLowerCase() === 'user'"
            :key="`${msg.id || conversationId}`"
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
                editedContent: $event,
              })
            "
            @prev="handleUserPrevPage(msg.id)"
            @next="handleUserNextPage(msg.id)"
          />

          <!-- 助手消息 -->
          <CompletionsAssistantMessage
            v-else-if="msg.role.toLowerCase() === 'assistant'"
            :key="`assistant-${msg.id || conversationId}`"
            :file-percent="msg.filePercent"
            :message="msg.content"
            :finished="msg.finished"
            :loading="loading && index === chatHistory.length - 1"
            :conversation-id="conversationId"
            :message-id="msg.id"
            :parent-id="msg.parentId"
            :model="msg.aiModel"
            :error="msg.error"
            :receiving="isReceiving"
            :thinking-content="msg.thinkingContent"
            :thinking-duration="msg.thinkingTime"
            :current-page="msg.pageIndex + 1"
            :total-pages="msg.siblingCount || 1"
            :image-list="msg.imageList || []"
            @regenerate="handleRegenerateAnswer"
            @prev="handleAssistantPrevPage(msg.parentId)"
            @next="handleAssistantNextPage(msg.parentId)"
          />

          <!-- {{ msg.role.toLowerCase() === 'assistant' ? msg : '' }} -->
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
          v-model:deepThink="enableDeepThink"
          v-model:create-image="enableCreateImage"
          v-model:create-image-count="createImageCount"
          :model-list="models"
          :float-button-enable="floatButtonEnable && !loading && !isReceiving"
          :loading="loading || isReceiving"
          :placeholder="PLACEHOLDER_MAP.DEFAULT"
          :disabled="lastMessageHasError"
          :show-file-btn="isFileButtonVisible"
          :allow-empty-message="false"
          :hidden-input-when-files="false"
          :min-rows="2"
          :show-image-btn="isUploadFileButtonVisible"
          :show-deep-think-btn="isDeepThinkButtonVisible"
          :show-create-image-btn="isCreateImageButtonVisible"
          :show-create-image-count="isCreateImageCountVisible"
          show-model-select
          validate-mode="single"
          agent-code="completions"
          @submit="handleSendMessage"
          @stop="handleManualStop"
        />
      </div>
    </div>
  </div>
</template>
<script>
import { beforeRouteEnter } from "./config/index.js";
export default {
  name: "CompletionsChat",
  beforeRouteEnter,
};
</script>
<script setup>
import { ref, computed, watch, onBeforeUnmount, nextTick } from "vue";
import { AgentSender } from "@/components";
import CompletionsUserMessage from "@/components/completions-message/user.vue";
import CompletionsAssistantMessage from "@/components/completions-message/assistant.vue";
import { PLACEHOLDER_MAP } from "@/config/agent-placeholder";
import { useRoute, onBeforeRouteLeave, useRouter } from "vue-router";
import {
  tryOnMounted,
  useEventBus,
  useElementSize,
  useWindowScroll,
  useEventListener,
} from "@vueuse/core";
import { useCompletions } from "./hooks/use-completions";
import { FETCH_CHAR_HISTORY } from "@/config/symbol";

defineOptions({
  name: "CompletionsChatPage",
});

const { x: windowScrollX } = useWindowScroll();
const agentPositionX = computed(() => {
  if (windowScrollX.value) {
    return `${-windowScrollX.value}px`;
  }
  return "0";
});

const route = useRoute();
const router = useRouter();
const conversationId = computed(() => route.query.conversationId);
const chatDetailId = computed(() => route.query.chatDetailId);
const senderRef = ref(null);

const eventBusOfHistory = useEventBus(FETCH_CHAR_HISTORY);

const chatHistoryContainerRef = ref(null);
const inputContainerRef = ref(null);

const { height: inputContainerHeight } = useElementSize(inputContainerRef);
const { height: chatHistoryContainerHeight } = useElementSize(
  chatHistoryContainerRef,
);

const floatButtonEnable = computed(() => {
  return chatHistoryContainerHeight.value > window.innerHeight;
});

// 最后一条消息是否有错误
const lastMessageHasError = computed(() => {
  if (chatHistory.value.length === 0) return false;
  const lastMessage = chatHistory.value[chatHistory.value.length - 1];
  return !!lastMessage?.error;
});

// 输入框高度 + 垂直padding：68 + 80：最后一条消息到输入框的距离
const pagePaddingBottom = computed(
  () => `${inputContainerHeight.value + 68 + 80}px`,
);

const {
  models,
  currentModelValue,
  currentModel,
  message,
  loading,
  chatHistory,
  chatContainerRef,
  isReceiving,
  chatHistoryLoading,
  isDeepThinkButtonVisible,
  enableDeepThink,
  isFileButtonVisible,
  isUploadFileButtonVisible,
  editingMessageId,
  isCreateImageButtonVisible,
  isCreateImageCountVisible,
  enableCreateImage,
  createImageCount,
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
  handleSendEditedUserMessage,
} = useCompletions({
  conversationId,
  chatDetailId,
});

// 页面加载时获取数据
tryOnMounted(async () => {
  let willSendMessage =
    window.sessionStorage.getItem("COMPLETIONS_WILL_SEND_MESSAGE") || "";
  if (willSendMessage) {
    willSendMessage = JSON.parse(willSendMessage);
    window.sessionStorage.removeItem("COMPLETIONS_WILL_SEND_MESSAGE");
  }

  if (willSendMessage && Object.keys(willSendMessage).length > 0) {
    message.value = willSendMessage.message || "";
    currentModelValue.value = willSendMessage.aiModel || [
      models.value[0]?.code,
    ];
    enableDeepThink.value = willSendMessage.enableDeepThink ?? true;
    enableCreateImage.value = willSendMessage.enableCreateImage ?? false;
    createImageCount.value = willSendMessage.createImageCount ?? 1;
    sendMessage({ ...willSendMessage });
  } else {
    await fetchChatHistory();

    nextTick(() => {
      // 如果聊天记录为空，则跳转至首页
      console.log("chatHistory", chatHistory.value);
      if (chatHistory.value.length === 0) {
        router.replace({
          name: "Completions",
        });
      }
    });
  }
});

const handleSendMessage = (payload = {}) => {
  senderRef.value.filesUploaded = [];
  sendMessage(payload);
};

const handleManualStop = async () => {
  if (loading.value) return;
  if (isReceiving.value) {
    await stopSSE(conversationId.value);
    loading.value = false;
    isReceiving.value = false;
  }
};

// 监听会话ID变化，重新获取聊天记录
watch(conversationId, async (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    if (oldVal) {
      loading.value = false;
      await handleManualStop();
    }
  }
});

// 切换模型时，需要按需重置文件列表
watch(currentModelValue, () => {
  if (currentModel.value?.enableVision && currentModel.value?.enableFile) {
    return;
  }

  const tmpFilesUploaded = [...senderRef.value.filesUploaded];
  senderRef.value.filesUploaded = [];

  if (currentModel.value?.enableVision) {
    senderRef.value.filesUploaded = tmpFilesUploaded.filter(
      (item) => item.type === "image",
    );
  }

  if (currentModel.value?.enableFile) {
    senderRef.value.filesUploaded = [
      ...senderRef.value.filesUploaded,
      ...tmpFilesUploaded.filter((item) => item.type === "file"),
    ];
  }
});

eventBusOfHistory.on(async ({ taskId, aiModel, agentId }) => {
  console.log("切换房间-单模型", { taskId, aiModel, agentId });

  if (+agentId === 0) {
    // 停止当前正在进行的对话
    loading.value = false;
    await handleManualStop();
    await fetchChatHistory(taskId);
    if (aiModel) {
      const model = aiModel.split(",").filter(Boolean);
      currentModelValue.value = models.value
        .map((item) => item.code)
        .includes(model[0])
        ? model[0]
        : models.value[0]?.code || "";
    }
  }
});

// 组件卸载前停止对话
onBeforeUnmount(async () => {
  loading.value = false;
  await handleManualStop();
});

useEventListener(window, "beforeunload", async () => {
  loading.value = false;
  await handleManualStop();
});

// 路由离开前停止对话
onBeforeRouteLeave(async (to, from, next) => {
  loading.value = false;
  await handleManualStop();
  next();
});
</script>

<style lang="scss" scoped>
.active-message-item {
  position: relative;

  > * {
    position: relative;
    z-index: 2;
  }

  &::after {
    content: "";
    position: absolute;
    top: -14px;
    left: -18px;
    z-index: 1;
    width: calc(100% + 36px);
    height: calc(100% + 28px);
    transition: all 0.2s;
    animation: active-message-blink 0.75s ease;
    animation-iteration-count: infinite;
    border-radius: 8px;
    background: #eafaed;
  }

  @keyframes active-message-blink {
    0% {
      background: #eafaed;
    }

    50% {
      background: #bbf5b3;
    }

    100% {
      background: #eafaed;
    }
  }
}

.input-container {
  position: fixed;
  bottom: 0;
  z-index: 11;
  // width: 100%;

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

/* 欢迎页样式 */
.welcome-container {
  display: flex;
  // display: none;
  align-items: center;
  flex-direction: column;
  width: 1080px;
  margin-top: 120px;

  @include flex-gap(36px, column);

  @media screen and (width <= 1440px) {
    width: 960px;
    margin-top: 72px;
  }

  @media screen and (width > 1440px) and (width < 1920px) {
    width: 960px;
    margin-top: 96px;
  }

  @media screen and (width >= 1920px) {
    width: 1080px;
    margin-top: 120px;
  }
}

.welcome-content {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 100%;

  @include flex-gap(16px, column);
}

.agent-info {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
}

.agent-avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  margin-bottom: 8px;
  border: 1px solid #d4dbe9;
  border-radius: 100px;

  img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
  }
}

.agent-title {
  display: flex;
  align-items: center;
  flex-direction: column;

  @include flex-gap(4px, column);

  h2 {
    margin: 0;
    letter-spacing: 2%;
    color: #000;
    font-family: "Source Han Sans CN", sans-serif;
    font-size: 28px;
    font-weight: 500;
    line-height: 1.5em;
  }

  .usage-count {
    display: flex;
    align-items: center;
    color: #8c8c8c;
    font-family: "Source Han Sans CN", sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5em;

    @include flex-gap(8px, row);
  }
}

.agent-description {
  max-width: 800px;
  margin: 0;
  text-align: center;
  color: rgb(0 0 0 / 80%);
  font-family: "Source Han Sans CN", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5em;
}

.sample-questions {
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0 220px;

  @include flex-gap(24px, row);
}

.question-item {
  display: flex;
  align-items: stretch;
  flex: 1;
  min-width: 142px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  // border: 1px solid #d4dbe9;
  border-radius: 8px;
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 6%);

  @include flex-gap(12px, row);

  &:hover {
    transform: translateY(-2px);
    // background-color: #f8f9fa;
    box-shadow: 0 4px 20px 0 rgb(0 0 0 / 12%);
  }

  &.unclickable {
    cursor: not-allowed;

    &:hover {
      transform: none;
      box-shadow: 0 2px 12px 0 rgb(0 0 0 / 6%);
    }
  }

  .question-content {
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    text-align: center;
    color: #595959;
    font-family: "Source Han Sans CN", sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5em;
  }
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

<style lang="scss">
@use "@/styles/export.scss";
</style>
