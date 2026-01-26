<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-08
 * @FilePath     : /bi-agents/src/components/mention-sender/components/loading-button/loading.vue
 * @Description  : 
 * 
-->
<script setup lang="ts"></script>

<template>
  <svg
    viewBox="0 0 1000 1000"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
  >
    <title>Loading</title>
    <rect
      fill="currentColor"
      height="250"
      rx="24"
      ry="24"
      width="250"
      x="375"
      y="375"
    />
    <circle
      cx="500"
      cy="500"
      fill="none"
      r="450"
      stroke="currentColor"
      stroke-width="100"
      opacity="0.45"
    />
    <circle
      cx="500"
      cy="500"
      fill="none"
      r="450"
      stroke="currentColor"
      stroke-width="100"
      stroke-dasharray="600 9999999"
    >
      <animateTransform
        attributeName="transform"
        dur="1s"
        from="0 500 500"
        repeatCount="indefinite"
        to="360 500 500"
        type="rotate"
      />
    </circle>
  </svg>
</template>
