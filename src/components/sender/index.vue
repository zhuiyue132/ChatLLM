<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-17
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-08-27 18:13:25
 * @FilePath     : /ChatLLM/src/components/sender/index.vue
 * @Description  : 信息发送器
 * 
-->
<template>
  <div
    class="agents-sender-wrapper"
    :class="{
      'hidden-input': filesUploaded.length > 0 && hiddenInputWhenFiles
    }"
  >
    <FloatButton v-if="floatButtonEnable" :float-button-offset="floatButtonOffset" />

    <MentionSender
      v-bind="$attrs"
      ref="mentionSenderRef"
      v-model="inputValue"
      :input-style="{
        fontSize: '16px'
      }"
      :auto-size="{ minRows: minRows, maxRows: 6 }"
      submit-type="enter"
      :class="{ 'footer-unenable': !footerEnable }"
      :options="mentionOptions"
      :filter-option="showMentionModel ? undefined : () => true"
      @submit="handleSendClick"
      @cancel="handleCancel"
      @select="handleMentionSelect"
    >
      <!-- @模型 下拉列表项自定义渲染 -->
      <template v-if="showMentionModel" #trigger-label="{ item }">
        <div class="mention-model-item">
          <ModelIcon :name="item.value" :size="18" />
          <span>{{ item.label }}</span>
        </div>
      </template>

      <template v-if="filesUploaded.length > 0" #header>
        <!-- 已上传文件列表 -->
        <div
          class="upload-files-list"
          :class="{
            'is-only-image': filesUploaded.every(file => file.type === 'image')
          }"
        >
          <FileItem
            v-for="(file, index) in filesUploaded"
            :key="`${file.name}-${index}`"
            :file="file"
            :index="index"
            @remove="removeFile"
          />
        </div>
      </template>

      <template #action-list>
        <span></span>
      </template>

      <template #footer>
        <div class="action-list-self-wrap">
          <div class="action-list-self-wrap-left">
            <!-- 模型选择 -->
            <ModelSelector
              v-if="showModelSelect && modelList.length > 0"
              v-model="model"
              :model-list="modelList"
            />
            <!-- 没有模型时显示配置按钮 -->
            <el-button
              v-else-if="showModelSelect && modelList.length === 0"
              type="primary"
              size="small"
              @click="handleOpenSettings"
            >
              请先配置模型
            </el-button>
          </div>

          <div class="action-list-self-wrap-right">
            <template v-if="!loading">
              <div class="send-btn-group">
                <!-- 发送按钮 -->
                <div
                  v-title="sendButtonProps.customTitle"
                  class="custom-button"
                  :class="sendButtonProps.class"
                  @click="handleSendClick"
                >
                  <i class="icon-up1"></i>
                </div>
              </div>
            </template>

            <Loading v-else tyle="width: 40px; height: 40px" @click="handleStopClick" />
          </div>
        </div>
      </template>
    </MentionSender>
  </div>
</template>

<script setup>
import MentionSender from '../mention-sender/index.vue'
import { ref, computed, useSlots, nextTick } from 'vue'
import Loading from '../mention-sender/components/loading-button/index.vue'
import { showMessage } from '@/hooks'
import FloatButton from '../float-button/index.vue'
import ModelSelector from './components/model-select.vue'
import ModelIcon from '@/components/model-icon/index.vue'
import FileItem from './components/file-item.vue'
import { useVModel, useEventBus } from '@vueuse/core'
import { OPEN_SETTINGS_COMMAND } from '@/config/symbol'
import './common.scss'

defineOptions({
  name: 'AgentSender'
})

