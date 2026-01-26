/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-09-16
 * @FilePath     : /bi-agents/src/utils/avatar/index.js
 * @Description  :
 *
 */
import { base10Colors } from '@/config/color'
import defaultAvatar from '@/assets/images/common/default-avatar-white.svg'

// 基础10色里面有11个色值，只取前10个；
const colors = [...base10Colors].slice(0, 10)

/**
 * @description 获取用户的对应转换颜色的编号，userid 末位是数字时，直接用作颜色的索引，否则取末尾的ascii编码的末位做颜色的索引；
 * @param {String} id: 用户Id
 * @returns {Number} 返回用来获取颜色的下标
 */
const getUserId = id => {
  if (!id) return 0
  const lastStr = id.toString().slice(-1)
  if (Number.isNaN(+lastStr)) {
    // 末位不是数字；
    return +lastStr.charCodeAt().toString().slice(-1)
  } else {
    return +lastStr
  }
}
/**
 * @description 通过下标号获取颜色值
 * @param {String} index: 索引
 * @returns {String} 返回 对应的颜色值
 */

const getColor = index => colors[index]

/**
 * @description 获取头像使用的canvas图片
 * @param {String} name : 用户名称
 * @param {String} color : canvas的背景颜色
 * @returns {String} 返回 canvas的图片引用路径
 */
const getImage = (name, color, { size = 144, fontWeight = 'normal', fontSize: fz = '' } = {}) => {
  let canvas = document.createElement('canvas')
  canvas.width = canvas.height = size * window.devicePixelRatio
  const context = canvas.getContext('2d')

  context.fillStyle = color
  context.fillRect(0, 0, canvas.width, canvas.height)
  const fontSize =
    fz || fontWeight === 'bold' ? Math.round(canvas.width / 3) : Math.round(canvas.width / 2) - 12
  context.font = `${fontWeight} ${fontSize}px/1 Microsoft Yahei`

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#FFF'
  context.fillText(
    `${name || ''}`.replace(/\s+/g, ''),
    canvas.width / 2,
    canvas.height / 2 + fontSize * 0.1
  )
  return canvas.toDataURL()
}
/**
 * @description 获取用户名称后两位
 * @param {String} username : 用户名称
 * @returns {String}
 */
const getName = (username = '') => {
  return `${username || ''}`.slice(-2)
}
/**
 * @description 获取用户头像
 * @param {String} username : 用户名称
 * @param {String} id : 用户id
 * @param {String} url : 用户头像url
 * @param {Object} options : 配置头像大小、字体字重
 * @returns {String}
 */
export const getAvatar = (
  username = '',
  id = '',
  url = '',
  options = { size: 144, fontWeight: 'normal' }
) => {
  // 负责人id, 姓名，头像;

  if (url) {
    const isDefaultAvatar = ['yhtx_', 'default_avatar', 'defaultImg']
      .map(str => url.includes(str))
      .some(Boolean)
    // 如果不是默认头像，就使用用户头像url
    if (!isDefaultAvatar) {
      return url
    }
  }
  // 默认头像
  // 获取随机颜色下标
  const uid = getUserId(id)
  // 通过id下标获取颜色值
  const color = getColor(uid)
  // 获取用户名后两位
  const name = getName(username)
  // 如果没有 名称，使用默认头像
  if (!name) return defaultAvatar
  // 如果有 使用canvas生成的头像
  return getImage(name, color, options)
}
