<template>
  <el-dropdown-menu v-bind="$attrs" :class="['xs-dropdown-menu', customClass]" :style="customStyle">
    <slot></slot>
  </el-dropdown-menu>
</template>

<script setup>
defineOptions({
  name: 'XsDropdownMenu',
  inheritAttrs: false
})

defineProps({
  customClass: {
    type: String,
    default: ''
  },
  customStyle: {
    type: Object,
    default: () => ({})
  }
})
</script>

<style lang="scss">
.xs-dropdown {
  .xs-dropdown-menu.el-dropdown-menu {
    padding: 0;
  }
}
</style>
