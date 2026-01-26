/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-25
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-25
 * @FilePath     : /bi-agents/src/utils/nexttick/index.js
 * @Description  :
 *
 */

export const wait = (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
