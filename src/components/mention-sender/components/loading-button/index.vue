<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-08
 * @FilePath     : /bi-agents/src/components/mention-sender/components/loading-button/index.vue
 * @Description  : 
 * 
-->
<!-- LoadingButton loading 按钮 -->
<template>
  <div class="el-send-button">
    <el-button circle @click="emits('cancel')">
      <loading class="loading-svg" />
    </el-button>
  </div>
</template>
<script setup>
import loading from './loading.vue'

const emits = defineEmits(['cancel'])
</script>

<style scoped lang="scss">
.el-send-button {
  :deep(.el-button) {
    padding: 0;
  }

  .loading-svg {
    width: 100%;
    color: var(--el-color-primary);
  }
}
</style>
