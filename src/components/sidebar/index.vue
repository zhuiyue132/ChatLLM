<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-08-27 19:12:17
 * @FilePath     : /ChatLLM/src/components/sidebar/index.vue
 * @Description  : 侧边栏（入口+历史记录）
 * 
-->
<template>
  <div
    class="sidebar-wrapper"
    :style="{
      '--width-sidebar-block': isCollapsed ? `0` : `${widthSidebarExpanded}px`,
      '--width-sidebar-header': isCollapsed
        ? `${widthSidebarCollapsed}px`
        : `${widthSidebarExpanded}px`
    }"
  >
    <div class="sidebar-block" />
    <div class="sidebar-block sidebar">
      <!-- 顶部标题区域 -->
      <div class="sidebar-header-block" />
      <div class="sidebar-header-block sidebar-header">
        <div class="logo-area">
          <router-link :to="`/`" class="logo-link">
            <h3 class="title">{{ APP_NAME }}</h3>
          </router-link>
        </div>

        <div v-if="isCollapsed" class="sidebar-header-collapsed">
          <div title="展开" class="collapse-btn" @click="toggleSidebar">
            <i class="iconfont icon-fenlan sidebar-header-icon"></i>
          </div>
          <div title="发起对话" class="collapse-btn" @click.stop="handleStartChat">
            <i class="iconfont icon-faqixinduihua sidebar-header-icon"></i>
          </div>
        </div>

        <div
          v-else
          title="收起"
          class="collapse-btn"
          style="margin-right: 8px"
          @click="toggleSidebar"
        >
          <i class="iconfont icon-fenlan sidebar-header-icon"></i>
        </div>
      </div>

      <template v-if="!isCollapsed">
        <!-- 智能体入口 -->
        <div class="agents-section">
          <div
            class="section-item"
            :class="{ active: isActiveStartChat }"
            style="margin-top: 0"
            @click.stop="handleStartChat"
          >
            <div class="item-icon">
              <i class="iconfont icon-faqixinduihua"></i>
            </div>
            <span class="item-text">发起对话</span>
          </div>
        </div>

        <!-- 历史记录 -->
        <el-scrollbar ref="scrollRef" always>
          <div v-if="filteredChatRoomGroupList.length > 0" class="history-section">
            <div v-for="group in filteredChatRoomGroupList" :key="group.key" class="history-list">
              <div>
                <span class="group-name-label">{{ group.groupName }}</span>
              </div>
              <ChatRoomItem
                v-for="chatRoomInfo in group.chatRoomList"
                :key="`chat-room-${chatRoomInfo.agentId}-${chatRoomInfo.taskId}`"
                :chat-room-info="chatRoomInfo"
                :is-active="activeRoomId === chatRoomInfo.taskId"
                @chat-room-item-click="handleChatRoomItemClick($event, chatRoomInfo)"
                @chat-room-item-operation="handleChatRoomItemOperation($event, chatRoomInfo)"
              />
            </div>
            <div class="section-footer">
              <span class="section-footer-label">没有更多数据了</span>
            </div>
          </div>

          <div v-if="isCompleted && filteredChatRoomGroupList.length === 0" class="history-section">
            <AgentEmpty type="search" description="没有更多数据了" class="no-data-empty" />
          </div>
        </el-scrollbar>
      </template>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { setPopperPosition } from '@/utils'
import { useEventBus, useVModel, tryOnMounted } from '@vueuse/core'
import { APP_NAME } from '@/config/app'
import AgentEmpty from '@/components/empty/index.vue'
import {
  AGENT_UNREADCOUNT_COMMAND,
  RECEIVE_CHAT_TASK_COMMAND,
  FETCH_CHAR_HISTORY
} from '@/config/symbol'
import { XsDropdown, XsDropdownMenu, XsDropdownItem } from '@/components/xs-dropdown'
import { useSidebar } from '@/hooks/use-sidebar'

