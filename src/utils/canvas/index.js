/*
 * @Author: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @Date: 2025-07-21 16:57:02
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-07-22 11:58:19
 * @Description: 计算文字大小
 */
export const getTextWidthByFontStyle = (text, fontStyle) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  context.font = fontStyle
  const { width } = context.measureText(text)
  return parseFloat(width)
}

export const getTextHeight = (text, fontSize, maxWidth = null) => {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  context.font = `700 ${fontSize}px Microsoft YaHei UI` // 设置字体样式（必须包含 font-size 和 font-family）

  if (maxWidth) {
    const words = text.split('')

    let line = ''
    let totalHeight = 0
    const lineHeight = fontSize * 1.2 // 默认行高（粗略估计）
    let totalRow = 1

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i]
      const metrics = context.measureText(testLine)

      if (metrics.width > maxWidth && i > 0) {
        totalHeight += lineHeight
        line = words[i]
        totalRow++
      } else {
        line = testLine
      }
    }
    return {
      height: totalHeight + lineHeight,
      row: totalRow
    }
  }

  // 单行文本高度（精确计算）
  const metrics = context.measureText(text)
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  return {
    height,
    row: 1
  }
}

// 获取文字默认样式
export const getTextAutoSize = (text, style, maxHeight) => {
  const fontSize = style?.fontSize

  if (!text || !fontSize) return ''

  // 1、直接看长度，要是直接的长度只有一行，直接返回可以，增加执行效率
  if (getTextWidthByFontStyle(text, `700 ${fontSize}px Microsoft YaHei UI`) <= style?.width) {
    return ''
  }

  // 默认大小的情况放得下的
  if (getTextHeight(text, fontSize, style?.width).height <= maxHeight) {
    return ''
  }

  // 需要缩放的
  for (let size = style.fontSize - 1; size > 0; size--) {
    const info = getTextHeight(text, size, style?.width)

    if (info.height <= maxHeight) {
      let lineHeight = Math.trunc((maxHeight / info.row / size) * 10) / 10
      if (lineHeight > 1.5) lineHeight = 1.5
      let newHeight = lineHeight * size * info.row

      return `font-size:${size}px;line-height:${lineHeight};padding:${parseInt(
        (maxHeight - newHeight) / 2
      )}px 0px`
    }
  }
  return ''
}
