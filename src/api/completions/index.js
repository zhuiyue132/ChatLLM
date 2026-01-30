/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-19
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/api/completions/index.js
 * @Description  :
 *
 */

/**
 * 使用自定义配置获取模型列表
 * @param {string} baseURL - API 基础地址
 * @param {string} apiKey - API 密钥
 */
export const getModelListWithConfig = async (baseURL, apiKey) => {
  const response = await fetch(`${baseURL}/v1/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return await response.json()
}
