/* eslint-disable vue/one-component-per-file */
import { defineComponent, h } from 'vue'
import { MarkdownProvider, useMarkdownContext } from '../components/markdown-provider'
import { VueMarkdown, VueMarkdownAsync } from '../core'
import { useComponents } from '../hooks'
import { MARKDOWN_CORE_PROPS } from '../shared/constants'

function createInnerRenderer(MarkdownComponent) {
  return defineComponent({
    name: `Inner${MarkdownComponent.name}`,
    setup(_, { slots }) {
      const context = useMarkdownContext()
      const components = useComponents()
      return () =>
        h(MarkdownComponent, context.value, {
          ...components,
          ...slots
        })
    }
  })
}

function createRenderer(MarkdownComponent, InnerRenderer) {
  return defineComponent({
    name: `MarkdownRenderer${MarkdownComponent.name.endsWith('Async') ? 'Async' : ''}`,
    props: MARKDOWN_CORE_PROPS,
    setup(props, { slots }) {
      return () =>
        h(MarkdownProvider, props, {
          default: () => h(InnerRenderer, {}, slots)
        })
    }
  })
}

const InnerRenderer = createInnerRenderer(VueMarkdown)
const InnerRendererAsync = createInnerRenderer(VueMarkdownAsync)

const MarkdownRenderer = createRenderer(VueMarkdown, InnerRenderer)
const MarkdownRendererAsync = createRenderer(VueMarkdownAsync, InnerRendererAsync)

export { MarkdownRenderer, MarkdownRendererAsync }
