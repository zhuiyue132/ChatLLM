<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-11-10
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-10
 * @FilePath     : /bi-agents/src/components/x-markdown-core/components/mermaid/index.vue
 * @Description  : 
 * 
-->
<script setup>
import { computed, ref, watch } from 'vue'
import { useMermaid } from '../../hooks'
import { getRandomCode } from '@/utils'

const props = defineProps({
  raw: {
    type: Object,
    default: () => ({})
  }
})

const mermaidContent = computed(() => props.raw?.content || '')
const mermaidResult = useMermaid(mermaidContent, {
  id: `mermaid-${getRandomCode()}`
})

const svg = ref('')

// 获取插槽上下文

const containerRef = ref(null)

watch(
  () => mermaidResult.data.value,
  newSvg => {
    if (newSvg) {
      svg.value = newSvg
    }
  }
)
</script>

<template>
  <div ref="containerRef" :key="props.raw.key" class="markdown-mermaid">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div class="mermaid-content" :mermaid-content="mermaidContent" v-html="svg" />
  </div>
</template>

<style src="./style.scss"></style>
