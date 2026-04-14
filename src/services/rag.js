/*
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/services/rag.js
 * @Description  : RAG 检索增强生成服务
 */

import { getEmbeddings } from '@/api/embedding'
import { searchVectors } from '@/services/vector-store'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useKnowledgeBaseStore } from '@/stores/knowledge-base'

/**
 * 查询知识库并构建 RAG 上下文
 * @param {Object} options
 * @param {string} options.query - 用户消息文本
 * @param {string[]} options.kbIds - 要搜索的知识库 ID 列表
 * @param {number} [options.topK=5] - 每个知识库返回的结果数量
 * @returns {Promise<{ contextText: string, sources: Array } | null>}
 */
export const queryKnowledgeBases = async ({ query, kbIds, topK = 5 }) => {
  if (!query?.trim() || !kbIds?.length) return null

  const apiSettingsStore = useApiSettingsStore()
  const kbStore = useKnowledgeBaseStore()

  // 按嵌入模型分组（相同模型只需嵌入一次查询）
  const kbsByModel = new Map()
  for (const kbId of kbIds) {
    const kb = kbStore.getKnowledgeBaseById(kbId)
    if (!kb) {
      console.warn(`[RAG] 知识库 ${kbId} 不存在，已跳过`)
      continue
    }
    if (!kb.enabled) {
      console.warn(`[RAG] 知识库 "${kb.name}" 已禁用，已跳过`)
      continue
    }
    const key = `${kb.embeddingModel}__${kb.dimensions}`
    if (!kbsByModel.has(key)) {
      kbsByModel.set(key, { model: kb.embeddingModel, dimensions: kb.dimensions, kbs: [] })
    }
    kbsByModel.get(key).kbs.push(kb)
  }

  if (kbsByModel.size === 0) {
    console.warn('[RAG] 没有可用的知识库，跳过检索', { kbIds })
    return null
  }

  const allResults = []

  for (const [, group] of kbsByModel) {
    try {
      // 为每个模型组嵌入一次查询
      const { embeddings } = await getEmbeddings({
        baseURL: apiSettingsStore.baseURL,
        apiKey: apiSettingsStore.apiKey,
        model: group.model,
        input: query,
        dimensions: group.dimensions
      })
      const queryVector = embeddings[0]

      // 搜索该模型下的所有知识库
      for (const kb of group.kbs) {
        try {
          const kbTopK = kb.topK || topK
          const results = await searchVectors(kb.id, kb.dimensions, queryVector, kbTopK)
          allResults.push(
            ...results.map(r => ({
              ...r,
              kbName: kb.name,
              kbId: kb.id
            }))
          )
        } catch (error) {
          console.warn(`[RAG] 搜索知识库 "${kb.name}" 失败:`, error)
        }
      }
    } catch (error) {
      console.warn(`[RAG] 嵌入查询失败 (模型: ${group.model}):`, error)
    }
  }

  if (allResults.length === 0) return null

  // 按 score 降序排序（score 越高越相似），取 topK 个结果
  allResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const topResults = allResults.slice(0, topK)

  // 构建上下文文本
  const contextText = topResults
    .map((r, i) => {
      const source = r.metadata?.source || r.kbName
      const text = r.metadata?.text || ''
      return `[${i + 1}] (来源: ${source})\n${text}`
    })
    .join('\n\n')

  return {
    contextText,
    sources: topResults
  }
}

/**
 * 构建 RAG 系统消息
 * @param {string} contextText
 * @returns {{ role: string, content: string }}
 */
export const buildRAGSystemMessage = contextText => {
  return {
    role: 'system',
    content: `以下是从知识库中检索到的相关参考内容，请基于这些内容回答用户的问题。如果参考内容与问题无关，请忽略并基于你的知识回答。\n\n---\n${contextText}\n---`
  }
}
