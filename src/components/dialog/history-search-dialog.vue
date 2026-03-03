<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-10-24
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-03-03
 * @FilePath     : /ChatLLM/src/components/dialog/history-search-dialog.vue
 * @Description  : 对话历史搜索弹窗（本地消息级检索）
 *
-->

<template>
  <bi-dialog
    v-model="dialogVisible"
    title="搜索对话"
    width="812px"
    lock-scroll
    close-on-click-modal
    destroy-on-close
    custom-class="history-search-dialog"
    :show-footer="false"
    @close="handleClose"
  >
    <div class="dialog-body">
      <div class="search-bar">
        <el-input
          ref="searchInputRef"
          v-model="searchKeyword"
          style="max-width: 437px"
          placeholder="搜索聊天..."
          clearable
          class="input-with-select"
        >
          <template #prefix>
            <i class="iconfont icon-search"></i>
          </template>
        </el-input>
      </div>

      <div class="history-list">
        <el-scrollbar>
          <div
            v-if="loading"
            v-xs-loading="loading"
            class="no-data"
            style="height: calc(100vh - 500px)"
          ></div>
          <div v-else class="history-items">
            <div
              v-for="(item, index) in filteredHistoryList"
              :key="item.chatDetailId"
              class="history-item"
              :class="{ selected: currentSelectedIndex === index }"
              :tabindex="index + 2"
              @click="handleItemClick(item)"
            >
              <div class="item-content">
                <div class="item-icon">
                  <i class="iconfont icon-duihua"></i>
                </div>
                <p v-overflow-title="stripHtmlTags(item.content)" class="item-text">
                  {{ stripHtmlTags(item.content) }}
                </p>
              </div>
            </div>

            <div v-if="!loading && filteredHistoryList.length === 0" class="no-data">
              <AgentEmpty
                type="search"
                :description="searchKeyword ? '没有找到相关记录' : '请先输入关键词进行搜索'"
                class="no-data-empty"
              />
            </div>
            <div v-else-if="!loading && filteredHistoryList.length > 0" class="no-more">
              <span class="no-more-text">没有更多数据了</span>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>
  </bi-dialog>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import AgentEmpty from '@/components/empty/index.vue'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import BiDialog from './index.vue'

defineOptions({
  name: 'HistorySearchDialog'
})

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'select-item'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const chatRoomsStore = useChatRoomsStore()
const searchInputRef = ref(null)
const searchKeyword = ref('')
const currentSelectedIndex = ref(-1)
const filteredHistoryList = ref([])
const loading = ref(false)

const MAX_RESULT_COUNT = 100

const stripHtmlTags = text => {
  if (!text) return ''
  const div = document.createElement('div')
  div.innerHTML = text
  return div.textContent || div.innerText || ''
}

const normalizeKeyword = value => `${value || ''}`.trim().toLowerCase()
const normalizeForFuzzy = value => normalizeKeyword(value).replace(/\s+/g, '')

const getFuzzyScore = (text, keyword) => {
  const normalizedText = normalizeForFuzzy(text)
  const normalizedKeyword = normalizeForFuzzy(keyword)
  if (!normalizedText || !normalizedKeyword) return -1

  const exactIndex = normalizedText.indexOf(normalizedKeyword)
  if (exactIndex >= 0) {
    return 1000 - exactIndex * 2 - (normalizedText.length - normalizedKeyword.length)
  }

  let queryIndex = 0
  let firstMatchIndex = -1
  let lastMatchIndex = -1

  for (let textIndex = 0; textIndex < normalizedText.length; textIndex += 1) {
    if (normalizedText[textIndex] === normalizedKeyword[queryIndex]) {
      if (firstMatchIndex === -1) firstMatchIndex = textIndex
      lastMatchIndex = textIndex
      queryIndex += 1
      if (queryIndex >= normalizedKeyword.length) break
    }
  }

  if (queryIndex !== normalizedKeyword.length || firstMatchIndex === -1 || lastMatchIndex === -1) {
    return -1
  }

  const compactness = lastMatchIndex - firstMatchIndex + 1 - normalizedKeyword.length
  return 600 - compactness * 2 - firstMatchIndex
}

const collectRoomMessages = roomId => {
  const tree = chatRoomsStore.getMessageTree(roomId)
  if (!tree || !Array.isArray(tree.children) || tree.children.length === 0) {
    return []
  }

  const list = []
  const stack = [...tree.children]

  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue

    const plainText = stripHtmlTags(node.content)
    if (plainText.trim()) {
      list.push({
        chatDetailId: node.id,
        taskId: roomId,
        content: plainText,
        role: node.role,
        createdAt: node.createdAt || ''
      })
    }

    if (Array.isArray(node.children) && node.children.length > 0) {
      stack.push(...node.children)
    }
  }

  return list
}

