<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-08
 * @FilePath     : /bi-agents/src/components/mention-sender/components/send-button/index.vue
 * @Description  : 发送按钮
-->
<!-- SendButton 发送按钮 -->
<script setup>
import { Top } from '@element-plus/icons-vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
})

const emits = defineEmits(['submit'])
</script>

<template>
  <div class="el-send-button">
    <el-button circle :disabled="props.disabled" @click="emits('submit')">
      <el-icon><Top /></el-icon>
    </el-button>
  </div>
</template>
