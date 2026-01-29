import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { computed, toRefs } from 'vue'
import remarkMathExtended from './remark-math-extended'

function usePlugins(props) {
  const {
    allowHtml,
    enableLatex,
    enableBreaks,
    rehypePlugins,
    remarkPlugins,
    rehypePluginsAhead,
    remarkPluginsAhead
  } = toRefs(props)

  const rehype = computed(() => {
    return [
      ...rehypePluginsAhead.value,
      allowHtml.value && rehypeRaw,
      enableLatex.value && rehypeKatex,
      ...rehypePlugins.value
    ].filter(Boolean)
  })

  const remark = computed(() => {
    // 数学公式相关插件
    // remarkMathExtended 必须在 remarkMath 之前运行，将扩展格式转换为标准格式
    const mathPlugins = enableLatex.value ? [remarkMathExtended, remarkMath] : []

    const base = [...mathPlugins, enableBreaks.value && remarkBreaks].filter(Boolean)

    return [
      [remarkGfm, { singleTilde: false }],
      ...remarkPluginsAhead.value,
      ...base,
      ...remarkPlugins.value
    ]
  })

  return {
    rehypePlugins: rehype,
    remarkPlugins: remark
  }
}
export { usePlugins }
