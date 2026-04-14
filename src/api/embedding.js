/*
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/api/embedding.js
 * @Description  : Embedding API 调用（OpenAI 兼容格式）
 */

/**
 * 获取文本嵌入向量
 * @param {Object} options
 * @param {string} options.baseURL - API 基础地址
 * @param {string} options.apiKey - API 密钥
 * @param {string} options.model - 嵌入模型名称
 * @param {string|string[]} options.input - 需要嵌入的文本
 * @param {number} [options.dimensions] - 可选维度覆盖
 * @returns {Promise<{ embeddings: Float32Array[], usage: Object|null }>}
 */
export const getEmbeddings = async ({ baseURL, apiKey, model, input, dimensions }) => {
  const body = {
    model,
    input,
    encoding_format: 'float'
  }
  if (dimensions) body.dimensions = dimensions

  const response = await fetch(`${baseURL}/v1/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Embedding 请求失败 (${response.status}): ${errorText || response.statusText}`)
  }

  const result = await response.json()

  const embeddings = (result.data || [])
    .sort((a, b) => a.index - b.index)
    .map(item => new Float32Array(item.embedding))

  return { embeddings, usage: result.usage || null }
}

/**
 * 批量获取嵌入向量（自动分批）
 * @param {Object} options
 * @param {string} options.baseURL
 * @param {string} options.apiKey
 * @param {string} options.model
 * @param {string[]} options.inputs - 文本数组
 * @param {number} [options.dimensions]
 * @param {number} [options.batchSize=20] - 每批大小
 * @param {Function} [options.onProgress] - 进度回调 (completed, total)
 * @param {AbortSignal} [options.signal] - 取消信号
 * @returns {Promise<{ embeddings: Float32Array[], usage: { prompt_tokens: number, total_tokens: number } }>}
 */
export const getEmbeddingsBatched = async ({
  baseURL,
  apiKey,
  model,
  inputs,
  dimensions,
  batchSize = 20,
  onProgress,
  signal
}) => {
  const allEmbeddings = []
  let totalPromptTokens = 0
  let totalTokens = 0

  for (let i = 0; i < inputs.length; i += batchSize) {
    if (signal?.aborted) {
      throw new Error('Embedding 已取消')
    }

    const batch = inputs.slice(i, i + batchSize)
    const { embeddings, usage } = await getEmbeddings({
      baseURL,
      apiKey,
      model,
      input: batch,
      dimensions
    })

    allEmbeddings.push(...embeddings)

    if (usage) {
      totalPromptTokens += usage.prompt_tokens || 0
      totalTokens += usage.total_tokens || 0
    }

    onProgress?.(Math.min(i + batchSize, inputs.length), inputs.length)
  }

  return {
    embeddings: allEmbeddings,
    usage: { prompt_tokens: totalPromptTokens, total_tokens: totalTokens }
  }
}
