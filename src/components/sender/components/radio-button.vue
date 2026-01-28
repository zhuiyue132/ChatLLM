<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-09-19
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-09-29
 * @FilePath     : /bi-agents/src/components/sender/radio-button.vue
 * @Description  : radio
 * 
-->
<template>
  <el-radio-group v-model="radio" class="radio-button" text-color="#000" fill="#BBF5B3">
    <el-radio-button
      v-for="item in list"
      :key="item?.value || item?.label || item"
      :label="item?.label || item"
      :value="item?.value || item?.label || item"
    />
  </el-radio-group>
</template>
<script setup>
import { useVModel } from '@vueuse/core'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  list: {
    type: Array,
    default: () => []
  }
})

const emits = defineEmits(['update:modelValue'])

const radio = useVModel(props, 'modelValue', emits)
</script>

<style lang="scss" scoped>
.radio-button {
  @include flex-gap(8px, row);

  .is-active {
    border-color: rgb(255 255 255 / 0%);
    box-shadow: none;

    :deep() {
      .el-radio-button {
        &__inner {
          color: var(--main-color, #007e54) !important;
          border-color: rgb(255 255 255 / 0%) !important;
          background-color: #e0f2e7 !important;
          box-shadow: none !important;
        }
      }
    }
  }

  :deep() {
    .el-radio-button {
      height: 29px;
      border: none;
      box-shadow: none;

      &__inner {
        display: block;
        width: 100%;
        height: 100%;
        padding: 0 8px;
        color: #000;
        border: 1px solid #d4dbe9;
        border-radius: 15px !important;
        background-color: #fff;
        box-shadow: none;
        font-weight: 400;
        line-height: 26px;

        &:hover {
          color: #000;
          border-color: rgb(179 217 200);
          background-color: rgb(230 242 237);
        }
      }
    }
  }
}
</style>
