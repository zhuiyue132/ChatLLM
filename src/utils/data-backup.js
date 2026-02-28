/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-29
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-29
 * @FilePath     : /ChatLLM/src/utils/data-backup.js
 * @Description  : 数据备份工具函数 - 导入、导出、格式转换
 */

/**
 * 选择 JSON 文件
 * @returns {Promise<File>}
 */
export const selectJsonFile = () => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files?.[0]
      if (file) resolve(file)
      else reject(new Error('未选择文件'))
    }
    input.click()
  })
}

/**
 * 读取文件内容
 * @param {File} file
 * @returns {Promise<string>}
 */
export const readFileAsText = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * 下载 JSON 文件
 * @param {Object} data - 要下载的数据
 * @param {string} filename - 文件名
 */
export const downloadJson = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出 ChatLLM 数据
 * @param {Array} rooms - 房间列表
 * @param {Object} messages - 消息数据
 * @returns {Object}
 */
export const exportChatData = (rooms, messages) => {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: { rooms, messages }
  }
}

/**
 * 导入 ChatLLM 原生格式数据
 * @param {Object} jsonData - 导入的 JSON 数据
 * @returns {Object} { rooms, messages }
 */
export const importNativeData = jsonData => {
  // 验证格式
  if (!jsonData.data?.rooms || !jsonData.data?.messages) {
    throw new Error('无效的数据格式')
  }
  return jsonData.data
}

/**
 * 提取模型名称（Cherry Studio 的 model 可能是对象或字符串）
 * @param {string|Object|null} model - 模型信息
 * @returns {string|null}
 */
const extractModelName = model => {
  if (!model) return null
  if (typeof model === 'string') return model
  if (typeof model === 'object') {
    return model.id || model.name || null
  }
  return null
}

/**
 * 构建消息树（Cherry Studio 是线性消息，转为单链树）
 * @param {Array} cherryMessages - Cherry Studio 消息数组
 * @param {Map} blocksMap - blockId -> block 映射
 * @returns {Object} 消息树
 */
const buildMessageTree = (cherryMessages, blocksMap) => {
  const tree = { children: [], currentIndex: 0 }
  let currentNode = tree

  for (const msg of cherryMessages) {
    // 通过 msg.blocks（block ID 数组）查找对应的内容块
    const blockIds = msg.blocks || []
    const blocks = blockIds.map(id => blocksMap.get(id)).filter(Boolean)

    // 合并 main_text 类型的内容
    const textBlocks = blocks.filter(b => b.type === 'main_text' || b.type === 'text')
    const content = textBlocks.map(b => b.content).join('\n') || msg.content || ''

    // 查找推理内容（thinking block）
    const thinkingBlocks = blocks.filter(b => b.type === 'thinking')
    const reasoningContent = thinkingBlocks.map(b => b.content).join('\n') || ''

    const messageNode = {
      id: `msg-imported-${msg.id}`,
      role: msg.role,
      content,
      reasoningContent,
      reasoningTime: 0,
      model: extractModelName(msg.model),
      parentId: currentNode === tree ? null : currentNode.id,
      children: [],
      currentIndex: 0,
      finished: true,
      error: false,
      createdAt: msg.createdAt || new Date().toISOString()
    }

    currentNode.children.push(messageNode)
    currentNode.currentIndex = 0
    currentNode = messageNode
  }

  return tree
}

/**
 * 从 Cherry Studio 数据中解析 topic 标题映射
 * @param {Object} cherryData - Cherry Studio 导出的数据
 * @returns {Map} topicId -> title 映射
 */
const parseTopicTitles = cherryData => {
  const titleMap = new Map()
  const createdAtMap = new Map()
  const updatedAtMap = new Map()

  try {
    const localStorage = cherryData.localStorage
    if (!localStorage) return titleMap

    // localStorage['persist:cherry-studio'] 是 JSON 字符串
    const persistData = localStorage['persist:cherry-studio']
    if (!persistData) return titleMap

    const parsed = typeof persistData === 'string' ? JSON.parse(persistData) : persistData

    // parsed.assistants 也是 JSON 字符串
    const assistantsData = parsed.assistants
    if (!assistantsData) return titleMap

    const assistantsParsed =
      typeof assistantsData === 'string' ? JSON.parse(assistantsData) : assistantsData

    // assistants.assistants 是数组，每项有 topics 字段
    const assistants = assistantsParsed.assistants || []
    for (const assistant of assistants) {
      const topics = assistant.topics || []
      for (const topic of topics) {
        if (topic.id && topic.name) {
          titleMap.set(topic.id, topic.name)
          createdAtMap.set(topic.id, topic.createdAt)
          updatedAtMap.set(topic.id, topic.updatedAt)
        }
      }
    }
  } catch (e) {
    console.warn('解析 Cherry Studio topic 标题失败:', e)
  }

  return [titleMap, createdAtMap, updatedAtMap]
}

