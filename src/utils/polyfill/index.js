/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-16
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-18
 * @FilePath     : /bi-agents/src/utils/polyfill/index.js
 * @Description  : 兼容性处理
 *
 */
import cloneDeep from 'lodash-es/cloneDeep'

function at(num) {
  let n = num
  // ToInteger() abstract op
  n = Math.trunc(n) || 0
  // Allow negative indexing from the end
  if (n < 0) n += this.length
  // OOB access is guaranteed to return undefined
  if (n < 0 || n >= this.length) return undefined
  // Otherwise, this is just normal property access
  return this[n]
}

export const processPolyfill = () => {
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (oldString, newString) {
      return this.replace(new RegExp(oldString, 'gm'), newString)
    }
  }

  if (!Array.prototype.at) {
    const TypedArray = Reflect.getPrototypeOf(Int8Array)
    for (const C of [Array, String, TypedArray]) {
      Object.defineProperty(C.prototype, 'at', {
        value: at,
        writable: true,
        enumerable: false,
        configurable: true
      })
    }
  }

  if (typeof structuredClone === 'undefined') {
    // 使用 Lodash 的 cloneDeep 或其他库
    window.structuredClone = cloneDeep
  }
}
