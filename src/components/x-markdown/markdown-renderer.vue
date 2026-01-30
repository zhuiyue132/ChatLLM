<!--
 * @Description  : markdown渲染器 - 简化版 XMarkdown 组件
 *
-->
<template>
  <XMarkdown :markdown="content" :need-view-code-btn="false" allow-html />
</template>
<script setup>
import XMarkdown from './index.vue'

defineProps({
  content: {
    type: String,
    default: '### 你好'
  }
})
</script>
