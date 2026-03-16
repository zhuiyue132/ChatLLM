/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/stores/chat-rooms/index.js
 * @Description  : 对话房间和消息管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed, isProxy } from 'vue'

/**
 * 生成唯一 ID
 */
const generateId = (prefix = '') => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const syncPagingMetaForChildren = node => {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) {
    return
  }

  const siblingCount = node.children.length
  node.children.forEach((child, index) => {
    if (!child || typeof child !== 'object') return
    child.pageIndex = index
    child.siblingCount = siblingCount
  })
}

const createChatRoomsPersistFilter = () => {
  const STREAMING_MUTATION_KEYS = new Set(['content', 'reasoningContent', 'reasoningTime'])
  const STREAMING_PERSIST_INTERVAL = 1200
  const GENERAL_PERSIST_INTERVAL = 250

  let lastPersistAt = 0
  let lastStreamingPersistAt = 0

  const getEventKeys = mutation => {
    const events = Array.isArray(mutation?.events) ? mutation.events : []
    return events.map(event => event?.key).filter(Boolean)
  }

  return mutation => {
    const now = Date.now()
    const keys = getEventKeys(mutation).map(key => `${key}`)

    // 关键状态变化（例如结束、切分分支）优先落盘
    if (keys.includes('finished') || keys.includes('currentIndex')) {
      lastPersistAt = now
      lastStreamingPersistAt = now
      return true
    }

    // 流式更新高频触发，降频持久化，降低 JSON 序列化开销
    const isStreamingOnly = keys.length > 0 && keys.every(key => STREAMING_MUTATION_KEYS.has(key))
    if (isStreamingOnly) {
      if (now - lastStreamingPersistAt < STREAMING_PERSIST_INTERVAL) {
        return false
      }
      lastStreamingPersistAt = now
      lastPersistAt = now
      return true
    }

    if (now - lastPersistAt < GENERAL_PERSIST_INTERVAL) {
      return false
    }
    lastPersistAt = now
    return true
  }
}

const normalizeMcpServerIds = serverIds => {
  return Array.from(new Set((Array.isArray(serverIds) ? serverIds : []).filter(Boolean)))
}

