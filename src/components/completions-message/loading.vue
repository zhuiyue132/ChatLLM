<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-07
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-20
 * @FilePath     : /bi-agents/src/components/agent-message/loading.vue
 * @Description  : 对话输出前的loading
 * 
-->
<template>
  <div class="loading-container">
    <div class="dot-flashing">
      <div class="circle"></div>
      <div class="circle"></div>
    </div>
  </div>
</template>
<script setup></script>
<style lang="scss" scoped>
@keyframes move-right-to-left {
  0% {
    transform: translateX(0) scale(0.6);
    opacity: 0.2;
  }

  48% {
    transform: translateX(-4.5px) scale(0.3);
    opacity: 0;
  }

  52% {
    transform: translateX(-4.5px) scale(0.3);
    opacity: 0;
  }

  100% {
    transform: translateX(-12px) scale(0.5);
    opacity: 1;
  }
}

@keyframes move-left-to-right {
  0% {
    transform: translateX(0) scale(0.6);
    opacity: 1;
  }

  48% {
    transform: translateX(4.5px) scale(0.9);
    opacity: 0.5;
  }

  52% {
    transform: translateX(4.5px) scale(0.9);
    opacity: 0.5;
  }

  100% {
    transform: translateX(12px) scale(0.6);
    opacity: 0.2;
  }
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 24px;
  color: rgb(0 0 0 / 40%);
  color: var(--s-color-text-tertiary, rgb(0 0 0 / 40%));
  border-radius: 10px;
  font-size: 14px;
  font-weight: 400;
  font-style: normal;

  @include flex-gap(8px, row);

  .dot-flashing {
    position: relative;
    display: flex;
    width: 18px;
    height: 24px;
    padding: 6px 0;

    .circle {
      position: absolute;
      top: 7px;
      width: 14px;
      height: 14px;
      animation-duration: 0.8s;
      animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
      animation-iteration-count: infinite;
      border-radius: 50%;
      animation-fill-mode: both;
      background-color: var(--main-color);

      &:first-child {
        left: 0;
        animation-name: move-left-to-right;
      }

      &:last-child {
        left: 14px;
        animation-name: move-right-to-left;
      }
    }
  }
}
</style>
