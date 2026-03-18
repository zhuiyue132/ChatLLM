/*
 * @Author       : zhuiyue132
 * @Date         : 2026-03-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-17
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-chat-search-target.js
 * @Description  : Completions 聊天页消息搜索定位（滚动/高亮/分支同步）
 */

import { nextTick, onBeforeUnmount, watch } from 'vue'

const SEARCH_TARGET_HIGHLIGHT_CLASS = 'is-search-target'
const SEARCH_TARGET_HIGHLIGHT_DURATION = 2200

export const useChatSearchTarget = ({
  roomId,
  displayChatHistory,
  route,
  router,
  chatRoomsStore
} = {}) => {
  let searchTargetHighlightTimer = null
  let isClearingSearchTargetParam = false

  const resolveSearchTargetMessageId = () => {
    const routeChatDetailId = route?.query?.chatDetailId
    const rawId = Array.isArray(routeChatDetailId) ? routeChatDetailId[0] : routeChatDetailId
    return `${rawId || ''}`.trim()
  }

  const clearSearchTargetHighlight = () => {
    if (searchTargetHighlightTimer) {
      window.clearTimeout(searchTargetHighlightTimer)
      searchTargetHighlightTimer = null
    }
    document
      .querySelectorAll(`.message-wrapper.${SEARCH_TARGET_HIGHLIGHT_CLASS}`)
      .forEach(element => element.classList.remove(SEARCH_TARGET_HIGHLIGHT_CLASS))
  }

  const clearSearchTargetRouteParam = async () => {
    const targetMessageId = resolveSearchTargetMessageId()
    if (!targetMessageId || isClearingSearchTargetParam) return

    const nextQuery = {
      ...(route?.query || {})
    }
    delete nextQuery.chatDetailId

    isClearingSearchTargetParam = true
    try {
      await router.replace({
        path: route.path,
        query: nextQuery
      })
    } catch (error) {
      console.warn('[Completions] 清理搜索定位参数失败', error)
    } finally {
      isClearingSearchTargetParam = false
    }
  }

  const syncConversationBranchBySearchTarget = () => {
    const targetRoomId = `${roomId?.value || ''}`.trim()
    const targetMessageId = resolveSearchTargetMessageId()
    if (!targetRoomId || !targetMessageId) return
    chatRoomsStore.setCurrentIndexByMessageId(targetRoomId, targetMessageId)
  }

  const findSearchTargetElement = targetMessageId => {
    if (!targetMessageId) return null
    const exactElement = document.getElementById(`message-${targetMessageId}`)
    if (exactElement) return exactElement

    const mergedElement = Array.from(
      document.querySelectorAll('.message-wrapper[data-search-message-ids]')
    ).find(element => {
      const aliases = `${element.dataset.searchMessageIds || ''}`
      return aliases.includes(`|${targetMessageId}|`)
    })
    if (mergedElement) {
      return mergedElement
    }

    return null
  }

  const locateSearchTargetMessage = () => {
    const targetMessageId = resolveSearchTargetMessageId()
    if (!targetMessageId) {
      return
    }

    syncConversationBranchBySearchTarget()
    nextTick(() => {
      const targetElement = findSearchTargetElement(targetMessageId)
      if (!targetElement) return

      clearSearchTargetHighlight()
      targetElement.classList.add(SEARCH_TARGET_HIGHLIGHT_CLASS)
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
      clearSearchTargetRouteParam()

      searchTargetHighlightTimer = window.setTimeout(() => {
        targetElement.classList.remove(SEARCH_TARGET_HIGHLIGHT_CLASS)
        searchTargetHighlightTimer = null
      }, SEARCH_TARGET_HIGHLIGHT_DURATION)
    })
  }

  watch(
    [roomId, () => route.query.chatDetailId],
    () => {
      syncConversationBranchBySearchTarget()
      locateSearchTargetMessage()
    },
    { immediate: true }
  )

  watch(
    () => displayChatHistory.value.length,
    () => {
      if (resolveSearchTargetMessageId()) {
        locateSearchTargetMessage()
      }
    }
  )

  onBeforeUnmount(() => {
    clearSearchTargetHighlight()
  })

  return {
    resolveSearchTargetMessageId,
    locateSearchTargetMessage,
    syncConversationBranchBySearchTarget
  }
}
