<template>
  <el-dropdown-item v-bind="$attrs" :class="['xs-dropdown-item', customClass]">
    <slot></slot>
  </el-dropdown-item>
</template>

<script setup>
defineOptions({
  name: 'XsDropdownItem',
  inheritAttrs: false
})

defineProps({
  customClass: {
    type: String,
    default: ''
  }
})
</script>

<style lang="scss">
.xs-dropdown {
  .xs-dropdown-menu {
    .xs-dropdown-item.el-dropdown-menu__item {
      padding: 8px 16px;
      color: var(--text-normal-color);
      border-radius: 0;
      font-size: 14px;

      &:hover {
        background-color: var(--bg-hover);
      }

      &:active {
        color: var(--main-color);
      }
    }

    .el-dropdown-menu__item:not(.is-disabled):hover,
    .el-dropdown-menu__item:not(.is-disabled):focus {
      background-color: var(--bg-hover);
    }
  }
}
</style>
