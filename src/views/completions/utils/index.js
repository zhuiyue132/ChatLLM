/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-04
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-29
 * @FilePath     : /ChatLLM/src/views/completions/utils/index.js
 * @Description  : 补全工具函数
 *
 */

/**
 * 构建树形结构
 * @param {*} items
 * @returns {Array} 树形结构
 */
export const buildTree = items => {
  const map = new Map()
  const roots = []

  // 第一步：创建所有节点的映射
  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  // 第二步：构建树形关系
  items.forEach(item => {
    const node = map.get(item.id)
    if (item.parentId === null || item.parentId === undefined) {
      // 顶级节点（可能有多个）
      roots.push(node)
    } else {
      // 子节点
      const parent = map.get(item.parentId)
      if (parent) {
        parent.children.push(node)
      } else {
        // 如果找不到父节点，作为顶级节点处理
        console.warn(`找不到parentId为${item.parentId}的父节点，将id为${item.id}的节点作为顶级节点`)
        roots.push(node)
      }
    }
  })

  // 第三步：为每个有 children 的节点添加 currentIndex 字段
  const addCurrentIndex = nodes => {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        // 默认选中最后一个子节点（最新的回复）
        node.currentIndex = node.children.length - 1
        // 递归处理子节点
        addCurrentIndex(node.children)
      }
    })
  }

  addCurrentIndex(roots)

  // 第四步：为根节点也包裹一层对象
  return {
    children: roots,
    currentIndex: roots.length > 0 ? roots.length - 1 : 0
  }
}

/**
 * 构建扁平数组结构（多模型对话专用）
 * @param {Array} items - 原始消息数组
 * @returns {Array} 扁平数组结构，每个元素是用户消息，包含 leftChildren 和 rightChildren
 */
export const buildList = items => {
  if (!items || items.length === 0) {
    return []
  }

  // 分离用户消息和助手消息
  const userMessages = items.filter(item => item.role?.toLowerCase() === 'user')
  const assistantMessages = items.filter(item => item.role?.toLowerCase() === 'assistant')

  // 为每个用户消息创建对应的结构
  const result = userMessages.map(userMsg => {
    // 找到属于这个用户消息的所有助手消息
    const relatedAssistants = assistantMessages.filter(
      assistantMsg => assistantMsg.parentId === userMsg.id
    )

    // 按奇偶索引分配到左右列（按 side 属性或索引顺序）
    const leftChildren = []
    const rightChildren = []

    relatedAssistants.forEach((msg, index) => {
      // 如果有 side 属性，按 side 分配；否则按索引分配
      const side = msg.side !== undefined ? msg.side : index
      if (side % 2 === 0) {
        leftChildren.push(msg)
      } else {
        rightChildren.push(msg)
      }
    })

    return {
      ...userMsg,
      leftChildren,
      rightChildren,
      // 默认选中最后一个（最新的）
      leftCurrentIndex: leftChildren.length > 0 ? leftChildren.length - 1 : 0,
      rightCurrentIndex: rightChildren.length > 0 ? rightChildren.length - 1 : 0,
      fileList: userMsg.fileList || []
    }
  })

  return result
}
