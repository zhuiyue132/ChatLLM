/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-08
 * @FilePath     : /bi-agents/src/utils/popper/index.js
 * @Description  : popper 配置
 *
 */

/**
 * 设置 popper 位置(可以使用该方法设置element-plus的弹出框位置，有些弹出框隐藏箭头后，需要设置偏移量才会更靠近触发器)
 * @param {*} x
 * @param {*} y
 * @returns
 */
export const setPopperPosition = (x = 0, y = 0) => {
  return {
    modifiers: [{ name: 'offset', options: { offset: [x, y] } }]
  }
}