const props = defineProps({
  // 输入框绑定值
  modelValue: {
    type: String,
    default: ''
  },

  // 模型绑定值
  model: {
    type: String,
    default: ''
  },

  // 模型列表
  modelList: {
    type: Array,
    default: () => []
  },

  // 是否加载中
  loading: {
    type: Boolean,
    default: false
  },

  // 悬浮按钮是否显示
  floatButtonEnable: {
    type: Boolean,
    default: false
  },

  // 输入框的最小行数
  minRows: {
    type: Number,
    default: 1
  },

  // 是否显示模型选择
  showModelSelect: {
    type: Boolean,
    default: false
  },
  /**
   * 上传文件后，是否隐藏输入区域
   */
  hiddenInputWhenFiles: {
    type: Boolean,
    default: true
  },
  // 是否展示图片上传按钮
  showImageBtn: {
    type: Boolean,
    default: false
  },
  // 是否展示文件上传按钮
  showFileBtn: {
    type: Boolean,
    default: false
  },
  // 是否展示粘贴数据按钮
  showPasteBtn: {
    type: Boolean,
    default: false
  },

  // 是否展示榜单类型选择
  showRadioBtn: {
    type: Boolean,
    default: false
  },

  // 是否展示价格段切分
  showPriceBtn: {
    type: Boolean,
    default: false
  },

  /**
   * 允许空消息
   */
  allowEmptyMessage: {
    type: Boolean,
    default: false
  },

  // 价格区间模板ID
  priceRangeTemplateId: {
    type: String,
    default: ''
  },

  // 单选类型选择列表
  radioList: {
    type: Array,
    default: () => ['全部榜单', '直播', '商品卡', '短视频', '图文']
  },
  // 选中的单选按钮
  radioValue: {
    type: [String, Number],
    default: ''
  },
  // 是否展示选品设置
  showSelectionBtn: {
    type: Boolean,
    default: false
  },
  // 选品设置模板ID
  selectionTemplateId: {
    type: String,
    default: ''
  },

  // 是否深度思考
  deepThink: {
    type: Boolean,
    default: false
  },
  // 是否展示深度思考按钮
  showDeepThinkBtn: {
    type: Boolean,
    default: false
  },

  // 是否展示创建图片按钮
  showCreateImageBtn: {
    type: Boolean,
    default: false
  },
  // 是否启用创建图片
  createImage: {
    type: Boolean,
    default: false
  },
  // 是否展示创建图片数量
  showCreateImageCount: {
    type: Boolean,
    default: false
  },
  // 创建图片数量
  createImageCount: {
    type: Number,
    default: 1
  },

  // ========== 公共模板设置相关 ==========
  // 是否展示公共模板设置按钮
  showTemplateSettingBtn: {
    type: Boolean,
    default: false
  },
  // 公共模板ID
  customTemplateId: {
    type: String,
    default: ''
  },

  // 公共模板转换为API格式的函数
  templateSettingTransformToApi: {
    type: Function,
    default: null
  },
  // 公共模板从API格式转换的函数
  templateSettingTransformFromApi: {
    type: Function,
    default: null
  },
  // 公共模板验证函数
  templateSettingValidate: {
    type: Function,
    default: () => true
  },
  floatButtonOffset: {
    type: String,
    default: '-42px'
  },

  // 是否启用 @模型 功能
  showMentionModel: {
    type: Boolean,
    default: false
  }
})

const emits = defineEmits([
  'update:modelValue',
  'submit',
  'cancel',
  'recordingChange',
  'trigger',
  'stop',
  'update:model',
  'update:priceRangeTemplateId',
  'update:selectionTemplateId',
  'update:radioValue',
  'update:deepThink',
  'update:createImage',
  'update:createImageCount',
  'update:customTemplateId',
  'template-setting-confirmed'
])

// 创建图片值
const enableCreateImage = useVModel(props, 'createImage', emits)

const createImageCount = useVModel(props, 'createImageCount', emits)

// 模型值
const model = useVModel(props, 'model', emits)

// 输入框值
const inputValue = useVModel(props, 'modelValue', emits)

// 价格段模板id
const priceRangeTemplateId = useVModel(props, 'priceRangeTemplateId', emits)

// 选品设置模板id
const selectionTemplateId = useVModel(props, 'selectionTemplateId', emits)

// 单选按钮值
const radioValue = useVModel(props, 'radioValue', emits)

// 深度思考值
const deepThink = useVModel(props, 'deepThink', emits)

// 公共模板ID
const customTemplateId = useVModel(props, 'customTemplateId', emits)

// 几个按钮的loading状态控制
const loadingMap = ref({
  file: false,
  image: false,
  paste: false
})

const slots = useSlots()

// footer是否占位显示
const footerEnable = computed(() => {
  return (
    !!slots.footer ||
    props.showFileBtn ||
    props.showImageBtn ||
    props.showModelSelect ||
    props.showPasteBtn ||
    props.showRadioBtn ||
    props.showPriceBtn ||
    props.showSelectionBtn ||
    props.showTemplateSettingBtn
  )
})

