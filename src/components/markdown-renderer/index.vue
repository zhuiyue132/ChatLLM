<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-17
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-09-04 15:54:26
 * @FilePath     : /ChatLLM/src/components/markdown-renderer/index.vue
 * @Description  : markdown渲染器
 * 
-->
<template>
  <XMarkdown :markdown="content" :need-view-code-btn="false" allow-html />
</template>
<script setup>
import XMarkdown from '../x-markdown/index.vue'

defineProps({
  content: {
    type: String,
    default: '### 你好'
  },
  agentId: {
    type: [Number, String],
    default: null
  },
  agentCode: {
    type: String,
    default: ''
  }
})
</script>
