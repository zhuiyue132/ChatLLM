/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-chat-bootstrap.js
 * @Description  : Completions 聊天页初始化（历史加载 / 待发送消息 / 滚动定位）
 */

import { nextTick } from 'vue'
import { tryOnMounted, useEventBus } from '@vueuse/core'
import { FETCH_CHAR_HISTORY } from '@/config/symbol'
import { consumePendingCompletionsMessage } from '../utils'

const WILL_SEND_SESSION_KEY = 'COMPLETIONS_WILL_SEND_MESSAGE'

export const useChatBootstrap = ({
  message,
  sendMessage,
  fetchChatHistory,
  chatHistory,
  router,
  enableAutoScroll,
  scrollToBottom,
  resolveSearchTargetMessageId = () => '',
  locateSearchTargetMessage = () => {}
} = {}) => {
  // 页面加载时获取数据
  tryOnMounted(async () => {
    let willSendMessage = null
    const willSendMessageRaw = window.sessionStorage.getItem(WILL_SEND_SESSION_KEY) || ''
    if (willSendMessageRaw) {
      window.sessionStorage.removeItem(WILL_SEND_SESSION_KEY)
      try {
        willSendMessage = JSON.parse(willSendMessageRaw)
      } catch (error) {
        console.warn('[Completions] 解析待发送消息失败，已忽略', error)
      }
    }

    const pendingMessage = consumePendingCompletionsMessage()
    if (pendingMessage && Object.keys(pendingMessage).length > 0) {
      message.value = pendingMessage.message || ''
      sendMessage({ ...pendingMessage })
      return
    }

    if (willSendMessage && Object.keys(willSendMessage).length > 0) {
      message.value = willSendMessage.message || ''
      sendMessage({ ...willSendMessage })
    } else {
      await fetchChatHistory()

      nextTick(() => {
        // 如果聊天记录为空，则跳转至首页
        if (chatHistory.value.length === 0) {
          router.replace({
            name: 'Completions'
          })
        } else {
          if (resolveSearchTargetMessageId()) {
            locateSearchTargetMessage()
          } else {
            // 有聊天记录时，滚动到底部
            enableAutoScroll()
            scrollToBottom(true)
          }
        }
      })
    }
  })

  // 监听侧边栏点击切换对话事件
  const eventBusOfHistory = useEventBus(FETCH_CHAR_HISTORY)
  eventBusOfHistory.on(payload => {
    nextTick(() => {
      if (payload?.chatDetailId || resolveSearchTargetMessageId()) {
        locateSearchTargetMessage()
        return
      }
      if (chatHistory.value.length > 0) {
        enableAutoScroll()
        scrollToBottom(true)
      }
    })
  })
}
