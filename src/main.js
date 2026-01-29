/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-15
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-29
 * @FilePath     : /ChatLLM/src/main.js
 * @Description  :
 *
 */

/* eslint-disable no-undef */
import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import { createPinia } from 'pinia'
import { processPolyfill } from '@/utils'
import { vTitle, vXsLoading, vOverflowTitle } from '@/directives'
import localforage from 'localforage'
import stringify from 'json-stringify-safe'
import { createPersistedStatePlugin } from 'pinia-plugin-persistedstate-2'

import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn' // 导入dayjs中文语言包
import './styles/index.scss'
import 'element-plus/theme-chalk/src/index.scss'
import 'github-markdown-css/github-markdown-light.css'

const pinia = createPinia()
pinia.use(
  createPersistedStatePlugin({
    serialize: value => stringify(value),
    storage: {
      getItem: key => localforage.getItem(key),
      setItem: (key, value) => localforage.setItem(key, value),
      removeItem: key => localforage.removeItem(key)
    }
  })
)

dayjs.locale('zh-cn')

const app = createApp(App)
app.use(pinia)
app.use(vTitle)
app.use(vXsLoading)
app.use(vOverflowTitle)
app.use(processPolyfill)
app.use(router)
app.mount('#app')

if (window.history.scrollRestoration) {
  window.history.scrollRestoration = 'manual'
}
