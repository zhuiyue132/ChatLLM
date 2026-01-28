/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/hooks/use-sse/openai-example.js
 * @Description  : useOpenAISSE 钩子使用示例
 */

import { ref, computed } from 'vue'
import { useOpenAISSE, useOpenAISSESingle, OpenAISSEStatus } from './use-openai-sse'

// ============================================================================
// 示例 1: 单请求模式（简单场景）
// ============================================================================

/**
 * 单对话模式示例
 * 适用于只需要管理单个对话的场景
 */
export const useSingleChat = (options = {}) => {
  const { apiKey = '', baseURL = 'https://api.openai.com/v1', model = 'gpt-4o-mini' } = options

  const messages = ref([])
  const currentReply = ref('')
  const currentThinking = ref('')

  const { status, error, send, stop, reset } = useOpenAISSESingle({
    baseURL,
    apiKey,
    onToken: ({ content, reasoning_content, isReasoning }) => {
      if (isReasoning) {
        currentThinking.value = reasoning_content
      } else {
        currentReply.value = content
      }
    },
    onDone: ({ content, reasoning_content, usage }) => {
      messages.value.push({
        role: 'assistant',
        content,
        reasoning_content,
        usage
      })
      currentReply.value = ''
      currentThinking.value = ''
    },
    onAbort: ({ content, reasoning_content }) => {
      if (content || reasoning_content) {
        messages.value.push({
          role: 'assistant',
          content: content || '（已停止）',
          reasoning_content,
          aborted: true
        })
      }
      currentReply.value = ''
      currentThinking.value = ''
    }
  })

  const isGenerating = computed(
    () =>
      status.value === OpenAISSEStatus.CONNECTING || status.value === OpenAISSEStatus.STREAMING
  )

  const sendMessage = async userMessage => {
    if (!userMessage.trim() || isGenerating.value) return

    messages.value.push({ role: 'user', content: userMessage })

    await send({
      model,
      messages: messages.value.map(m => ({ role: m.role, content: m.content }))
    })
  }

  return {
    messages,
    currentReply,
    currentThinking,
    isGenerating,
    status,
    error,
    sendMessage,
    stopGeneration: stop,
    clearMessages: () => {
      reset()
      messages.value = []
    }
  }
}

// ============================================================================
// 示例 2: 多请求模式（多对话窗口）
// ============================================================================

/**
 * 多对话管理示例
 * 适用于同时管理多个独立对话的场景（如多窗口对话）
 */
export const useMultiChat = (options = {}) => {
  const { apiKey = '', baseURL = 'https://api.openai.com/v1', model = 'gpt-4o-mini' } = options

  // 对话列表 Map<chatId, { messages, currentReply, requestId }>
  const chats = ref(new Map())

  const { send, stop, stopAll, hasActiveRequests, getRequest } = useOpenAISSE({
    baseURL,
    apiKey
  })

  /**
   * 创建新对话
   */
  const createChat = chatId => {
    if (chats.value.has(chatId)) return

    chats.value.set(chatId, {
      messages: [],
      currentReply: '',
      currentThinking: '',
      requestId: null,
      status: OpenAISSEStatus.IDLE
    })
  }

  /**
   * 发送消息到指定对话
   */
  const sendMessage = (chatId, userMessage) => {
    const chat = chats.value.get(chatId)
    if (!chat) return

    // 检查该对话是否正在生成中
    if (
      chat.status === OpenAISSEStatus.CONNECTING ||
      chat.status === OpenAISSEStatus.STREAMING
    ) {
      console.warn(`Chat ${chatId} is busy`)
      return
    }

    chat.messages.push({ role: 'user', content: userMessage })

    const request = send(
      {
        model,
        messages: chat.messages.map(m => ({ role: m.role, content: m.content }))
      },
      {
        onStart: ({ requestId }) => {
          chat.requestId = requestId
          chat.status = OpenAISSEStatus.CONNECTING
        },
        onToken: ({ content, reasoning_content, isReasoning }) => {
          chat.status = OpenAISSEStatus.STREAMING
          if (isReasoning) {
            chat.currentThinking = reasoning_content
          } else {
            chat.currentReply = content
          }
        },
        onDone: ({ content, reasoning_content }) => {
          chat.messages.push({
            role: 'assistant',
            content,
            reasoning_content
          })
          chat.currentReply = ''
          chat.currentThinking = ''
          chat.requestId = null
          chat.status = OpenAISSEStatus.DONE
        },
        onAbort: ({ content, reasoning_content }) => {
          if (content) {
            chat.messages.push({
              role: 'assistant',
              content,
              reasoning_content,
              aborted: true
            })
          }
          chat.currentReply = ''
          chat.currentThinking = ''
          chat.requestId = null
          chat.status = OpenAISSEStatus.ABORTED
        },
        onError: ({ error }) => {
          console.error(`Chat ${chatId} error:`, error)
          chat.requestId = null
          chat.status = OpenAISSEStatus.ERROR
        }
      }
    )

    return request
  }

  /**
   * 停止指定对话的生成
   */
  const stopChat = chatId => {
    const chat = chats.value.get(chatId)
    if (chat?.requestId) {
      stop(chat.requestId)
    }
  }

  /**
   * 删除对话
   */
  const deleteChat = chatId => {
    stopChat(chatId)
    chats.value.delete(chatId)
  }

  /**
   * 获取对话状态
   */
  const getChatStatus = chatId => {
    const chat = chats.value.get(chatId)
    return chat?.status || OpenAISSEStatus.IDLE
  }

  /**
   * 检查对话是否正在生成
   */
  const isChatGenerating = chatId => {
    const status = getChatStatus(chatId)
    return status === OpenAISSEStatus.CONNECTING || status === OpenAISSEStatus.STREAMING
  }

  return {
    chats,
    createChat,
    sendMessage,
    stopChat,
    stopAll,
    deleteChat,
    getChatStatus,
    isChatGenerating,
    hasActiveRequests
  }
}

