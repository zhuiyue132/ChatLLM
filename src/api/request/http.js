/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-26
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/api/request/http.js
 * @Description  :
 *
 */

import axios from 'axios'
import qs from 'qs'
import { showMessage, showNotification } from '@/hooks/use-message'

// 默认的请求头content-type;
const CONTENT_TYPE_DEFAULT = `application/json;chareset=UTF-8`

// 取消重复的请求
const pending = [] // 声明一个数组用于存储每个请求的取消函数和axios标识
const CancelToken = axios.CancelToken

/**
 * 通过url、请求方法和参数等数据，组合请求的标识，不同的请求标识不一样
 * 区分添加参数和不添加参数
 * eg：快速切换日历组件，url和请求方法相同，参数不同，但是只要最后请求的结果即可
 * @param {Object} config
 * @returns String
 */
const createRequestFlag = config => {
  const url = config.url.split('?')[0] + '&' + config.method

  // 处理 FormData
  const serializeFormData = formData => {
    const data = []
    formData.forEach((value, key) => {
      data.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    })
    return data.join('&')
  }

  let dataString = ''
  if (typeof config.data === 'object') {
    try {
      if (config.data instanceof FormData) {
        dataString = serializeFormData(config.data)
      } else {
        dataString = qs.stringify(config.data)
      }
    } catch (error) {
      console.log('error: ', error)
    }
  } else {
    dataString = config.data
  }

  return config.cancelByUrl ? url : url + qs.stringify(config.params) + dataString
}

/**
 * 移除请求
 * @param {Object} config
 */
const removePending = config => {
  const requestFlag = createRequestFlag(config)
  for (const p in pending) {
    if (pending[p].requestFlag === requestFlag) {
      // 当前请求在数组中存在时执行函数体
      pending[p].cancel('取消重复请求接口：' + config.url) // 执行取消操作
      pending.splice(p, 1) // 数组移除当前请求
    }
  }
}

// ********************************** 请求响应处理 **********************************
axios.interceptors.response.use(async response => {
  if (!response) return
  removePending(response.config) //在一个ajax响应后再执行一下取消操作，把已经完成的请求从pending中移除

  // 否则再次处理
  return responseHandler(response)
})

// 响应处理
const responseHandler = response => {
  return response.data
}

// ********************************** 请求方法 **********************************
/**
 *接口请求方法;
 * @param {String} url  请求路径，如/user/getUser(无论是真实接口还是mock接口，都只需要写短路径)
 * @param {Object} params 请求参数
 * @param {Object} config 额外配置，{ mock: true } 如果mock字段为true，则默认启用easy-mock的接口;
 */
const request = (url, params, config) => {
  const {
    method,
    timeout = 60000,
    headers = {},
    responseType = 'json',
    cancelByUrl = false,
    isMessage,
    // 自定义baseUrl
    customBaseUrl,
    // 是否携带请求凭证
    withCredentials = false,
    ignoreRepeatRequest = false,
    signal
  } = config

  const contentType = headers?.['Content-Type'] || headers?.contentType || CONTENT_TYPE_DEFAULT

  let baseUrl = import.meta.env.VITE_APP_WEB_URL

  // 自定义baseUrl
  if (typeof customBaseUrl !== 'undefined') {
    baseUrl = customBaseUrl
  }

  const newHeaders = {
    'Content-Type': contentType,
    Authorization: `Bearer ${import.meta.env.VITE_APP_API_KEY}`,
    ...headers
  }

  const option = {
    url: baseUrl + url,
    method,
    timeout,
    cancelByUrl,
    isMessage,
    withCredentials,
    data: params,
    responseType,
    headers: newHeaders,
    // 允许 400 状态码进入 response 回调
    validateStatus: function (status) {
      return status >= 200 && status < 500
    }
  }

  if (option.method?.toLowerCase?.() === 'get') {
    option.params = params
    option.paramsSerializer = p => qs.stringify(p, { indices: false })
  }

  // 在一个axios发送前执行一下取消操作
  if (!ignoreRepeatRequest) {
    removePending(option)
    option.cancelToken = new CancelToken(c => {
      // pending存放每一次请求的标识，一般是url + 参数名 + 请求方法，当然你可以自己定义
      pending.push({
        requestFlag: createRequestFlag(option),
        cancel: c
      })
    })
  }

  // 用于 AbortController 取消请求
  if (signal) {
    option.signal = signal
  }
  return axios(option).catch(err => {
    if (axios.isCancel(err)) {
      console.log('错误处理，请求重复: ' + err.message)
    } else {
      // 处理错误码
    }
    return Promise.reject(err)
  })
}

/**************兼容以前的接口调用方式**************/
/**
 *
 * @param {*} url 接口路径
 * @param {*} params 请求参数
 * @param {*} config 接口其他配置，如超时时间，请求头，响应类型等
 * @returns
 */
const get = (url, params, config = {}) => {
  return request(url, params, { ...config, method: 'get' })
}
const post = (url, params, config = {}) => {
  return request(url, params, { ...config, method: 'post' })
}

const isCancelError = err => {
  return err?.__proto__?.__CANCEL__ === true
}

export { get, post, isCancelError }
