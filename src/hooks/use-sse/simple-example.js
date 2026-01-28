/*
 * @Author       : Claude
 * @Date         : 2023-10-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-22
 * @FilePath     : /bi-agents/src/hooks/use-sse/simple-example.js
 * @Description  : useSSE 钩子简单使用示例
 */

import { ref } from 'vue'
import { useSSE } from './index'

/**
 * 智能代理聊天 SSE 钩子
 * 用于实时接收代理消息
 * @param {string} agentId 代理 ID
 * @param {string} conversationId 对话 ID
 * @returns {Object} SSE 控制对象和消息数据
 */
export const useAgentChat = (agentId, conversationId) => {
  // 会话消息
  const messages = ref([])
  // 是否正在接收消息
  const isReceiving = ref(false)
  // 错误信息
  const errorMsg = ref('')

  // 使用 useSSE
  const { status, error, connect, disconnect } = useSSE({
    // 使用完整的聊天 URL
    url: `${import.meta.env.VITE_APP_WEB_URL}/api/agents/chat/sse?agentId=${agentId}&conversationId=${conversationId}`,

    // 接收消息处理
    onMessage: event => {
      try {
        // 解析消息数据
        const data = JSON.parse(event.data)

        // 根据消息类型处理
        switch (data.type) {
          case 'start':
            // 开始接收消息
            isReceiving.value = true
            break

          case 'message':
            // 处理聊天消息
            messages.value.push({
              id: data.id,
              content: data.content,
              role: data.role,
              timestamp: Date.now()
            })
            break

          case 'error':
            // 处理错误
            errorMsg.value = data.error || '接收消息出错'
            break

          case 'end':
            // 结束接收
            isReceiving.value = false
            break

          default:
            console.warn('未知的消息类型:', data.type)
        }
      } catch (err) {
        console.error('解析消息出错:', err)
        errorMsg.value = '解析消息出错'
      }
    },

    // 连接打开
    onOpen: () => {
      console.log('代理聊天 SSE 连接已打开')
      errorMsg.value = ''
    },

    // 连接关闭
    onClose: () => {
      isReceiving.value = false
      console.log('代理聊天 SSE 连接已关闭')
    },

    // 连接错误
    onError: err => {
      isReceiving.value = false
      errorMsg.value = err.message || '连接出错'
      console.error('代理聊天 SSE 连接错误:', err)
    },

    // 自动连接
    autoConnect: true
  })

  // 重新连接
  const reconnect = () => {
    disconnect()
    messages.value = [] // 清空消息
    errorMsg.value = ''
    connect()
  }

  // 发送消息到代理（这通常是一个独立的 API 调用）
  const sendMessage = async content => {
    try {
      // 这里可以添加发送消息的 API 调用
      // 例如:
      // await postJSON('/api/agents/chat/send', {
      //   agentId,
      //   conversationId,
      //   content
      // })

      // 添加用户消息到本地列表（实际应用中可能会由服务端返回确认）
      messages.value.push({
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: Date.now()
      })

      return true
    } catch (err) {
      console.error('发送消息失败:', err)
      errorMsg.value = '发送消息失败'
      return false
    }
  }

  // 组件卸载时自动断开连接（useSSE 内部已处理）

  return {
    // SSE 状态
    status,
    error,
    // 消息数据
    messages,
    isReceiving,
    errorMsg,
    // 控制方法
    connect,
    disconnect,
    reconnect,
    // 业务方法
    sendMessage
  }
}

/**
 * 使用示例：
 *
 * // 在组件中
 * const agentId = 'agent_123'
 * const conversationId = 'conv_456'
 *
 * // 使用钩子
 * const {
 *   messages,
 *   isReceiving,
 *   errorMsg,
 *   sendMessage,
 *   reconnect
 * } = useAgentChat(agentId, conversationId)
 *
 * // 发送消息
 * const sendUserMessage = async () => {
 *   const success = await sendMessage('Hello, Agent!')
 *   if (success) {
 *     // 清空输入框等操作
 *   }
 * }
 */
