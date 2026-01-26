<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-16
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/views/common/404.vue
 * @Description  : 404页面
 *
-->
<template>
  <div class="no-match-page">
    <AgentEmpty type="search" description="页面不存在，请检查地址是否正确">
      <el-button type="primary" class="go-home-btn" @click="handleGoHome">返回首页</el-button>
    </AgentEmpty>
  </div>
</template>

<script setup>
import AgentEmpty from '@/components/empty/index.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleGoHome = () => {
  router.push('/')
}
</script>

<style lang="scss" scoped>
.no-match-page {
  position: fixed;
  inset: 48px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 48px;

  .go-home-btn {
    --el-border-radius-base: 4px;
  }
}
</style>
