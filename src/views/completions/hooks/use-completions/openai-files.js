/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions/openai-files.js
 * @Description  : OpenAI 对话文件处理工具
 */

export const getImageFiles = fileList => {
  if (!Array.isArray(fileList)) return []
  return fileList.filter(file => file?.type === 'image' || file?.belong === 'image')
}

export const getImageDataUrls = fileList => {
  return getImageFiles(fileList)
    .map(file => {
      if (typeof file?.base64 === 'string' && file.base64.startsWith('data:image/')) {
        return file.base64
      }
      if (typeof file?.previewBase64 === 'string' && file.previewBase64.startsWith('data:image/')) {
        return file.previewBase64
      }
      if (typeof file?.url === 'string' && file.url.startsWith('data:image/')) {
        return file.url
      }
      return ''
    })
    .filter(Boolean)
}

export const sanitizeFileListForStorage = fileList => {
  if (!Array.isArray(fileList)) return []

  return fileList
    .map(file => {
      if (!file || typeof file !== 'object') return null

      const commonFields = {
        type: file.type || (file.belong === 'image' ? 'image' : 'file'),
        belong: file.belong || (file.type === 'image' ? 'image' : 'file'),
        name: file.name || '',
        size: file.size || 0,
        extension: file.extension || '',
        mimeType: file.mimeType || ''
      }

      if (commonFields.type === 'image' || commonFields.belong === 'image') {
        const previewUrlCandidate = [file.previewBase64, file.url].find(
          url => typeof url === 'string' && url.startsWith('data:image/')
        )
        const previewUrl = typeof previewUrlCandidate === 'string' ? previewUrlCandidate.trim() : ''

        return {
          ...commonFields,
          type: 'image',
          belong: 'image',
          url: previewUrl || null
        }
      }

      return {
        ...commonFields,
        url: typeof file.url === 'string' ? file.url : null,
        fileId: file.fileId || null,
        tokens: file.tokens || 0
      }
    })
    .filter(Boolean)
}
