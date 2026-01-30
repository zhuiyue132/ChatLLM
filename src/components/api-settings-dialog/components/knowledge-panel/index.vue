<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/knowledge-panel/index.vue
 * @Description  : 知识库设置面板
-->

<template>
  <div class="knowledge-panel">
    <div class="panel-header">
      <div class="panel-title">知识库设置</div>
      <div class="panel-desc">配置知识库连接以启用 RAG 功能</div>
    </div>

    <el-form label-position="top" class="settings-form">
      <el-form-item>
        <el-switch
          v-model="knowledgeConfig.enabled"
          active-text="启用知识库"
          inactive-text=""
        />
      </el-form-item>

      <template v-if="knowledgeConfig.enabled">
        <el-form-item label="知识库 API 地址">
          <el-input
            v-model="knowledgeConfig.apiUrl"
            placeholder="例如: https://your-knowledge-base.com/api"
            clearable
          />
        </el-form-item>

        <el-form-item label="知识库 API Key">
          <el-input
            v-model="knowledgeConfig.apiKey"
            :type="showKbApiKey ? 'text' : 'password'"
            placeholder="请输入知识库 API Key"
            clearable
          >
            <template #suffix>
              <el-icon class="toggle-password" @click="showKbApiKey = !showKbApiKey">
                <i :class="showKbApiKey ? 'iconfont icon-eye' : 'iconfont icon-eye-close'" />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="默认知识库">
          <el-input
            v-model="knowledgeConfig.defaultCollection"
            placeholder="输入默认知识库名称或 ID"
            clearable
          />
          <div class="form-item-tip">对话时默认查询的知识库</div>
        </el-form-item>
      </template>
    </el-form>

    <div class="panel-footer">
      <div></div>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useApiSettingsStore } from '@/stores/api-settings'

defineOptions({
  name: 'KnowledgePanel'
})

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const apiSettingsStore = useApiSettingsStore()

const showKbApiKey = ref(false)

const knowledgeConfig = reactive({
  enabled: false,
  apiUrl: '',
  apiKey: '',
  defaultCollection: ''
})

// 从 store 加载配置
const loadFromStore = () => {
  const kb = apiSettingsStore.knowledgeBase || {}
  knowledgeConfig.enabled = kb.enabled || false
  knowledgeConfig.apiUrl = kb.apiUrl || ''
  knowledgeConfig.apiKey = kb.apiKey || ''
  knowledgeConfig.defaultCollection = kb.defaultCollection || ''
}

// 面板可见时加载配置
watch(
  () => props.visible,
  visible => {
    if (visible) {
      loadFromStore()
      showKbApiKey.value = false
    }
  },
  { immediate: true }
)

// 保存知识库配置
const handleSave = () => {
  apiSettingsStore.updateKnowledgeBase({
    enabled: knowledgeConfig.enabled,
    apiUrl: knowledgeConfig.apiUrl,
    apiKey: knowledgeConfig.apiKey,
    defaultCollection: knowledgeConfig.defaultCollection
  })
  ElMessage.success('知识库设置已保存')
}
</script>

<style lang="scss" scoped>
.knowledge-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.panel-header {
  flex-shrink: 0;
  margin-bottom: 24px;

  .panel-title {
    margin-bottom: 8px;
    color: #262626;
    font-size: 18px;
    font-weight: 600;
  }

  .panel-desc {
    color: #8c8c8c;
    font-size: 14px;
  }
}

.settings-form {
  flex: 1;
  overflow-y: auto;

  :deep(.el-form-item) {
    margin-bottom: 20px;

    .el-form-item__label {
      padding-bottom: 6px;
      color: #262626;
      font-size: 14px;
      font-weight: 500;
      line-height: 22px;
    }

    .el-input {
      .el-input__wrapper {
        padding: 8px 12px;
        border-radius: 6px;
      }
    }
  }

  .form-item-tip {
    margin-top: 6px;
    color: #8c8c8c;
    font-size: 12px;
    line-height: 18px;
  }

  .toggle-password {
    cursor: pointer;

    .iconfont {
      color: #8c8c8c;
      font-size: 16px;
      transition: color 0.2s;

      &:hover {
        color: #595959;
      }
    }
  }
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
