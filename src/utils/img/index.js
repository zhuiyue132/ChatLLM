/*
 * @Author       : zhuiyue132
 * @Date         : 2025-09-19
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/utils/img/index.js
 * @Description  :
 *
 */

/**
 * 修正后端返回的数据中已有裁剪的参数时
 */
const CROP_REG = /_\d+x\d+\./gi

/**
 * 将图片URL转换为base64
 * @param {string} url - 图片URL
 * @returns {Promise<string>} - 返回base64字符串
 */
export const convertImageToBase64 = (url, size) => {
  if (!url) return ''

  // 处理淘宝图片URL格式问题
  url = url.replace('//img.alicdn.com/imgextrahttps', 'https')
  url = url.replace('/imgextra/', '/')

  if (CROP_REG.test(url)) {
    url = url.split(url.match(CROP_REG)[0])[0]
  }

  if (size) {
    url = url + `_${size}x${size}.jpg`
  }

  return new Promise(resolve => {
    try {
      // 创建图片对象
      const img = new Image()
      img.crossOrigin = 'anonymous' // 关键：设置跨域

      // 图片加载成功回调
      img.onload = () => {
        try {
          // 创建canvas
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height

          if (canvas.width < 10 || canvas.height < 10) {
            resolve('')
          } else {
            // 绘制图片到canvas
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)

            // 转换为base64
            const base64 = canvas.toDataURL('image/png')
            resolve(base64)
          }
        } catch (error) {
          resolve('')
        }
      }

      // 图片加载失败回调
      img.onerror = () => {
        console.log('图片加载失败')
        resolve('')
      }

      // 设置图片源
      img.src = url
    } catch (error) {
      console.log('图片加载失败')
      resolve('')
    }
  })
}

export const formatImageLink = url => {
  const str = url
    .replace('//img.alicdn.com/imgextrahttps', 'https')
    .replace('//img.alicdn.com/imgextra//', 'https://')
    .replace('/imgextra/', '/')
  return str.startsWith('//') ? `https://${str}` : str
}