// ========== @模型 功能相关 ==========
// 将 modelList 转换为 mention options 格式，过滤掉当前选中的模型
const mentionOptions = computed(() => {
  if (!props.showMentionModel) return []
  return props.modelList
    .filter(item => item.code !== model.value)
    .map(item => ({
      label: item.name,
      value: item.code
    }))
})

// 处理 mention 选择事件
const handleMentionSelect = (option, prefix) => {
  if (prefix === '@' && props.showMentionModel) {
    // 更新当前模型
    model.value = option.value
    // 清除输入框中的 @模型名 文本
    nextTick(() => {
      // 匹配 @模型名 后可能跟着的空格
      inputValue.value = inputValue.value.replace(/@\S+\s?/, '')
    })
  }
}

// 已上传文件
const filesUploaded = ref([])

// 图片和文件分别有多少
const countOfType = computed(() => {
  const image = filesUploaded.value.filter(file => file.belong === 'image').length

  return {
    image,
    file: filesUploaded.value.length - image
  }
})

const removeFile = index => {
  // 如果是图片，需要释放URL对象
  const file = filesUploaded.value[index]
  if (file && file.type === 'image' && file.url?.startsWith?.('blob:')) {
    URL.revokeObjectURL(file.url)
  }

  filesUploaded.value.splice(index, 1)
}

const handleUploadSuccess = uploads => {
  filesUploaded.value.push(...uploads)
}

const isNotEmpty = computed(() => {
  return (
    inputValue.value.trim().replace(/\s/g, '') !== '' ||
    (props.allowEmptyMessage && filesUploaded.value.length > 0)
  )
})

const sendButtonProps = computed(() => {
  if (loadingMap.value.image || loadingMap.value.file || loadingMap.value.paste) {
    return { class: 'disabled', customTitle: '文件上传中，请稍候' }
  }

  // 如果显示模型选择但没有模型
  if (props.showModelSelect && props.modelList.length === 0) {
    return { class: 'disabled', customTitle: '请先配置模型' }
  }

  if (!isNotEmpty.value) {
    if (props.allowEmptyMessage) {
      return { class: 'disabled', customTitle: '请上传文件' }
    }
    return { class: 'disabled', customTitle: '请输入你的问题' }
  }

  // 可以发送
  return { class: 'has-value', customTitle: '' }
})

// 事件处理函数
const handleCancel = () => {
  emits('cancel')
  emits('stop')
}

// 暴露 MentionSender 的实例方法
const mentionSenderRef = ref(null)

const handleSendClick = (extraData = {}) => {
  if (props.loading || sendButtonProps.value.class === 'disabled') {
    return
  }

  if (props.allowEmptyMessage) {
    // 文件上传中，不能发送消息
    if (loadingMap.value.file || loadingMap.value.image || loadingMap.value.paste) {
      return
    }

    // 允许空消息&没有文件上传，不能发送消息
    if (filesUploaded.value.length === 0 && !inputValue.value.trim()) {
      return
    }

    emits('submit', {
      fileList: [...filesUploaded.value],
      message: inputValue.value,
      priceRangeTemplateId: priceRangeTemplateId.value,
      selectionTemplateId: selectionTemplateId.value,
      customTemplateId: customTemplateId.value,
      radioValue: radioValue.value,
      ...extraData
    })

    filesUploaded.value = []
  } else {
    if (!inputValue.value.trim()) {
      showMessage('发送消息不可为空，请输入消息内容')
      return
    }
    emits('submit', {
      message: inputValue.value,
      priceRangeTemplateId: priceRangeTemplateId.value,
      selectionTemplateId: selectionTemplateId.value,
      customTemplateId: customTemplateId.value,
      radioValue: radioValue.value,
      fileList: [...filesUploaded.value],
      ...extraData
    })
  }
}

const handleStopClick = () => {
  emits('stop')
}

// 打开设置对话框
const eventBus = useEventBus(OPEN_SETTINGS_COMMAND)
const handleOpenSettings = () => {
  eventBus.emit()
}

