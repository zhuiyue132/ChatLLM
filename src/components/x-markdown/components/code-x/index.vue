<!--
 * @Description  : CodeX 组件
 *
-->
<script>
import { defineComponent, h, toValue } from 'vue'
import { useMarkdownContext } from '../markdown-provider'
import Mermaid from '../mermaid/index.vue'

export default defineComponent({
  props: {
    raw: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const context = useMarkdownContext()
    const { codeXRender } = toValue(context)
    return () => {
      if (props.raw.inline) {
        if (codeXRender && codeXRender.inline) {
          const renderer = codeXRender.inline
          if (typeof renderer === 'function') {
            return renderer(props)
          }
          return h(renderer, props)
        }
        // 默认渲染行内代码
        return h('code', { class: 'elx-inline-code' }, props.raw.content)
      }
      const { language } = props.raw
      if (codeXRender && codeXRender[language]) {
        const renderer = codeXRender[language]
        if (typeof renderer === 'function') {
          return renderer(props)
        }
        return h(renderer, props)
      }
      if (language === 'mermaid') {
        return h(Mermaid, { raw: props.raw })
      }

      // 默认渲染代码块
      return h('pre', { class: 'elx-code-block' }, [
        h('code', { class: language ? `language-${language}` : '' }, props.raw.content)
      ])
    }
  }
})
</script>
