<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/knowledge-panel/index.vue
 * @Description  : 知识库设置面板
-->

<template>
  <div class="knowledge-panel">
    <div class="panel-header">
      <div class="panel-title">知识库管理</div>
      <div class="panel-desc">创建并管理本地知识库，支持 RAG 检索增强对话</div>
    </div>

    <div class="panel-body">
      <div class="toolbar">
        <el-button type="primary" @click="handleCreateKb">新建知识库</el-button>
        <span class="kb-count">共 {{ knowledgeBases.length }} 个知识库</span>
      </div>

      <div class="kb-list-card">
        <div v-if="knowledgeBases.length === 0" class="empty-state">尚未创建知识库，请先新建</div>

        <div v-else class="kb-list">
          <div v-for="kb in knowledgeBases" :key="kb.id" class="kb-item">
            <div class="kb-main">
              <div class="kb-name">{{ kb.name || '未命名知识库' }}</div>
              <div class="kb-meta">
                <span>{{ kb.embeddingModel }}</span>
                <span class="meta-sep">/</span>
                <span>{{ kb.dimensions }} 维</span>
                <span class="meta-sep">/</span>
                <span>{{ kb.documentCount }} 文档</span>
                <span class="meta-sep">/</span>
                <span>{{ kb.chunkCount }} 分块</span>
              </div>
            </div>

            <div class="kb-actions" @click.stop>
              <el-switch
                :model-value="kb.enabled"
                size="small"
                @update:model-value="handleToggleEnabled(kb.id, $event)"
              />
              <el-button link size="small" @click="handleUploadDocuments(kb)">上传</el-button>
              <el-button link size="small" @click="handleEditKb(kb)">编辑</el-button>
              <el-button link size="small" type="danger" @click="handleDeleteKb(kb.id)">
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑对话框 -->
    <KbEditorDialog v-model="editorDialogVisible" :edit-data="editingKb" @save="handleSaveKb" />

    <!-- 文档上传对话框 -->
    <DocumentUpload
      v-model="uploadDialogVisible"
      :knowledge-base="uploadingKb"
      @uploaded="handleDocumentsUploaded"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useKnowledgeBaseStore } from '@/stores/knowledge-base'
import { deleteVectorStore } from '@/services/vector-store'
import KbEditorDialog from './kb-editor-dialog.vue'
import DocumentUpload from './document-upload.vue'

defineOptions({
  name: 'KnowledgePanel'
})

const kbStore = useKnowledgeBaseStore()

const knowledgeBases = computed(() => kbStore.knowledgeBases)

const editorDialogVisible = ref(false)
const editingKb = ref(null)
const uploadDialogVisible = ref(false)
const uploadingKb = ref(null)

const handleCreateKb = () => {
  editingKb.value = null
  editorDialogVisible.value = true
}

const handleEditKb = kb => {
  editingKb.value = kb
  editorDialogVisible.value = true
}

const handleSaveKb = formData => {
  if (editingKb.value?.id) {
    kbStore.updateKnowledgeBase(editingKb.value.id, formData)
    ElMessage.success('知识库已更新')
  } else {
    kbStore.addKnowledgeBase(formData)
    ElMessage.success('知识库已创建')
  }
}

const handleDeleteKb = async kbId => {
  const confirmed = await ElMessageBox.confirm(
    '删除知识库将同时清除所有已索引的文档数据，此操作不可恢复。',
    '确认删除',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    }
  )
    .then(() => true)
    .catch(() => false)

  if (!confirmed) return

  try {
    await deleteVectorStore(kbId)
  } catch (error) {
    console.warn('[KB] 清理向量数据失败:', error)
  }

  kbStore.deleteKnowledgeBase(kbId)
  ElMessage.success('知识库已删除')
}

const handleToggleEnabled = (kbId, enabled) => {
  kbStore.toggleEnabled(kbId, enabled)
}

const handleUploadDocuments = kb => {
  uploadingKb.value = kb
  uploadDialogVisible.value = true
}

const handleDocumentsUploaded = () => {
  // 上传完成后可刷新列表（store 已自动更新）
}
</script>

<style lang="scss" scoped>
.knowledge-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.panel-header {
  flex-shrink: 0;
  margin-bottom: 20px;

  .panel-title {
    margin-bottom: 8px;
    color: var(--text-normal-color);
    font-size: 18px;
    font-weight: 600;
  }

  .panel-desc {
    color: var(--text-dblight-color);
    font-size: 14px;
  }
}

.panel-body {
  display: flex;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
  gap: 14px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;

  .kb-count {
    margin-left: auto;
    color: var(--text-dblight-color);
    font-size: 12px;
  }
}

.kb-list-card {
  display: flex;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
  border: 1px solid var(--border-color-muted);
  border-radius: 8px;
  background: var(--bg-panel);
}

.kb-list {
  overflow-y: auto;
  flex: 1;
  padding: 10px;
}

.kb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  transition: all 0.2s;
  border: 1px solid var(--border-color-muted);
  border-radius: 8px;

  &:not(:first-child) {
    margin-top: 8px;
  }

  &:hover {
    border-color: var(--main-color, #007e54);
    background-color: rgb(0 126 84 / 4%);
  }

  .kb-main {
    overflow: hidden;
    flex: 1;
    min-width: 0;
    margin-right: 8px;

    .kb-name {
      overflow: hidden;
      margin-bottom: 4px;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 500;
    }

    .kb-meta {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--text-dblight-color);
      font-size: 12px;

      .meta-sep {
        margin: 0 4px;
        opacity: 0.4;
      }
    }
  }

  .kb-actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  color: var(--text-dblight-color);
  font-size: 13px;
}

@include mobile {
  .knowledge-panel {
    padding: 16px;
  }

  .toolbar {
    flex-wrap: wrap;

    .kb-count {
      width: 100%;
      margin-left: 0;
    }
  }
}
</style>
