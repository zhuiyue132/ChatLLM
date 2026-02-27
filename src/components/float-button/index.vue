<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-13
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-08-27 19:19:29
 * @FilePath     : /bi-agents/src/components/float-button/index.vue
 * @Description  : 对话页面悬浮按钮
 * 
-->

<template>
  <div class="float-button-container" :style="{ right: floatButtonOffset }">
    <!-- 向上滚动按钮 -->
    <div class="float-button scroll-up" @click="scrollToTop">
      <i class="icon-arrowUp"></i>
    </div>

    <!-- 向下滚动按钮 -->
    <div class="float-button scroll-down" @click="scrollToBottom">
      <i class="icon-arrowDown"></i>
    </div>
  </div>
</template>

<script setup>
defineProps({
  floatButtonOffset: {
    type: String,
    default: '-42px'
  }
})
// 滚动到顶部
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 滚动到底部
const scrollToBottom = () => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth'
  })
}
</script>

<style lang="scss" scoped>
.float-button-container {
  position: absolute;
  top: -224px;
  right: -42px;
  z-index: 1000;
  display: inline-flex;
  flex-direction: column;

  @include flex-gap(20px, column);
}

.float-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 1;
  border: 1.5px solid var(--border-color);
  border-radius: 18px;
  background: var(--white);
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);

  i {
    color: #8c8c8c;
    font-size: 18px;
    font-weight: bold;
  }

  &:hover {
    // border-color: var(--main-color);
    // background: #f5f7fa;

    // .arrow-icon path {
    //   fill: var(--main-color);
    // }

    box-shadow: 0 -4px 6px 0 rgb(0 0 0 / 11%);
  }

  &:last-child {
    &:hover {
      box-shadow: 0 4px 6px 0 rgb(0 0 0 / 11%);
    }
  }

  &:active {
    transform: translateY(1px);
    box-shadow: 0 1px 4px rgb(0 0 0 / 15%);
  }
}

.arrow-icon {
  width: 14px;
  height: 8px;
  transition: fill 0.3s ease;

  &.down {
    transform: rotate(180deg);
  }

  path {
    transition: fill 0.3s ease;
  }
}

// 移动端适配
@include mobile {
  .float-button-container {
    right: 16px;
    bottom: 16px;
  }

  .float-button {
    width: 44px;
    height: 44px;
    border-radius: 22px;
  }

  .arrow-icon {
    width: 16px;
    height: 10px;
  }
}
</style>
