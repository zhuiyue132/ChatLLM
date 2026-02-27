<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-31
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-27
 * @FilePath     : /bi-agents/src/components/dialog/index.vue
 * @Description  : 弹窗组件
 * 
-->

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    :width="width"
    :fullscreen="fullscreen"
    :center="center"
    :modal="modal"
    :lock-scroll="lockScroll"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :show-close="showClose"
    :before-close="beforeClose"
    :append-to-body="appendToBody"
    :destroy-on-close="destroyOnClose"
    class="bi-dialog"
    :class="customClass"
    @open="handleOpen"
    @opened="handleOpened"
    @close="handleClose"
    @closed="handleClosed"
  >
    <!-- 头部插槽 -->
    <template #header="{ close }">
      <div class="bi-dialog__header">
        <div class="bi-dialog__title">
          <slot name="title">{{ title }}</slot>
        </div>
        <div class="bi-dialog__close" @click="close">
          <slot name="close-icon">
            <i class="iconfont icon-cancel"></i>
          </slot>
        </div>
      </div>
    </template>

    <!-- 内容区域 -->
    <div class="bi-dialog__body">
      <slot></slot>
    </div>

    <!-- 底部操作按钮 -->
    <template v-if="showFooter" #footer>
      <div class="bi-dialog__footer">
        <slot name="footer">
          <div class="bi-dialog__actions">
            <el-button
              v-if="showCancelButton"
              :loading="cancelLoading"
              class="bi-dialog__cancel-btn"
              @click="handleCancel"
            >
              {{ cancelButtonText }}
            </el-button>
            <el-button
              v-if="showConfirmButton"
              type="primary"
              :loading="confirmLoading"
              class="bi-dialog__confirm-btn"
              @click="handleConfirm"
            >
              {{ confirmButtonText }}
            </el-button>
          </div>
        </slot>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'

// 定义组件名称
defineOptions({
  name: 'BiDialog'
})

// 定义props
const props = defineProps({
  // 控制弹窗显示隐藏
  modelValue: {
    type: Boolean,
    default: false
  },
  // 弹窗标题
  title: {
    type: String,
    default: ''
  },
  // 弹窗宽度
  width: {
    type: [String, Number],
    default: '1200px'
  },
  // 是否全屏
  fullscreen: {
    type: Boolean,
    default: false
  },
  // 是否居中对齐
  center: {
    type: Boolean,
    default: false
  },
  // 是否显示遮罩层
  modal: {
    type: Boolean,
    default: true
  },
  // 是否锁定body滚动
  lockScroll: {
    type: Boolean,
    default: true
  },
  // 是否可以通过点击modal关闭
  closeOnClickModal: {
    type: Boolean,
    default: false
  },
  // 是否可以通过ESC关闭
  closeOnPressEscape: {
    type: Boolean,
    default: true
  },
  // 是否显示关闭按钮
  showClose: {
    type: Boolean,
    default: false
  },
  // 关闭前的回调
  beforeClose: {
    type: Function,
    default: null
  },
  // 是否插入到body
  appendToBody: {
    type: Boolean,
    default: false
  },
  // 关闭时销毁元素
  destroyOnClose: {
    type: Boolean,
    default: false
  },
  // 自定义类名
  customClass: {
    type: String,
    default: ''
  },
  // 是否显示底部
  showFooter: {
    type: Boolean,
    default: true
  },
  // 是否显示取消按钮
  showCancelButton: {
    type: Boolean,
    default: true
  },
  // 是否显示确认按钮
  showConfirmButton: {
    type: Boolean,
    default: true
  },
  // 取消按钮文字
  cancelButtonText: {
    type: String,
    default: '取消'
  },
  // 确认按钮文字
  confirmButtonText: {
    type: String,
    default: '保存'
  },
  // 取消按钮loading状态
  cancelLoading: {
    type: Boolean,
    default: false
  },
  // 确认按钮loading状态
  confirmLoading: {
    type: Boolean,
    default: false
  }
})

// 定义emits
const emit = defineEmits([
  'update:modelValue',
  'open',
  'opened',
  'close',
  'closed',
  'cancel',
  'confirm'
])

// 计算弹窗显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => {
    emit('update:modelValue', value)
  }
})

// 事件处理函数
const handleOpen = () => {
  emit('open')
}

const handleOpened = () => {
  emit('opened')
}

const handleClose = () => {
  emit('close')
}

const handleClosed = () => {
  emit('closed')
}

const handleCancel = () => {
  emit('cancel')
  if (!props.cancelLoading) {
    dialogVisible.value = false
  }
}

const handleConfirm = () => {
  emit('confirm')

  setTimeout(() => {
    console.log('handleConfirm', props.confirmLoading)
    if (!props.confirmLoading) {
      dialogVisible.value = false
    }
  }, 200)
}
</script>

<style lang="scss" scoped>
:deep(.bi-dialog) {
  .el-dialog {
    overflow: hidden;
    border-radius: 4px;

    .el-dialog__header {
      margin: 0;
      padding: 0;
    }

    .el-dialog__body {
      overflow-y: auto;
      max-height: calc(80vh - 120px);
      padding: 0;
    }

    .el-dialog__footer {
      margin: 0;
      padding: 0;
    }
  }
}

.bi-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-app);

  .bi-dialog__title {
    color: var(--text-normal-color);
    font-family: 'Microsoft YaHei', sans-serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.32;
  }

  .bi-dialog__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    cursor: pointer;
    transition: opacity 0.2s;

    .iconfont {
      font-size: 24px;
    }

    &:hover {
      .iconfont {
        color: var(--main-color);
      }
    }
  }
}

.bi-dialog__body {
  // min-height: 200px;
  padding: 0;
  padding-bottom: 12px;
  background: var(--bg-app);
}

.bi-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 56px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-app);

  .bi-dialog__actions {
    display: flex;
    align-items: center;

    .bi-dialog__cancel-btn {
      height: 32px;
      padding: 8px 16px;
      color: var(--text-dblight-color);
      border: 1px solid var(--border-color);
      border-radius: 2px;
      background: var(--bg-app);
      font-size: 12px;
      font-weight: 400;

      &:hover {
        color: var(--text-light-color);
        border-color: var(--text-tblight-color);
      }
    }

    .bi-dialog__confirm-btn {
      height: 32px;
      padding: 8px 16px;
      color: var(--text-white-color);
      border: none;
      border-radius: 2px;
      background: var(--main-color);
      font-size: 12px;
      font-weight: 400;
    }
  }
}
</style>
