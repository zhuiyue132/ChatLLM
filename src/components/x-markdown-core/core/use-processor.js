/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-05
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-11
 * @FilePath     : /bi-agents/src/components/x-markdown-core/core/use-processor.js
 * @Description  :
 *
 */

import deepmerge from 'deepmerge'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { computed, toValue } from 'vue'
import { visit } from 'unist-util-visit'

function rehypeExternalLinks() {
  return tree => {
    visit(tree, 'element', node => {
      if (node.tagName === 'a' && node.properties && node.properties.href) {
        node.properties.target = '_blank'
        node.properties.rel = 'noopener noreferrer'
      }
    })
  }
}

export function useMarkdownProcessor(options) {
  const processor = computed(() => {
    return createProcessor({
      prePlugins: [remarkParse, ...(toValue(options?.remarkPlugins) ?? [])],
      rehypePlugins: toValue(options?.rehypePlugins),
      rehypeOptions: toValue(options?.rehypeOptions),
      sanitize: toValue(options?.sanitize),
      sanitizeOptions: toValue(options?.sanitizeOptions)
    })
  })
  return { processor }
}

export function createProcessor(options) {
  return unified()
    .use(options?.prePlugins ?? [])
    .use(remarkRehype, {
      allowDangerousHtml: true,
      ...(options?.rehypeOptions || {})
    })
    .use(options?.rehypePlugins ?? [])
    .use(rehypeExternalLinks)
    .use(
      options?.sanitize
        ? [
            [
              rehypeSanitize,
              deepmerge(
                {
                  ...defaultSchema,
                  attributes: {
                    ...defaultSchema.attributes,
                    a: [...(defaultSchema.attributes.a || []), 'target', 'rel']
                  }
                },
                options?.sanitizeOptions?.sanitizeOptions || {},
                options?.sanitizeOptions?.mergeOptions || {}
              )
            ]
          ]
        : []
    )
}