const getSearchCandidates = () => {
  const rooms = [...chatRoomsStore.rooms]
  if (!rooms.length) return []

  const roomMap = new Map(rooms.map(room => [room.id, room]))
  const messages = rooms.flatMap(room => collectRoomMessages(room.id))

  return messages.map(message => {
    const room = roomMap.get(message.taskId)
    return {
      ...message,
      roomTitle: room?.title || '新对话',
      roomUpdatedAt: room?.updatedAt || '',
      aiModel: room?.model || ''
    }
  })
}

const fetchHistoryList = async () => {
  const trimmedKeyword = normalizeForFuzzy(searchKeyword.value)
  if (!trimmedKeyword) {
    filteredHistoryList.value = []
    return
  }

  try {
    loading.value = true
    const keyword = searchKeyword.value
    const candidates = getSearchCandidates()

    filteredHistoryList.value = candidates
      .map(item => ({
        ...item,
        _score: getFuzzyScore(item.content, keyword)
      }))
      .filter(item => item._score >= 0)
      .sort((a, b) => {
        if (b._score !== a._score) {
          return b._score - a._score
        }
        return (
          new Date(b.createdAt || b.roomUpdatedAt).getTime() -
          new Date(a.createdAt || a.roomUpdatedAt).getTime()
        )
      })
      .slice(0, MAX_RESULT_COUNT)
  } catch (error) {
    console.error('获取历史记录失败:', error)
    filteredHistoryList.value = []
  } finally {
    loading.value = false
  }
}

const debouncedSearch = useDebounceFn(() => {
  fetchHistoryList()
}, 500)

watch(searchKeyword, () => {
  debouncedSearch()
})

const focusSearchInput = () => {
  nextTick(() => {
    searchInputRef.value?.focus?.()
  })
}

const scrollToSelectedItem = () => {
  nextTick(() => {
    const selectedElement = document.querySelector('.history-item.selected')
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  })
}

const handleItemClick = item => {
  emit('select-item', item)
  handleClose()
}

const handleKeydown = event => {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
    return
  }

  const listLength = filteredHistoryList.value.length
  if (listLength === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      currentSelectedIndex.value = (currentSelectedIndex.value + 1) % listLength
      scrollToSelectedItem()
      break
    case 'ArrowUp':
      event.preventDefault()
      currentSelectedIndex.value =
        currentSelectedIndex.value <= 0 ? listLength - 1 : currentSelectedIndex.value - 1
      scrollToSelectedItem()
      break
    case 'Enter':
      event.preventDefault()
      if (currentSelectedIndex.value >= 0 && currentSelectedIndex.value < listLength) {
        handleItemClick(filteredHistoryList.value[currentSelectedIndex.value])
      }
      break
    default:
      break
  }
}

const handleClose = () => {
  dialogVisible.value = false
  searchKeyword.value = ''
  currentSelectedIndex.value = -1
  filteredHistoryList.value = []
}

watch(dialogVisible, val => {
  if (val) {
    currentSelectedIndex.value = -1
    nextTick(() => {
      document.addEventListener('keydown', handleKeydown)
    })
    focusSearchInput()
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

watch(filteredHistoryList, list => {
  if (!Array.isArray(list) || list.length === 0) {
    currentSelectedIndex.value = -1
    return
  }
  currentSelectedIndex.value = 0
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
:deep(.history-search-dialog) {
  .bi-dialog__body {
    padding: 0;
  }
}

.dialog-body {
  display: flex;
  flex-direction: column;
  padding: 0;

  .search-bar {
    margin: 16px 24px 24px;
  }

  .history-list {
    flex: 0 0 auto;
    height: calc(100vh - 500px);
    min-height: 400px;

    :deep(.el-scrollbar) {
      height: 100%;

      .el-scrollbar__wrap {
        overflow-x: hidden;
      }
    }

    .history-items {
      display: flex;
      flex-direction: column;

      @include flex-gap(4px, column);

      .history-item {
        display: flex;
        align-items: center;
        margin: 0 10px;
        padding: 4px 12px;
        cursor: pointer;
        transition: background-color 0.2s;
        border-radius: 8px;

        &:hover {
          background: var(--bg-highlight);
        }

        &.selected {
          background: var(--bg-highlight);
        }

        .item-content {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;

          @include flex-gap(8px, row);

          .item-icon {
            .icon-duihua {
              font-size: 20px;
            }
          }

          .item-text {
            overflow: hidden;
            flex: 1;
            margin: 0;
            white-space: nowrap;
            text-overflow: ellipsis;
            color: var(--text-normal-color);
            font-family: 'Source Han Sans CN', sans-serif;
            font-size: 16px;
            font-weight: 400;
            line-height: 2;
          }
        }
      }

      .no-data,
      .no-more {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px 0;
        user-select: none;

        .no-data-text,
        .no-more-text {
          color: var(--text-light-color);
          font-family: 'Source Han Sans CN', sans-serif;
          font-size: 12px;
          font-weight: 400;
          line-height: normal;
        }
      }
    }
  }
}
</style>
<style lang="scss">
.history-search-dialog {
  .el-dialog__body {
    padding: 0;
  }
}
</style>
