/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-15
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-29
 * @FilePath     : /ChatLLM/src/router/index.js
 * @Description  : 路由配置
 *
 */
import { createRouter, createWebHistory } from 'vue-router'
import { BASE_URL } from '@/config/app'
import * as stores from '@/stores'

const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: '/completions'
  },
  // AI对话补全-首页
  {
    path: '/completions',
    name: 'Completions',
    meta: {
      requireAuth: true,
      withoutFooter: true,
      showBackBtn: false
    },
    component: () => import('@/views/completions/index.vue')
  },
  // AI对话补全-对话页面
  {
    path: '/completions/chat',
    name: 'CompletionsChat',
    meta: {
      requireAuth: true,
      withoutFooter: true,
      showBackBtn: true
    },
    component: () => import('@/views/completions/chat.vue')
  },
  {
    path: '/404',
    name: 'NotFound',
    meta: {
      showBackBtn: false,
      layout: 'normal'
    },
    component: () => import('@/views/common/404.vue')
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotAllFound',
    meta: {
      layout: 'normal'
    },
    redirect: { name: 'NotFound', replace: true } // 修改此处，将通配符路由重定向到NotFound并替换历史记录
  }
]

const router = createRouter({
  history: createWebHistory(BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  // When entering the page for the first time, initialize all stores once;
  // This can avoid the problem that when const { xxx } = storeToRefs(xxxStore), the first xxx.value is the default value instead of the value in the persistent storage, and xxx.value becomes the value in the persistent storage after a few milliseconds;
  // The reason for the problem: pinia is synchronous while localforage is asynchronous, resulting in an asynchronous time difference in pinia's initialization of local persistent storage data, causing the first data obtained to be the default value;
  // If the persistent storage is localstorage or sessionStorage, this is not necessary, because the APIs of these two are synchronous;
  // The localforage API is asynchronous because of the nature of indexDB, as indexDB's API is inherently asynchronous, so it cannot be changed to a synchronous API;
  if (!from.name) {
    Object.keys(stores).forEach(storeName => stores[storeName]())
  }

  next()
})

export default router
