/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-23
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-25
 * @FilePath     : /bi-agents/src/utils/copy/index.js
 * @Description  :
 *
 */
import useClipboard from 'vue-clipboard3'
import { showMessage } from '@/hooks/use-message'

const { toClipboard } = useClipboard()

export const onCopy = async (val, { message, showNotify = true } = {}) => {
  try {
    await toClipboard(val.toString())
    showNotify && showMessage(message || '复制成功！', { type: 'success' })
  } catch (e) {
    console.log(e)
  }
}
