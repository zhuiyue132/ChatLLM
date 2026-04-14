/*
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/services/document-processor.js
 * @Description  : 文档分块处理器
 */

export const DEFAULT_CHUNK_OPTIONS = {
  maxChunkSize: 512,
  chunkOverlap: 64
}

const PARAGRAPH_SEPARATOR = '\n\n'
const SENTENCE_SEPARATORS = /(?<=[。！？.!?\n])/

/**
 * 按固定大小切分大段文本（带重叠）
 */
const splitByFixedSize = (text, maxChunkSize, chunkOverlap) => {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length)
    chunks.push(text.slice(start, end))
    start = end - chunkOverlap
    if (start >= text.length) break
    if (end === text.length) break
  }
  return chunks
}

/**
 * 切分大段落（先尝试按句子切，兜底按固定大小）
 */
const splitLargeParagraph = (paragraph, maxChunkSize, chunkOverlap) => {
  const sentences = paragraph.split(SENTENCE_SEPARATORS).filter(s => s.trim())

  if (sentences.length <= 1) {
    return splitByFixedSize(paragraph, maxChunkSize, chunkOverlap)
  }

  const chunks = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if (sentence.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      chunks.push(...splitByFixedSize(sentence, maxChunkSize, chunkOverlap))
    } else if ((currentChunk + sentence).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = sentence
    } else {
      currentChunk += sentence
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * 将文本切分为语义块
 * @param {string} text - 原始文本
 * @param {Object} [options]
 * @param {number} [options.maxChunkSize=512] - 最大块大小（字符数）
 * @param {number} [options.chunkOverlap=64] - 块重叠大小
 * @returns {string[]}
 */
export const splitTextIntoChunks = (text, options = {}) => {
  const { maxChunkSize, chunkOverlap } = { ...DEFAULT_CHUNK_OPTIONS, ...options }

  if (!text || !text.trim()) return []

  const paragraphs = text.split(PARAGRAPH_SEPARATOR).filter(p => p.trim())

  const chunks = []
  let currentChunk = ''

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      chunks.push(...splitLargeParagraph(paragraph, maxChunkSize, chunkOverlap))
    } else if ((currentChunk + PARAGRAPH_SEPARATOR + paragraph).length > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
      }
      currentChunk = paragraph
    } else {
      currentChunk = currentChunk ? currentChunk + PARAGRAPH_SEPARATOR + paragraph : paragraph
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * 支持的文件扩展名
 */
export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.log']

/**
 * 从 File 对象中提取文本
 * @param {File} file
 * @returns {Promise<string>}
 */
export const extractTextFromFile = async file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = () => reject(new Error(`读取文件失败: ${file.name}`))
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * 处理文档：提取文本 → 分块 → 附加元数据
 * @param {File} file
 * @param {Object} [options]
 * @returns {Promise<Array<{ text: string, metadata: Object }>>}
 */
export const processDocument = async (file, options = {}) => {
  const text = await extractTextFromFile(file)
  const chunks = splitTextIntoChunks(text, options)

  return chunks.map((chunk, index) => ({
    text: chunk,
    metadata: {
      text: chunk,
      source: file.name,
      chunkIndex: index,
      totalChunks: chunks.length,
      createdAt: new Date().toISOString()
    }
  }))
}

/**
 * 检查文件是否为支持的格式
 * @param {File} file
 * @returns {boolean}
 */
export const isSupportedFile = file => {
  if (!file?.name) return false
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  return SUPPORTED_EXTENSIONS.includes(ext)
}
