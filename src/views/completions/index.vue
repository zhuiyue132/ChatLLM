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
          v-model:mcp-session-enabled="sessionMcpEnabled"
          v-model:mcp-server-ids="selectedMcpServerIds"
          :model-list="modelList"
          :mcp-server-list="availableMcpServers"
          :mcp-global-enabled="mcpSettingsStore.globalEnabled"
          :mcp-supported="isCurrentModelSupportsToolCall"
          :float-button-enable="false"
          :min-rows="2"
          :hidden-input-when-files="false"
          :allow-empty-message="false"
          :show-image-btn="isCurrentModelSupportsVision"
          :show-mcp-selector="isCurrentModelSupportsToolCall"
          :placeholder="PLACEHOLDER_MAP.DEFAULT"
          show-model-select
          show-mention-model
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
import { useCompletionsEntry } from './hooks/use-completions-entry'

const {
  senderRef,
  showSettingsDialog,
  inputMessage,
  sessionMcpEnabled,
  selectedMcpServerIds,
  currentModel,
  modelList,
  availableMcpServers,
  isCurrentModelSupportsVision,
  isCurrentModelSupportsToolCall,
  handleMessageSubmit,
  mcpSettingsStore
} = useCompletionsEntry()
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
  background-color: var(--bg-app);
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
  color: var(--text-normal-color);
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
  border: 0.8px solid var(--border-color);
  border-radius: 28px;
  background: var(--bg-muted);
}

@include mobile {
  .chat-container {
    height: calc(100vh - 56px);
    padding: 0 16px 24px;
  }

  .chat-content {
    width: 100%;
  }

  .welcome-title {
    font-size: 24px;
  }

  .input-section {
    max-width: 100%;
  }
}
</style>
