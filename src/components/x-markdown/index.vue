<!--
 * @Description  : XMarkdown 组件
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
import { MarkdownRenderer } from './render'
import { useMarkdownContext } from './components/markdown-provider'
import { MARKDOWN_CORE_PROPS } from './shared/constants'

const props = defineProps(MARKDOWN_CORE_PROPS)

const slots = useSlots()
const customComponents = useMarkdownContext()
const colorReplacementsComputed = computed(() => {
  return props.colorReplacements
})
</script>
