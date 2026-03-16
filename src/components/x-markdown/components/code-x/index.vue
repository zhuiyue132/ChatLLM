<!--
 * @Description  : CodeX 组件
 *
-->
<script>
import { defineComponent, h, toValue } from 'vue'
import hljs from 'highlight.js'
import { useCodePreview } from '@/hooks/use-code-preview'
import { useMarkdownContext } from '../markdown-provider'
import Mermaid from '../mermaid/index.vue'

const HTML_LANGUAGES = new Set(['html', 'htm', 'xml', 'svg'])
const CSS_LANGUAGES = new Set(['css'])
const JS_LANGUAGES = new Set(['javascript', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx'])

const PREVIEWABLE_LANGUAGES = new Set([...HTML_LANGUAGES, ...CSS_LANGUAGES, ...JS_LANGUAGES])
const SCRIPT_CLOSE_TAG = '</scr' + 'ipt>'

const normalizeLanguage = language => {
  return `${language || ''}`.trim().toLowerCase()
}

const isHtmlLanguage = language => HTML_LANGUAGES.has(language)
const isCssLanguage = language => CSS_LANGUAGES.has(language)
const isJsLanguage = language => JS_LANGUAGES.has(language)

const concatCodeSections = sections => {
  return sections.filter(Boolean).join('\n\n')
}

const ensureDoctype = source => {
  if (/<!doctype\s+html>/i.test(source)) {
    return source
  }
  return `<!doctype html>\n${source}`
}

const isCompleteHtmlDocument = source => {
  return (
    /<html[\s>]/i.test(source) || /<body[\s>]/i.test(source) || /<!doctype\s+html>/i.test(source)
  )
}

const buildStyleTag = cssCode => {
  if (!cssCode) {
    return ''
  }
  return `<style>\n${cssCode}\n</style>`
}

const sanitizeScriptCode = jsCode => {
  return jsCode.replace(/<\/(script)/gi, '<\\/$1')
}

const buildScriptTag = jsCode => {
  if (!jsCode) {
    return ''
  }
  return `<script>\n${sanitizeScriptCode(jsCode)}\n${SCRIPT_CLOSE_TAG}`
}

const injectAssetsIntoDocument = (htmlCode, cssCode, jsCode) => {
  let source = htmlCode
  const styleTag = buildStyleTag(cssCode)
  const scriptTag = buildScriptTag(jsCode)

  if (styleTag) {
    if (/<\/head>/i.test(source)) {
      source = source.replace(/<\/head>/i, `${styleTag}\n</head>`)
    } else if (/<body[^>]*>/i.test(source)) {
      source = source.replace(/<body[^>]*>/i, match => `${match}\n${styleTag}\n`)
    } else {
      source = `${styleTag}\n${source}`
    }
  }

  if (scriptTag) {
    if (/<\/body>/i.test(source)) {
      source = source.replace(/<\/body>/i, `${scriptTag}\n</body>`)
    } else {
      source = `${source}\n${scriptTag}`
    }
  }

  return ensureDoctype(source)
}

const wrapAsHtmlDocument = (htmlCode, cssCode, jsCode) => {
  const styleTag = buildStyleTag(cssCode)
  const scriptTag = buildScriptTag(jsCode)

  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${styleTag}
</head>
<body>
${htmlCode || '<div id="app"></div>'}
${scriptTag}
</body>
</html>`
}

const readCodeContent = preNode => {
  const codeNode = preNode?.querySelector?.('code')
  return codeNode?.textContent || ''
}

const collectPreviewBlocks = containerElement => {
  const root = containerElement || null
  if (!root?.querySelectorAll) {
    return []
  }

  return Array.from(root.querySelectorAll('pre[data-previewable="1"]'))
    .map(preNode => ({
      language: normalizeLanguage(preNode.dataset.previewLanguage),
      content: readCodeContent(preNode)
    }))
    .filter(item => item.language && item.content.trim())
}

const selectHtmlCode = (htmlBlocks, clickedLanguage, clickedContent) => {
  if (isHtmlLanguage(clickedLanguage) && isCompleteHtmlDocument(clickedContent)) {
    return clickedContent
  }

  const fullDocument = htmlBlocks.find(item => isCompleteHtmlDocument(item))
  if (fullDocument) {
    return fullDocument
  }

  if (isHtmlLanguage(clickedLanguage) && clickedContent.trim()) {
    return clickedContent
  }

  return concatCodeSections(htmlBlocks)
}

const buildPreviewDocument = ({ clickedLanguage, clickedContent, containerElement }) => {
  const collectedBlocks = collectPreviewBlocks(containerElement)
  const sourceBlocks =
    collectedBlocks.length > 0
      ? collectedBlocks
      : [{ language: normalizeLanguage(clickedLanguage), content: clickedContent || '' }]

  const htmlBlocks = []
  const cssBlocks = []
  const jsBlocks = []

  sourceBlocks.forEach(item => {
    if (isHtmlLanguage(item.language)) {
      htmlBlocks.push(item.content)
      return
    }

    if (isCssLanguage(item.language)) {
      cssBlocks.push(item.content)
      return
    }

    if (isJsLanguage(item.language)) {
      jsBlocks.push(item.content)
    }
  })

  if (isCssLanguage(clickedLanguage) && cssBlocks.length === 0 && clickedContent.trim()) {
    cssBlocks.push(clickedContent)
  }

  if (isJsLanguage(clickedLanguage) && jsBlocks.length === 0 && clickedContent.trim()) {
    jsBlocks.push(clickedContent)
  }

  const htmlCode = selectHtmlCode(htmlBlocks, clickedLanguage, clickedContent)
  const cssCode = concatCodeSections(cssBlocks)
  const jsCode = concatCodeSections(jsBlocks)

  if (!htmlCode && !cssCode && !jsCode) {
    return ''
  }

  if (isCompleteHtmlDocument(htmlCode)) {
    return injectAssetsIntoDocument(htmlCode, cssCode, jsCode)
  }

  return wrapAsHtmlDocument(htmlCode || '<div id="app"></div>', cssCode, jsCode)
}

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
    const { openPreview } = useCodePreview()
    const MAX_HIGHLIGHT_LENGTH = 12000
    const MAX_AUTO_HIGHLIGHT_LENGTH = 2000

    const getHighlightHtml = (content, language) => {
      const safeContent = typeof content === 'string' ? content : ''
      if (!safeContent) {
        return null
      }
      if (safeContent.length > MAX_HIGHLIGHT_LENGTH) {
        return null
      }
      try {
        if (language && hljs.getLanguage(language)) {
          return hljs.highlight(safeContent, { language, ignoreIllegals: true }).value
        }
        if (safeContent.length > MAX_AUTO_HIGHLIGHT_LENGTH) {
          return null
        }
        return hljs.highlightAuto(safeContent).value
      } catch {
        return null
      }
    }

    const handlePreviewClick = event => {
      const clickedLanguage = normalizeLanguage(props.raw.language)
      const markdownBody = event?.currentTarget?.closest('.markdown-body')
      const clickedContentAtOpen = props.raw.content || ''

      if (!markdownBody) {
        return
      }

      const messageWrapper = markdownBody.closest('[id^="message-"]')
      const messageWrapperId = messageWrapper?.id || ''
      const markdownBodies = messageWrapper
        ? Array.from(messageWrapper.querySelectorAll('.markdown-body'))
        : []
      const markdownBodyIndex = markdownBodies.indexOf(markdownBody)

      const codeBlockContainer = event?.currentTarget?.closest('.elx-code-block-container')
      const clickedPreNode =
        codeBlockContainer?.querySelector?.('pre[data-previewable="1"]') || null
      const previewableBlocks = Array.from(
        markdownBody.querySelectorAll('pre[data-previewable="1"]')
      )
      const clickedBlockIndex = previewableBlocks.indexOf(clickedPreNode)

      const resolveSource = () => {
        let latestContainer = markdownBody

        if (messageWrapperId && typeof document !== 'undefined') {
          const latestMessageWrapper = document.getElementById(messageWrapperId)
          if (latestMessageWrapper) {
            const latestMarkdownBodies = Array.from(
              latestMessageWrapper.querySelectorAll('.markdown-body')
            )
            latestContainer =
              latestMarkdownBodies[markdownBodyIndex] || latestMarkdownBodies[0] || latestContainer
          }
        }

        let clickedContent = clickedContentAtOpen
        if (latestContainer && clickedBlockIndex >= 0) {
          const latestBlocks = Array.from(
            latestContainer.querySelectorAll('pre[data-previewable="1"]')
          )
          const latestClickedBlock = latestBlocks[clickedBlockIndex]
          if (latestClickedBlock) {
            clickedContent = readCodeContent(latestClickedBlock)
          }
        }

        return buildPreviewDocument({
          clickedLanguage,
          clickedContent,
          containerElement: latestContainer
        })
      }

      const source = resolveSource()

      if (!source) {
        return
      }

      openPreview({
        source,
        language: clickedLanguage,
        title: `代码预览 · ${clickedLanguage || 'code'}`,
        resolveSource
      })
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

      const language = normalizeLanguage(props.raw.language)

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

      const highlighted = getHighlightHtml(props.raw.content, language)
      const isPreviewable = PREVIEWABLE_LANGUAGES.has(language)

      return h('div', { class: 'elx-code-block-container' }, [
        h('div', { class: 'elx-code-block-header' }, [
          h('span', { class: 'elx-code-language' }, language || 'text'),
          isPreviewable
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'elx-code-preview-btn',
                  onClick: handlePreviewClick
                },
                '预览'
              )
            : null
        ]),
        h(
          'pre',
          {
            class: 'elx-code-block',
            'data-previewable': isPreviewable ? '1' : '0',
            'data-preview-language': language || ''
          },
          [
            h(
              'code',
              {
                class: ['hljs', language ? `language-${language}` : ''],
                ...(highlighted ? { innerHTML: highlighted } : {})
              },
              highlighted ? null : props.raw.content
            )
          ]
        )
      ])
    }
  }
})
</script>

<style lang="scss" scoped>
.elx-code-block-container {
  overflow: hidden;
  margin: 12px 0;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--code-bg);
}

.elx-code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color-light);
  background: var(--bg-subtle);
}

.elx-code-language {
  text-transform: lowercase;
  color: var(--text-dblight-color);
  font-size: 12px;
  line-height: 1;
}

.elx-code-preview-btn {
  height: 24px;
  padding: 0 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--main-color);
  border: 1px solid var(--main-color-light-7);
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  line-height: 22px;

  &:hover {
    color: var(--main-color-dark-2);
    border-color: var(--main-color-light-5);
    background: var(--bg-highlight);
  }

  &:focus-visible {
    outline: 2px solid var(--main-color-light-5);
    outline-offset: 1px;
  }
}

.elx-code-block {
  overflow: auto;
  margin: 0;
  padding: 16px;
  border: 0;
  border-radius: 0;
  background: transparent;

  code {
    display: inline;
    padding: 0;
    background: transparent;
    line-height: 1.5;
  }

  code.hljs {
    display: inline;
    padding: 0;
    background: transparent;
  }
}
</style>
