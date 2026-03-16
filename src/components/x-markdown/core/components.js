/* eslint-disable vue/one-component-per-file */
import { render } from './hast-to-vnode'
import { defineComponent, shallowRef, toRefs, watch, computed } from 'vue'
import { useMarkdownProcessor } from './use-processor'
import { preprocessMathFormulas } from '../hooks/remark-math-extended'

const sharedProps = {
  markdown: {
    type: String,
    default: ''
  },
  customAttrs: {
    type: Object,
    default: () => ({})
  },
  remarkPlugins: {
    type: Array,
    default: () => []
  },
  rehypePlugins: {
    type: Array,
    default: () => []
  },
  rehypeOptions: {
    type: Object,
    default: () => ({})
  },
  sanitize: {
    type: Boolean,
    default: false
  },
  sanitizeOptions: {
    type: Object,
    default: () => ({})
  },
  enableLatex: {
    type: Boolean,
    default: true
  }
}

function createMarkdownSetup(isAsync = false) {
  return function setup(props, { slots, attrs }) {
    const {
      markdown,
      remarkPlugins,
      rehypePlugins,
      rehypeOptions,
      sanitize,
      sanitizeOptions,
      customAttrs,
      enableLatex
    } = toRefs(props)

    const { processor } = useMarkdownProcessor({
      remarkPlugins,
      rehypePlugins,
      rehypeOptions,
      sanitize,
      sanitizeOptions
    })

    // 预处理 markdown：在 parse 之前转换 LaTeX 公式格式
    // 必须在这里处理，因为 \( \) \[ \] 中的反斜杠会被 markdown 解析器当作转义字符消耗掉
    const preprocessedMarkdown = computed(() => {
      if (enableLatex.value) {
        return preprocessMathFormulas(markdown.value)
      }
      return markdown.value
    })

    if (isAsync) {
      const hast = shallowRef(null)

      const process = async () => {
        const mdast = processor.value.parse(preprocessedMarkdown.value)
        hast.value = await processor.value.run(mdast)
      }

      watch(() => [preprocessedMarkdown.value, processor.value], process, {
        flush: 'sync'
      })

      return () => {
        return hast.value ? render(hast.value, attrs, slots, customAttrs.value) : null
      }
    } else {
      const hast = computed(() => {
        const mdast = processor.value.parse(preprocessedMarkdown.value)
        return processor.value.runSync(mdast)
      })

      return () => {
        return render(hast.value, attrs, slots, customAttrs.value)
      }
    }
  }
}

const vueMarkdownImpl = defineComponent({
  name: 'VueMarkdown',
  props: sharedProps,
  setup: createMarkdownSetup(false)
})

const vueMarkdownAsyncImpl = defineComponent({
  name: 'VueMarkdownAsync',
  props: sharedProps,
  setup: createMarkdownSetup(true)
})

export const VueMarkdown = vueMarkdownImpl
export const VueMarkdownAsync = vueMarkdownAsyncImpl
