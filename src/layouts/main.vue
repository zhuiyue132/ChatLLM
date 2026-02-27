<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-01-12
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/layouts/main.vue
 * @Description  : 主布局（v2 版本）- 带侧边栏
 * 
-->
<template>
  <div class="main-v2-layout">
    <!-- 侧边栏 -->
    <CommonSidebar />

    <!-- 移动端遮罩层 -->
    <transition name="overlay-fade">
      <div v-if="isMobile && !isCollapsed" class="sidebar-overlay" @click="closeSidebar" />
    </transition>

    <!-- 右侧内容区域 -->
    <div class="main-content">
      <!-- 顶部导航栏 -->
      <PageHeader class="page-header" :show-back-btn="showBackBtn" />
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :class="classNames.page" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/header/index-v2.vue'
import CommonSidebar from '@/components/sidebar/index.vue'
import { useSidebar } from '@/hooks/use-sidebar'

const route = useRoute()
const { isMobile, isCollapsed, closeSidebar } = useSidebar()

// 方便在路由中配置classNames
const classNames = computed(() => {
  return {
    page: route.meta?.pageClass || ''
  }
})

const showBackBtn = computed(() => {
  return route.meta?.showBackBtn
})
</script>

<style lang="scss" scoped>
.main-v2-layout {
  display: flex;
  overflow: visible;
  min-height: 100vh;
  background-color: #fff;
}

.page-header {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 1000;
}

.main-content {
  overflow: visible;
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  background-color: #fff;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1998;
  width: 100%;
  height: 100%;
  background: rgb(0 0 0 / 40%);
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

@include mobile {
  .main-content {
    width: 100%;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
.agents-list::-webkit-scrollbar {
  width: 4px;
}

.agents-list::-webkit-scrollbar-track {
  background: transparent;
}

.agents-list::-webkit-scrollbar-thumb {
  border-radius: 2px;
  background: #d1d5db;
}

.agents-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
