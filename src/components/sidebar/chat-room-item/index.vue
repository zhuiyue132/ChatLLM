<template>
  <div
    :id="`chat-room-item-${chatRoomInfo.taskId}`"
    class="chat-room-item-wrap"
    :class="{ active: isActive }"
    @click.stop="handleChatRoomItemClick($event)"
  >
    <div class="chat-room-icon">
      <i v-if="!isCompletions" class="icon-brain" />
      <i v-else class="icon-duihua-1" />
    </div>

    <div class="chat-room-info">
      <div
        v-title="chatRoomInfo.content"
        :data-chatid="chatRoomInfo.id"
        :data-first="chatRoomInfo.firstContent || ''"
        class="chat-room-content"
        :class="{ 'is-loading': chatRoomInfo.isTitleLoading }"
      >
        {{ chatRoomInfo.content }}
      </div>
      <div class="chat-room-agent-name">
        {{ isCompletions ? '对话' : chatRoomInfo.agentName }}
      </div>
    </div>

    <template v-if="!isActive">
      <div v-if="chatRoomInfo.state === 'RUNNING'" class="chat-room-operation">
        <img :src="IconLoading" class="animate-spin" alt="loading" />
      </div>

      <div
        v-else-if="chatRoomInfo.unreadMessageCount > 0"
        class="chat-room-operation chat-room-new-badge"
      >
        <span>NEW</span>
      </div>
    </template>

    <div v-show="isActive" class="chat-room-operation chat-room-operation-dropdown">
      <xs-dropdown
        placement="right-start"
        :style="{
          marginTop: '3px'
        }"
        :persistent="false"
        :popper-options="setPopperPosition(0, 6)"
        :teleported="true"
        :show-timeout="0"
        @command="handleChatRoomItemOperation($event)"
      >
        <i class="icon-gengduo" />

        <template #dropdown>
          <xs-dropdown-menu :custom-style="{ width: '120px' }">
            <xs-dropdown-item v-if="!chatRoomInfo.topFlag" command="pin">置顶</xs-dropdown-item>
            <xs-dropdown-item v-else command="unpin">取消置顶</xs-dropdown-item>
            <xs-dropdown-item command="rename">重命名</xs-dropdown-item>
            <xs-dropdown-item command="delete">删除</xs-dropdown-item>
          </xs-dropdown-menu>
        </template>
      </xs-dropdown>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { setPopperPosition } from '@/utils'
import { XsDropdown, XsDropdownMenu, XsDropdownItem } from '@/components/xs-dropdown'
import IconLoading from '@/assets/images/sidebar/loading.svg'

const emit = defineEmits(['chat-room-item-click', 'chat-room-item-operation'])

defineOptions({
  name: 'ChatRoomItem'
})

const props = defineProps({
  chatRoomInfo: {
    type: Object,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: false
  }
})

const isCompletions = computed(() => {
  return [0, 1].includes(props.chatRoomInfo.agentId)
  // return !props.chatRoomInfo.headUrl
})

const handleChatRoomItemClick = event => {
  emit('chat-room-item-click', event)
}

const handleChatRoomItemOperation = command => {
  emit('chat-room-item-operation', command)
}
</script>

<style scoped lang="scss">
.chat-room-item-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  padding: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 8px;

  --display-dropdown: block;

  @include flex-gap(4px, row);

  &:hover {
    background: #e4e4e7;

    --display-dropdown: block;
  }

  &.active {
    color: #007e54;
    background: #e0f2e7;

    .chat-room-info {
      .chat-room-content,
      .chat-room-agent-name {
        color: #007e54;
      }
    }
  }

  .chat-room-icon {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    flex-direction: column;
    justify-content: center;
    width: 24px;
    height: 24px;

    i {
      font-size: 20px;
    }

    img {
      width: 16px;
      height: 16px;
    }
  }

  .chat-room-info {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    width: 0;

    .chat-room-content {
      position: relative;
      overflow: hidden;
      flex: 1;
      user-select: none;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #595959;
      font-size: 16px;

      &.is-loading {
        animation: shimmer 1.2s infinite linear;
        background: linear-gradient(
          90deg,
          #595959 0%,
          #595959 40%,
          #d0d0d0 50%,
          #595959 60%,
          #595959 100%
        );
        background-clip: text;
        background-size: 200% 100%;
        -webkit-text-fill-color: transparent;
      }
    }

    .chat-room-agent-name {
      overflow: hidden;
      flex: 1;
      user-select: none;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #8c8c8c;
      font-size: 14px;
    }
  }

  .chat-room-operation {
    display: flex;
    align-items: center;
    align-self: center;
    flex: 0 0 auto;
    justify-content: center;

    img {
      width: 20px;
      height: 20px;
    }

    i {
      outline: none;
      font-size: 20px;
    }
  }

  .chat-room-new-badge {
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 3px 4px;
    color: #fff;
    border-radius: 2px;
    background-color: #bd4206;
    font-size: 8px;
    font-weight: 700;
  }

  .chat-room-operation-dropdown {
    display: var(--display-dropdown);
  }

  .animate-spin {
    animation: rotate 1.5s linear infinite;

    i {
      font-size: 20px;
    }
  }

  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: 100% 0;
    }

    100% {
      background-position: 0% 0;
    }
  }
}
</style>
