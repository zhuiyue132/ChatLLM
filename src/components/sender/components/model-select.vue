<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-21
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/components/sender/components/model-select.vue
 * @Description  : 模型下拉框（单选）
 *
-->
<template>
  <xs-dropdown
    v-title="popperTitle"
    trigger="click"
    placement="top-start"
    :popper-options="setPopperPosition(0, 4)"
    hide-on-click
    @visible-change="onVisiableChange"
    @command="onCommand"
  >
    <div class="trigger">
      <div class="sender-button">
        <i class="iconfont icon-moxing-lora sender-icon"></i>
        <span>{{ currentModelName }}</span>

        <div class="arrow-icon" :class="{ visible: poperVisible }">
          <i class="iconfont icon-arrowDown"></i>
        </div>
      </div>
    </div>
    <template #dropdown>
      <xs-dropdown-menu>
        <xs-dropdown-item v-for="model in modelList" :key="model?.code" :command="model?.code">
          <div
            class="model-item"
            :class="{
              active: currentModel === model.code
            }"
          >
            <div class="model-name">
              <ModelIcon :name="model.code" :size="18" />
              <span>{{ model.name }} </span>
            </div>
          </div>
        </xs-dropdown-item>
      </xs-dropdown-menu>
    </template>
  </xs-dropdown>
</template>
<script setup>
import { useVModel } from '@vueuse/core'
import { XsDropdown, XsDropdownMenu, XsDropdownItem } from '@/components/xs-dropdown'
import { setPopperPosition } from '@/utils'
import { computed, ref } from 'vue'
import ModelIcon from '@/components/model-icon/index.vue'

defineOptions({
  name: 'ModelSelector'
})

const props = defineProps({
  modelList: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    default: ''
  },
  popperTitle: {
    type: String,
    default: ''
  }
})

const emits = defineEmits(['update:modelValue'])

const currentModel = useVModel(props, 'modelValue', emits)

// 显示的模型名称
const currentModelName = computed(() => {
  return props.modelList.find(item => item.code === currentModel.value)?.name || ''
})

const poperVisible = ref(false)
const onVisiableChange = visible => {
  poperVisible.value = visible
}

const onCommand = model => {
  currentModel.value = model
}
</script>

<style lang="scss" scoped>
.trigger {
  outline: none;

  .sender-button {
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;

    .arrow-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
      transition: transform 0.2s ease;
      transform: rotate(0deg);
      font-size: 14px;

      .iconfont {
        font-size: 14px;
      }

      &.visible {
        transform: rotate(180deg);
      }
    }
  }
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;

  @include flex-gap(4px, row);

  span {
    margin-bottom: 1px;
  }

  .model-name {
    display: flex;
    align-items: center;

    @include flex-gap(4px, row);

    .iconfont {
      transform: translateY(1px);
      color: #595959;
      font-size: 14px;
    }
  }
}

.model-item.active {
  color: #007e54;
}
</style>
