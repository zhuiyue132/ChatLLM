/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-19
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/api/completions/index.js
 * @Description  :
 *
 */

import { get } from '../request/http'

export const getModelList = async () => {
  return get('/v1/models')
}

/**
 * 使用自定义配置获取模型列表
 * @param {string} baseURL - API 基础地址
 * @param {string} apiKey - API 密钥
 */
export const getModelListWithConfig = async (baseURL, apiKey) => {
  return get('/v1/models', null, {
    customBaseUrl: baseURL,
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })
}
