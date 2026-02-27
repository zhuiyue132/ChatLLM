<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-10-24
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-21
 * @FilePath     : /bi-agents/src/components/dialog/history-search-dialog.vue
 * @Description  : 历史记录搜索弹窗
 *
-->

<template>
  <bi-dialog
    v-model="dialogVisible"
    title="历史记录"
    width="812px"
    lock-scroll
    close-on-click-modal
    destroy-on-close
    custom-class="history-search-dialog"
    :show-footer="false"
    @close="handleClose"
  >
    <!-- 内容区域 -->
    <div class="dialog-body">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <!-- 智能体下拉选择 -->

        <el-input
          v-model="searchKeyword"
          style="max-width: 437px"
          placeholder="搜索聊天..."
          clearable
          class="input-with-select"
        >
          <template #prepend>
            <el-select
              v-model="selectedAgent"
              placeholder="全部"
              popper-class="agent-select-popper"
              filterable
              :filter-method="filterAgents"
              :show-arrow="false"
              :offset="4"
            >
              <el-option
                v-for="agent in filteredAgentList"
                :key="agent.value"
                :label="agent.label"
                :value="agent.value"
              />
            </el-select>
          </template>
          <template #prefix>
            <i class="iconfont icon-search"></i>
          </template>
        </el-input>
      </div>

      <!-- 历史记录列表 -->
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

            <!-- 没有更多数据提示 -->
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
import BiDialog from './index.vue'
import { useMagicKeys, useDebounceFn } from '@vueuse/core'
import { AgentEmpty } from '@/components'
import { historyRetrievalApi } from '@/api/agents'

defineOptions({
  name: 'HistorySearchDialog'
})

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 智能体列表
  agentList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'select-item'])

// 弹窗显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

// 搜索关键词
const searchKeyword = ref('')

// 选中的智能体
const selectedAgent = ref('all')

// 当前选中的历史记录索引
const currentSelectedIndex = ref(-1)

// 过滤后的智能体列表
const filteredAgentList = ref(props.agentList)

// 过滤智能体方法
const filterAgents = query => {
  if (query) {
    filteredAgentList.value = props.agentList.filter(agent =>
      agent.label.toLowerCase().includes(query.toLowerCase())
    )
  } else {
    filteredAgentList.value = props.agentList
  }
}

// 过滤 HTML 标签
const stripHtmlTags = text => {
  if (!text) return ''
  // 创建一个临时 DOM 元素来解析 HTML
  const div = document.createElement('div')
  div.innerHTML = text
  // 返回纯文本内容
  return div.textContent || div.innerText || ''
}

// 历史记录列表（从接口获取）
const filteredHistoryList = ref([])

// 加载状态
const loading = ref(false)

// 搜索历史记录
const fetchHistoryList = async () => {
  // 如果搜索关键词为空或只包含空格等无意义字符，显示空列表
  const trimmedKeyword = searchKeyword.value?.replace(/\s+/g, '') || ''
  if (!trimmedKeyword) {
    filteredHistoryList.value = []
    return
  }

  try {
    loading.value = true
    const params = {
      agentId: (selectedAgent.value === 'all' ? null : selectedAgent.value) || null,
      queryStr: searchKeyword.value
    }
    const res = await historyRetrievalApi(params)

    console.log(res)

    if (res.data.code === 0) {
      // 转换数据格式，统一成外部传入的 history 格式
      const data = res.data?.data || []
      filteredHistoryList.value = data.map(item => ({
        chatDetailId: item.chatDetailId,
        content: item.matchContent,
        agentId: item.agentId,
        agentHeadUrl: item.agentHeadUrl,
        date: item.date,
        taskId: item.taskId,
        role: item.role
      }))
    } else {
      filteredHistoryList.value = []
    }
  } catch (error) {
    console.error('获取历史记录失败:', error)
    filteredHistoryList.value = []
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 1000)
  }
}

// 防抖搜索
const debouncedSearch = useDebounceFn(() => {
  fetchHistoryList()
}, 500)

// 监听搜索关键词和智能体选择变化
watch([searchKeyword, selectedAgent], () => {
  debouncedSearch()
})

// 键盘事件处理
const handleKeydown = event => {
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
  }
}

// 滚动到选中项
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

// 处理历史记录点击
const handleItemClick = item => {
  emit('select-item', item)
  handleClose()
}

// 关闭弹窗
const handleClose = () => {
  dialogVisible.value = false
  // 重置搜索条件和数据
  searchKeyword.value = ''
  selectedAgent.value = 'all'
  currentSelectedIndex.value = -1
  filteredHistoryList.value = []
}

// 监听弹窗显示状态
watch(dialogVisible, val => {
  if (val) {
    // 弹窗打开时，重置选中索引
    currentSelectedIndex.value = -1
    // 初始加载历史记录
    fetchHistoryList()
    // 添加键盘事件监听
    nextTick(() => {
      document.addEventListener('keydown', handleKeydown)
    })
  } else {
    // 弹窗关闭时，移除键盘事件监听
    document.removeEventListener('keydown', handleKeydown)
  }
})

// 监听筛选列表变化，重置选中索引
watch(filteredHistoryList, () => {
  currentSelectedIndex.value = -1
})

const { ctrl_k, command_k, ctrl_option } = useMagicKeys()
watch([ctrl_k, command_k, ctrl_option], v => {
  if (v.some(v => v)) {
    dialogVisible.value = true
  }
})

// 组件卸载时移除事件监听
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
.input-with-select .el-input-group__prepend {
  background-color: var(--el-fill-color-blank);
}

div.agent-select-popper.el-select__popper {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: var(--shadow-dropdown);

  --el-fill-color-light: var(--bg-highlight);
}

.history-search-dialog {
  .el-dialog__body {
    padding: 0;
  }
}
</style>
