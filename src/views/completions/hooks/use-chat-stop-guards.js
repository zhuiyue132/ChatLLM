/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-chat-stop-guards.js
 * @Description  : Completions 聊天页离开/卸载时自动停止对话并清理预览
 */

import { onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useEventListener } from '@vueuse/core'

export const useChatStopGuards = ({
  loading,
  handleManualStop,
  teardownPreviewFullscreen,
  resetPreview
} = {}) => {
  useEventListener(window, 'beforeunload', async () => {
    loading.value = false
    await handleManualStop()
  })

  // 组件卸载前停止对话
  onBeforeUnmount(async () => {
    loading.value = false
    await handleManualStop()
    await teardownPreviewFullscreen()
    resetPreview()
  })

  // 路由离开前停止对话
  onBeforeRouteLeave(async (_to, _from, next) => {
    loading.value = false
    await handleManualStop()
    await teardownPreviewFullscreen()
    resetPreview()
    next()
  })
}
