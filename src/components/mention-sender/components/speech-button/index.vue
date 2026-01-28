<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-08
 * @FilePath     : /bi-agents/src/components/mention-sender/components/speech-button/index.vue
 * @Description  : 语音按钮
-->
<!-- SpeechButton 语音按钮 -->
<script setup>
import { Microphone } from '@element-plus/icons-vue'
</script>

<template>
  <div class="el-send-button">
    <el-button circle>
      <el-icon><Microphone /></el-icon>
    </el-button>
  </div>
</template>
