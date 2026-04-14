<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/knowledge-panel/document-upload.vue
 * @Description  : 知识库文档上传组件
-->

<template>
  <el-dialog
    v-model="visible"
    title="上传文档"
    width="520px"
    append-to-body
    destroy-on-close
    class="document-upload-dialog"
  >
    <div class="upload-body">
      <div class="upload-area">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :file-list="fileList"
          :accept="acceptTypes"
          multiple
          drag
        >
          <div class="upload-placeholder">
            <i
              class="iconfont icon-upload"
              style="font-size: 32px; color: var(--text-dblight-color)"
            ></i>
            <div class="upload-text">点击或拖拽文件到此区域</div>
            <div class="upload-tip">支持 .txt, .md, .json, .csv, .log 格式</div>
          </div>
        </el-upload>
      </div>

      <div v-if="processing" class="progress-area">
        <div class="progress-text">{{ progressText }}</div>
        <el-progress :percentage="progressPercent" :stroke-width="8" />
      </div>
    </div>

    <template #footer>
      <div class="upload-actions">
        <el-button :disabled="processing" @click="handleCancel">取消</el-button>
        <el-button v-if="processing" type="danger" @click="handleAbort"> 停止 </el-button>
        <el-button
          v-else
          type="primary"
          :disabled="pendingFiles.length === 0"
          @click="handleStartUpload"
        >
          开始处理（{{ pendingFiles.length }} 个文件）
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  processDocument,
  isSupportedFile,
  SUPPORTED_EXTENSIONS
} from '@/services/document-processor'
import { getEmbeddingsBatched } from '@/api/embedding'
import { insertVectors } from '@/services/vector-store'
import { useApiSettingsStore } from '@/stores/api-settings'
import { useKnowledgeBaseStore } from '@/stores/knowledge-base'

defineOptions({
  name: 'DocumentUpload'
})

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  knowledgeBase: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'uploaded'])

const apiSettingsStore = useApiSettingsStore()
const kbStore = useKnowledgeBaseStore()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const acceptTypes = SUPPORTED_EXTENSIONS.join(',')

const fileList = ref([])
const pendingFiles = ref([])
const processing = ref(false)
const progressText = ref('')
const progressPercent = ref(0)

let abortController = null

const handleFileChange = (file, uploadFileList) => {
  if (!isSupportedFile(file.raw)) {
    ElMessage.warning(`不支持的文件格式: ${file.name}`)
    const index = uploadFileList.indexOf(file)
    if (index > -1) uploadFileList.splice(index, 1)
    return
  }
  pendingFiles.value = uploadFileList.map(f => f.raw).filter(Boolean)
}

const handleFileRemove = (file, uploadFileList) => {
  pendingFiles.value = uploadFileList.map(f => f.raw).filter(Boolean)
}

const handleStartUpload = async () => {
  const kb = props.knowledgeBase
  if (!kb) {
    ElMessage.error('知识库信息缺失')
    return
  }

  if (!apiSettingsStore.isConfigured) {
    ElMessage.error('请先配置 API')
    return
  }

  processing.value = true
  progressText.value = '准备处理文档...'
  progressPercent.value = 0
  abortController = new AbortController()

  const files = [...pendingFiles.value]
  let totalDocuments = 0
  let totalChunks = 0

  try {
    for (let i = 0; i < files.length; i++) {
      if (abortController.signal.aborted) break

      const file = files[i]
      progressText.value = `处理文档 (${i + 1}/${files.length}): ${file.name}`
      progressPercent.value = Math.floor((i / files.length) * 30)

      // 分块
      const chunks = await processDocument(file, {
        maxChunkSize: kb.chunkSize,
        chunkOverlap: kb.chunkOverlap
      })

      if (chunks.length === 0) {
        ElMessage.warning(`文件 ${file.name} 内容为空，已跳过`)
        continue
      }

      // 嵌入
      progressText.value = `嵌入向量 (${i + 1}/${files.length}): ${file.name} (${chunks.length} 个分块)`

      const { embeddings } = await getEmbeddingsBatched({
        baseURL: apiSettingsStore.baseURL,
        apiKey: apiSettingsStore.apiKey,
        model: kb.embeddingModel,
        inputs: chunks.map(c => c.text),
        dimensions: kb.dimensions,
        batchSize: 20,
        signal: abortController.signal,
        onProgress: (completed, total) => {
          const fileProgress = 30 + ((i + completed / total) / files.length) * 60
          progressPercent.value = Math.floor(Math.min(fileProgress, 90))
        }
      })

      // 存储向量
      progressText.value = `存储向量: ${file.name}`

      const items = chunks.map((chunk, idx) => ({
        vector: embeddings[idx],
        metadata: chunk.metadata
      }))

      await insertVectors(kb.id, kb.dimensions, items)

      totalDocuments++
      totalChunks += chunks.length
    }

    progressPercent.value = 100
    progressText.value = '处理完成'

    // 更新知识库统计
    if (totalDocuments > 0) {
      kbStore.incrementDocumentCount(kb.id, totalDocuments, totalChunks)
    }

    ElMessage.success(`已处理 ${totalDocuments} 个文档，共 ${totalChunks} 个分块`)
    emit('uploaded')

    setTimeout(() => {
      visible.value = false
    }, 500)
  } catch (error) {
    if (abortController.signal.aborted) {
      ElMessage.info('处理已停止')
    } else {
      ElMessage.error(`处理失败: ${error.message || '未知错误'}`)
    }
  } finally {
    processing.value = false
    abortController = null
  }
}

const handleAbort = () => {
  abortController?.abort()
}

const handleCancel = () => {
  if (processing.value) return
  visible.value = false
}
</script>

<style lang="scss" scoped>
.upload-body {
  .upload-area {
    :deep(.el-upload-dragger) {
      padding: 24px;
    }

    .upload-placeholder {
      display: flex;
      align-items: center;
      flex-direction: column;
      gap: 8px;

      .upload-text {
        color: var(--text-normal-color);
        font-size: 14px;
      }

      .upload-tip {
        color: var(--text-dblight-color);
        font-size: 12px;
      }
    }
  }

  .progress-area {
    margin-top: 16px;

    .progress-text {
      margin-bottom: 8px;
      color: var(--text-light-color);
      font-size: 13px;
    }
  }
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style lang="scss">
.document-upload-dialog {
  --el-dialog-padding-primary: 12px !important;

  .el-dialog__header {
    margin-right: 0;
    padding: 12px 24px;
  }

  .el-dialog__footer {
    padding: 24px;
    padding-top: 0;
  }
}
</style>
