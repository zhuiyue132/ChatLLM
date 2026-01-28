/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-15
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/router/index.js
 * @Description  : 路由配置
 *
 */
import { createRouter, createWebHistory } from 'vue-router'
import { BASE_URL } from '@/config/app'

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

export default router
