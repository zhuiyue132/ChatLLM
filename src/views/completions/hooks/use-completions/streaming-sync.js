/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions/streaming-sync.js
 * @Description  : 流式输出 UI 同步节流工具
 */

export const createStreamingSync = ({ interval = 100, onSync = () => {} } = {}) => {
  let streamingSyncTimer = null
  let latestPayload = null

  const clearTimer = () => {
    if (streamingSyncTimer) {
      window.clearTimeout(streamingSyncTimer)
      streamingSyncTimer = null
    }
  }

  const flush = () => {
    clearTimer()
    if (!latestPayload) return
    const payload = latestPayload
    latestPayload = null
    onSync(payload)
  }

  const schedule = payload => {
    latestPayload = payload
    if (streamingSyncTimer) return
    streamingSyncTimer = window.setTimeout(flush, interval)
  }

  const reset = () => {
    clearTimer()
    latestPayload = null
  }

  return {
    schedule,
    reset,
    flush
  }
}
