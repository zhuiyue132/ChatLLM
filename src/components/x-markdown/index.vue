<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-05
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-05
 * @FilePath     : /bi-agents/src/components/x-markdown/index.vue
 * @Description  : 
 * 
-->

<template>
  <div class="elx-xmarkdown-container">
    <MarkdownRenderer v-bind="props" :color-replacements="colorReplacementsComputed">
      <template v-for="(slot, name) in customComponents" :key="name" #[name]="slotProps">
        <component :is="slot" v-bind="slotProps" />
      </template>
      <template v-for="(_, name) in slots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </MarkdownRenderer>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import { MarkdownRenderer } from '../x-markdown-core'
import { useMarkdownContext } from '../x-markdown-core/components/markdown-provider'
import { MARKDOWN_CORE_PROPS } from '../x-markdown-core/shared/constants'

const props = defineProps(MARKDOWN_CORE_PROPS)

const slots = useSlots()
const customComponents = useMarkdownContext()
const colorReplacementsComputed = computed(() => {
  return props.colorReplacements
})
</script>
