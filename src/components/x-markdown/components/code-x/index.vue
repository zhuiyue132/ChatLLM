<!--
 * @Description  : CodeX 组件
 *
-->
<script>
import { defineComponent, h, toValue } from 'vue'
import hljs from 'highlight.js'
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
    const getHighlightHtml = (content, language) => {
      if (!content) {
        return null
      }
      try {
        if (language && hljs.getLanguage(language)) {
          return hljs.highlight(content, { language, ignoreIllegals: true }).value
        }
        return hljs.highlightAuto(content).value
      } catch {
        return null
      }
    }

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
      const highlighted = getHighlightHtml(props.raw.content, language)
      return h('pre', { class: 'elx-code-block' }, [
        h(
          'code',
          {
            class: ['hljs', language ? `language-${language}` : ''],
            ...(highlighted ? { innerHTML: highlighted } : {})
          },
          highlighted ? null : props.raw.content
        )
      ])
    }
  }
})
</script>
