<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-25
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-24
 * @FilePath     : /bi-agents/src/components/sender/components/image-upload.vue
 * @Description  : 文件上传按钮
 * 
-->

<template>
  <el-button
    v-title="buttonDisabled ? null : uploadTips"
    :disabled="buttonDisabled"
    class="sender-button"
    :loading="isUploading"
    @click="open"
  >
    <i v-if="!isUploading" class="iconfont icon-fujian22 sender-icon"></i>
    <span>上传图片</span>
  </el-button>
</template>
<script setup>
import { useFileDialog, useVModel } from '@vueuse/core'
import { computed } from 'vue'
import { showMessage } from '@/hooks/use-message'

const IMAGE_LIMIT_BY_AGENT = {
  completions: {
    fileFormat: 'jpg,jpeg,png,gif,webp,bmp',
    maxCount: 4,
    maxSize: 10,
    multiple: true
  }
}

const props = defineProps({
  count: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  },
  agentCode: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const LIMIT_OF_AGENT = computed(() => {
  return IMAGE_LIMIT_BY_AGENT[props.agentCode] || IMAGE_LIMIT_BY_AGENT.completions
})

const emit = defineEmits(['upload-success', 'update:loading'])

const buttonDisabled = computed(() => {
  return props.disabled || props.count >= LIMIT_OF_AGENT.value.maxCount
})

const isUploading = useVModel(props, 'loading', emit)

const { open, reset, onChange } = useFileDialog({
  accept: LIMIT_OF_AGENT.value.fileFormat
    .split(',')
    .map(type => `.${type}`)
    .join(','),
  multiple: LIMIT_OF_AGENT.value.multiple
})

const uploadTips = computed(() => {
  const { fileFormat, maxCount, maxSize } = LIMIT_OF_AGENT.value
  const format = fileFormat
    .split(',')
    .map(item => item.toUpperCase())
    .join('/')
  return `最多可上传${maxCount}个（${format}）。单个图片大小不超过${maxSize}M，点击即可上传。`
})

const readFileAsBase64 = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    reader.readAsDataURL(file)
  })
}

const createImagePreviewDataUrl = (base64, maxSide = 768, quality = 0.75) => {
  if (!base64) return Promise.resolve('')

  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const { width, height } = img
        const scale = Math.min(1, maxSide / Math.max(width, height))
        const targetWidth = Math.max(1, Math.round(width * scale))
        const targetHeight = Math.max(1, Math.round(height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(base64)
          return
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (error) {
        resolve(base64)
      }
    }
    img.onerror = () => {
      resolve(base64)
    }
    img.src = base64
  })
}

const validateFile = file => {
  const { maxSize, fileFormat } = LIMIT_OF_AGENT.value

  // 检查文件格式
  const allowedFormats = fileFormat.split(',')
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
  if (!allowedFormats.includes(fileExtension)) {
    showMessage(`只允许上传 ${fileFormat} 格式的图片`, { type: 'error' })
    return false
  }

  // 检查文件大小
  const fileSize = file.size / 1024 / 1024 // 转换为MB
  if (fileSize > maxSize) {
    showMessage(`图片大小不能超过 ${maxSize}MB`, { type: 'error' })
    return false
  }

  return true
}

const handleUpload = async selectedFiles => {
  if (!selectedFiles || selectedFiles.length === 0) return

  const { maxCount } = LIMIT_OF_AGENT.value
  if (selectedFiles.length > maxCount) {
    showMessage(`最多只能上传 ${maxCount} 张图片`, { type: 'error' })
    reset()
    return
  }

  if (selectedFiles.length + props.count > maxCount) {
    showMessage(`最多只能上传 ${maxCount} 张图片，超出的图片将被忽略`, {
      type: 'warning'
    })
  }

  isUploading.value = true

  try {
    const validFiles = Array.from(selectedFiles)
      .slice(0, maxCount - props.count)
      .filter(validateFile)

    if (validFiles.length > 0) {
      const base64Images = await Promise.all(validFiles.map(file => readFileAsBase64(file)))
      const previewImages = await Promise.all(
        base64Images.map(base64 => createImagePreviewDataUrl(base64))
      )

      // 生成预览URL
      const uploads = validFiles
        .map((file, index) => {
          const extension = file.name.split('.').pop()?.toLowerCase() || ''
          const base64 = base64Images[index]
          const previewBase64 = previewImages[index]
          if (!base64) return null

          return {
            file,
            url: URL.createObjectURL(file),
            type: 'image',
            name: file.name,
            size: file.size,
            belong: 'image',
            extension,
            mimeType: file.type || `image/${extension}`,
            base64,
            previewBase64: previewBase64 || base64
          }
        })
        .filter(Boolean)

      if (!uploads.length) {
        showMessage('图片读取失败，请重试', { type: 'error' })
        return
      }

      emit('upload-success', uploads)
    }
  } catch (error) {
    showMessage(error?.message || '上传失败，请重试', { type: 'error' })
    console.error('Upload error:', error)
  } finally {
    isUploading.value = false
    reset()
  }
}

onChange(handleUpload)

defineOptions({
  name: 'SenderImageButton'
})
</script>
