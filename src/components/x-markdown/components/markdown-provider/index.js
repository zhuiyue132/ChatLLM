import deepmerge from 'deepmerge'
import { computed, defineComponent, h, inject, provide, toValue } from 'vue'
import { useDarkModeWatcher, usePlugins } from '../../hooks'
import { MARKDOWN_PROVIDER_KEY } from '@/config/symbol'
import { MARKDOWN_CORE_PROPS } from '../../shared/constants'
import Mermaid from '../mermaid/index.vue'
import '../../style/index.scss'

const MarkdownProvider = defineComponent({
  name: 'MarkdownProvider',
  props: MARKDOWN_CORE_PROPS,
  setup(props, { slots, attrs }) {
    const { rehypePlugins, remarkPlugins } = usePlugins(props)
    const { isDark } = useDarkModeWatcher()

    // 默认的 codeXRender，包含 mermaid 支持
    const defaultCodeXRender = {
      mermaid: Mermaid
    }

    const contextProps = computed(() => {
      // 合并默认的 codeXRender 和用户提供的 codeXRender
      const mergedCodeXRender = {
        ...defaultCodeXRender,
        ...(props.codeXRender || {})
      }

      return deepmerge(
        {
          rehypePlugins: toValue(rehypePlugins),
          remarkPlugins: toValue(remarkPlugins),
          isDark: toValue(isDark),
          codeXRender: mergedCodeXRender
        },
        props
      )
    })
    provide(MARKDOWN_PROVIDER_KEY, contextProps)
    return () =>
      h('div', { class: 'elx-xmarkdown-provider', ...attrs }, slots.default && slots.default())
  }
})

function useMarkdownContext() {
  const context = inject(
    MARKDOWN_PROVIDER_KEY,
    computed(() => ({}))
  )
  if (!context) {
    return computed(() => ({}))
  }
  return context
}
export { MarkdownProvider, useMarkdownContext }
