<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-22
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/components/agent-message/user.vue
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
          readonly
          :file="file"
        />
      </div>
    </div>

    <div class="user-message">
      <div v-if="message" class="message-content">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="message-text" v-html="message"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { chunk } from 'lodash-es'
import FileItem from '../sender/components/file-item.vue'
import { IGNORE_MESSAGE } from '@/config/app'

defineOptions({
  name: 'AgentUserMessage'
})

const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  agentId: {
    type: String,
    default: ''
  },
  fileList: {
    type: Array,
    default: () => []
  }
})

const fileListChunks = computed(() => {
  return chunk(props.fileList, 3)
})

const message = computed(() => {
  return (props.message || '').replaceAll(IGNORE_MESSAGE, '').replaceAll('\n', '<br>')
})
</script>

<style lang="scss" scoped>
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
    background: #f6f6f6;

    @include flex-gap(12px, row);

    .message-text {
      width: 100%;
      word-break: break-all;
      color: #000;
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
</style>
