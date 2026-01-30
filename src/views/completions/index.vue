<template>
  <div class="chat-container">
    <div class="chat-content">
      <!-- 欢迎标题 -->
      <div class="welcome-section">
        <h1 class="welcome-title">欢迎使用ChatLLM</h1>
      </div>

      <!-- 输入区域 -->

      <div class="input-section">
        <AgentSender
          ref="senderRef"
          v-model="inputMessage"
          v-model:model="currentModel"
          :model-list="modelList"
          :float-button-enable="false"
          :min-rows="2"
          :hidden-input-when-files="false"
          :allow-empty-message="false"
          :placeholder="PLACEHOLDER_MAP.DEFAULT"
          show-model-select
          show-mention-model
          agent-code="completions"
          @submit="handleMessageSubmit"
        />
      </div>
    </div>

    <!-- 设置对话框 -->
    <ApiSettingsDialog v-model="showSettingsDialog" />
  </div>
</template>
<script setup>
import AgentSender from '@/components/sender/index.vue'
import ApiSettingsDialog from '@/components/api-settings-dialog/index.vue'
import { PLACEHOLDER_MAP } from '@/config/agent-placeholder'
import { useRouter } from 'vue-router'
import { ref, computed, watch } from 'vue'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import { useEventBus } from '@vueuse/core'
import { OPEN_SETTINGS_COMMAND } from '@/config/symbol'

const router = useRouter()
const apiSettingsStore = useApiSettingsStore()
const chatRoomsStore = useChatRoomsStore()

const senderRef = ref(null)

// 设置对话框显示状态
const showSettingsDialog = ref(false)

// 监听打开设置事件
const eventBus = useEventBus(OPEN_SETTINGS_COMMAND)
eventBus.on(() => {
  showSettingsDialog.value = true
})

// 输入框内容
const inputMessage = ref('')

// 当前选中的模型（支持用户手动切换）
const currentModel = ref(apiSettingsStore.effectiveDefaultChatModel || '')

// 监听默认模型变化，如果当前模型是默认值且用户没有手动修改过，则更新
watch(
  () => apiSettingsStore.effectiveDefaultChatModel,
  newModel => {
    if (newModel && newModel !== currentModel.value) {
      currentModel.value = newModel
    }
  },
  { immediate: false }
)

// 模型列表，转换为 ModelSelector 所需格式
const modelList = computed(() => {
  return apiSettingsStore.selectedModels.map(model => ({
    code: model,
    name: model
  }))
})

/**
 * 处理消息提交
 * @param {Object} payload - 提交的消息数据
 * @param {string} payload.message - 用户输入的消息
 */
const handleMessageSubmit = (payload = {}) => {
  const { message } = payload
  const model = currentModel.value || apiSettingsStore.effectiveDefaultChatModel

  if (!message || !message.trim()) {
    return
  }

  // 检查是否有可用模型
  if (!apiSettingsStore.hasModels) {
    // 不显示错误提示，因为按钮已经不可用
    return
  }

  // 1. 创建新房间，使用用户第一句话作为标题（截取前50个字符）
  const title = message.trim().slice(0, 50)
  const roomId = chatRoomsStore.createRoom(model, title)

  // 2. 存储待发送的消息到 sessionStorage
  window.sessionStorage.setItem(
    'COMPLETIONS_WILL_SEND_MESSAGE',
    JSON.stringify({
      message,
      model
    })
  )

  // 3. 跳转到对话页面
  router.push({
    name: 'CompletionsChat',
    query: { roomId }
  })
}
</script>

<style lang="scss" scoped>
.chat-container {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 100%;
  height: calc(100vh - 128px);
  padding: 0 100px 48px;
  background-color: #fff;
}

.chat-content {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 960px;

  @include flex-gap(36px, column);
}

/* 欢迎标题 */
.welcome-section {
  width: 100%;
  text-align: center;
}

.welcome-title {
  margin: 0;
  letter-spacing: 0.64px;
  color: #000;
  font-family: 'Source Han Sans CN', 'Microsoft YaHei', sans-serif;
  font-size: 32px;
  font-weight: 500;
  line-height: 1.2;
}

/* 输入区域 */
.input-section {
  width: 100%;
  max-width: 960px;
}

.input-area {
  position: relative;
  padding: 12px 24px;
  border: 0.8px solid #d4dbe9;
  border-radius: 28px;
  background: #f5f5f5;
}
</style>
