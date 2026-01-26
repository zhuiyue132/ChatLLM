<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-08
 * @FilePath     : /bi-agents/src/components/mention-sender/components/speech-loading-button/index.vue
 * @Description  : 语音loading 按钮
-->
<!-- SpeechLoadingButton 语音loading 按钮 -->
<script setup>
import loading from "./loading.vue";
</script>

<template>
  <div class="el-send-button">
    <el-button circle>
      <loading class="loading-svg" />
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.el-send-button {
  :deep() {
    .el-button {
      padding: 0;
    }
  }

  .loading-svg {
    width: 16px;
    color: var(--el-color-primary);
  }
}
</style>