import ChatRoomItem from './chat-room-item/index.vue'
import { useChatRoom } from './hooks/use-chat-room'

defineOptions({
  name: 'CommonSidebar'
})

const props = defineProps({
  platformList: {
    type: Array,
    default: () => []
  },
  platform: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const route = useRoute()

const eventBus = useEventBus(AGENT_UNREADCOUNT_COMMAND)
const eventBusOfReceiveChatTask = useEventBus(RECEIVE_CHAT_TASK_COMMAND)
const eventBusOfHistory = useEventBus(FETCH_CHAR_HISTORY)
const eventBusOfPopover = useEventBus('popover-action')

eventBusOfReceiveChatTask.on(() => {
  // console.log('接收到 RECEIVE_CHAT_TASK_COMMAND 事件', message?.data?.asyncTaskId)

  setTimeout(() => {}, 2000)
})

eventBus.on(({ type, params }) => {
  console.log('接收到消息')
  console.log(type, params)

  startTaskProcess()

  const { agentId, taskId } = params

  const index = chatRoomList.value.findIndex(
    item => item.taskId === taskId && +item.agentId === +agentId
  )

  if (index === -1) return
  const agent = chatRoomList.value[index]

  if (type === 'subtract') {
    chatRoomList.value.splice(index, 1, {
      ...agent,
      unreadReportCount: agent.unreadReportCount - 1
    })
  } else if (type === 'add') {
    chatRoomList.value.splice(index, 1, {
      ...agent,
      unreadReportCount: agent.unreadReportCount + 1
    })
  }
})

const emit = defineEmits(['update:platform'])

const currentPlatform = useVModel(props, 'platform', emit)

const scrollRef = ref()

const {
  isCompleted,
  chatRoomList,
  filteredChatRoomGroupList,
  getChatRoomList,
  pinChatRoom,
  unpinChatRoom,
  renameChatRoom,
  deleteChatRoom,
  createInfiniteScroll
} = useChatRoom(999999999, route)

const { isCollapsed, widthSidebarCollapsed, widthSidebarExpanded, toggleSidebar } = useSidebar()

const activeRoomId = computed(() => {
  return route.query.roomId || null
})

const isActiveStartChat = computed(() => {
  return route.path.includes('/completions')
})

tryOnMounted(() => {})

const handleStartChat = () => {
  router.push({
    path: '/completions'
  })
}

const handlePlatformChange = platform => {
  currentPlatform.value = platform
  router.push({
    path: '/agents',
    query: { platform }
  })
}

const handleChatRoomItemClick = (_event, room) => {
  if (room.taskId === activeRoomId.value && !room.chatDetailId) return

  // 发送关闭popover事件
  eventBusOfPopover.emit('close')

  const query = {
    roomId: room.taskId
  }
  if (room.chatDetailId) {
    query.chatDetailId = room.chatDetailId
  }

  router.replace({
    path: '/completions/chat',
    query
  })

  setTimeout(() => {
    eventBusOfHistory.emit({
      taskId: room.taskId,
      aiModel: room.aiModel
    })
  }, 100)
}

const handleChatRoomItemOperation = async (command, room) => {
  console.log('command', command)
  console.log('room', room)
  switch (command) {
    case 'pin': {
      const res = await pinChatRoom(room)
      if (res) {
        document
          .querySelector(`#chat-room-item-${room?.taskId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      break
    }
    case 'unpin': {
      const res = await unpinChatRoom(room)
      if (res) {
        document
          .querySelector(`#chat-room-item-${room?.taskId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      break
    }
    case 'rename': {
      await renameChatRoom(room)
      break
    }
    case 'delete': {
      // eslint-disable-next-line no-case-declarations
      const res = await deleteChatRoom(room)
      if (res) {
        if (activeRoomId.value === room.taskId) {
          router.replace({
            path: '/completions'
          })
        }
      }
      break
    }
    default: {
      break
    }
  }
}
</script>
<style lang="scss" scoped>
.no-data-empty {
  :deep(.el-empty) {
    padding: 0;

    .el-empty__image {
      margin-bottom: 0;
    }

    .el-empty__description {
      margin: 0;
      margin-top: -24px;
      margin-bottom: 36px;
      color: var(--bi-2045, #8c8c8c);

      .bi-empty__description {
        /* 雅黑-常规-12 */
        font-size: 12px;
        font-weight: 400;
      }
    }
  }
}

.platform-item {
  display: flex;
  justify-content: space-between;
  min-width: 76px;

  @include flex-gap(4px, row);

  .icon-rightPlain {
    margin-right: 0;
    font-size: 12px;
  }

  &.active {
    color: #007e54;
  }
}

.sidebar-block {
  width: var(--width-sidebar-block); // 280px;
  height: 100vh;
  transition: width 0.2s ease;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1999;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border-right: 1px solid #d4dbe9;
  background: #f1f2f4;
  font-family: 'Source Han Sans CN', sans-serif;

  .sidebar-header-block {
    width: auto;
    min-height: 88px;
    padding: 16px 16px 32px;
  }

  .sidebar-header {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1999;
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    justify-content: space-between;
    box-sizing: border-box;
    width: var(--width-sidebar-header);

    @include flex-gap(16px, row);

    .sidebar-header-icon {
      font-size: 24px;
    }

    .sidebar-header-collapsed {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      flex-direction: row;
      justify-content: center;
      box-sizing: border-box;
      height: 40px;
      padding: 8px;
      border: 1px solid #d4dbe9;
      border-radius: 20px;

      @include flex-gap(8px, row);
    }

    .logo-area {
      .title {
        margin: 0;
        margin-bottom: 3px;
        white-space: nowrap;
        color: #000;
        outline: none;
        font-size: 22px;
        font-weight: 700;
        font-style: normal;
      }

      .logo-link {
        text-decoration: none;
        color: #000;
      }
    }

    .collapse-btn {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      justify-content: center;
      box-sizing: border-box;
      cursor: pointer;
      transition: all 0.2s ease;
    }
  }

  .agents-section {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    padding: 0 16px 32px;

    @include flex-gap(8px, row);

    :deep(.el-dropdown) {
      width: 100%;
    }

    .section-item {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      margin-top: 8px;
      padding: 8px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      color: #000;
      border-radius: 8px;
      outline: none;

      @include flex-gap(8px, row);

      &:hover {
        background-color: #e4e4e7;
      }

      &.active {
        background-color: #fff;
      }

      .item-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;

        i {
          font-size: 20px;
        }
      }

      .item-text {
        flex: 1;
        font-size: 16px;
      }

      .icon-arrowRight {
        font-size: 20px;
      }
    }
  }

  .history-section {
    flex: 1;
    height: 100%;
    padding: 0 16px;

    :deep(.el-scrollbar__bar.is-vertical) {
      right: 0;
    }

    :deep(.el-scrollbar) {
      overflow-x: hidden;
      height: 100%;

      .el-scrollbar__wrap.el-scrollbar__wrap--hidden-default {
        height: 100%;
      }
    }

    .history-list {
      display: flex;
      overflow-y: auto;
      flex-direction: column;
      padding-bottom: 24px;
      //   max-height: calc(100vh - 172px);
      // min-height: calc(100vh - 158px);

      @include flex-gap(4px, column);

      .group-name-label {
        color: #8c8c8c;
        font-size: 14px;
        font-weight: 400;
        font-style: normal;
        line-height: normal;
      }
    }

    .section-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px 0;
      user-select: none;

      .section-footer-label {
        color: #595959;
        font-size: 12px;
        font-weight: 400;
        font-style: normal;
        line-height: normal;
      }
    }
  }
}
</style>

<style lang="scss">
.agents-section-popover {
  z-index: 2000 !important;
}
</style>