export const useChatRoomsStore = defineStore(
  'chat-rooms',
  () => {
    // 房间列表
    const rooms = ref([])
    // 当前房间 ID
    const currentRoomId = ref(null)
    // 消息存储，按房间 ID 索引
    // { roomId: { children: [], currentIndex: 0 } }
    const messages = ref({})

    // roomId -> Map<messageId, messageNode>
    // 用于加速 updateMessage / 查找节点（避免每次都递归遍历整棵树）
    const messageIndexByRoom = new Map()

    const buildRoomMessageIndex = roomId => {
      const tree = messages.value[roomId]
      const index = new Map()
      if (tree) {
        const stack = [tree]
        while (stack.length > 0) {
          const node = stack.pop()
          if (!node || typeof node !== 'object') continue
          if (node.id) {
            index.set(node.id, node)
          }
          if (Array.isArray(node.children) && node.children.length > 0) {
            node.children.forEach(child => stack.push(child))
          }
        }
      }
      messageIndexByRoom.set(roomId, index)
      return index
    }

    const ensureRoomMessageIndex = roomId => {
      if (!roomId) return null
      if (messageIndexByRoom.has(roomId)) {
        return messageIndexByRoom.get(roomId)
      }
      return buildRoomMessageIndex(roomId)
    }

    // 当前房间
    const currentRoom = computed(() => {
      if (!currentRoomId.value) return null
      return rooms.value.find(room => room.id === currentRoomId.value) || null
    })

    // 当前房间的消息树
    const currentMessageTree = computed(() => {
      if (!currentRoomId.value) return null
      return messages.value[currentRoomId.value] || null
    })

    // 当前房间的消息列表（根据 currentIndex 展平）
    const currentMessages = computed(() => {
      const tree = currentMessageTree.value
      if (!tree || !tree.children) {
        return []
      }

      const result = []
      const traverse = node => {
        if (!node.children || node.children.length === 0) {
          return
        }

        const currentIndex = node.currentIndex ?? 0
        const selectedChild = node.children[currentIndex]

        if (selectedChild) {
          result.push(selectedChild)
          traverse(selectedChild)
        }
      }

      traverse(tree)
      return result
    })

    /**
     * 创建新房间
     * @param {string} model - 使用的模型
     * @param {string} title - 房间标题
     * @returns {string} 房间 ID
     */
    const createRoom = (model, title = '新对话', options = {}) => {
      const { mcpEnabled = false, mcpServerIds = [] } = options
      const roomId = generateId('room-')
      const now = new Date().toISOString()

      rooms.value.unshift({
        id: roomId,
        title,
        isTitleLoading: false,
        model,
        mcpEnabled: !!mcpEnabled,
        mcpServerIds: normalizeMcpServerIds(mcpServerIds),
        createdAt: now,
        updatedAt: now,
        topFlag: false,
        pinTime: null
      })

      // 初始化消息树
      messages.value[roomId] = {
        children: [],
        currentIndex: 0
      }
      messageIndexByRoom.set(roomId, new Map())

      currentRoomId.value = roomId
      return roomId
    }

    /**
     * 删除房间
     * @param {string} roomId - 房间 ID
     */
    const deleteRoom = roomId => {
      const index = rooms.value.findIndex(room => room.id === roomId)
      if (index !== -1) {
        rooms.value.splice(index, 1)
        delete messages.value[roomId]
        messageIndexByRoom.delete(roomId)

        // 如果删除的是当前房间，切换到第一个房间
        if (currentRoomId.value === roomId) {
          currentRoomId.value = rooms.value[0]?.id || null
        }
      }
    }

    /**
     * 设置当前房间
     * @param {string} roomId - 房间 ID
     */
    const setCurrentRoom = roomId => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        currentRoomId.value = roomId
      }
    }

    /**
     * 更新房间标题
     * @param {string} roomId - 房间 ID
     * @param {string} title - 新标题
     */
    const updateRoomTitle = (roomId, title) => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.title = title
        room.updatedAt = new Date().toISOString()
      }
    }

    const updateRoomIsTitleLoading = (roomId, isTitleLoading) => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.isTitleLoading = isTitleLoading
      }
    }

    /**
     * 更新房间模型
     * @param {string} roomId - 房间 ID
     * @param {string} model - 新模型
     */
    const updateRoomModel = (roomId, model) => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.model = model
        room.updatedAt = new Date().toISOString()
      }
    }

    const updateRoomMcpEnabled = (roomId, enabled) => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.mcpEnabled = !!enabled
        room.updatedAt = new Date().toISOString()
      }
    }

    const updateRoomMcpServerIds = (roomId, serverIds) => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.mcpServerIds = normalizeMcpServerIds(serverIds)
        room.updatedAt = new Date().toISOString()
      }
    }

    /**
     * 置顶房间
     * @param {string} roomId - 房间 ID
     */
    const pinRoom = roomId => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.topFlag = true
        room.pinTime = new Date().toISOString()
        room.updatedAt = new Date().toISOString()
      }
    }

    /**
     * 取消置顶房间
     * @param {string} roomId - 房间 ID
     */
    const unpinRoom = roomId => {
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.topFlag = false
        room.pinTime = null
        room.updatedAt = new Date().toISOString()
      }
    }

    /**
     * 在树中查找节点
     * @param {Object} node - 根节点
     * @param {string} targetId - 目标节点 ID
     * @returns {Object|null}
     */
    const findNodeById = (node, targetId) => {
      if (!node) return null
      if (node.id === targetId) return node

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const found = findNodeById(child, targetId)
          if (found) return found
        }
      }
      return null
    }

    /**
     * 在树中查找父节点
     * @param {Object} node - 根节点
     * @param {string} targetId - 目标节点 ID
     * @param {Object|null} parent - 当前父节点
     * @returns {Object|null}
     */
    const findParentNode = (node, targetId, parent = null) => {
      if (!node) return null
      if (node.id === targetId) return parent

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const found = findParentNode(child, targetId, node)
          if (found !== null) return found
        }
      }
      return null
    }

    /**
     * 找到当前对话路径的最后一个节点
     * @param {string} roomId - 房间 ID
     * @returns {Object|null}
     */
    const findLastNode = roomId => {
      const tree = messages.value[roomId]
      if (!tree) return null

      let currentNode = tree
      while (currentNode.children && currentNode.children.length > 0) {
        const currentIndex = currentNode.currentIndex ?? 0
        const selectedChild = currentNode.children[currentIndex]
        if (!selectedChild) break
        currentNode = selectedChild
      }
      return currentNode
    }

    /**
     * 添加消息到房间
     * @param {string} roomId - 房间 ID
     * @param {Object} message - 消息对象
     * @param {string|null} parentId - 父消息 ID（null 表示添加到当前路径末尾）
     * @returns {Object} 添加的消息
     */
    const addMessage = (roomId, message, parentId = null) => {
      const tree = messages.value[roomId]
      if (!tree) return null

      const messageWithDefaults = {
        id: message.id || generateId('msg-'),
        role: message.role,
        content: message.content || '',
        reasoningContent: message.reasoningContent || '',
        reasoningTime: message.reasoningTime || 0,
        model: message.model || null,
        parentId: parentId,
        children: [],
        currentIndex: 0,
        finished: message.finished ?? true,
        error: message.error ?? false,
        createdAt: message.createdAt || new Date().toISOString(),
        ...message
      }

      let targetNode
      if (parentId) {
        // 添加到指定父节点
        targetNode = findNodeById(tree, parentId)
      } else {
        // 添加到当前路径末尾
        targetNode = findLastNode(roomId)
      }

      if (targetNode) {
        if (!targetNode.children) {
          targetNode.children = []
        }
        messageWithDefaults.parentId = targetNode === tree ? null : targetNode.id
        targetNode.children.push(messageWithDefaults)
        targetNode.currentIndex = targetNode.children.length - 1
        syncPagingMetaForChildren(targetNode)

        const index = ensureRoomMessageIndex(roomId)
        if (index) {
          // 注意：push 进去的是原始对象，必须从响应式数组里再取一次，拿到 proxy，
          // 否则 updateMessage 通过 Map 命中原始对象时不会触发视图更新（流式输出会“卡住”）。
          const insertedMessage =
            targetNode.children[targetNode.currentIndex] || messageWithDefaults
          index.set(messageWithDefaults.id, insertedMessage)
        }
      }

      // 更新房间时间
      const room = rooms.value.find(r => r.id === roomId)
      if (room) {
        room.updatedAt = new Date().toISOString()
      }

      return messageWithDefaults
    }

    /**
     * 更新消息
     * @param {string} roomId - 房间 ID
     * @param {string} messageId - 消息 ID
     * @param {Object} updates - 更新内容
     * @returns {Object|null} 更新后的消息
     */
    const updateMessage = (roomId, messageId, updates) => {
      const tree = messages.value[roomId]
      if (!tree) return null

      const index = ensureRoomMessageIndex(roomId)
      const messageFromIndex = index?.get(messageId) || null
      const message = messageFromIndex && isProxy(messageFromIndex) ? messageFromIndex : null
      if (!message) {
        const fallback = findNodeById(tree, messageId)
        if (!fallback) return null
        if (index) {
          index.set(messageId, fallback)
        }
        Object.assign(fallback, updates)
        return fallback
      }

      Object.assign(message, updates)
      return message
    }

    const getMessageById = (roomId, messageId) => {
      const tree = messages.value[roomId]
      if (!tree || !messageId) return null

      const index = ensureRoomMessageIndex(roomId)
      const messageFromIndex = index?.get(messageId) || null
      if (messageFromIndex) {
        if (isProxy(messageFromIndex)) {
          return messageFromIndex
        }
        // 自愈：索引里如果混入了原始对象，回退到树里拿 proxy 并替换索引
        const fallback = findNodeById(tree, messageId)
        if (fallback && index) {
          index.set(messageId, fallback)
        }
        return fallback || messageFromIndex
      }

      const fallback = findNodeById(tree, messageId)
      if (fallback && index) {
        index.set(messageId, fallback)
      }
      return fallback || null
    }

    const getParentNodeByMessageId = (roomId, messageId) => {
      const tree = messages.value[roomId]
      if (!tree) return null
      if (!messageId) return tree

      const message = getMessageById(roomId, messageId)
      if (!message) return null

      const parentId = message.parentId
      if (!parentId) {
        return tree
      }
      return getMessageById(roomId, parentId)
    }

    /**
     * 获取房间的消息树
     * @param {string} roomId - 房间 ID
     * @returns {Object|null}
     */
    const getMessageTree = roomId => {
      return messages.value[roomId] || null
    }

    /**
     * 获取房间的当前消息列表（展平后的）
     * @param {string} roomId - 房间 ID
     * @returns {Array}
     */
    const getMessages = roomId => {
      const tree = messages.value[roomId]
      if (!tree || !tree.children) {
        return []
      }

      const result = []
      const traverse = node => {
        if (!node.children || node.children.length === 0) {
          return
        }

        const currentIndex = node.currentIndex ?? 0
        const selectedChild = node.children[currentIndex]

        if (selectedChild) {
          result.push(selectedChild)
          traverse(selectedChild)
        }
      }

      traverse(tree)
      return result
    }

    /**
     * 根据消息 ID 设置树的 currentIndex，使该消息所在的分支被选中显示
     * @param {string} roomId - 房间 ID
     * @param {string} targetId - 目标消息 ID
     * @returns {boolean} 是否找到目标消息
     */
    const setCurrentIndexByMessageId = (roomId, targetId) => {
      const tree = messages.value[roomId]
      if (!tree || !targetId) return false

      const doSet = (node, targetId) => {
        if (!node) return false
        if (node.id != null && String(node.id) === String(targetId)) {
          return true
        }

        if (node.children && node.children.length > 0) {
          for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i]
            if (doSet(child, targetId)) {
              node.currentIndex = i
              syncPagingMetaForChildren(node)
              return true
            }
          }
        }
        return false
      }

      return doSet(tree, targetId)
    }

    /**
     * 处理上一页（切换到上一个兄弟节点）
     * @param {string} roomId - 房间 ID
     * @param {string} messageId - 当前消息 ID
     */
    const handlePrevPage = (roomId, messageId) => {
      const tree = messages.value[roomId]
      if (!tree) return

      const index = ensureRoomMessageIndex(roomId)
      const messageNode = index?.get(messageId) || findNodeById(tree, messageId)
      if (!messageNode) return

      const parentId = messageNode.parentId
      const parentNode = parentId ? index?.get(parentId) || findNodeById(tree, parentId) : tree

      if (parentNode && parentNode.children && parentNode.children.length > 0) {
        const currentIndex = parentNode.currentIndex ?? 0
        if (currentIndex > 0) {
          parentNode.currentIndex = currentIndex - 1
          syncPagingMetaForChildren(parentNode)
        }
      }
    }

    /**
     * 处理下一页（切换到下一个兄弟节点）
     * @param {string} roomId - 房间 ID
     * @param {string} messageId - 当前消息 ID
     */
    const handleNextPage = (roomId, messageId) => {
      const tree = messages.value[roomId]
      if (!tree) return

      const index = ensureRoomMessageIndex(roomId)
      const messageNode = index?.get(messageId) || findNodeById(tree, messageId)
      if (!messageNode) return

      const parentId = messageNode.parentId
      const parentNode = parentId ? index?.get(parentId) || findNodeById(tree, parentId) : tree

      if (parentNode && parentNode.children && parentNode.children.length > 0) {
        const currentIndex = parentNode.currentIndex ?? 0
        if (currentIndex < parentNode.children.length - 1) {
          parentNode.currentIndex = currentIndex + 1
          syncPagingMetaForChildren(parentNode)
        }
      }
    }

    /**
     * 清空所有数据
     */
    const clearAll = () => {
      rooms.value = []
      messages.value = {}
      currentRoomId.value = null
      messageIndexByRoom.clear()
    }

    /**
     * 导入数据（合并模式）
     * @param {Array} importRooms - 要导入的房间列表
     * @param {Object} importMessages - 要导入的消息数据
     * @returns {number} 导入的房间数量
     */
    const importData = (importRooms, importMessages) => {
      let importedCount = 0

      // 导入房间（跳过已存在的）
      for (const room of importRooms) {
        if (!rooms.value.find(r => r.id === room.id)) {
          rooms.value.push({
            ...room,
            mcpServerIds: normalizeMcpServerIds(room?.mcpServerIds)
          })
          importedCount++
        }
      }

      // 导入消息（跳过已存在的）
      for (const [roomId, tree] of Object.entries(importMessages)) {
        if (!messages.value[roomId]) {
          messages.value[roomId] = tree
          buildRoomMessageIndex(roomId)
        }
      }

      return importedCount
    }

    return {
      // 状态
      rooms,
      currentRoomId,
      messages,
      // 计算属性
      currentRoom,
      currentMessageTree,
      currentMessages,
      // 房间操作
      createRoom,
      deleteRoom,
      setCurrentRoom,
      updateRoomTitle,
      updateRoomIsTitleLoading,
      updateRoomModel,
      updateRoomMcpEnabled,
      updateRoomMcpServerIds,
      pinRoom,
      unpinRoom,
      // 消息操作
      addMessage,
      updateMessage,
      getMessageById,
      getParentNodeByMessageId,
      getMessageTree,
      getMessages,
      findNodeById,
      findParentNode,
      findLastNode,
      setCurrentIndexByMessageId,
      handlePrevPage,
      handleNextPage,
      // 工具
      clearAll,
      importData
    }
  },
  {
    persistedState: {
      serialize: JSON.stringify,
      filter: createChatRoomsPersistFilter()
    }
  }
)
