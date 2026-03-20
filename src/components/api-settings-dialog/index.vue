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
          :class="{ active: activeMenu === item.key, disabled: isMenuDisabled(item.key) }"
          @click="handleMenuClick(item.key)"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <!-- 右侧内容区 - 动态组件 -->
      <div class="settings-content">
        <component :is="currentPanel" v-bind="currentPanelProps" @saved="handlePanelSaved" />
      </div>
    </div>
  </bi-dialog>
</template>

<script setup>
import { ref, computed, watch, markRaw } from 'vue'
import BiDialog from '@/components/dialog/index.vue'
import { MENU_LIST } from './config'
import UserProfilePanel from './components/user-profile-panel/index.vue'
import ApiModelPanel from './components/api-model-panel/index.vue'
import AppearancePanel from './components/appearance-panel/index.vue'
import McpPanel from './components/mcp-panel/index.vue'
import BackupPanel from './components/backup-panel/index.vue'
import WebdavPanel from './components/webdav-panel/index.vue'
import { useSidebar } from '@/hooks/use-sidebar'
import { useApiModelWizard } from './hooks/use-api-model-wizard'

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
  'user-profile': markRaw(UserProfilePanel),
  'api-config': markRaw(ApiModelPanel),
  'model-list': markRaw(ApiModelPanel),
  'default-model': markRaw(ApiModelPanel),
  appearance: markRaw(AppearancePanel),
  mcp: markRaw(McpPanel),
  backup: markRaw(BackupPanel),
  webdav: markRaw(WebdavPanel)
}

const activeMenu = ref('user-profile')
const apiModelWizard = useApiModelWizard()
const apiMenus = ['api-config', 'model-list', 'default-model']

// 当前面板组件
const currentPanel = computed(() => {
  return panelComponents[activeMenu.value] || panelComponents['user-profile']
})

// 当前面板 key（用于 visible 判断）
const currentPanelKey = computed(() => activeMenu.value)

const isMenuDisabled = key => {
  if (key === 'model-list') {
    return !apiModelWizard.canAccessModelListTab.value
  }
  if (key === 'default-model') {
    return !apiModelWizard.canAccessDefaultModelsTab.value
  }
  return false
}

const ensureValidActiveMenu = () => {
  if (activeMenu.value === 'default-model' && !apiModelWizard.canAccessDefaultModelsTab.value) {
    activeMenu.value = apiModelWizard.canAccessModelListTab.value ? 'model-list' : 'api-config'
    return
  }
  if (activeMenu.value === 'model-list' && !apiModelWizard.canAccessModelListTab.value) {
    activeMenu.value = 'api-config'
  }
}

const handleMenuClick = key => {
  if (isMenuDisabled(key)) return
  activeMenu.value = key
}

const currentPanelProps = computed(() => {
  if (apiMenus.includes(activeMenu.value)) {
    return {
      panelKey: activeMenu.value,
      wizard: apiModelWizard
    }
  }
  return {
    visible: dialogVisible.value && activeMenu.value === currentPanelKey.value
  }
})

// 弹窗打开时重置菜单
watch(dialogVisible, visible => {
  if (visible) {
    apiModelWizard.loadFromStore()
    apiModelWizard.reset()
    activeMenu.value = 'user-profile'
  }
})

watch(
  () => [
    apiModelWizard.canAccessModelListTab.value,
    apiModelWizard.canAccessDefaultModelsTab.value,
    activeMenu.value
  ],
  () => {
    ensureValidActiveMenu()
  }
)

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
    height: 44px;
    margin: 4px 8px;
    padding: 0 20px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--text-light-color);
    border-radius: 6px;
    font-size: 14px;
    gap: 10px;

    .iconfont {
      font-size: 18px;
    }

    &:hover {
      color: var(--text-normal-color);
      background-color: var(--bg-hover);
    }

    &.active {
      color: var(--main-color, #007e54);
      background-color: rgb(0 126 84 / 12%);
      font-weight: 500;

      .iconfont {
        color: var(--main-color, #007e54);
      }
    }

    &.disabled {
      cursor: not-allowed;
      opacity: 0.5;
      color: var(--text-dblight-color);
      background-color: transparent;
    }
  }
}

.settings-content {
  display: flex;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
  max-height: 720px;
}

@include mobile {
  .settings-container {
    flex-direction: column;
    height: 100%;
    min-height: auto;
  }

  .settings-sidebar {
    display: flex;
    overflow-x: auto;
    flex: 0 0 auto;
    flex-direction: row;
    padding: 8px 0;
    border-right: none;
    border-bottom: 1px solid var(--border-color-light);

    .sidebar-item {
      flex: 0 0 auto;
      height: 36px;
      margin: 0 4px;
      padding: 0 16px;
      white-space: nowrap;
    }
  }

  .settings-content {
    overflow-y: auto;
    flex: 1;
    max-height: none;
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
