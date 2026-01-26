<template>
  <el-dropdown
    v-bind="$attrs"
    :popper-class="['xs-dropdown', customClass]"
    :style="customStyle"
  >
    <slot></slot>

    <template v-if="$slots.dropdown" #dropdown>
      <slot name="dropdown"></slot>
    </template>
  </el-dropdown>
</template>

<script setup>
defineOptions({
  name: "XsDropdown",
  inheritAttrs: false,
});

defineProps({
  customClass: {
    type: [String, Array, Object],
    default: "",
  },
  customStyle: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<style lang="scss">
.xs-dropdown.el-popper.el-dropdown__popper,
.xs-dropdown.el-popper.el-dropdown__popper.is-light {
  box-sizing: border-box;
  padding: 8px 0;
  border: 0.5px solid rgb(212 219 233 / 100%);
  border-radius: 10px;
  box-shadow: 0 4px 14px 0 rgb(0 0 0 / 10%);
}
</style>
