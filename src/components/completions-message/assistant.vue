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
    <LoadingComponent v-if="loading" />
    <template v-else>
      <!-- 模型信息头部 -->
      <div class="model-header">
        <div class="model-info">
          <!-- 模型logo -->
          <div class="model-logo">
            <img :src="modelLogo" :alt="modelName" />
          </div>
          <!-- 模型名称标签 -->
          <div class="model-name-tag">
            <span>{{ modelName }}</span>
          </div>
        </div>
      </div>

      <div v-if="filePercent" class="oversize-tips">
        超出字数限制，{{ modelName }} 只阅读了前
        {{ Math.ceil(Number(filePercent) * 100) + '%' }}
      </div>

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
            <!-- {{ thinkingContent }} -->
            <MarkdownRenderer :content="thinkingContent" />
          </div>
        </div>
      </div>

      <!-- 消息正文内容 -->
      <div v-if="!imageList.length" class="message-content">
        <div ref="mdContainer" class="message-text markdown-body">
          <div v-if="error" class="error-content">内容生成时出现错误，请稍后重试！</div>
          <MarkdownRenderer v-else :content="message" />
        </div>
      </div>
      <!-- 图片内容 -->
      <template v-else>
        <div class="message-content">
          <div ref="mdContainer" class="message-text markdown-body">
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
      </div>
    </template>
  </div>
</template>

<script setup>
import MarkdownRenderer from '../markdown-renderer/index.vue'
import { onCopy } from '@/utils'
import { ref, computed } from 'vue'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import ChatMessageItemLoading from '../agent-message/loading.vue'
import { getProviderImageByModelName } from '@/views/completions/utils'
import ImageItem from './image-item.vue'
import { showMessage } from '@/hooks'

defineOptions({
  name: 'CompletionsAssistantMessage'
})

const props = defineProps({
  message: {
    type: String,
    default: ''
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
  agentId: {
    type: [String, Number],
    default: ''
  },
  conversationId: {
    type: [String, Number],
    default: ''
  },
  agentCode: {
    type: String,
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
  }
})

const emit = defineEmits(['regenerate', 'prev', 'next'])

const LoadingComponent = computed(() => {
  return ChatMessageItemLoading
})

const mdContainer = ref(null)
const showThinking = ref(true)

// 获取模型logo
const modelLogo = computed(() => {
  // 从model字符串中提取模型类型

  return getProviderImageByModelName(props.model)
})

// 获取模型显示名称
const modelName = computed(() => {
  return 'DeepSeek'
})

// 思考状态文本
const thinkingText = computed(() => {
  if (props.thinkingDuration > 0) {
    return `已深度思考（用时${Math.ceil(props.thinkingDuration / 1000)}秒）`
  }
  return '深度思考中...'
})

// 切换思考过程显示
const toggleThinking = () => {
  showThinking.value = !showThinking.value
}

// 复制消息
const copyMessage = async () => {
  await onCopy(mdContainer.value?.innerText)
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

.export-icon {
  outline: none;
}

.oversize-tips {
  color: #8c8c8c;
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
        width: 26px;
        height: 26px;
        border-radius: 0;
        background: #fff;

        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      }

      .model-name-tag {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 0 4px;
        border-radius: 2px;
        background: #e3e3e3;

        span {
          white-space: nowrap;
          color: #8c8c8c;
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
      background: #f5fbf4;

      @include flex-gap(12px, row);

      .thinking-status {
        display: flex;
        align-items: center;

        .icon-shendusikao {
          font-size: 16px;
        }

        @include flex-gap(4px, row);

        .thinking-text {
          color: #000;
          font-size: 14px;
          font-weight: 400;
          line-height: 14px;
        }
      }

      .arrow-icon {
        transition: transform 0.3s ease;
        // transform: rotate(-90deg);
        color: #000;
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
        color: #595959;
        border-left: 1px #d9d9d9 solid;
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
      color: #000;
      font-weight: 400;
      // line-height: 1.6;

      .error-content {
        display: inline-flex;
        align-items: center;
        margin: 2px 0 8px !important;
        padding: 8px;
        color: #ff4038;
        border: 1px solid #ffd4cd;
        border-radius: 4px;
        background: #ffeeeb;
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
        color: #8c8c8c;
        font-size: 16px;
      }

      &:hover {
        opacity: 0.8;
      }
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      color: #595959;

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
        color: #8c8c8c;
        font-size: 14px;
      }
    }
  }
}
</style>
