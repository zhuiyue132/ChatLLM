<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-22
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/src/components/completions-message/user.vue
 * @Description  : 用户消息组件
 * 
-->
<template>
  <div class="user-message-wrapper">
    <div v-if="fileList && fileList.length > 0" class="file-content-wrapper">
      <div v-for="(list, index) in fileListChunks" :key="index" class="file-content">
        <FileItem
          v-for="file in list"
          :key="file.name"
          :index="index"
          :file-list="fileList"
          :file="file"
          readonly
        />
      </div>
    </div>

    <!-- 编辑模式 -->
    <div v-if="isEditing" class="edit-mode-container">
      <div class="edit-content">
        <el-input
          ref="editTextarea"
          v-model="editingText"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 8 }"
          placeholder="请输入内容..."
          resize="vertical"
          class="edit-textarea"
        />
      </div>
      <div class="edit-actions">
        <el-button class="cancel-button" @click="handleCancelEdit">取消</el-button>
        <el-button
          type="primary"
          class="send-button"
          :disabled="!isEditTextValid"
          @click="handleSendEdit"
        >
          发送
        </el-button>
      </div>
    </div>

    <!-- 普通模式 -->
    <template v-else>
      <div class="user-message">
        <div v-if="message" class="message-content">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="message-text" v-html="message"></div>
        </div>
      </div>

      <!-- 操作按钮区域 -->
      <div class="message-actions">
        <div class="action-icon">
          <i v-title="'复制内容'" class="icon-copy" @click.stop="handleCopy"></i>
        </div>
        <div v-if="enableEdit" class="action-icon edit" @click="handleEdit">
          <i v-title="'修改'" class="icon-bianji"></i>
        </div>
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
import { ref, computed, watch, nextTick } from 'vue'
import { chunk } from 'lodash-es'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import FileItem from '../sender/components/file-item.vue'
import { IGNORE_MESSAGE } from '@/config/app'
import { onCopy } from '@/utils'
import { showMessage } from '@/hooks/use-message'

defineOptions({
  name: 'CompletionsUserMessage'
})

const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  fileList: {
    type: Array,
    default: () => []
  },
  currentPage: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  editMode: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  enableEdit: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['copy', 'edit', 'prev', 'next', 'cancel-edit', 'send-edit'])

const editTextarea = ref(null)
const isEditing = ref(false)
const editingText = ref('')

const fileListChunks = computed(() => {
  return chunk(props.fileList, 3)
})

const message = computed(() => {
  return (props.message || '').replaceAll(IGNORE_MESSAGE, '').replaceAll('\n', '<br>')
})

const paginationText = computed(() => {
  return `${props.currentPage}/${props.totalPages}`
})

const isFirstPage = computed(() => {
  return props.currentPage <= 1
})

const isLastPage = computed(() => {
  return props.currentPage >= props.totalPages
})

// 检查编辑文本是否有效（非空且有有效字符）
const isEditTextValid = computed(() => {
  return editingText.value.trim().length > 0
})

// 监听 editMode 变化
watch(
  () => props.editMode,
  newVal => {
    isEditing.value = newVal
    if (newVal) {
      // 进入编辑模式，初始化编辑文本（去除 HTML 标签）
      editingText.value = (props.message || '')
        .replaceAll(IGNORE_MESSAGE, '')
        .replaceAll('<br>', '\n')
        .replaceAll('<br/>', '\n')
        .replace(/<[^>]*>/g, '')

      // 聚焦到 textarea
      nextTick(() => {
        if (editTextarea.value) {
          // Element Plus 的 el-input 组件需要通过 textarea 属性访问原生元素
          const textarea =
            editTextarea.value.textarea || editTextarea.value.$el?.querySelector('textarea')
          if (textarea) {
            textarea.focus()
            // 将光标移动到末尾
            const len = editingText.value.length
            textarea.setSelectionRange(len, len)
          }
        }
      })
    }
  },
  { immediate: true }
)

const handleCopy = () => {
  onCopy(props.message)
  emit('copy', props.message)
}

const handleEdit = () => {
  if (props.loading) {
    return showMessage('正在生成回答中，无法编辑', { type: 'warning' })
  }
  isEditing.value = true
  editingText.value = (props.message || '')
    .replaceAll(IGNORE_MESSAGE, '')
    .replaceAll('<br>', '\n')
    .replaceAll('<br/>', '\n')
    .replace(/<[^>]*>/g, '')

  nextTick(() => {
    if (editTextarea.value) {
      // Element Plus 的 el-input 组件需要通过 textarea 属性访问原生元素
      const textarea =
        editTextarea.value.textarea || editTextarea.value.$el?.querySelector('textarea')
      if (textarea) {
        textarea.focus()
        const len = editingText.value.length
        textarea.setSelectionRange(len, len)
      }
    }
  })

  emit('edit', props.message)
}

