<template>
  <div
    class="sidebar-wrapper"
    :class="{ 'is-mobile': isMobile }"
    :style="{
      '--width-sidebar-block': isMobile ? '0px' : isCollapsed ? `0` : `${widthSidebarExpanded}px`,
      '--width-sidebar-header': isCollapsed
        ? `${widthSidebarCollapsed}px`
        : `${widthSidebarExpanded}px`,
      '--sidebar-translate': isMobile ? (isCollapsed ? '-100%' : '0') : '0'
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
                :key="`chat-room-${chatRoomInfo.taskId}`"
                :chat-room-info="chatRoomInfo"
                :is-active="activeRoomId === chatRoomInfo.taskId"
                @chat-room-item-click="handleChatRoomItemClick($event, chatRoomInfo)"
                @chat-room-item-operation="handleChatRoomItemOperation($event, chatRoomInfo)"
              />
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
import { useEventBus, tryOnMounted } from '@vueuse/core'
import { APP_NAME } from '@/config/app'
import AgentEmpty from '@/components/empty/index.vue'
import { FETCH_CHAR_HISTORY } from '@/config/symbol'
import { useSidebar } from '@/hooks/use-sidebar'

import ChatRoomItem from './chat-room-item/index.vue'
import { useChatRoom } from './hooks/use-chat-room'

import { useTitleGenerator } from '@/hooks'
import { useChatRoomsStore } from '@/stores/chat-rooms'

defineOptions({
  name: 'CommonSidebar'
})

const router = useRouter()
const route = useRoute()

const eventBusOfHistory = useEventBus(FETCH_CHAR_HISTORY)
const eventBusOfPopover = useEventBus('popover-action')

const scrollRef = ref()

const {
  isCompleted,
  filteredChatRoomGroupList,

  pinChatRoom,
  unpinChatRoom,
  deleteChatRoom
} = useChatRoom()

const chatRoomsStore = useChatRoomsStore()

const {
  isCollapsed,
  widthSidebarCollapsed,
  widthSidebarExpanded,
  toggleSidebar,
  isMobile,
  closeSidebar
} = useSidebar()

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
  // 移动端导航后自动关闭侧边栏
  if (isMobile.value) closeSidebar()
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

  // 移动端导航后自动关闭侧边栏
  if (isMobile.value) closeSidebar()

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
      const { generateTitleSync } = useTitleGenerator()
      const _room = chatRoomsStore.rooms.find(r => r.id === room.taskId)
      if (_room) {
        try {
          const messages = chatRoomsStore.getMessages(_room.id)
          chatRoomsStore.updateRoomIsTitleLoading(_room.id, true)
          const title = await generateTitleSync(messages)
          if (title) {
            chatRoomsStore.updateRoomTitle(_room.id, title)
          }
        } catch (error) {
          console.error('rename chat room title error', error)
        } finally {
          chatRoomsStore.updateRoomIsTitleLoading(_room.id, false)
        }
      }
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
      color: var(--text-dblight-color);

      .bi-empty__description {
        /* 雅黑-常规-12 */
        font-size: 12px;
        font-weight: 400;
      }
    }
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
  border-right: 1px solid var(--border-color);
  background: var(--bg-sidebar);
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
      border: 1px solid var(--border-color);
      border-radius: 20px;

      @include flex-gap(8px, row);
    }

    .logo-area {
      .title {
        margin: 0;
        margin-bottom: 3px;
        white-space: nowrap;
        color: var(--text-normal-color);
        outline: none;
        font-size: 22px;
        font-weight: 700;
        font-style: normal;
      }

      .logo-link {
        text-decoration: none;
        color: var(--text-normal-color);
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
      color: var(--text-normal-color);
      border-radius: 8px;
      outline: none;

      @include flex-gap(8px, row);

      &:hover {
        background-color: var(--bg-hover);
      }

      &.active {
        background-color: var(--bg-active);
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
        color: var(--text-dblight-color);
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
        color: var(--text-light-color);
        font-size: 12px;
        font-weight: 400;
        font-style: normal;
        line-height: normal;
      }
    }
  }
}

// 移动端侧边栏：抽屉模式
.is-mobile {
  .sidebar-block:not(.sidebar) {
    display: none;
  }

  .sidebar {
    width: #{280px};
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateX(var(--sidebar-translate, 0));
    will-change: transform;
  }

  .sidebar-header-block:not(.sidebar-header) {
    display: none;
  }

  .sidebar-header {
    position: relative;
    width: 100% !important;
  }

  .sidebar-header-collapsed {
    display: none !important;
  }
}
</style>

<style lang="scss">
.agents-section-popover {
  z-index: 2000 !important;
}
</style>
