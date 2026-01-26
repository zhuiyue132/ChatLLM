<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-10-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-17
 * @FilePath     : /bi-agents/src/components/agent-message/fake-progress.vue
 * @Description  : 假进度条组件 - 用于显示异步任务的模拟进度
 *
-->

<template>
  <div
    class="progress-container"
    :class="{ finished: isFinished, error: isError }"
    @click="onClick"
  >
    <!-- 主卡片 -->
    <div class="progress-card">
      <!-- 左侧内容 -->
      <div class="content-section" :class="{ finished: isFinished }">
        <!-- 标题 -->
        <div class="title">{{ titleText }}</div>

        <!-- 进度条容器 -->
        <div v-if="!isFinished" class="progress-wrapper">
          <div class="progress-track">
            <div
              class="progress-bar"
              :style="{ width: `${taskProgress}%` }"
            ></div>
          </div>
        </div>

        <div v-else class="tip-text">点击查看</div>
      </div>

      <!-- 右侧图标 -->
      <div class="icon-section">
        <div class="icon-placeholder"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, defineExpose, defineEmits } from "vue";
import { useProgress } from "@/hooks";

// ========== 事件定义 ==========
const emit = defineEmits(["click"]);

// ========== 进度控制 ==========
const {
  progressValue,
  isCompleted,
  isFailed,
  startProgress,
  startAutoProgress,
  completeProgress,
  failProgress,
} = useProgress({
  showDelay: 0, // 立即显示
  minVisibleTime: 800, // 最少显示800ms
  autoStep: 2, // 每次递增2%
  autoMax: 90, // 最大自动递增到90%
  autoInterval: 500, // 每500ms递增一次
  completeDelay: 600, // 完成后停留600ms
});

// ========== 计算属性 ==========

// 任务进度（用于显示）
const taskProgress = computed(() => progressValue.value);

// 是否已完成
const isFinished = computed(() => isCompleted.value);

// 是否失败
const isError = computed(() => isFailed.value);

// 标题文本
const titleText = computed(() => {
  if (isError.value) {
    return "生成失败，请重试";
  }
  if (isFinished.value) {
    return "生成完成";
  }
  return "AI生成中，请稍候...";
});

// ========== 方法 ==========

/**
 * 点击处理
 * 只有完成且非失败状态才能点击
 */
const onClick = () => {
  if (isFinished.value && !isError.value) {
    emit("click");
  }
};

/**
 * 手动完成进度
 * 供父组件调用
 */
const complete = async () => {
  await completeProgress();
};

/**
 * 手动标记失败
 * 供父组件调用
 */
const fail = (error) => {
  failProgress(error);
};

// ========== 生命周期 ==========

// 组件挂载时自动启动进度
onMounted(() => {
  startProgress(10); // 从10%开始
  startAutoProgress(); // 启动自动递增
});

// ========== 暴露给父组件的方法 ==========
defineExpose({
  complete,
  fail,
  isFinished,
  isError,
  taskProgress,
});
</script>

<style scoped lang="scss">
.progress-container {
  display: flex;
  flex-direction: column;
  width: fit-content;

  @include flex-gap(12px, column);

  &.finished:not(.error) {
    cursor: pointer;
  }
}

.progress-card {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  width: 364px;
  padding: 20px 100px 20px 24px;
  border: 1px solid #c5e5d8;
  border-radius: 8px;
  background: linear-gradient(
    133deg,
    rgb(255 255 255 / 100%) 0%,
    rgb(230 247 240 / 100%) 33%,
    rgb(235 249 243 / 100%) 68%,
    rgb(255 255 255 / 100%) 100%
  );

  @include flex-gap(24px, row);
}

/* stylelint-disable-next-line no-duplicate-selectors */
.progress-container {
  &.error {
    .progress-card {
      border: 1px solid var(--bi-20, #ffe8e4);
      border-radius: 8px;
      background: linear-gradient(
        95deg,
        #fff -0.29%,
        #ffecea 32.98%,
        #ffe8e8 67.7%,
        #fff 100%
      );
    }
  }
}

.content-section {
  display: flex;
  flex-direction: column;
  width: 223px;

  @include flex-gap(12px, column);

  &.finished {
    @include flex-gap(0, column);
  }
}

.title {
  text-align: left;
  color: #000;
  font-family: "Source Han Sans CN", sans-serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.6;
}

.progress-wrapper {
  display: flex;
  flex-direction: column;

  @include flex-gap(4px, column);
}

.progress-track {
  overflow: hidden;
  width: 100%;
  height: 9px;
  border-radius: 24px;
  background-color: #fff;
}

.progress-bar {
  width: 72%;
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 24px;
  background-color: var(--main-color);
}

.icon-section {
  position: absolute;
  right: 0;
  bottom: 0;
}

.icon-placeholder {
  width: 104px;
  height: 104px;
  border-radius: 8px;

  img {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
  }
}

.tip-text {
  text-align: left;
  color: #8c8c8c;
  font-family: "Source Han Sans CN", sans-serif;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
}
</style>
