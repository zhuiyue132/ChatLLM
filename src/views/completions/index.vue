<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-21
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/views/completions/index.vue
 * @Description  : AI 补全的首页
 * 
-->
<template>
  <div class="chat-container">
    <div class="chat-content">
      <!-- 欢迎标题 -->
      <div class="welcome-section">
        <h1 class="welcome-title">欢迎使用Chat2LLM</h1>
      </div>

      <!-- 输入区域 -->

      <div class="input-section">
        <AgentSender
          ref="senderRef"
          v-model:model="currentModel"
          :model-list="modelList"
          :float-button-enable="false"
          :min-rows="2"
          :hidden-input-when-files="false"
          :allow-empty-message="false"
          :placeholder="PLACEHOLDER_MAP.DEFAULT"
          show-model-select
          validate-mode="both"
          agent-code="completions"
          @submit="handleMessageSubmit"
        />
      </div>
    </div>
  </div>
</template>
<script setup>
import AgentSender from '@/components/sender/index.vue'
import { PLACEHOLDER_MAP } from '@/config/agent-placeholder'
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, watch, onMounted } from 'vue'
import { useApiSettingsStore } from '@/stores/api-settings'

const route = useRoute()
const apiSettingsStore = useApiSettingsStore()

const senderRef = ref(null)

// 当前选中的模型（多选模式需要数组格式）
const currentModel = ref(
  apiSettingsStore.defaultModel ? [apiSettingsStore.defaultModel] : []
)

// 模型列表，转换为 ModelSelector 所需格式
const modelList = computed(() => {
  return apiSettingsStore.selectedModels.map(model => ({
    code: model,
    name: model
  }))
})

const handleMessageSubmit = (payload = {}) => {}

onMounted(async () => {})
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
