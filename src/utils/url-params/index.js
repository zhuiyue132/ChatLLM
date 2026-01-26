/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-11
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-11
 * @FilePath     : /bi-agents/src/utils/url-params/index.js
 * @Description  : 从url中获取指定参数的值
 *
 */

export function getUrlParams(key, _url = window.location.href) {
  const url = new URL(_url)
  const params = new URLSearchParams(url.search)
  return params.get(key)
}
