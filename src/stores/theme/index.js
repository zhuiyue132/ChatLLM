/*
 * @Author       : zhuiyue132
 * @Date         : 2026-02-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-27
 * @FilePath     : /ChatLLM/src/stores/theme/index.js
 * @Description  : 主题模式状态管理
 */

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { usePreferredDark } from '@vueuse/core'

export const THEME_MODE_OPTIONS = ['system', 'light', 'dark']

export const useThemeStore = defineStore(
  'theme',
  () => {
    const themeMode = ref('system')
    const prefersDark = usePreferredDark()

    const resolvedTheme = computed(() => {
      if (themeMode.value === 'system') {
        return prefersDark.value ? 'dark' : 'light'
      }
      return themeMode.value
    })

    const isDark = computed(() => resolvedTheme.value === 'dark')

    const setThemeMode = mode => {
      if (!THEME_MODE_OPTIONS.includes(mode)) return
      themeMode.value = mode
    }

    return {
      themeMode,
      resolvedTheme,
      isDark,
      setThemeMode
    }
  },
  {
    persist: {
      key: 'chat-llm-theme'
    }
  }
)
