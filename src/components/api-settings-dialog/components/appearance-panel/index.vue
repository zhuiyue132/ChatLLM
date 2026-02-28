<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-02-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-27
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/appearance-panel/index.vue
 * @Description  : 外观设置面板
-->

<template>
  <div class="appearance-panel">
    <div class="panel-header">
      <div class="panel-title">外观</div>
      <div class="panel-desc">设置应用主题与显示模式</div>
    </div>

    <div class="panel-body">
      <div class="setting-item">
        <div class="setting-label">主题模式</div>
        <el-radio-group v-model="themeMode" class="theme-radio-group">
          <el-radio-button label="system">跟随系统</el-radio-button>
          <el-radio-button label="light">浅色</el-radio-button>
          <el-radio-button label="dark">深色</el-radio-button>
        </el-radio-group>
        <div class="setting-tip">当前生效：{{ resolvedLabel }}</div>
      </div>
      <div class="setting-item">
        <div class="setting-label">提示</div>
        <div class="setting-tip">主题修改后会自动保存并立即生效。</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

defineOptions({
  name: 'AppearancePanel'
})

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const themeStore = useThemeStore()

const themeMode = computed({
  get: () => themeStore.themeMode,
  set: value => themeStore.setThemeMode(value)
})

const resolvedLabel = computed(() => {
  return themeStore.resolvedTheme === 'dark' ? '深色' : '浅色'
})
</script>

<style lang="scss" scoped>
.appearance-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.panel-header {
  flex-shrink: 0;
  margin-bottom: 24px;

  .panel-title {
    margin-bottom: 8px;
    color: var(--text-normal-color);
    font-size: 18px;
    font-weight: 600;
  }

  .panel-desc {
    color: var(--text-dblight-color);
    font-size: 14px;
  }
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-color-light);
  border-radius: 8px;
  background: var(--bg-panel);
}

.setting-label {
  color: var(--text-normal-color);
  font-size: 14px;
  font-weight: 600;
}

.setting-tip {
  color: var(--text-dblight-color);
  font-size: 12px;
  line-height: 18px;
}

.theme-radio-group {
  :deep(.el-radio-button__inner) {
    padding: 8px 16px;
  }
}
</style>
