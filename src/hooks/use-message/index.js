/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-16
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-10-16
 * @FilePath     : /bi-agents/src/hooks/use-message/index.js
 * @Description  : 统一消息提示的来源，避免全局修改；
 */

import { ElMessage, ElNotification } from 'element-plus'

const messageInstances = new Map()
const notificationInstances = new Map()

const createMessageHandler = (instanceMap, createFn) => {
  return (message, { type = 'warning', duration = 2000, force = false, ...rest } = {}) => {
    if (!message) return null

    const key = `${message}_${type}`

    if (instanceMap.has(key) && !force) {
      return instanceMap.get(key)
    }

    const instance = createFn({
      type,
      message,
      duration,
      ...rest,
      // 添加 onClose 回调，监听消息关闭事件
      onClose: () => {
        // 先执行用户自定义的 onClose
        rest.onClose?.()
        // 从 Map 中删除实例引用
        instanceMap.delete(key)
      }
    })

    instanceMap.set(key, instance)

    // 当 duration 不为 0 时，设置超时删除（作为兜底机制）
    if (duration !== 0) {
      setTimeout(() => {
        instanceMap.delete(key)
      }, duration)
    }

    return instance
  }
}

export const showMessage = createMessageHandler(messageInstances, options => ElMessage(options))

export const showNotification = createMessageHandler(notificationInstances, options =>
  ElNotification(options)
)
