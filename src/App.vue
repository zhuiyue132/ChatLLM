<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-15
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-08-27 15:08:16
 * @FilePath     : /ChatLLM/src/App.vue
 * @Description  : 主应用组件，支持动态布局切换
 * 
-->
<script setup>
import '@/assets/icon/iconfont.css'
import { computed, onMounted } from 'vue'
import MainLayout from './layouts/main.vue'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useEventListener } from '@vueuse/core'
import { getModelList } from '@/api/completions'

onMounted(async () => {
  const response = await getModelList()
  console.log(response)
  if (response.success && response.data.length > 0) {
    const model = response.data[0]
    console.log(model)
  }
})

const currentLayout = computed(() => {
  return MainLayout
})

const visibilityChangeHandler = async () => {
  // TODO: 隐藏状态停止回复
}

useEventListener(window, 'visibilitychange', visibilityChangeHandler)
</script>

<template>
  <el-config-provider :locale="zhCn">
    <component :is="currentLayout" />
  </el-config-provider>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;

  font-family: -apple-system, BlinkMacSystemFont, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 移动端适配样式 */
@media (width <= 768px) {
  html,
  body {
    font-size: 14px;
  }
}
</style>
