/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions/openai-messages.js
 * @Description  : OpenAI 对话消息构建工具
 */

import { getImageDataUrls } from './openai-files'

export const buildOpenAIContent = (msg, options = {}) => {
  const { supportsVision = false, overrideImageDataUrls = [] } = options
  const textContent = typeof msg?.content === 'string' ? msg.content : ''

  if (msg?.role !== 'user' || !supportsVision) {
    return textContent
  }

  const imageDataUrls = overrideImageDataUrls.length
    ? overrideImageDataUrls
    : getImageDataUrls(msg.fileList)
  if (!imageDataUrls.length) {
    return textContent
  }

  const content = []
  if (textContent.trim()) {
    content.push({
      type: 'text',
      text: textContent
    })
  }

  imageDataUrls.forEach(url => {
    content.push({
      type: 'image_url',
      image_url: {
        url
      }
    })
  })

  return content
}

export const buildOpenAIMessages = (messages = [], options = {}) => {
  const {
    supportsVision = false,
    excludeAssistantId = '',
    overrideImageDataUrlsByMessageId = {}
  } = options
  const supportedRoles = new Set(['system', 'user', 'assistant', 'tool'])

  return messages
    .filter(msg => {
      if (!msg?.role) return false
      const normalizedRole = `${msg.role}`.toLowerCase()
      if (!supportedRoles.has(normalizedRole)) return false
      if (
        normalizedRole === 'assistant' &&
        excludeAssistantId &&
        msg.id === excludeAssistantId &&
        !msg.content
      ) {
        return false
      }
      return true
    })
    .map(msg => {
      const normalizedRole = `${msg.role}`.toLowerCase()
      return {
        role: normalizedRole,
        content: buildOpenAIContent(msg, {
          supportsVision,
          overrideImageDataUrls: Array.isArray(overrideImageDataUrlsByMessageId[msg.id])
            ? overrideImageDataUrlsByMessageId[msg.id]
            : []
        })
      }
    })
}
