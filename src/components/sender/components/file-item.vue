<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-09-01
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-12-15
 * @FilePath     : /bi-agents/src/components/sender/components/file-item.vue
 * @Description  : 文件项组件
 * 
-->
<template>
  <div class="upload-file-item-wrapper" :class="{ readonly }">
    <div v-if="file.type === 'image'" :class="{ 'upload-file-item-image': true, readonly }">
      <el-image
        v-if="file.url"
        :src="file.url"
        :preview-src-list="imageList"
        fit="cover"
        class="file-preview"
        :initial-index="imageIndex"
      ></el-image>

      <el-image v-else :src="getFileIcon(fileName)" class="file-preview"></el-image>
    </div>

    <!-- 文件项 -->
    <div v-else :class="{ 'upload-file-item-file': true, readonly }">
      <div class="file-icon">
        <img :src="getFileIcon(fileName)" alt="" />
      </div>
      <div class="file-info">
        <span v-title="fileName" class="file-name">{{ fileName }}</span>
        <span class="file-size">
          {{ `${formatFileExt(fileName)}&nbsp;&nbsp;${formatFileSize(fileSize)}` }}
        </span>
      </div>
    </div>

    <!-- 删除按钮 -->
    <div v-if="!readonly" class="remove-btn" @click="$emit('remove', index)">
      <div class="remove-btn-inner">
        <i class="icon-cancel"></i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatFileSize, formatFileExt, isImageUrl } from '@/utils'

import docxIcon from '@/assets/images/file-icon/docx.svg'
import imageIcon from '@/assets/images/file-icon/image.png'
import pdfIcon from '@/assets/images/file-icon/pdf.svg'
import pptxIcon from '@/assets/images/file-icon/pptx.svg'
import xlsxIcon from '@/assets/images/file-icon/xlsx.svg'
import videoIcon from '@/assets/images/file-icon/video.svg'
import unknowIcon from '@/assets/images/file-icon/unknown-1.svg'

const fileIconMap = {
  pptx: pptxIcon,
  xlsx: xlsxIcon,
  pdf: pdfIcon,
  docx: docxIcon,
  image: imageIcon,
  unknow: unknowIcon,
  video: videoIcon
}

const getFileIcon = filename => {
  if (isImageUrl(filename)) {
    return fileIconMap.image
  }

  const ext = filename.split('.').pop().toUpperCase()

  switch (ext) {
    case 'PPTX':
    case 'PPT':
      return fileIconMap.pptx

    case 'XLSX':
    case 'XLS':
    case 'CSV':
      return fileIconMap.xlsx

    case 'PDF':
      return fileIconMap.pdf
    case 'DOC':
    case 'DOCX':
    case 'WORD':
      return fileIconMap.docx
    case 'MP4':
      return fileIconMap.video
    default:
      return fileIconMap.unknow
  }
}

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },

  readonly: {
    type: Boolean,
    default: false
  },

  fileList: {
    type: Array,
    default: () => []
  }
})

// 兼容不同的文件名字段
const fileName = computed(() => props.file.name || props.file.fileName)
// 兼容不同的文件大小字段
const fileSize = computed(() => props.file.size || props.file.fileSize)

const imageList = computed(() =>
  props.fileList.filter(item => item.type === 'image').map(item => item.url)
)
const imageIndex = computed(() => {
  return imageList.value.findIndex(item => item === props.file.url)
})

defineEmits(['remove'])
</script>

<style lang="scss" scoped>
.upload-file-item-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .upload-file-item-image {
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 48px;
    height: 48px;
    border: 1px solid #f0f0f0;
    border-radius: 10px;

    &.readonly {
      border-color: transparent;
      background-color: #f6f6f6;
    }

    .file-preview {
      flex-shrink: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .upload-file-item-file {
    position: relative;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: 158px;
    height: 48px;

    /* height: fit-content; */
    padding: 0 8px;
    border: 1px solid #d4dbe9;
    border-radius: 8px;
    background-color: #fafafb;

    &.readonly {
      border-color: transparent;
      background-color: #f6f6f6;
    }

    @include flex-gap(8px, row);

    .file-icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;

      img {
        width: 36px;
        height: 32px;
      }
    }

    .file-info {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      height: 40px;

      .file-name {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: #000;
        font-family: 'Source Han Sans CN', sans-serif;
        font-size: 14px;
        font-weight: 500;
      }

      .file-size {
        color: #8c8c8c;
        font-family: 'Source Han Sans CN', sans-serif;
        font-size: 12px;
        font-weight: 400;
      }
    }
  }

  .remove-btn {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 4px;
    cursor: pointer;
    transform: translate(40%, -40%);

    &:active {
      opacity: 0.8;
    }

    .remove-btn-inner {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
      justify-content: center;
      box-sizing: border-box;
      width: 14px;
      height: 14px;
      text-align: center;
      border: 1px solid #22272214;
      border-radius: 50%;
      background-color: #6c756b;

      .icon-cancel {
        color: #fff;
        font-size: 10px;
        line-height: 14px;
      }
    }
  }
}
</style>
