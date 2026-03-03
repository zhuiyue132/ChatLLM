/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-24
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-28
 * @FilePath     : /bi-agents/src/hooks/use-auto-scroll/index.js
 * @Description  : 自动滚动
 *
 */
import { ref, onMounted } from 'vue'
import { useEventListener, useThrottleFn } from '@vueuse/core'

export const useAutoScroll = (scrollable, scrollContainer = null) => {
  const isAutoScrollEnabled = ref(true)

  const getScrollMetrics = () => {
    const containerElement = scrollContainer?.value || null
    if (containerElement) {
      return {
        scrollHeight: containerElement.scrollHeight,
        scrollTop: containerElement.scrollTop,
        clientHeight: containerElement.clientHeight
      }
    }

    return {
      scrollHeight: document.documentElement.scrollHeight,
      scrollTop: window.pageYOffset || document.documentElement.scrollTop,
      clientHeight: window.innerHeight
    }
  }

  // 实际执行滚动的函数
  const doScroll = force => {
    if (!isAutoScrollEnabled.value) return

    const containerElement = scrollContainer?.value || null
    const { scrollHeight, clientHeight } = getScrollMetrics()
    if (scrollHeight > clientHeight) {
      if (containerElement) {
        containerElement.scrollTo({
          top: scrollHeight,
          behavior: force ? 'auto' : 'smooth'
        })
        return
      }

      window.scrollTo({
        top: scrollHeight,
        behavior: force ? 'auto' : 'smooth'
      })
    }
  }

  // 节流处理的滚动函数，100ms 内最多执行一次
  const throttledScroll = useThrottleFn(doScroll, 100)

  // 设置页面滚动位置, 滚动到最底部
  const scrollToBottom = force => {
    if (force) {
      // 强制滚动时直接执行，不节流
      doScroll(true)
    } else {
      // 普通滚动使用节流
      throttledScroll(false)
    }
  }

  const enableAutoScroll = () => {
    isAutoScrollEnabled.value = true
  }

  // 鼠标滚动事件
  const handleWheel = () => {
    if (scrollable.value) {
      isAutoScrollEnabled.value = false
      const { scrollHeight, scrollTop, clientHeight } = getScrollMetrics()
      // 这里20px是经验值，根据实际情况调整
      if (scrollHeight - scrollTop - clientHeight <= 20) {
        isAutoScrollEnabled.value = true
      }
    }
  }

  const handleScroll = () => {
    if (!isAutoScrollEnabled.value && scrollable.value) {
      // 滚动到底部时，设置isAutoScrollEnabled为true; 距离底部100px,认为到底了。
      const { scrollHeight, scrollTop, clientHeight } = getScrollMetrics()
      if (scrollHeight - scrollTop - clientHeight <= 100) {
        isAutoScrollEnabled.value = true
      }
    }
  }

  onMounted(() => {
    // 监听滚动事件（优先容器滚动，其次页面滚动）
    useEventListener(scrollContainer || window, 'wheel', handleWheel)
    useEventListener(scrollContainer || window, 'scroll', handleScroll)
  })

  return {
    isAutoScrollEnabled,
    scrollToBottom,
    handleWheel,
    handleScroll,
    enableAutoScroll
  }
}