// 定义要暴露的方法
defineExpose({
  clear: () => mentionSenderRef.value?.clear(),
  blur: () => mentionSenderRef.value?.blur(),
  focus: type => mentionSenderRef.value?.focus(type),
  submit: (initialData = {}) => {
    // 如果传入文件列表，设置到已上传文件
    if (initialData.fileList?.length > 0) {
      filesUploaded.value = initialData.fileList
      delete initialData.fileList
    }

    // 自动触发发送
    handleSendClick(initialData)
  },
  cancel: () => mentionSenderRef.value?.cancel(),
  filesUploaded
})
</script>
<style lang="scss">
.agents-sender-wrapper {
  .el-sender {
    &-content {
      gap: unset !important;

      .el-textarea {
        .el-textarea__inner {
          height: auto;
          padding: 0 24px 0 8px !important;
        }
      }
    }
  }

  .footer-unenable {
    padding-top: 0;
    padding-bottom: 0;

    .el-sender-content {
      padding-top: 20px !important;
      padding-bottom: 20px !important;

      .el-textarea {
        .el-textarea__inner {
          padding: 0 72px 0 8px !important;
        }
      }
    }

    .el-sender-footer {
      position: absolute;
      top: 0;
      right: 12px;
      height: 100%;

      .action-list-self-wrap {
        height: 100%;
        padding: 0;
      }
    }
  }
}

.el-mention__popper {
  .el-mention-dropdown {
    .el-mention-dropdown__item {
      padding: 0 12px;
    }

    .mention-model-item {
      display: flex;
      align-items: center;

      @include flex-gap(6px, row);
    }
  }
}
</style>
<style lang="scss" scoped>
.agents-sender-wrapper {
  position: relative;
  width: 100%;
  max-width: 1080px;
  height: 100%;
  margin: 0 auto;

  .action-list-self-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 58px;
    padding: 0 12px 0 16px;

    &-left {
      display: flex;
      align-items: center;

      @include flex-gap(8px);

      .el-button + .el-button {
        margin-left: 0;
      }
    }

    &-right {
      .send-btn-group {
        display: flex;
        align-items: center;

        @include flex-gap(12px, row);

        .point-rule {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c7cdc6;

          i {
            font-size: 14px;
          }

          @include flex-gap(4px, row);

          &-text {
            font-size: 12px;
            font-weight: 400;
            font-style: normal;
            line-height: normal;
            line-height: 18px;
          }
        }
      }

      .custom-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        cursor: pointer;
        border-radius: 100%;
        background: #e0f2e7;

        &.disabled {
          cursor: not-allowed;
          background: #e0f2e7;
        }

        &:not(.disabled):active {
          background: #00a377 !important;
        }

        i {
          color: #fff;
          font-size: 20px;
        }

        &.has-value {
          background: var(--main-color);
        }

        &:not(.disabled):hover {
          background: var(--main-color);
        }
      }
    }
  }

  :deep(.el-sender-wrap) {
    .el-sender-footer {
      border-top: none;
    }

    .el-sender {
      &:focus-within {
        border-color: var(--main-color) !important;
        // box-shadow: none !important;

        &::after {
          border-width: 1.5px !important;
        }
      }

      --el-border-radius-base: 12px;

      overflow: hidden;
      border-color: rgb(212 219 233 / 100%);
      box-shadow: 0 5px 12px 0 rgb(0 163 119 / 7%) !important;
    }

    .el-sender-header {
      padding: 16px 24px 0;
      border: none;
    }

    .el-sender-content {
      padding-top: 16px;
      padding-right: 0;
      padding-bottom: 8px;
    }

    .el-mention {
      width: 100%;
    }

    .upload-files-list {
      position: relative;
      display: flex;
      overflow-y: auto;
      flex-wrap: wrap;
      margin-bottom: 12px;
      padding-top: 32px;

      @include flex-gap(12px, both);

      &.is-video,
      &.is-only-image {
        padding-top: 4px;
      }

      &:not(.is-video, .is-only-image)::before {
        content: '仅识别文件中的文字';
        position: absolute;
        top: 6px;
        left: 6px;
        color: #9898a9;
        font-family: 'Source Han Sans CN', sans-serif;
        font-size: 16px;
        font-weight: 400;
        font-style: normal;
        line-height: normal;
      }
    }
  }

  &.hidden-input {
    :deep(.el-sender-content) {
      display: none;
    }
  }

  @include mobile {
    max-width: 100%;

    .action-list-self-wrap {
      height: 48px;
      padding: 0 8px 0 12px;
    }

    :deep(.el-sender-wrap) {
      .el-sender-content {
        padding-top: 12px;
        padding-bottom: 4px;
      }

      .el-sender-header {
        padding: 12px 16px 0;
      }
    }

    :deep(.el-textarea .el-textarea__inner) {
      font-size: 16px !important; // 防止 iOS 自动缩放
    }
  }
}
</style>
