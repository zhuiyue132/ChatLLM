/*
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/api/rerank.js
 * @Description  : Rerank API 调用（OpenAI 兼容格式）
 */

/**
 * 对文档列表进行重排序
 * @param {Object} options
 * @param {string} options.baseURL - API 基础地址
 * @param {string} options.apiKey - API 密钥
 * @param {string} options.model - Rerank 模型名称
 * @param {string} options.query - 查询文本
 * @param {string[]} options.documents - 待排序的文档文本数组
 * @param {number} [options.topN] - 返回前 N 个结果（默认返回全部）
 * @returns {Promise<Array<{ index: number, relevance_score: number }>>}
 */
export const rerank = async ({ baseURL, apiKey, model, query, documents, topN }) => {
  const body = {
    model,
    query,
    documents
  }
  if (topN) body.top_n = topN

  const response = await fetch(`${baseURL}/v1/rerank`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Rerank 请求失败 (${response.status}): ${errorText || response.statusText}`)
  }

  const result = await response.json()

  // 返回格式: { results: [{ index, relevance_score }] }
  return (result.results || []).sort((a, b) => b.relevance_score - a.relevance_score)
}
