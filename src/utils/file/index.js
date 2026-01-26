/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-25
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-25
 * @FilePath     : /bi-agents/src/utils/file/index.js
 * @Description  : 文件工具函数
 *
 */

/**
 * 格式化文件大小
 * @param {*} fileSize
 * @param {*} decimalPlaces
 * @returns
 */
export const formatFileSize = (fileSize, decimalPlaces = 2) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let unitIndex = 0

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }

  return fileSize.toFixed(decimalPlaces) + ' ' + units[unitIndex]
}

/**
 * 格式化文件格式
 * @param {*} fileName
 * @returns
 */
export const formatFileExt = fileName => {
  const ext = fileName.split('.').pop().toUpperCase()
  return ext
}

/**
 * 是否是图片链接
 * @param {*} url
 * @returns
 */
export const isImageUrl = url => {
  return /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)
}

const fileIconType = {
  default: 'tongyongwenjian',
  bad: 'DamageFile',
  xls: 'EXCEL',
  xlsx: 'EXCEL',
  csv: 'EXCEL',
  doc: 'WORD',
  docx: 'WORD',
  ppt: 'PPT',
  pptx: 'PPT',
  txt: 'TXT',
  pdf: 'PDF'
}

/**
 * 动态匹配文件的图标
 * @param {*} param0
 * @returns
 */
export const getFileIcon = ({ fileName }) => {
  const ext = String(fileName).split('.').pop().toLowerCase()
  return `#svg-icon-${fileIconType[ext] || fileIconType.default}`
}
