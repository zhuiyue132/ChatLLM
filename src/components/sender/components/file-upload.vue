<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-25
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-21
 * @FilePath     : /bi-agents/src/components/sender/components/file-upload.vue
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
    <span>上传文件</span>
  </el-button>
</template>

<script setup>
import { useFileDialog } from "@vueuse/core";
import { useUploadLimit } from "@/hooks/use-upload-limit";
import { computed } from "vue";
import { showMessage } from "@/hooks/use-message";
import { useVModel } from "@vueuse/core";
import { useSenderUpload } from "../hooks/use-sender-upload";
import { isImageUrl } from "@/utils";
import { AGENT_CODE } from "@/config/agent-code";

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
  modelName: {
    type: String,
    default: "",
  },
});

const { LIMIT_OF_FILE } = useUploadLimit();
const LIMIT_OF_AGENT = computed(() => {
  return (
    LIMIT_OF_FILE.value[props.agentCode] ||
    LIMIT_OF_FILE.value[AGENT_CODE.CUSTOMER_DEMAND_ANALYST]
  );
});
const emit = defineEmits(["upload-success", "update:loading"]);

const isUploading = useVModel(props, "loading", emit);

const { uploadFiles } = useSenderUpload(props);

const disabled = computed(() => {
  return props.count >= LIMIT_OF_AGENT.value.maxCount;
});

const uploadTips = computed(() => {
  const { fileFormat, maxCount, maxSize } = LIMIT_OF_AGENT.value;
  const format = fileFormat
    .split(",")
    .map((item) => item.toUpperCase())
    .join("/");
  return `最多可上传${maxCount}个（${format}）。单个文件大小不超过${maxSize}M，点击即可上传。`;
});

const { open, reset, onChange } = useFileDialog({
  accept: LIMIT_OF_AGENT.value.fileFormat
    .split(",")
    .map((type) => `.${type}`)
    .join(","),
  multiple: LIMIT_OF_AGENT.value.multiple,
});

const validateFile = (file) => {
  const { maxSize, fileFormat } = LIMIT_OF_AGENT.value;

  const allowedFormats = fileFormat.split(",");
  const fileExtension = file.name.split(".").pop().toLowerCase();
  if (!allowedFormats.includes(fileExtension)) {
    showMessage(`只允许上传 ${fileFormat} 格式的文件`, { type: "error" });
    return false;
  }

  const fileSize = file.size / 1024 / 1024; // Convert to MB
  if (fileSize > maxSize) {
    showMessage(`文件大小不能超过 ${maxSize}MB`, { type: "error" });
    return false;
  }

  return true;
};

const handleUpload = async (selectedFiles) => {
  if (!selectedFiles || selectedFiles.length === 0) return;

  const { maxCount } = LIMIT_OF_AGENT.value;
  if (selectedFiles.length > maxCount) {
    showMessage(`最多只能上传 ${maxCount} 个文件`, { type: "error" });
    reset();
    return;
  }

  if (selectedFiles.length + props.count > maxCount) {
    showMessage(`最多只能上传 ${maxCount} 个文件，超出的文件将被忽略`, {
      type: "warning",
    });
  }

  isUploading.value = true;

  try {
    const validFiles = Array.from(selectedFiles)
      .slice(0, maxCount - props.count)
      .filter(validateFile);

    if (validFiles.length > 0) {
      const { fileIds, tokens = [] } = await uploadFiles(validFiles);
      if (!fileIds) return;

      const uploads = validFiles.map((file, index) => ({
        file,
        type: isImageUrl(file.name) ? "image" : "file",
        url: isImageUrl(file.name) ? URL.createObjectURL(file) : null,
        name: file.name,
        size: file.size,
        fileId: fileIds[index],
        belong: "file",
        extension: file.name.split(".").pop().toLowerCase(),
        tokens: tokens[index] || 0,
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
  name: "SenderFileButton",
});
</script>
