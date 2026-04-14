/*
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/services/vector-store.js
 * @Description  : 基于 edgevec 的向量存储服务
 *
 * edgevec 的 save/load 使用 Rust PostCard 序列化，在浏览器 WASM 环境下
 * 存在反序列化兼容性问题（ERR_CORRUPTION: PostCard will never implement）。
 *
 * 本模块绕过 edgevec 内置的持久化，自行将原始数据（向量 + 元数据）存入 IndexedDB，
 * 每次需要时从原始数据重建 EdgeVec 内存索引。edgevec 仅用于 HNSW 搜索。
 */

const IDB_NAME = 'ChatLLM_VectorStore'
const IDB_VERSION = 1
const IDB_STORE = 'vectors' // objectStore: key=kbId, value={ items: [...] }

let wasmInitialized = false
let EdgeVec = null
let EdgeVecConfig = null

// ============================================================
// IndexedDB 自管理层
// ============================================================

/**
 * 打开自管理的 IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
const openDb = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * 从 IndexedDB 读取某个知识库的原始向量数据
 * @param {string} kbId
 * @returns {Promise<Array<{ vector: number[], metadata: Object }> | null>}
 */
const readRawData = async kbId => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([IDB_STORE], 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const req = store.get(kbId)
    req.onsuccess = () => {
      db.close()
      resolve(req.result?.items || null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

/**
 * 将原始向量数据写入 IndexedDB
 * @param {string} kbId
 * @param {Array<{ vector: number[], metadata: Object }>} items
 */
const writeRawData = async (kbId, items) => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([IDB_STORE], 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    store.put({ items }, kbId)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * 从 IndexedDB 删除某个知识库的数据
 * @param {string} kbId
 */
const deleteRawData = async kbId => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([IDB_STORE], 'readwrite')
    const store = tx.objectStore(IDB_STORE)
    store.delete(kbId)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

// ============================================================
// WASM 初始化
// ============================================================

const ensureWasmInit = async () => {
  if (wasmInitialized) return

  const edgevec = await import('edgevec')

  if (typeof edgevec.default === 'function') {
    await edgevec.default()
  }

  EdgeVec = edgevec.EdgeVec
  EdgeVecConfig = edgevec.EdgeVecConfig
  wasmInitialized = true
}

// ============================================================
// 内存索引管理
// ============================================================

// 内存缓存: kbId → { edgevec: EdgeVec, idToMeta: Map<number, Object> }
const instanceCache = new Map()

/**
 * 从原始数据重建 EdgeVec 内存索引
 * @param {number} dimensions
 * @param {Array<{ vector: number[], metadata: Object }>} rawItems
 * @returns {{ edgevec: EdgeVec, idToMeta: Map<number, Object> }}
 */
const buildIndex = (dimensions, rawItems) => {
  const config = new EdgeVecConfig(dimensions)
  const db = new EdgeVec(config)
  const idToMeta = new Map()

  for (const item of rawItems) {
    const vec = new Float32Array(item.vector)
    const id = db.insert(vec)
    idToMeta.set(id, item.metadata)
  }

  return { edgevec: db, idToMeta }
}

/**
 * 获取或创建知识库的向量索引
 * @param {string} kbId
 * @param {number} dimensions
 * @returns {Promise<{ edgevec: EdgeVec, idToMeta: Map<number, Object> }>}
 */
const getOrCreateIndex = async (kbId, dimensions) => {
  await ensureWasmInit()

  if (instanceCache.has(kbId)) {
    return instanceCache.get(kbId)
  }

  // 尝试从 IndexedDB 加载原始数据并重建索引
  const rawItems = await readRawData(kbId)
  if (rawItems && rawItems.length > 0) {
    console.log(`[VectorStore] 从 IndexedDB 重建索引: ${kbId} (${rawItems.length} 条)`)
    const index = buildIndex(dimensions, rawItems)
    instanceCache.set(kbId, index)
    return index
  }

  // 没有数据，创建空索引
  const config = new EdgeVecConfig(dimensions)
  const db = new EdgeVec(config)
  const index = { edgevec: db, idToMeta: new Map() }
  instanceCache.set(kbId, index)
  return index
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 批量插入向量并持久化
 * @param {string} kbId
 * @param {number} dimensions
 * @param {Array<{ vector: Float32Array, metadata: Object }>} items
 */
export const insertVectors = async (kbId, dimensions, items) => {
  const index = await getOrCreateIndex(kbId, dimensions)

  // 插入到内存索引
  for (const { vector, metadata } of items) {
    const id = index.edgevec.insert(vector)
    index.idToMeta.set(id, metadata)
  }

  // 读取已有数据，追加新数据，写回 IndexedDB
  const existingRaw = (await readRawData(kbId)) || []
  const newRaw = items.map(({ vector, metadata }) => ({
    vector: Array.from(vector),
    metadata
  }))
  await writeRawData(kbId, [...existingRaw, ...newRaw])

  console.log(`[VectorStore] 已插入 ${items.length} 条向量到 ${kbId}，总计 ${existingRaw.length + newRaw.length} 条`)
}

/**
 * 搜索相似向量
 * @param {string} kbId
 * @param {number} dimensions
 * @param {Float32Array} queryVector
 * @param {number} [topK=5]
 * @returns {Promise<Array<{ id: number, score: number, metadata: Object }>>}
 */
export const searchVectors = async (kbId, dimensions, queryVector, topK = 5) => {
  const index = await getOrCreateIndex(kbId, dimensions)

  const results = index.edgevec.search(queryVector, topK)

  // edgevec search 返回 [{ id, score }]，补上 metadata
  return (Array.isArray(results) ? results : []).map(r => ({
    id: r.id,
    score: r.score,
    distance: 1 - (r.score || 0),
    metadata: index.idToMeta.get(r.id) || null
  }))
}

/**
 * 删除知识库的完整向量存储
 * @param {string} kbId
 */
export const deleteVectorStore = async kbId => {
  instanceCache.delete(kbId)
  await deleteRawData(kbId)
}

/**
 * 获取知识库中的文档列表（按文件名去重）
 * @param {string} kbId
 * @returns {Promise<Array<{ source: string, chunkCount: number, createdAt: string }>>}
 */
export const getDocumentList = async kbId => {
  const rawItems = await readRawData(kbId)
  if (!rawItems || rawItems.length === 0) return []

  const docMap = new Map()
  for (const item of rawItems) {
    const source = item.metadata?.source || '未知文件'
    if (!docMap.has(source)) {
      docMap.set(source, { source, chunkCount: 0, createdAt: item.metadata?.createdAt || '' })
    }
    docMap.get(source).chunkCount++
  }

  return Array.from(docMap.values()).sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0
    return a.createdAt < b.createdAt ? -1 : 1
  })
}

/**
 * 删除知识库中某个文件的所有向量
 * @param {string} kbId
 * @param {string} source - 文件名（metadata.source）
 * @returns {Promise<number>} 被删除的分块数
 */
export const removeDocumentBySource = async (kbId, source) => {
  const rawItems = await readRawData(kbId)
  if (!rawItems || rawItems.length === 0) return 0

  const before = rawItems.length
  const remaining = rawItems.filter(item => item.metadata?.source !== source)
  const removedCount = before - remaining.length

  if (removedCount === 0) return 0

  // 重写 IndexedDB
  await writeRawData(kbId, remaining)

  // 清除内存缓存，下次访问时从新数据重建索引
  instanceCache.delete(kbId)

  return removedCount
}

/**
 * 清除全部内存缓存
 */
export const clearVectorStoreCache = () => {
  instanceCache.clear()
}
