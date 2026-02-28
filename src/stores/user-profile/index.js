/*
 * @Author       : zhuiyue132
 * @Date         : 2026-02-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/src/stores/user-profile/index.js
 * @Description  : 用户信息状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const DEFAULT_USERNAME = 'User'

export const useUserProfileStore = defineStore(
  'user-profile',
  () => {
    const username = ref(DEFAULT_USERNAME)
    const avatarBase64 = ref('')

    const displayName = computed(() => {
      const trimmedName = `${username.value || ''}`.trim()
      return trimmedName || DEFAULT_USERNAME
    })

    const updateProfile = config => {
      if (!config) return
      if (config.username !== undefined) username.value = `${config.username || ''}`
      if (config.avatarBase64 !== undefined) avatarBase64.value = config.avatarBase64 || ''
    }

    const updateUsername = value => {
      username.value = `${value || ''}`
    }

    const updateAvatar = value => {
      avatarBase64.value = value || ''
    }

    const resetProfile = () => {
      username.value = DEFAULT_USERNAME
      avatarBase64.value = ''
    }

    return {
      username,
      avatarBase64,
      displayName,
      updateProfile,
      updateUsername,
      updateAvatar,
      resetProfile
    }
  },
  {
    persist: {
      key: 'chat-llm-user-profile'
    }
  }
)