const handleCancelEdit = () => {
  isEditing.value = false
  editingText.value = ''
  emit('cancel-edit')
}

const handleSendEdit = () => {
  if (!editingText.value.trim()) {
    return
  }

  emit('send-edit', editingText.value)
  isEditing.value = false
  editingText.value = ''
}

const handlePrevPage = () => {
  if (!isFirstPage.value) {
    emit('prev')
  }
}

const handleNextPage = () => {
  if (!isLastPage.value) {
    emit('next')
  }
}
</script>

<style lang="scss" scoped>
.user-message-wrapper {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  justify-content: flex-end;
}

.file-content {
  display: flex;
  justify-content: flex-end;

  @include flex-gap(12px, row);

  &:not(:first-child) {
    margin-top: 12px;
  }
}

.file-content-wrapper {
  margin-bottom: 12px;
}

// 编辑模式容器
.edit-mode-container {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  width: 75%;
  padding: 16px;
  padding-right: 0;
  padding-bottom: 12px;
  border: 1px solid var(--main-color, #007e54);
  border-radius: 16px;
  background: var(--bg-muted);

  @include flex-gap(8px, column);

  .edit-content {
    width: 100%;

    // Element Plus el-input textarea 样式覆盖
    :deep(.el-textarea) {
      .el-textarea__inner {
        padding: 0;
        resize: none !important;
        color: var(--text-normal-color);
        border: none;
        background: transparent;
        box-shadow: none;
        font-family: 'Source Han Sans CN', sans-serif;
        font-size: 16px;
        font-weight: 400;
        line-height: 1.6em;

        &::placeholder {
          color: var(--text-dblight-color);
        }

        &:focus {
          border: none;
          box-shadow: none;
        }
      }
    }
  }

  .edit-actions {
    display: flex;
    align-items: center;
    margin-right: 16px;

    // Element Plus el-button 样式覆盖
    :deep(.el-button) {
      height: 32px;
      padding: 0 24px;
      border-radius: 36px;
      font-family: 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      font-weight: 400;
      line-height: normal;

      &.cancel-button {
        color: var(--text-normal-color);
        border-color: var(--border-color);
        background: var(--bg-app);

        &:hover,
        &:focus {
          color: var(--main-color, #007e54);
          border-color: var(--main-color, #007e54);
          background: var(--bg-app);
        }

        &:active {
          color: var(--main-color, #007e54);
          border-color: var(--main-color, #007e54);
          background: var(--bg-app);
        }
      }

      &.send-button {
        color: var(--text-white-color);
        border-color: var(--main-color, #007e54);
        background: var(--main-color, #007e54);

        &:hover,
        &:focus {
          opacity: 0.9;
          border-color: var(--main-color, #007e54);
          background: var(--main-color, #007e54);
        }

        &:active {
          opacity: 0.8;
          border-color: var(--main-color, #007e54);
          background: var(--main-color, #007e54);
        }

        &.is-disabled,
        &:disabled {
          cursor: not-allowed;
          opacity: 0.5;
          color: var(--text-white-color);
          border-color: var(--main-color, #007e54);
          background: var(--main-color, #007e54);

          &:hover,
          &:focus {
            opacity: 0.5;
            border-color: var(--main-color, #007e54);
            background: var(--main-color, #007e54);
          }
        }
      }
    }
  }
}

.user-message {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;

  .message-content {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 4px;
    background: var(--bg-muted);

    @include flex-gap(12px, row);

    .message-text {
      width: 100%;
      word-break: break-all;
      color: var(--text-normal-color);
      font-family: 'Source Han Sans CN', sans-serif;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.6em;

      div:not(:last-child) {
        margin-bottom: 0.2em;
      }
    }
  }
}

.message-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;

  @include flex-gap(16px, row);

  .action-icon {
    width: 16px;
    height: 16px;
    cursor: pointer;
    transition: opacity 0.2s;
    line-height: 16px;

    i {
      color: var(--text-dblight-color);
      font-size: 16px;
    }

    &.edit {
      transform: translateY(1px);

      .icon-bianji {
        font-size: 17px;
      }
    }

    &:hover {
      opacity: 0.7;
    }

    .copy-icon {
      position: relative;
      width: 20px;
      height: 20px;
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
}

@include mobile {
  .edit-mode-container {
    width: 100%;
  }

  .message-actions {
    .action-icon {
      @include touch-target;
    }

    .pagination-controls {
      .pagination-arrow {
        @include touch-target;
      }
    }
  }
}
</style>
