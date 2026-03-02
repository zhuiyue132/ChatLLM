/*
 * @Description  : 代码预览共享状态
 *
 */
import { ref } from 'vue'

const createInitialPreviewState = () => ({
  source: '',
  title: '代码预览',
  language: '',
  openedAt: 0
})

const previewVisible = ref(false)
const previewState = ref(createInitialPreviewState())
const previewVersion = ref(0)
const previewSourceResolver = ref(null)

export const useCodePreview = () => {
  const openPreview = payload => {
    const source = typeof payload?.source === 'string' ? payload.source : ''
    if (!source.trim()) {
      return
    }

    previewState.value = {
      source,
      title: payload?.title || '代码预览',
      language: payload?.language || '',
      openedAt: Date.now()
    }
    previewSourceResolver.value =
      typeof payload?.resolveSource === 'function' ? payload.resolveSource : null

    previewVisible.value = true
    previewVersion.value += 1
  }

  const closePreview = () => {
    previewVisible.value = false
  }

  const refreshPreview = () => {
    if (!previewVisible.value) {
      return
    }

    const resolveSource = previewSourceResolver.value
    if (typeof resolveSource === 'function') {
      try {
        const latestSource = resolveSource()
        if (typeof latestSource === 'string' && latestSource.trim()) {
          previewState.value = {
            ...previewState.value,
            source: latestSource
          }
        }
      } catch (error) {
        console.warn('[CodePreview] 刷新预览源失败，继续使用旧内容', error)
      }
    }

    previewVersion.value += 1
  }

  const resetPreview = () => {
    previewVisible.value = false
    previewState.value = createInitialPreviewState()
    previewVersion.value = 0
    previewSourceResolver.value = null
  }

  return {
    previewVisible,
    previewState,
    previewVersion,
    openPreview,
    closePreview,
    refreshPreview,
    resetPreview
  }
}
