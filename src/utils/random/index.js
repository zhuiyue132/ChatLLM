/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-28
 * @FilePath     : /bi-agents/src/utils/random/index.js
 * @Description  : 随机类的函数集合
 *
 */

/**
 * 获取随机码
 * @returns {string}
 */
export const getRandomCode = () => {
  return Math.random().toString(32).slice(2)
}

/**
 * 获取uuid
 * @returns {string}
 */
export const uuid = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 32; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    id += chars.charAt(randomIndex)
  }

  return id
}
