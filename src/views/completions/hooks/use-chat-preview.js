/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-chat-preview.js
 * @Description  : Completions 聊天页代码预览面板逻辑
 */

import { ref, computed, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useCodePreview } from '@/hooks/use-code-preview'
import { useSidebar } from '@/hooks/use-sidebar'
import { useThemeStore } from '@/stores/theme'

const PREVIEW_HEIGHT_EVENT_KEY = '__CHATLLM_PREVIEW_HEIGHT__'
const PREVIEW_MIN_IFRAME_HEIGHT = 420
const PREVIEW_MAX_IFRAME_HEIGHT = 8000
const SCRIPT_CLOSE_TAG = '</scr' + 'ipt>'

export const useChatPreview = () => {
  const themeStore = useThemeStore()
  const { closeSidebar } = useSidebar()
  const {
    previewVisible,
    previewState,
    previewVersion,
    closePreview,
    refreshPreview,
    resetPreview
  } = useCodePreview()

  const codePreviewPanelRef = ref(null)
  const previewIframeRef = ref(null)
  const previewFrameHeight = ref(0)
  const isPreviewFullscreen = ref(false)

  const resolveThemeBridge = () => {
    const rootStyle = window.getComputedStyle(document.documentElement)
    const fallbackBg = themeStore.isDark ? '#0f1115' : '#ffffff'
    const fallbackText = themeStore.isDark ? '#f5f7fa' : '#000000'
    const fallbackLink = themeStore.isDark ? '#4ea1ff' : '#0969da'

    return {
      background: rootStyle.getPropertyValue('--bg-app').trim() || fallbackBg,
      text: rootStyle.getPropertyValue('--text-normal-color').trim() || fallbackText,
      link: fallbackLink,
      colorScheme: themeStore.isDark ? 'dark' : 'light'
    }
  }

  const ensurePreviewHtmlStructure = source => {
    let content = source

    if (!/<html[\s>]/i.test(content)) {
      if (/<head[\s>]/i.test(content) || /<body[\s>]/i.test(content)) {
        content = `<html>${content}</html>`
      } else {
        content = `<html><head></head><body>${content}</body></html>`
      }
    }

    if (!/<head[\s>]/i.test(content)) {
      content = content.replace(/<html[^>]*>/i, match => `${match}<head></head>`)
    }

    if (!/<body[\s>]/i.test(content)) {
      if (/<\/head>/i.test(content)) {
        content = content.replace(/<\/head>/i, '</head><body></body>')
      } else {
        content = content.replace(/<html[^>]*>/i, match => `${match}<body></body>`)
      }
    }

    if (!/<\/html>/i.test(content)) {
      content = `${content}</html>`
    }

    if (!/<!doctype\s+html>/i.test(content)) {
      content = `<!doctype html>\n${content}`
    }

    return content
  }

  const buildPreviewBridgeScript = () => {
    return `<script>
(function () {
  const EVENT_KEY = '${PREVIEW_HEIGHT_EVENT_KEY}'
  const postHeight = () => {
    const doc = document.documentElement
    const body = document.body
    const nextHeight = Math.max(
      doc ? doc.scrollHeight : 0,
      doc ? doc.offsetHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    )
    window.parent.postMessage({ event: EVENT_KEY, height: nextHeight }, '*')
  }

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(postHeight)
    if (document.documentElement) {
      observer.observe(document.documentElement)
    }
  }

  window.addEventListener('load', postHeight)
  window.addEventListener('resize', postHeight)
  setTimeout(postHeight, 0)
  setTimeout(postHeight, 120)
  setTimeout(postHeight, 300)
})()
${SCRIPT_CLOSE_TAG}`
  }

  const buildPreviewSrcDoc = rawSource => {
    const source = `${rawSource || ''}`.trim()
    if (!source) {
      return ''
    }

    const theme = resolveThemeBridge()
    const themeStyle = `<style id="chatllm-preview-theme">
:root {
  color-scheme: ${theme.colorScheme};
}

html,
body {
  margin: 0;
  padding: 0;
  background: ${theme.background};
  color: ${theme.text};
}

a {
  color: ${theme.link};
}
</style>`

    const bridgeScript = buildPreviewBridgeScript()
    let withStructure = ensurePreviewHtmlStructure(source)

    withStructure = withStructure.replace(/<head[^>]*>/i, match => `${match}\n${themeStyle}\n`)

    if (/<\/body>/i.test(withStructure)) {
      withStructure = withStructure.replace(/<\/body>/i, `${bridgeScript}\n</body>`)
    } else {
      withStructure = `${withStructure}\n${bridgeScript}`
    }

    return withStructure
  }

  const previewSrcDoc = computed(() => {
    if (!previewVisible.value) {
      return ''
    }
    return buildPreviewSrcDoc(previewState.value.source)
  })

  const iframeRenderKey = computed(() => {
    const themeKey = themeStore.isDark ? 'dark' : 'light'
    return `${previewVersion.value}-${previewState.value.openedAt}-${themeKey}`
  })

  const previewIframeStyle = computed(() => {
    if (!previewFrameHeight.value) {
      return {}
    }

    return {
      height: `${previewFrameHeight.value}px`
    }
  })

  const teardownPreviewFullscreen = async () => {
    if (document.fullscreenElement === codePreviewPanelRef.value) {
      try {
        await document.exitFullscreen()
      } catch (error) {
        console.warn('[Completions] 退出代码预览全屏失败', error)
      }
    }
  }

  const handleClosePreview = () => {
    closePreview()
  }

  const handleRefreshPreview = () => {
    refreshPreview()
  }

  const handleTogglePreviewFullscreen = async () => {
    const panelElement = codePreviewPanelRef.value
    if (!panelElement) {
      return
    }

    try {
      if (document.fullscreenElement === panelElement) {
        await document.exitFullscreen()
      } else {
        await panelElement.requestFullscreen()
      }
    } catch (error) {
      console.warn('[Completions] 切换代码预览全屏失败', error)
    }
  }

  const handlePreviewMessage = event => {
    if (event.source !== previewIframeRef.value?.contentWindow) {
      return
    }

    const payload = event.data
    if (!payload || payload.event !== PREVIEW_HEIGHT_EVENT_KEY) {
      return
    }

    const nextHeight = Number(payload.height)
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
      return
    }

    previewFrameHeight.value = Math.min(
      PREVIEW_MAX_IFRAME_HEIGHT,
      Math.max(PREVIEW_MIN_IFRAME_HEIGHT, Math.ceil(nextHeight))
    )
  }

  watch(previewVisible, async visible => {
    if (visible) {
      closeSidebar()
      return
    }

    previewFrameHeight.value = 0
    await teardownPreviewFullscreen()
  })

  watch(previewVersion, () => {
    previewFrameHeight.value = 0
  })

  useEventListener(window, 'message', handlePreviewMessage)

  useEventListener(document, 'fullscreenchange', () => {
    isPreviewFullscreen.value = document.fullscreenElement === codePreviewPanelRef.value
  })

  return {
    previewVisible,
    previewState,
    iframeRenderKey,
    previewSrcDoc,
    previewIframeStyle,
    isPreviewFullscreen,
    codePreviewPanelRef,
    previewIframeRef,
    handleClosePreview,
    handleRefreshPreview,
    handleTogglePreviewFullscreen,
    teardownPreviewFullscreen,
    resetPreview
  }
}