/**
 * Cherry Studio 数据转换
 * @param {Object} cherryData - Cherry Studio 导出的数据
 * @returns {Object} { rooms, messages }
 */
export const convertCherryStudioData = cherryData => {
  const { indexedDB } = cherryData
  if (!indexedDB?.topics) {
    throw new Error('无效的 Cherry Studio 数据格式')
  }

  const { topics, message_blocks = [] } = indexedDB

  // 解析 topic 标题
  const [titleMap, createdAtMap, updatedAtMap] = parseTopicTitles(cherryData)
  // console.log(titleMap, createdAtMap, updatedAtMap)

  // 构建 blockId -> block 映射
  const blocksMap = new Map()

  for (const block of message_blocks) {
    blocksMap.set(block.id, block)
  }

  const rooms = []
  const messages = {}

  for (const topic of topics) {
    const roomId = `room-imported-${topic.id}`

    const title = titleMap.get(topic.id) || topic.name || ''
    const createdAt = createdAtMap.get(topic.id) || new Date().toISOString()
    const updatedAt = updatedAtMap.get(topic.id) || new Date().toISOString()

    const messageTree = buildMessageTree(topic.messages || [], blocksMap)

    const assistantModels = topic.messages.map(msg => extractModelName(msg.model)).filter(Boolean)

    if (messageTree && messageTree.children.length > 0 && assistantModels.length > 0 && title) {
      // 创建房间
      rooms.push({
        id: roomId,
        title,
        model: extractModelName(topic.model),
        createdAt,
        updatedAt,
        topFlag: false,
        pinTime: null
      })

      // 转换消息为树形结构
      messages[roomId] = messageTree
    }
  }

  return { rooms, messages }
}

/**
 * 导出应用备份数据（包含应用设置与对话数据）
 * @param {Object} options - 备份选项
 * @param {Object} options.apiSettings - API 设置快照
 * @param {Object} options.backupSettings - 备份设置快照
 * @param {Object} options.themeSettings - 主题设置快照
 * @param {Object} options.userProfileSettings - 用户信息快照
 * @param {Array} options.rooms - 房间列表
 * @param {Object} options.messages - 消息数据
 * @returns {Object}
 */
export const exportAppBackup = ({
  apiSettings,
  backupSettings,
  themeSettings,
  userProfileSettings,
  rooms,
  messages
}) => {
  const chatData = exportChatData(rooms, messages)
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    appSettings: {
      apiSettings: apiSettings || {},
      backupSettings: backupSettings || {},
      themeSettings: themeSettings || {},
      userProfileSettings: userProfileSettings || {}
    },
    chatData
  }
}

/**
 * 导入应用备份数据（兼容仅对话数据格式）
 * @param {Object} jsonData - 备份 JSON
 * @returns {Object} { appSettings, rooms, messages }
 */
export const importAppBackup = jsonData => {
  if (!jsonData) {
    throw new Error('无效的备份数据')
  }

  const hasAppSettings = !!jsonData.appSettings
  const appSettings = hasAppSettings
    ? {
        ...jsonData.appSettings
      }
    : null

  if (appSettings) {
    // 兼容历史字段名，统一为 userProfileSettings
    appSettings.userProfileSettings =
      appSettings.userProfileSettings ||
      appSettings.userProfile ||
      appSettings.userInfo ||
      jsonData.userProfileSettings ||
      null
  }

  let chatPayload = null

  if (jsonData.chatData?.data?.rooms && jsonData.chatData?.data?.messages) {
    chatPayload = jsonData.chatData
  } else if (jsonData.data?.rooms && jsonData.data?.messages) {
    chatPayload = jsonData
  }

  if (!chatPayload) {
    throw new Error('备份数据缺少对话信息')
  }

  const { rooms, messages } = importNativeData(chatPayload)

  return {
    appSettings,
    rooms,
    messages
  }
}
