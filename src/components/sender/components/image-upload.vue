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
    v-title="disabled ? null : uploadTips"
    :disabled="disabled"
    class="sender-button"
    :loading="isUploading"
    @click="open"
  >
    <i v-if="!isUploading" class="iconfont icon-fujian22 sender-icon"></i>
    <span>上传图片</span>
  </el-button>
</template>
<script setup>
import { useFileDialog, useVModel } from "@vueuse/core";
import { useUploadLimit } from "@/hooks/use-upload-limit";
import { computed } from "vue";
import { showMessage } from "@/hooks/use-message";
import { useImageUpload } from "../hooks/use-image-upload.js";

const props = defineProps({
  count: {
    type: Number,
    default: 0,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  agentCode: {
    type: String,
    default: "",
  },
});

const { LIMIT_OF_IMAGE } = useUploadLimit();
const LIMIT_OF_AGENT = computed(() => {
  return (
    LIMIT_OF_IMAGE.value[props.agentCode] || LIMIT_OF_IMAGE.value.completions
  );
});

const emit = defineEmits(["upload-success", "update:loading"]);

const { uploadFiles } = useImageUpload();

const disabled = computed(() => {
  return props.count >= LIMIT_OF_AGENT.value.maxCount;
});

const isUploading = useVModel(props, "loading", emit);

const { open, reset, onChange } = useFileDialog({
  accept: LIMIT_OF_AGENT.value.fileFormat
    .split(",")
    .map((type) => `image/${type}`)
    .join(","),
  multiple: LIMIT_OF_AGENT.value.multiple,
});

const uploadTips = computed(() => {
  const { fileFormat, maxCount, maxSize } = LIMIT_OF_AGENT.value;
  const format = fileFormat
    .split(",")
    .map((item) => item.toUpperCase())
    .join("/");
  return `最多可上传${maxCount}个（${format}）。单个图片大小不超过${maxSize}M，点击即可上传。`;
});

const validateFile = (file) => {
  const { maxSize, fileFormat } = LIMIT_OF_AGENT.value;

  // 检查文件格式
  const allowedFormats = fileFormat.split(",");
  const fileExtension = file.name.split(".").pop().toLowerCase();
  if (!allowedFormats.includes(fileExtension)) {
    showMessage(`只允许上传 ${fileFormat} 格式的图片`, { type: "error" });
    return false;
  }

  // 检查文件大小
  const fileSize = file.size / 1024 / 1024; // 转换为MB
  if (fileSize > maxSize) {
    showMessage(`图片大小不能超过 ${maxSize}MB`, { type: "error" });
    return false;
  }

  return true;
};

const handleUpload = async (selectedFiles) => {
  if (!selectedFiles || selectedFiles.length === 0) return;

  const { maxCount } = LIMIT_OF_AGENT.value;
  if (selectedFiles.length > maxCount) {
    showMessage(`最多只能上传 ${maxCount} 张图片`, { type: "error" });
    reset();
    return;
  }

  if (selectedFiles.length + props.count > maxCount) {
    showMessage(`最多只能上传 ${maxCount} 张图片，超出的图片将被忽略`, {
      type: "warning",
    });
  }

  isUploading.value = true;

  try {
    const validFiles = Array.from(selectedFiles)
      .slice(0, maxCount - props.count)
      .filter(validateFile);

    if (validFiles.length > 0) {
      // 模拟上传延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const fileIds = await uploadFiles(validFiles);
      if (!fileIds) return;

      // 生成预览URL
      const uploads = validFiles.map((file, index) => ({
        file,
        url: URL.createObjectURL(file),
        type: "image",
        name: file.name,
        size: file.size,
        fileId: fileIds[index],
        belong: "image",
        extension: file.name.split(".").pop().toLowerCase(),
      }));

      emit("upload-success", uploads);
    }
  } catch (error) {
    showMessage("上传失败，请重试", { type: "error" });
    console.error("Upload error:", error);
  } finally {
    isUploading.value = false;
    reset();
  }
};

onChange(handleUpload);

defineOptions({
  name: "SenderImageButton",
});
</script>
