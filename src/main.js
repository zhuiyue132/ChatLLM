/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-15
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/main.js
 * @Description  :
 *
 */

/* eslint-disable no-undef */
import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createPinia } from 'pinia'
import { processPolyfill } from '@/utils'
import { vTitle, vXsLoading, vOverflowTitle } from '@/directives'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn' // 导入dayjs中文语言包
import './styles/index.scss'
import 'element-plus/theme-chalk/src/index.scss'
import 'github-markdown-css/github-markdown-light.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

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
