<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-08
 * @FilePath     : /bi-agents/src/components/mention-sender/components/clear-button/index.vue
 * @Description  : 清理按钮
-->
<!-- ClearButton 清理按钮 -->
<script setup>
import { Brush } from "@element-plus/icons-vue";

const emit = defineEmits(["clear"]);
</script>

<template>
  <div class="el-send-button">
    <el-button circle @click="emit('clear')">
      <el-icon><Brush /></el-icon>
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.el-send-button {
  :deep() {
    .el-button {
      .el-icon {
        // 旋转180
        transform: rotate(180deg);
      }
    }
  }
}
</style>
