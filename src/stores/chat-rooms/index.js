/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/stores/chat-rooms/index.js
 * @Description  : 对话房间和消息管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 生成唯一 ID
 */
const generateId = (prefix = '') => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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
          // 添加分页信息
          selectedChild.pageIndex = currentIndex
          selectedChild.siblingCount = node.children.length
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
    const createRoom = (model, title = '新对话') => {
      const roomId = generateId('room-')
      const now = new Date().toISOString()

      rooms.value.unshift({
        id: roomId,
        title,
        isTitleLoading: false,
        model,
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

      const message = findNodeById(tree, messageId)
      if (message) {
        Object.assign(message, updates)
        return message
      }
      return null
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
          selectedChild.pageIndex = currentIndex
          selectedChild.siblingCount = node.children.length
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
     * @param {string} role - 消息角色
     */
    const handlePrevPage = (roomId, messageId, role) => {
      const tree = messages.value[roomId]
      if (!tree) return

      const parentNode =
        role === 'assistant'
          ? findNodeById(tree, findNodeById(tree, messageId)?.parentId)
          : findParentNode(tree, messageId)

      if (parentNode && parentNode.children && parentNode.children.length > 0) {
        const currentIndex = parentNode.currentIndex ?? 0
        if (currentIndex > 0) {
          parentNode.currentIndex = currentIndex - 1
        }
      }
    }

    /**
     * 处理下一页（切换到下一个兄弟节点）
     * @param {string} roomId - 房间 ID
     * @param {string} messageId - 当前消息 ID
     * @param {string} role - 消息角色
     */
    const handleNextPage = (roomId, messageId, role) => {
      const tree = messages.value[roomId]
      if (!tree) return

      const parentNode =
        role === 'assistant'
          ? findNodeById(tree, findNodeById(tree, messageId)?.parentId)
          : findParentNode(tree, messageId)

      if (parentNode && parentNode.children && parentNode.children.length > 0) {
        const currentIndex = parentNode.currentIndex ?? 0
        if (currentIndex < parentNode.children.length - 1) {
          parentNode.currentIndex = currentIndex + 1
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
          rooms.value.push(room)
          importedCount++
        }
      }

      // 导入消息（跳过已存在的）
      for (const [roomId, tree] of Object.entries(importMessages)) {
        if (!messages.value[roomId]) {
          messages.value[roomId] = tree
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
      pinRoom,
      unpinRoom,
      // 消息操作
      addMessage,
      updateMessage,
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
    persist: {
      key: 'chat-llm-rooms'
    }
  }
)
