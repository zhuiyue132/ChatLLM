/*
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions/rag-inject.js
 * @Description  : RAG 检索注入逻辑
 */

import { queryKnowledgeBases, buildRAGSystemMessage } from '@/services/rag'

/**
 * 执行 RAG 检索并注入到 OpenAI 消息数组中
 * @param {Object} options
 * @param {string} options.query - 用户消息文本
 * @param {string[]} options.kbIds - 知识库 ID 列表
 * @param {Object[]} options.openAIMessages - 已构建的 OpenAI 消息数组（会被修改）
 * @returns {Promise<Array|null>} 检索到的 sources，供消息组件展示引用来源
 */
export const injectRAGContext = async ({ query, kbIds, openAIMessages }) => {
  console.log('[RAG] injectRAGContext 被调用', { query: query?.slice(0, 50), kbIds })

  if (!query?.trim() || !Array.isArray(kbIds) || kbIds.length === 0) {
    console.log('[RAG] 跳过注入: query 为空或 kbIds 为空')
    return null
  }

  try {
    const ragResult = await queryKnowledgeBases({
      query,
      kbIds
    })

    if (ragResult?.contextText) {
      const ragSystemMessage = buildRAGSystemMessage(ragResult.contextText)
      openAIMessages.unshift(ragSystemMessage)
      console.log('[RAG] 知识库上下文已注入', {
        kbIds,
        resultCount: ragResult.sources?.length || 0
      })
      return ragResult.sources || null
    }
  } catch (error) {
    console.warn('[RAG] 知识库检索失败，已降级为普通对话', error)
  }

  return null
}
