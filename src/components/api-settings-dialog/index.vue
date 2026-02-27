<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/index.vue
 * @Description  : 设置弹窗 - 使用动态组件渲染各面板
 *
-->

<template>
  <bi-dialog
    v-model="dialogVisible"
    title="设置"
    :width="isMobile ? '100%' : '1100px'"
    :fullscreen="isMobile"
    :show-footer="false"
    :close-on-click-modal="false"
    append-to-body
    custom-class="settings-dialog"
  >
    <div class="settings-container">
      <!-- 左侧菜单 -->
      <div class="settings-sidebar">
        <div
          v-for="item in MENU_LIST"
          :key="item.key"
          class="sidebar-item"
          :class="{ active: activeMenu === item.key }"
          @click="activeMenu = item.key"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <!-- 右侧内容区 - 动态组件 -->
      <div class="settings-content">
        <component
          :is="currentPanel"
          :visible="dialogVisible && activeMenu === currentPanelKey"
          @saved="handlePanelSaved"
        />
      </div>
    </div>
  </bi-dialog>
</template>

<script setup>
import { ref, computed, watch, markRaw } from 'vue'
import BiDialog from '@/components/dialog/index.vue'
import { MENU_LIST } from './config'
import ApiModelPanel from './components/api-model-panel/index.vue'
import AppearancePanel from './components/appearance-panel/index.vue'
import KnowledgePanel from './components/knowledge-panel/index.vue'
import BackupPanel from './components/backup-panel/index.vue'
import { useSidebar } from '@/hooks/use-sidebar'

defineOptions({
  name: 'ApiSettingsDialog'
})

const { isMobile } = useSidebar()

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'save'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: value => {
    emit('update:modelValue', value)
  }
})

// 面板组件映射（使用 markRaw 避免响应式开销）
const panelComponents = {
  'api-model': markRaw(ApiModelPanel),
  appearance: markRaw(AppearancePanel),
  knowledge: markRaw(KnowledgePanel),
  backup: markRaw(BackupPanel)
}

const activeMenu = ref('api-model')

// 当前面板组件
const currentPanel = computed(() => {
  return panelComponents[activeMenu.value] || panelComponents['api-model']
})

// 当前面板 key（用于 visible 判断）
const currentPanelKey = computed(() => activeMenu.value)

// 弹窗打开时重置菜单
watch(dialogVisible, visible => {
  if (visible) {
    activeMenu.value = 'api-model'
  }
})

// 面板保存完成回调
const handlePanelSaved = () => {
  emit('save')
}
</script>

<style lang="scss" scoped>
.settings-container {
  display: flex;
  min-height: 720px;
}

.settings-sidebar {
  flex: 0 0 180px;
  padding: 16px 0;
  border-right: 1px solid var(--border-color-light);
  background-color: var(--bg-panel);

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 20px;
    margin: 4px 8px;
    color: var(--text-light-color);
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;

    .iconfont {
      font-size: 18px;
    }

    &:hover {
      color: var(--text-normal-color);
      background-color: var(--bg-hover);
    }

    &.active {
      color: var(--main-color, #007e54);
      font-weight: 500;
      background-color: rgb(0 126 84 / 12%);

      .iconfont {
        color: var(--main-color, #007e54);
      }
    }
  }
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 720px;
}

@include mobile {
  .settings-container {
    flex-direction: column;
    min-height: auto;
    height: 100%;
  }

  .settings-sidebar {
    flex: 0 0 auto;
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    padding: 8px 0;
    border-right: none;
    border-bottom: 1px solid var(--border-color-light);

    .sidebar-item {
      flex: 0 0 auto;
      margin: 0 4px;
      white-space: nowrap;
      padding: 0 16px;
      height: 36px;
    }
  }

  .settings-content {
    flex: 1;
    max-height: none;
    overflow-y: auto;
  }
}
</style>

<style lang="scss">
.settings-dialog {
  .el-dialog__body {
    padding: 0;
  }
}
</style>