// ============================================================================
// 示例 3: 对比模式（同时向多个模型发送请求）
// ============================================================================

/**
 * 模型对比示例
 * 同时向多个模型发送相同的问题，对比输出结果
 */
export const useModelComparison = (options = {}) => {
  const { apiKey = '', baseURL = 'https://api.openai.com/v1' } = options

  // 对比结果 Map<model, { content, status, error }>
  const results = ref(new Map())

  const { send, stopAll, hasActiveRequests } = useOpenAISSE({
    baseURL,
    apiKey
  })

  /**
   * 向多个模型发送相同问题
   */
  const compare = (models, message) => {
    // 清空之前的结果
    results.value.clear()

    // 初始化所有模型的状态
    models.forEach(model => {
      results.value.set(model, {
        content: '',
        reasoning_content: '',
        status: OpenAISSEStatus.IDLE,
        error: null,
        requestId: null
      })
    })

    // 同时发送请求
    models.forEach(model => {
      const result = results.value.get(model)

      send(
        {
          model,
          messages: [{ role: 'user', content: message }]
        },
        {
          onStart: ({ requestId }) => {
            result.requestId = requestId
            result.status = OpenAISSEStatus.CONNECTING
          },
          onToken: ({ content, reasoning_content }) => {
            result.status = OpenAISSEStatus.STREAMING
            result.content = content
            result.reasoning_content = reasoning_content
          },
          onDone: ({ content, reasoning_content, usage }) => {
            result.content = content
            result.reasoning_content = reasoning_content
            result.usage = usage
            result.status = OpenAISSEStatus.DONE
          },
          onAbort: () => {
            result.status = OpenAISSEStatus.ABORTED
          },
          onError: ({ error }) => {
            result.error = error
            result.status = OpenAISSEStatus.ERROR
          }
        }
      )
    })
  }

  return {
    results,
    compare,
    stopAll,
    hasActiveRequests
  }
}

/**
 * Vue 组件使用示例
 *
 * ```vue
 * <template>
 *   <!-- 示例 1: 单对话 -->
 *   <div class="single-chat">
 *     <div v-for="(msg, i) in messages" :key="i">
 *       <strong>{{ msg.role }}:</strong> {{ msg.content }}
 *     </div>
 *     <div v-if="isGenerating">
 *       <div v-if="currentThinking">思考中: {{ currentThinking }}</div>
 *       <div>{{ currentReply }}</div>
 *     </div>
 *     <input v-model="input" @keyup.enter="handleSend" />
 *     <button @click="handleSend" :disabled="isGenerating">发送</button>
 *     <button @click="stopGeneration" v-if="isGenerating">停止</button>
 *   </div>
 *
 *   <!-- 示例 2: 多对话窗口 -->
 *   <div class="multi-chat">
 *     <div v-for="[chatId, chat] in chats" :key="chatId" class="chat-window">
 *       <h3>对话 {{ chatId }}</h3>
 *       <div v-for="(msg, i) in chat.messages" :key="i">{{ msg.content }}</div>
 *       <div v-if="isChatGenerating(chatId)">{{ chat.currentReply }}</div>
 *       <button @click="stopChat(chatId)" v-if="isChatGenerating(chatId)">停止</button>
 *     </div>
 *   </div>
 *
 *   <!-- 示例 3: 模型对比 -->
 *   <div class="model-comparison">
 *     <div v-for="[model, result] in results" :key="model" class="model-result">
 *       <h3>{{ model }}</h3>
 *       <div>{{ result.content }}</div>
 *       <div>状态: {{ result.status }}</div>
 *     </div>
 *     <button @click="compare(['gpt-4o', 'gpt-4o-mini'], question)">开始对比</button>
 *     <button @click="stopAll" v-if="hasActiveRequests()">全部停止</button>
 *   </div>
 * </template>
 *
 * <script setup>
 * import { ref } from 'vue'
 * import { useSingleChat, useMultiChat, useModelComparison } from '@/hooks/use-sse/openai-example'
 *
 * // 示例 1
 * const { messages, currentReply, currentThinking, isGenerating, sendMessage, stopGeneration } =
 *   useSingleChat({ apiKey: 'sk-xxx' })
 *
 * // 示例 2
 * const { chats, createChat, sendMessage: sendToChat, stopChat, isChatGenerating } =
 *   useMultiChat({ apiKey: 'sk-xxx' })
 *
 * // 示例 3
 * const { results, compare, stopAll, hasActiveRequests } =
 *   useModelComparison({ apiKey: 'sk-xxx' })
 * </script>
 * ```
 */
