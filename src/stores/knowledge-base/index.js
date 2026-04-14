/*
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/stores/knowledge-base/index.js
 * @Description  : 知识库配置状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const generateId = (prefix = 'kb-') => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const normalizeKnowledgeBase = kb => {
  const normalized = kb && typeof kb === 'object' ? kb : {}
  return {
    id: normalized.id || generateId(),
    name: `${normalized.name || ''}`.trim(),
    embeddingModel: `${normalized.embeddingModel || ''}`.trim(),
    dimensions: Math.max(1, Math.floor(Number(normalized.dimensions) || 1536)),
    chunkSize: Math.max(64, Math.floor(Number(normalized.chunkSize) || 512)),
    chunkOverlap: Math.max(0, Math.floor(Number(normalized.chunkOverlap) || 64)),
    topK: Math.max(1, Math.floor(Number(normalized.topK) || 5)),
    documentCount: Math.max(0, Math.floor(Number(normalized.documentCount) || 0)),
    chunkCount: Math.max(0, Math.floor(Number(normalized.chunkCount) || 0)),
    enabled: normalized.enabled !== false,
    createdAt: normalized.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

export const useKnowledgeBaseStore = defineStore(
  'knowledge-base',
  () => {
    const knowledgeBases = ref([])

    const enabledKnowledgeBases = computed(() => {
      return knowledgeBases.value.filter(kb => kb.enabled)
    })

    const getKnowledgeBaseById = kbId => {
      if (!kbId) return null
      return knowledgeBases.value.find(kb => kb.id === kbId) || null
    }

    const addKnowledgeBase = kb => {
      const normalized = normalizeKnowledgeBase(kb)
      if (!normalized.name || !normalized.embeddingModel) {
        return null
      }
      knowledgeBases.value.push(normalized)
      return normalized
    }

    const updateKnowledgeBase = (kbId, updates = {}) => {
      const index = knowledgeBases.value.findIndex(kb => kb.id === kbId)
      if (index === -1) return null

      const current = knowledgeBases.value[index]
      const merged = normalizeKnowledgeBase({
        ...current,
        ...updates,
        id: current.id,
        createdAt: current.createdAt
      })

      knowledgeBases.value[index] = merged
      return merged
    }

    const deleteKnowledgeBase = kbId => {
      const index = knowledgeBases.value.findIndex(kb => kb.id === kbId)
      if (index === -1) return false
      knowledgeBases.value.splice(index, 1)
      return true
    }

    const toggleEnabled = (kbId, enabled) => {
      return updateKnowledgeBase(kbId, { enabled: !!enabled })
    }

    const incrementDocumentCount = (kbId, addedDocuments = 1, addedChunks = 0) => {
      const kb = getKnowledgeBaseById(kbId)
      if (!kb) return
      return updateKnowledgeBase(kbId, {
        documentCount: kb.documentCount + addedDocuments,
        chunkCount: kb.chunkCount + addedChunks
      })
    }

    const decrementDocumentCount = (kbId, removedDocuments = 1, removedChunks = 0) => {
      const kb = getKnowledgeBaseById(kbId)
      if (!kb) return
      return updateKnowledgeBase(kbId, {
        documentCount: Math.max(0, kb.documentCount - removedDocuments),
        chunkCount: Math.max(0, kb.chunkCount - removedChunks)
      })
    }

    const resetSettings = () => {
      knowledgeBases.value = []
    }

    return {
      knowledgeBases,
      enabledKnowledgeBases,
      getKnowledgeBaseById,
      addKnowledgeBase,
      updateKnowledgeBase,
      deleteKnowledgeBase,
      toggleEnabled,
      incrementDocumentCount,
      decrementDocumentCount,
      resetSettings
    }
  },
  {
    persist: {
      key: 'chat-llm-knowledge-base'
    }
  }
)
