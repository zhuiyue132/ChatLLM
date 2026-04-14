<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-04-14
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-04-14
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/knowledge-panel/kb-editor-dialog.vue
 * @Description  : 知识库 创建/编辑 对话框
-->

<template>
  <el-dialog
    v-model="visible"
    :title="isEditing ? '编辑知识库' : '新建知识库'"
    width="520px"
    append-to-body
    destroy-on-close
    class="kb-editor-dialog"
  >
    <div class="editor-body">
      <el-form label-position="top" class="editor-form">
        <el-form-item label="知识库名称">
          <el-input v-model="form.name" placeholder="例如：项目文档" clearable />
        </el-form-item>

        <el-form-item label="嵌入模型">
          <el-select
            v-model="form.embeddingModel"
            placeholder="请选择嵌入模型"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="model in embeddingModels"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-select>
          <div v-if="embeddingModels.length === 0" class="form-item-tip form-item-warning">
            当前没有标记为 Embedding 能力的模型，请先在「模型列表」中为模型启用 Embedding 能力
          </div>
        </el-form-item>

        <el-form-item label="向量维度">
          <el-input-number
            v-model="form.dimensions"
            :min="64"
            :max="8192"
            :step="64"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-item-tip">请根据所选嵌入模型设置正确的维度（常见：1536、1024、768）</div>
        </el-form-item>

        <el-form-item label="分块大小（字符数）">
          <el-input-number
            v-model="form.chunkSize"
            :min="64"
            :max="4096"
            :step="64"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="分块重叠（字符数）">
          <el-input-number
            v-model="form.chunkOverlap"
            :min="0"
            :max="512"
            :step="16"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="检索数量（topK）">
          <el-input-number
            v-model="form.topK"
            :min="1"
            :max="20"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-item-tip">对话时检索最相关的 K 条内容注入上下文</div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="editor-actions">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">
          {{ isEditing ? '保存' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useApiSettingsStore } from '@/stores/api-settings'

defineOptions({
  name: 'KbEditorDialog'
})

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  editData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const apiSettingsStore = useApiSettingsStore()

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.editData?.id)

const embeddingModels = computed(() => {
  return apiSettingsStore.selectedModels.filter(modelId =>
    apiSettingsStore.modelSupportsCapability(modelId, 'embedding')
  )
})

const createEmptyForm = () => ({
  name: '',
  embeddingModel: '',
  dimensions: 1536,
  chunkSize: 512,
  chunkOverlap: 64,
  topK: 5
})

const form = reactive(createEmptyForm())

const fillForm = data => {
  const source = data || createEmptyForm()
  form.name = source.name || ''
  form.embeddingModel = source.embeddingModel || ''
  form.dimensions = source.dimensions || 1536
  form.chunkSize = source.chunkSize || 512
  form.chunkOverlap = source.chunkOverlap || 64
  form.topK = source.topK || 5
}

watch(
  () => props.modelValue,
  isVisible => {
    if (isVisible) {
      fillForm(props.editData)
    }
  }
)

const handleSave = () => {
  if (!form.name.trim()) {
    ElMessage.error('请输入知识库名称')
    return
  }
  if (!form.embeddingModel) {
    ElMessage.error('请选择嵌入模型')
    return
  }

  emit('save', {
    name: form.name.trim(),
    embeddingModel: form.embeddingModel,
    dimensions: form.dimensions,
    chunkSize: form.chunkSize,
    chunkOverlap: form.chunkOverlap,
    topK: form.topK
  })

  visible.value = false
}
</script>

<style lang="scss" scoped>
.editor-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;

    .el-form-item__label {
      padding-bottom: 4px;
      font-size: 13px;
      line-height: 20px;
    }
  }

  .form-item-tip {
    margin-top: 6px;
    color: var(--text-dblight-color);
    font-size: 12px;
    line-height: 18px;
  }

  .form-item-warning {
    color: var(--warning-accent);
  }
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style lang="scss">
.kb-editor-dialog {
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
