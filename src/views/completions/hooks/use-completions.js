/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-03
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/views/completions/hooks/use-completions.js
 * @Description  : 单模型对话
 *
 */
import { ref, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSSE, useAutoScroll, showMessage } from '@/hooks'
import { useEventBus } from '@vueuse/core'
import { CHAT_ROOM_COMMAND } from '@/config/symbol'
import { isImageUrl } from '@/utils'
import { buildTree } from '../utils'
import { ILLEGAL_UNICODE_REG } from '../config'
import { uuid as getUuid } from '@/utils/random'

export function useCompletions() {
  const router = useRouter()
  const route = useRoute()

  const eventBus = useEventBus(CHAT_ROOM_COMMAND)

  // 是否正在加载中
  const loading = ref(false)
  const isReceiving = ref(false)

  // 输入框消息
  const tempMessage = ref('')

  // 正在编辑的消息ID
  const editingMessageId = ref(null)

  // 正在接收消息的assistant节点ID（用于后台追踪SSE消息）
  const receivingMessageId = ref(null)

  // 对话内容 - 树形结构
  const chatHistoryLoading = ref(false)
  const chatHistoryTree = ref(null)

  // 根据 currentIndex 从树中提取当前对话路径
  const chatHistory = computed(() => {
    if (!chatHistoryTree.value || !chatHistoryTree.value.children) {
      return []
    }

    const result = []
    let currentNode = chatHistoryTree.value

    // 递归遍历树，根据每层的 currentIndex 选择对应的子节点
    const traverse = node => {
      if (!node.children || node.children.length === 0) {
        return
      }

      const currentIndex = node.currentIndex ?? 0
      const selectedChild = node.children[currentIndex]

      if (selectedChild) {
        // 直接给原始节点添加分页信息属性（不创建新对象，提升性能）
        // 注意：使用 pageIndex 和 siblingCount，不覆盖节点自身的 currentIndex
        selectedChild.pageIndex = currentIndex
        selectedChild.siblingCount = node.children.length

        // 添加当前选中的节点到结果数组
        result.push(selectedChild)
        // 继续遍历子节点
        traverse(selectedChild)
      }
    }

    traverse(currentNode)

    return result
  })

  // 判断当前显示的分支是否包含正在接收消息的节点
  const isViewingReceivingBranch = computed(() => {
    if (!receivingMessageId.value) {
      return false
    }
    // 检查当前显示的消息列表中是否包含正在接收消息的节点
    return chatHistory.value.some(item => item.id === receivingMessageId.value)
  })

  // 当前分支是否显示loading状态
  const shouldShowLoading = computed(() => {
    return loading.value || (isReceiving.value && isViewingReceivingBranch.value)
  })

  const { scrollToBottom, enableAutoScroll } = useAutoScroll(
    computed(() => shouldShowLoading.value && chatHistory.value.length > 0)
  )

  // 从 useModels 获取模型相关的所有变量
  const {
    message,
    models,
    currentModelValue,
    enableDeepThink,
    createImageCount,
    enableCreateImage,
    isDeepThinkButtonVisible,
    isFileButtonVisible,
    isUploadImageButtonVisible: isUploadFileButtonVisible,
    isCreateImageButtonVisible,
    isCreateImageCountVisible,
    currentModel
  } = useModels()

  // use-completions 是单模型对话，将 useModels 的数组形式转换为单个值

  const { connect: connectSSE } = useSSE({
    // 使用完整的聊天 URL
    url: `${import.meta.env.VITE_APP_WEB_URL}/agentChat/treeStream`,

    // 接收消息处理
    onMessage: event => {
      try {
        // 如果没有正在接收消息的节点ID，说明不应该处理消息
        if (!receivingMessageId.value) {
          console.log('[onMessage] 跳过处理，原因: receivingMessageId为空')
          return
        }

        // 通过ID直接查找正在接收消息的节点
        const lastMessage = findNodeById(chatHistoryTree.value, receivingMessageId.value)

        if (!lastMessage || lastMessage.role !== 'assistant' || lastMessage.finished) {
          // 如果节点不存在、不是助理消息或已完成，跳过处理
          console.log('[onMessage] 跳过处理，原因: lastMessage不存在/不是assistant/已完成')
          return
        }

        // 查找父节点（用户消息）
        const lastSecondMessage = lastMessage.parentId
          ? findNodeById(chatHistoryTree.value, lastMessage.parentId)
          : null

        // 解析消息数据
        const data = JSON.parse(event.data)

        if (data.success && data.code === 0) {
          const {
            sid,
            taskId,
            reasoningMessage,
            message,
            finished,
            reasoningTime,
            questionId,
            answerId,
            reqId,
            filePercent,
            title
          } = data.data

          // 首次收到消息时，更新 taskId（conversationId）
          if (sid && !conversationId.value) {
            router.replace({
              query: {
                ...route.query,
                conversationId: sid
              }
            })

            eventBus.emit({
              command: 'add-room',
              params: {
                agentId: 0,
                taskId: sid,
                firstContent: tempMessage.value || '',
                agentName: 'AI对话',

                content: tempMessage.value || ''
              }
            })
          }

          // 存在AI生成的标题
          if (title) {
            setTimeout(() => {
              eventBus.emit({
                command: 'modify-title',
                params: {
                  agentId: 0,
                  taskId,
                  title
                }
              })
            }, 2000)
          }

          if (filePercent) {
            lastMessage.filePercent = filePercent || null
          }

          if (reqId) {
            lastMessage.reqId = reqId
          }

          // 问题id存在，则赋值
          if (questionId) {
            lastSecondMessage.id = questionId
            lastMessage.parentId = questionId
          }

          // 回答id存在，则赋值
          if (answerId) {
            lastMessage.id = answerId
            // 更新 receivingMessageId 为后端返回的真实ID
            receivingMessageId.value = answerId
          }

          // 处理思考内容（深度思考模式）
          if (reasoningMessage) {
            if (reasoningMessage.replace(/\s+/g, '').length > 0) {
              // 收到有效回复后，才结束loading
              loading.value = false
              isReceiving.value = true
            }
            if (!lastMessage.thinkingContent) {
              lastMessage.thinkingContent = ''
            }
            lastMessage.thinkingContent += reasoningMessage
          }

          if (reasoningTime) {
            lastMessage.thinkingTime = reasoningTime
          }

          // 处理回答内容
          if (message) {
            if (message.replace(/\s+/g, '').length > 0) {
              // 收到有效回复后，才结束loading
              loading.value = false
              isReceiving.value = true
            }

            // 累加回答内容
            if (!lastMessage.content) {
              lastMessage.content = ''
            }
            lastMessage.content += message.replaceAll(ILLEGAL_UNICODE_REG, '')
          }

          // 更新完成状态
          lastMessage.finished = !!finished

          if (finished) {
            loading.value = false
            isReceiving.value = false
            // 清空正在接收消息的节点ID
            receivingMessageId.value = null
          }

          // 只有在查看正在接收消息的分支时才滚动到底部
          if (isViewingReceivingBranch.value) {
            scrollToBottom()
          }
        } else {
          // 错误处理
          console.error('SSE 消息返回错误:', data)
          loading.value = false
          isReceiving.value = false
          // 将当前消息标记为错误
          if (lastMessage) {
            lastMessage.error = true
            lastMessage.finished = true
          }
          receivingMessageId.value = null
        }
      } catch (err) {
        console.error('解析消息出错:', err)
        loading.value = false
        isReceiving.value = false
        // 将当前消息标记为错误
        const lastMessage = receivingMessageId.value
          ? findNodeById(chatHistoryTree.value, receivingMessageId.value)
          : null
        if (lastMessage) {
          lastMessage.error = true
          lastMessage.finished = true
        }
        receivingMessageId.value = null
      }
    },

    // 连接打开
    onOpen: () => {
      console.log('代理聊天 SSE 连接已打开')
    },

    // 连接关闭
    onClose: () => {
      isReceiving.value = false
      loading.value = false
      receivingMessageId.value = null
      console.log('代理聊天 SSE 连接已关闭')
      return false
    },

    // 连接错误
    onError: err => {
      isReceiving.value = false
      loading.value = false

      // 将当前消息标记为错误
      const lastMessage = receivingMessageId.value
        ? findNodeById(chatHistoryTree.value, receivingMessageId.value)
        : null
      if (lastMessage) {
        lastMessage.error = true
        lastMessage.finished = true
      }

      receivingMessageId.value = null

      console.error('代理聊天 SSE 连接错误:', err)
    }
  })

  // 发送消息
  const sendMessage = ({ fileList = [] } = {}) => {
    if (!message.value.trim()) {
      showMessage('发送消息不可为空，请输入消息', { type: 'warning' })
      return
    }

    if (loading.value || isReceiving.value) {
      return
    }

    const sentMessage = message.value
    message.value = ''
    tempMessage.value =
      sentMessage || (fileList || []).map(file => file.name || file.fileName).join(',') || ''

    // 创建用户消息节点
    const userMessageId = `user-${Date.now()}`
    const assistantMessageId = `assistant-${Date.now()}`

    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: sentMessage || '',
      createdAt: new Date().toISOString(),
      parentId: null,
      children: [],
      currentIndex: 0,
      fileList
    }

    // 是否真的是创建图片，避免因为切换模型导致变量留存。
    const isImageGenerationFinal = currentModel.value.enableGenerateImage
      ? !!enableCreateImage.value
      : false
    // 不可以创建超过支持的最大数。
    const finalImageCreateCount = isImageGenerationFinal
      ? Math.min(currentModel.value.maxImageCount, createImageCount.value)
      : 0

    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      finished: false,
      createdAt: new Date().toISOString(),
      parentId: userMessageId,
      children: [],
      aiModel: currentModelValue.value[0],
      currentIndex: 0,
      thinkingTime: 0,
      filePercent: null,
      reqId: null,
      error: false,
      // 标记是否为生图消息
      isImageGeneration: isImageGenerationFinal,
      // 生图数量
      imageCount: finalImageCreateCount,
      // 生成的图片列表
      imageList: Array.from({ length: finalImageCreateCount }).fill({
        src: '',
        loading: true,
        error: false
      })
    }

    // 初始化树结构（如果还没有）
    if (!chatHistoryTree.value) {
      chatHistoryTree.value = {
        children: [],
        currentIndex: 0
      }
    }

    // 找到当前对话路径的最后一个节点
    const findLastNode = () => {
      let currentNode = chatHistoryTree.value

      while (currentNode.children && currentNode.children.length > 0) {
        const currentIndex = currentNode.currentIndex ?? 0
        const selectedChild = currentNode.children[currentIndex]
        if (!selectedChild) break
        currentNode = selectedChild
      }

      return currentNode
    }

    const lastNode = findLastNode()

    // 将用户消息添加到最后一个节点的children中
    if (!lastNode.children) {
      lastNode.children = []
    }
    lastNode.children.push(userMessage)
    lastNode.currentIndex = lastNode.children.length - 1

    // 将助手消息添加到用户消息的children中
    userMessage.children.push(assistantMessage)

    // 发送新消息时重置自动滚动状态，确保滚动到底部
    enableAutoScroll()
    scrollToBottom(true)

    loading.value = true
    isReceiving.value = false
    // 记录正在接收消息的节点ID
    receivingMessageId.value = assistantMessageId

    // 获取parentId:如果lastNode是根节点,parentId为null,否则为lastNode的id
    const parentId = lastNode === chatHistoryTree.value ? null : lastNode.id

    // 判断是生图还是对话
    if (isImageGenerationFinal) {
      // 生图逻辑
      handleGenerateImage({
        message: sentMessage,
        fileList,
        parentId,
        imageCount: finalImageCreateCount,
        model: currentModelValue.value[0]
      })
    } else {
      // 对话逻辑
      connectSSE({
        agentId: 0,
        taskId: conversationId.value,
        message: sentMessage,
        fileIds: fileList.map(item => item.fileId).join(','),
        aiModel: currentModelValue.value[0],
        // 开始深度思考后,需要额外判断一下模型是否支持深度思考。如模型不支持,传入了true会报错。
        reasoningEnable: enableDeepThink.value ? !!currentModel.value?.enableReasoning : false,
        parentId
      })
    }
  }

  const fetchChatHistory = _taskId => {
    if (!conversationId.value) return Promise.resolve()

    chatHistoryLoading.value = true
    chatHistoryTree.value = null
  }

  // 停止对话
  const stopSSE = async _taskId => {
    // 获取当前对话路径的最后一条消息（应该是 assistant 消息）
    const lastMessage = chatHistory.value.at(-1)
    try {
    } catch (error) {
      console.log(error)
    }
  }

  // 在树中找到节点的辅助函数
  const findNodeById = (node, targetId) => {
    if (node.id === targetId) {
      return node
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const found = findNodeById(child, targetId)
        if (found) return found
      }
    }

    return null
  }

  /**
   * 根据消息ID设置树的currentIndex，使该消息所在的分支被选中显示
   * @param {Object} node - 树节点
   * @param {string|number} targetId - 目标消息ID
   * @returns {boolean} 是否找到目标消息
   */
  const setCurrentIndexByMessageId = (node, targetId) => {
    if (!node || !targetId) return false

    // 如果当前节点就是目标，返回true（使用宽松相等处理类型不匹配）
    if (node.id != null && String(node.id) === String(targetId)) {
      return true
    }

    // 遍历子节点
    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]
        // 递归查找子节点
        if (setCurrentIndexByMessageId(child, targetId)) {
          // 如果在这个子节点的分支中找到了目标，设置currentIndex为该子节点的索引
          node.currentIndex = i
          return true
        }
      }
    }

    return false
  }

  /**
   * 重新生成回答
   * 点击助手消息的刷新按钮时触发
   * 会基于parentId对应的用户消息重新生成一个新的助手回答
   * 新回答会添加到用户消息的children数组中,形成多个回答版本
   *
   * @param {Object} params - 参数对象
   * @param {string|number} params.messageId - 当前助手消息的ID
   * @param {string|number} params.parentId - 父消息(用户消息)的ID
   */
  // eslint-disable-next-line no-unused-vars
  const handleRegenerateAnswer = ({ messageId, parentId }) => {
    if (loading.value || isReceiving.value) {
      showMessage('正在生成回答中,请稍后再试', { type: 'warning' })
      return
    }

    if (!parentId) {
      showMessage('无法找到对应的用户消息', { type: 'error' })
      return
    }

    // 通过messageId找到当前助手消息节点,判断是否为图片类型
    const currentAssistantMessage = findNodeById(chatHistoryTree.value, messageId)
    const isImageRegeneration = currentAssistantMessage?.isImageGeneration || false

    // 通过parentId找到对应的用户消息节点
    const userMessageNode = findNodeById(chatHistoryTree.value, parentId)

    if (!userMessageNode) {
      showMessage('无法找到对应的用户消息', { type: 'error' })
      return
    }

    const imageCount = isImageRegeneration ? currentAssistantMessage.imageCount || 1 : 0

    // 创建新的助手消息节点
    const newAssistantMessageId = `assistant-${Date.now()}`
    const newAssistantMessage = {
      id: newAssistantMessageId,
      role: 'assistant',
      content: '',
      finished: false,
      createdAt: new Date().toISOString(),
      parentId: userMessageNode.id,
      children: [],
      aiModel: isImageRegeneration ? currentAssistantMessage.aiModel : currentModelValue.value[0],
      currentIndex: 0, // 这个节点自身的 currentIndex(用于其子节点)
      thinkingTime: 0,
      thinkingContent: '',
      reqId: null,
      error: false,
      // 如果原消息是生图,则继承生图属性
      isImageGeneration: isImageRegeneration,
      imageCount,
      imageList: Array.from({ length: imageCount }).fill({
        src: '',
        loading: true,
        error: false
      })
    }

    // 将新的助手消息添加到用户消息的 children 数组中
    // 这样用户消息就会有多个助手回答版本
    if (!userMessageNode.children) {
      userMessageNode.children = []
    }
    userMessageNode.children.push(newAssistantMessage)

    // 更新 currentIndex 指向新的助手消息(最后一个)
    // 这样页面会自动切换到显示新生成的回答
    userMessageNode.currentIndex = userMessageNode.children.length - 1

    // 等待 Vue 更新完成后再发送请求
    nextTick(() => {
      // 发送新消息时重置自动滚动状态,确保滚动到底部
      enableAutoScroll()
      scrollToBottom(true)

      loading.value = true
      isReceiving.value = false
      // 记录正在接收消息的节点ID
      receivingMessageId.value = newAssistantMessageId

      // 判断是生图还是对话
      if (isImageRegeneration) {
        // 重新生图
        handleGenerateImage({
          message: userMessageNode.content,
          fileList: userMessageNode.fileList || [],
          parentId: userMessageNode.id,
          imageCount,
          model: currentAssistantMessage?.aiModel
        })
      } else {
        // 重新发送对话请求,使用用户消息的内容和文件
        const sseParams = {
          agentId: 0,
          taskId: conversationId.value,
          message: userMessageNode.content,
          fileIds: (userMessageNode.fileList || []).map(item => item.fileId).join(','),
          aiModel: currentModelValue.value[0],
          reasoningEnable: enableDeepThink.value ? !!currentModel.value?.enableReasoning : false,
          parentId: userMessageNode.id
        }
        console.log('[handleRegenerateAnswer] 发送SSE请求参数:', sseParams)
        connectSSE(sseParams)
      }
    })
  }

  /**
   * 找到指定节点的父节点
   *
   * @param {Object} node - 当前节点
   * @param {string|number} targetId - 目标节点ID
   * @param {Object|null} parent - 父节点（默认为null）
   * @returns {Object|null} 父节点或null
   */
  const findParentNode = (node, targetId, parent = null) => {
    if (node.id === targetId) {
      return parent
    }
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const found = findParentNode(child, targetId, node)
        if (found !== null) return found
      }
    }
    return null
  }

  /**
   * 处理助手消息的上一页
   * 当用户点击助手消息的上一页箭头时触发
   * 会切换到该用户消息的前一个助手回答版本
   *
   * @param {string|number} parentId - 父消息（用户消息）的ID
   */
  const handleAssistantPrevPage = parentId => {
    const userMessageNode = findNodeById(chatHistoryTree.value, parentId)
    if (userMessageNode && userMessageNode.children && userMessageNode.children.length > 0) {
      const currentIndex = userMessageNode.currentIndex ?? 0
      if (currentIndex > 0) {
        // 减少currentIndex，切换到上一个助手回答
        userMessageNode.currentIndex = currentIndex - 1
        // 注意：不需要手动设置loading，shouldShowLoading computed会自动处理显示状态

        // 如果切换后的分支正在接收消息，需要滚动到底部
        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理助手消息的下一页
   * 当用户点击助手消息的下一页箭头时触发
   * 会切换到该用户消息的下一个助手回答版本
   *
   * @param {string|number} parentId - 父消息（用户消息）的ID
   */
  const handleAssistantNextPage = parentId => {
    const userMessageNode = findNodeById(chatHistoryTree.value, parentId)
    if (userMessageNode && userMessageNode.children && userMessageNode.children.length > 0) {
      const currentIndex = userMessageNode.currentIndex ?? 0
      if (currentIndex < userMessageNode.children.length - 1) {
        // 增加currentIndex，切换到下一个助手回答
        userMessageNode.currentIndex = currentIndex + 1
        // 注意：不需要手动设置loading，shouldShowLoading computed会自动处理显示状态

        // 如果切换后的分支正在接收消息，需要滚动到底部
        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理用户消息的上一页
   * 当用户点击用户消息的上一页箭头时触发
   * 会切换到同一父节点下的前一个用户消息版本
   *
   * @param {string|number} messageId - 当前用户消息的ID
   */
  const handleUserPrevPage = messageId => {
    // 找到当前用户消息的父节点
    const parentNode = findParentNode(chatHistoryTree.value, messageId)

    if (parentNode && parentNode.children && parentNode.children.length > 0) {
      const currentIndex = parentNode.currentIndex ?? 0
      if (currentIndex > 0) {
        // 减少currentIndex，切换到上一个用户消息
        parentNode.currentIndex = currentIndex - 1

        loading.value = false

        // 如果切换后的分支正在接收消息，需要滚动到底部
        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理用户消息的下一页
   * 当用户点击用户消息的下一页箭头时触发
   * 会切换到同一父节点下的下一个用户消息版本
   *
   * @param {string|number} messageId - 当前用户消息的ID
   */
  const handleUserNextPage = messageId => {
    // 找到当前用户消息的父节点
    const parentNode = findParentNode(chatHistoryTree.value, messageId)

    if (parentNode && parentNode.children && parentNode.children.length > 0) {
      const currentIndex = parentNode.currentIndex ?? 0
      if (currentIndex < parentNode.children.length - 1) {
        // 增加currentIndex，切换到下一个用户消息
        parentNode.currentIndex = currentIndex + 1

        loading.value = false

        // 如果切换后的分支正在接收消息，需要滚动到底部
        nextTick(() => {
          if (isViewingReceivingBranch.value) {
            enableAutoScroll()
            scrollToBottom(true)
          }
        })
      }
    }
  }

  /**
   * 处理用户消息编辑
   * 当用户点击编辑按钮时触发
   *
   * @param {string|number} messageId - 用户消息的ID
   */
  const handleEditUserMessage = messageId => {
    if (loading.value || isReceiving.value) {
      showMessage('正在生成回答中，无法编辑', { type: 'warning' })
      return
    }
    editingMessageId.value = messageId
  }

  /**
   * 取消编辑用户消息
   */
  const handleCancelEditUserMessage = () => {
    editingMessageId.value = null
  }

  /**
   * 发送编辑后的用户消息
   * 当用户编辑消息后点击发送时触发
   * 会在当前消息的父节点创建一个新的分支（新的用户消息+助手消息）
   *
   * @param {Object} params - 参数对象
   * @param {string|number} params.messageId - 当前用户消息的ID
   * @param {string} params.editedContent - 编辑后的内容
   */
  const handleSendEditedUserMessage = ({ messageId, editedContent }) => {
    if (!editedContent || !editedContent.trim()) {
      showMessage('消息内容不能为空', { type: 'warning' })
      return
    }

    if (loading.value || isReceiving.value) {
      showMessage('正在生成回答中，请稍后再试', { type: 'warning' })
      return
    }

    // 找到当前用户消息节点
    const currentUserMessageNode = findNodeById(chatHistoryTree.value, messageId)
    if (!currentUserMessageNode) {
      showMessage('无法找到对应的消息', { type: 'error' })
      return
    }

    // 找到父节点
    const parentNode = findParentNode(chatHistoryTree.value, messageId)
    if (!parentNode) {
      showMessage('无法找到父节点', { type: 'error' })
      return
    }

    // 获取当前选中的助手消息,判断是否为生图类型
    const currentIndex = currentUserMessageNode.currentIndex ?? 0
    const currentAssistantMessage = currentUserMessageNode.children?.[currentIndex]
    const isImageRegeneration = currentAssistantMessage?.isImageGeneration || false
    const imageCount = isImageRegeneration ? currentAssistantMessage.imageCount || 1 : 0

    // 创建新的用户消息节点
    const newUserMessageId = `user-${Date.now()}`
    const newAssistantMessageId = `assistant-${Date.now()}`

    const newUserMessage = {
      id: newUserMessageId,
      role: 'user',
      content: editedContent,
      createdAt: new Date().toISOString(),
      parentId: parentNode === chatHistoryTree.value ? null : parentNode.id,
      children: [],
      currentIndex: 0,
      fileList: currentUserMessageNode.fileList || []
    }

    const newAssistantMessage = {
      id: newAssistantMessageId,
      role: 'assistant',
      content: '',
      finished: false,
      createdAt: new Date().toISOString(),
      parentId: newUserMessageId,
      children: [],
      aiModel: isImageRegeneration ? currentAssistantMessage.aiModel : currentModelValue.value[0],
      currentIndex: 0,
      thinkingTime: 0,
      thinkingContent: '',
      filePercent: null,
      reqId: null,
      error: false,
      // 如果原消息是生图,则继承生图属性
      isImageGeneration: isImageRegeneration,
      imageCount,
      imageList: Array.from({ length: imageCount }).fill({
        src: '',
        loading: true,
        error: false
      })
    }

    // 将新的用户消息添加到父节点的children中
    if (!parentNode.children) {
      parentNode.children = []
    }
    parentNode.children.push(newUserMessage)

    // 更新父节点的currentIndex指向新的用户消息
    parentNode.currentIndex = parentNode.children.length - 1

    // 将助手消息添加到新用户消息的children中
    newUserMessage.children.push(newAssistantMessage)

    // 清除编辑状态
    editingMessageId.value = null

    // 等待 Vue 更新完成后再发送请求
    nextTick(() => {
      // 发送新消息时重置自动滚动状态，确保滚动到底部
      enableAutoScroll()
      scrollToBottom(true)

      loading.value = true
      isReceiving.value = false
      // 记录正在接收消息的节点ID
      receivingMessageId.value = newAssistantMessageId

      // 判断是生图还是对话
      if (isImageRegeneration) {
        // 重新生图
        handleGenerateImage({
          message: editedContent,
          fileList: newUserMessage.fileList || [],
          parentId: parentNode === chatHistoryTree.value ? null : parentNode.id,
          imageCount,
          model: currentAssistantMessage?.aiModel
        })
      } else {
        // 发送SSE请求
        const sseParams = {
          agentId: 0,
          taskId: conversationId.value,
          message: editedContent,
          fileIds: (newUserMessage.fileList || []).map(item => item.fileId).join(','),
          aiModel: currentModelValue.value[0],
          reasoningEnable: enableDeepThink.value ? !!currentModel.value?.enableReasoning : false,
          parentId: parentNode === chatHistoryTree.value ? null : parentNode.id
        }
        console.log('[handleSendEditedUserMessage] 发送SSE请求参数:', sseParams)
        connectSSE(sseParams)
      }
    })
  }

  return {
    message,
    sendMessage,
    fetchChatHistory,
    chatHistory,
    chatHistoryTree,
    chatHistoryLoading,
    isReceiving,
    loading,
    shouldShowLoading,
    isViewingReceivingBranch,
    models,
    currentModel,
    currentModelValue,
    isDeepThinkButtonVisible,
    enableDeepThink,
    isFileButtonVisible,
    isUploadFileButtonVisible,
    stopSSE,
    handleRegenerateAnswer,
    handleAssistantPrevPage,
    handleAssistantNextPage,
    handleUserPrevPage,
    handleUserNextPage,
    editingMessageId,
    handleEditUserMessage,
    handleCancelEditUserMessage,
    handleSendEditedUserMessage,
    isCreateImageCountVisible,
    isCreateImageButtonVisible,
    enableCreateImage,
    createImageCount
  }
}
