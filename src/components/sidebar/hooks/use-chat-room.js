/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-13
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/components/sidebar/hooks/use-chat-room.js
 * @Description  : 侧边栏的对话历史, 每一个对话视为一个房间，房间内包含多轮对话（在MainV2 布局组件中使用，所以先放hooks里吧）
 *
 */

import { ref, computed, watch } from 'vue'
import { useEventBus, tryOnMounted } from '@vueuse/core'
import { ElMessageBox } from 'element-plus'
import { CHAT_ROOM_COMMAND } from '@/config/symbol'
import { useInfiniteScroll } from '@vueuse/core'
import { useChatRoomsStore } from '@/stores/chat-rooms'
import dayjs from 'dayjs'
import { wait } from '@/utils'

/**
 * 将 store 中的房间格式转换为 sidebar 列表所需的格式
 * @param {Object} room - store 中的房间对象
 * @returns {Object} sidebar 列表所需的房间对象
 */
const mapStoreRoomToListItem = room => ({
  taskId: room.id,
  agentId: 0, // AI 对话默认为 0
  content: room.title,
  createTime: room.createdAt,
  updateTime: room.updatedAt,
  aiModel: room.model,
  topFlag: room.topFlag || false,
  pinTime: room.pinTime || null
})

export const useChatRoom = (pageSize = 999999999, route = null) => {
  const chatRoomsStore = useChatRoomsStore()
  const chatRoomList = ref([])
  const isLoading = ref(false)
  const isFinished = ref(false)
  const isCompleted = ref(false)

  // 获取URL中的agentId参数
  const agentIdFromUrl = ref(route?.query?.agentId || null)

  // 根据agentId过滤后的聊天房间列表
  const filteredChatRoomList = computed(() => {
    if (!agentIdFromUrl.value) {
      if (route.path.includes('/completions')) {
        return chatRoomList.value.filter(room => room.agentId === 0 || room.agentId === 1)
      }
      // 如果没有agentId参数，显示所有对话房间
      return chatRoomList.value
    }
    // 如果有agentId参数，只显示该agent的对话房间
    if (agentIdFromUrl.value === '0' || agentIdFromUrl.value === '1') {
      return chatRoomList.value.filter(room => room.agentId === 0 || room.agentId === 1)
    }
    return chatRoomList.value.filter(room => String(room.agentId) === String(agentIdFromUrl.value))
  })

  const filteredChatRoomGroupList = computed(() => {
    const now = dayjs()
    // 获取各个时间段的开始时间（0点）
    const todayStart = now.startOf('day')
    const yesterdayStart = now.subtract(1, 'day').startOf('day')
    const weekStart = now.subtract(7, 'day').startOf('day')
    const monthStart = now.subtract(30, 'day').startOf('day')

    // 定义分组规则（按优先级排序）
    const groupRules = [
      {
        key: 'pinned',
        name: '置顶',
        matcher: room => room.topFlag
      },
      {
        key: 'today',
        name: '今天',
        matcher: room => {
          const roomTime = dayjs(room.createTime)
          return (
            roomTime.isSameOrAfter(todayStart) &&
            roomTime.isBefore(now.add(1, 'day').startOf('day'))
          )
        }
      },
      {
        key: 'yesterday',
        name: '昨天',
        matcher: room => {
          const roomTime = dayjs(room.createTime)
          return roomTime.isSameOrAfter(yesterdayStart) && roomTime.isBefore(todayStart)
        }
      },
      {
        key: 'week',
        name: '7天内',
        matcher: room => {
          const roomTime = dayjs(room.createTime)
          return roomTime.isSameOrAfter(weekStart) && roomTime.isBefore(yesterdayStart)
        }
      },
      {
        key: 'month',
        name: '30天内',
        matcher: room => {
          const roomTime = dayjs(room.createTime)
          return roomTime.isSameOrAfter(monthStart) && roomTime.isBefore(weekStart)
        }
      }
    ]

    // 初始化分组容器
    const groups = {}
    for (const rule of groupRules) {
      groups[rule.key] = []
    }
    const historyGroups = {}

    // 单次遍历完成所有分组
    filteredChatRoomList.value.forEach(room => {
      // 按优先级匹配分组规则
      const matchedRule = groupRules.find(rule => {
        const result = rule.matcher(room)
        return result
      })

      if (matchedRule) {
        groups[matchedRule.key].push(room)
      } else {
        // 超过30天的按月份分组
        const yearMonth = dayjs(room.createTime).format('YYYY-MM')
        if (!historyGroups[yearMonth]) {
          historyGroups[yearMonth] = []
        }
        historyGroups[yearMonth].push(room)
      }
    })

    // 构建最终的分组列表
    const result = []

    // 添加常规分组
    groupRules.forEach(rule => {
      if (groups[rule.key].length > 0) {
        result.push({
          key: rule.key,
          groupName: rule.name,
          chatRoomList: groups[rule.key]
        })
      }
    })

    // 添加历史记录分组（按月份倒序）
    Object.keys(historyGroups)
      .sort((a, b) => b.localeCompare(a))
      .forEach(yearMonth => {
        result.push({
          key: yearMonth,
          groupName: yearMonth,
          chatRoomList: historyGroups[yearMonth]
        })
      })

    // 最后调整result中各个分组中房间的顺序：pinned 分组按照 pinTime 字段时间倒序排序，其他分组按照 createTime 字段时间倒序排序
    result.forEach(group => {
      if (group.key === 'pinned') {
        group.chatRoomList.sort((a, b) => {
          return dayjs(b.pinTime).diff(dayjs(a.pinTime))
        })
      } else {
        group.chatRoomList.sort((a, b) => {
          return dayjs(b.createTime).diff(dayjs(a.createTime))
        })
      }
    })

    return result
  })

  const eventBus = useEventBus(CHAT_ROOM_COMMAND)

  const handleCommand = ({ command, params }) => {
    console.log(222223333, command, params)
    switch (command) {
      case 'delete':
        // 删除临时对话（不经过二次确认，直接删除）
        // TODO: 删除临时对话
        break
      case 'add-room':
        // 更新对话列表
        // 为了避免重复添加，先检查是否已存在
        if (chatRoomList.value.find(item => item.taskId === params.taskId)) {
          return
        }

        params.isTitleLoading = true
        // 五秒后自动关闭
        setTimeout(() => {
          chatRoomList.value[0].isTitleLoading = false
        }, 5000)

        chatRoomList.value.unshift(params)
        break
      case 'modify-title':
        setTimeout(async () => {
          // eslint-disable-next-line no-case-declarations
          const room = chatRoomList.value.find(item => item.taskId === params.taskId)
          if (!room) return
          room.isTitleLoading = true
          room.content = ''

          const titles = params.title?.split('')?.filter(Boolean)

          for (let index = 0; index < titles.length; index++) {
            const t = titles[index]
            room.content += t
            await wait(50)
          }

          setTimeout(() => {
            room.isTitleLoading = false
          }, 200)
        }, 1500)

        break
    }
  }

  eventBus.on(handleCommand)

  // 分页参数，后端采用游标分页
  const cursor = ref({
    lastCreateTime: null,
    lastId: null,
    pageSize,
    page: 1
  })

  // 重置游标和数据
  const resetHistory = () => {
    chatRoomList.value = []
    cursor.value = {
      lastCreateTime: null,
      lastId: null,
      pageSize,
      page: 1
    }
    isFinished.value = false
    isCompleted.value = false
  }

  /**
   * 从 store 加载房间列表到 sidebar
   */
  const loadRoomsFromStore = () => {
    const storeRooms = chatRoomsStore.rooms
    if (storeRooms && storeRooms.length > 0) {
      // 将 store 中的房间转换为 sidebar 列表格式
      const mappedRooms = storeRooms.map(mapStoreRoomToListItem)

      // 合并到 chatRoomList，避免重复
      mappedRooms.forEach(room => {
        const exists = chatRoomList.value.find(item => item.taskId === room.taskId)
        if (!exists) {
          chatRoomList.value.push(room)
        }
      })

      // 按创建时间倒序排序
      chatRoomList.value.sort((a, b) => {
        return dayjs(b.createTime).diff(dayjs(a.createTime))
      })
    }
    isCompleted.value = true
    isFinished.value = true
  }

  // 初始化时从 store 加载房间列表
  tryOnMounted(() => {
    loadRoomsFromStore()
  })

  // 监听 store 中房间列表的变化，同步更新 sidebar 列表
  watch(
    () => chatRoomsStore.rooms,
    newRooms => {
      // 获取 store 中所有房间的 ID 集合
      const storeRoomIds = new Set(newRooms.map(room => room.id))

      // 删除 chatRoomList 中已不存在于 store 的房间
      chatRoomList.value = chatRoomList.value.filter(item => storeRoomIds.has(item.taskId))

      // 更新现有房间的信息
      if (newRooms && newRooms.length > 0) {
        newRooms.forEach(storeRoom => {
          const existingRoom = chatRoomList.value.find(item => item.taskId === storeRoom.id)
          if (existingRoom) {
            existingRoom.content = storeRoom.title
            existingRoom.updateTime = storeRoom.updatedAt
            existingRoom.aiModel = storeRoom.model
            existingRoom.topFlag = storeRoom.topFlag || false
            existingRoom.pinTime = storeRoom.pinTime || null
          }
        })
      }
    },
    { deep: true }
  )

  const getChatRoomList = () => {
    if (isFinished.value || isLoading.value) return Promise.resolve()

    isLoading.value = true
    // 从 store 加载
    loadRoomsFromStore()
    isLoading.value = false
  }

  const pinChatRoom = params => {
    const { taskId } = params || {}
    if (!taskId) return false

    // 更新 store
    chatRoomsStore.pinRoom(taskId)

    // 更新 sidebar 列表
    const room = chatRoomList.value.find(item => item.taskId === taskId)
    if (room) {
      room.topFlag = true
      room.pinTime = new Date().toISOString()
    }

    return true
  }

  const unpinChatRoom = params => {
    const { taskId } = params || {}
    if (!taskId) return false

    // 更新 store
    chatRoomsStore.unpinRoom(taskId)

    // 更新 sidebar 列表
    const room = chatRoomList.value.find(item => item.taskId === taskId)
    if (room) {
      room.topFlag = false
      room.pinTime = null
    }

    return true
  }

  const renameChatRoom = params => {
    const { taskId, content } = params || {}
    if (!taskId) return Promise.resolve(false)

    return ElMessageBox.prompt('', '重命名对话', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputValue: content || '',
      inputPlaceholder: '请输入新的对话名称',
      inputValidator: value => {
        if (!value || !value.trim()) {
          return '对话名称不能为空'
        }
        return true
      }
    })
      .then(({ value }) => {
        const trimmedValue = value.trim()

        // 更新 store
        chatRoomsStore.updateRoomTitle(taskId, trimmedValue)

        // 更新 sidebar 列表
        const room = chatRoomList.value.find(item => item.taskId === taskId)
        if (room) {
          room.content = trimmedValue
        }

        return true
      })
      .catch(() => {
        // 用户取消操作
        return false
      })
  }

  const deleteChatRoom = params => {
    const { taskId } = params || {}

    return ElMessageBox.confirm('删除后，聊天记录将不可恢复。', '确认删除对话？', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
      type: 'warning'
    })
      .then(() => {
        // 从 store 删除
        chatRoomsStore.deleteRoom(taskId)

        // 从 sidebar 列表删除
        const index = chatRoomList.value.findIndex(item => item.taskId === taskId)
        if (index !== -1) {
          chatRoomList.value.splice(index, 1)
        }

        return true
      })
      .catch(() => {
        // 用户取消删除操作
        return false
      })
  }

  const createInfiniteScroll = target => {
    if (!target) return

    useInfiniteScroll(
      target,
      () => {
        if (!isFinished.value && !isLoading.value) {
          return getChatRoomList()
        }
        return Promise.resolve([])
      },
      {
        distance: 10,
        throttle: 300,
        canLoadMore: () => {
          return !isFinished.value
        }
      }
    )
  }

  // 监听route变化，更新agentId参数
  if (route) {
    watch(
      () => route.query.agentId,
      newAgentId => {
        agentIdFromUrl.value = newAgentId || null
      }
    )
  }

  return {
    isLoading,
    isFinished,
    isCompleted,
    chatRoomList,
    filteredChatRoomGroupList,
    agentIdFromUrl,
    resetHistory,
    getChatRoomList,
    pinChatRoom,
    unpinChatRoom,
    renameChatRoom,
    deleteChatRoom,
    createInfiniteScroll
  }
}
