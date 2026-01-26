<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-11-04
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-21
 * @FilePath     : /bi-agents/src/components/sender/components/deep-think.vue
 * @Description  : 深度思考开关
 * 
-->
<template>
  <el-button
    v-title="'先思考后回答，解决推理问题'"
    class="sender-button"
    :class="{ 'is-checked': checkedValue }"
    type="plain"
    @click="checkedValue = !checkedValue"
  >
    <i class="iconfont icon-shendusikao sender-icon"></i>
    <span>深度思考</span>
  </el-button>
</template>

<script setup>
import { useVModel } from "@vueuse/core";

defineOptions({
  name: "SenderDeepThinkButton",
});
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const checkedValue = useVModel(props, "modelValue", emit);
</script>
