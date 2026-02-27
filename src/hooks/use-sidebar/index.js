/*
 * @Author       : zhuiyue132
 * @Date         : 2025-12-15
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/hooks/use-sidebar/index.js
 * @Description  : 侧边栏钩子
 *
 */
import { ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { SIDEBAR_COLLAPSED_KEY } from '@/config/app'

// 移动端检测（模块级共享）
const isMobile = useMediaQuery('(max-width: 768px)')

// 侧边栏展开/收起状态
const isCollapsed = ref(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
const widthSidebarCollapsed = ref(210)
const widthSidebarExpanded = ref(280)

// 进入移动端时自动收起侧边栏
watch(
  isMobile,
  mobile => {
    if (mobile) {
      isCollapsed.value = true
    }
  },
  { immediate: true }
)

export const useSidebar = () => {
  const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value

    // 移动端不持久化折叠状态
    if (!isMobile.value) {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, Number(isCollapsed.value))
    }
  }

  const closeSidebar = () => {
    isCollapsed.value = true
    if (!isMobile.value) {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1')
    }
  }

  return {
    isMobile,
    isCollapsed,
    widthSidebarCollapsed,
    widthSidebarExpanded,
    toggleSidebar,
    closeSidebar
  }
}
