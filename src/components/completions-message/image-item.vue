<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-11-10
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-24
 * @FilePath     : /bi-agents/src/components/completions-message/image-item.vue
 * @Description  : 图片的item组件
 * 
-->
<template>
  <div
    class="animated-image"
    :class="{
      'is-loading': loading,
      'is-error': error,
    }"
  >
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-icon-wrapper">
        <i class="iconfont icon-tupian"></i>
        <div class="loading-progress">
          <span class="loading-text">图片生成中...</span>
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon-wrapper">
        <i class="iconfont icon-xian"></i>
        <div class="error-text">图片生成失败</div>
        <el-button v-if="retryable" size="small" @click="handleRetry"
          >重试</el-button
        >
      </div>
    </div>

    <!-- 图片容器 -->
    <div v-else class="image-container">
      <!-- 图片 -->
      <el-image
        ref="imageRef"
        class="image"
        preview-teleported
        :src="src"
        :alt="alt"
        :preview-src-list="previewList"
        :initial-index="currentIndex"
        fit="cover"
        lazy
        @load="onImageLoad"
        @error="onImageError"
      >
        <template #error>
          <div class="image-error">
            <i class="el-icon-picture-outline"></i>
          </div>
        </template>
      </el-image>

      <!-- 渐显蒙层 -->
      <transition name="mask-fade">
        <div v-if="showMask" class="mask">
          <i class="iconfont icon-tupian"></i>

          <span>图片加载中...</span>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: "生成的图片",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  imageList: {
    type: Array,
    default: () => [],
  },
  retryable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["load", "error", "retry"]);

// 计算预览图片列表
const previewList = computed(() => {
  if (!props.imageList || props.imageList.length === 0) {
    return [props.src];
  }
  return props.imageList.map((item) =>
    typeof item === "string" ? item : item.src,
  );
});

// 计算当前图片索引
const currentIndex = computed(() => {
  return previewList.value.findIndex((url) => url === props.src);
});

const imageRef = ref(null);
const showMask = ref(true);

// 监听loading变化,重置蒙层状态
watch(
  () => props.loading,
  (newVal) => {
    if (newVal) {
      showMask.value = true;
    }
  },
);

// 图片加载完成
const onImageLoad = () => {
  // 使用requestAnimationFrame确保动画流畅
  requestAnimationFrame(() => {
    setTimeout(() => {
      showMask.value = false;
    }, 800); // 优化动画时间
  });
  emit("load");
};

// 图片加载失败
const onImageError = (e) => {
  console.error("Image load error:", e);
  emit("error", e);
};

// 重试加载
const handleRetry = () => {
  emit("retry");
};
</script>

<style lang="scss" scoped>
// 加载状态
.loading-state {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  width: 244px;
  height: 244px;
  background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwLDAsMjAlLDEwMCUiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciPgogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRjJGM0Y1IiBvZmZzZXQ9IjI1JSIgLz4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iI0U1RTZFQiIgb2Zmc2V0PSIzNyUiIC8+CiAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGMkYzRjUiIG9mZnNldD0iNjMlIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3QgaWQ9InIiIHdpZHRoPSI0MDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiIC8+CiAgPGFuaW1hdGUgeGxpbms6aHJlZj0iI3IiIGF0dHJpYnV0ZU5hbWU9IngiIGZyb209Ii0zMDAlIiB0bz0iMCUiIGR1cj0iMS41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiICAvPgo8L3N2Zz4=");
  background-position: 0% 0%;
  background-size: cover;

  .loading-icon-wrapper {
    display: flex;
    align-items: center;
    flex-direction: column;

    @include flex-gap(16px, column);

    .iconfont {
      color: #bfbfbf;
      font-size: 32px;
    }

    .loading-progress {
      .loading-text {
        animation: fade-in-out 1.5s ease-in-out infinite;
        color: #909399;
        font-size: 14px;
      }
    }
  }
}

// 错误状态
.error-state {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  width: 244px;
  height: 244px;
  background-color: #f5f7fa;

  .error-icon-wrapper {
    display: flex;
    align-items: center;
    flex-direction: column;

    @include flex-gap(12px, column);

    .iconfont {
      color: #bfbfbf;
      font-size: 32px;
    }

    .error-text {
      color: #909399;
      font-size: 14px;
    }

    .el-button {
      margin-top: 8px;
    }
  }
}

// 主容器
.animated-image {
  position: relative;
  display: inline-flex;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid #d4dbe9;
  border-radius: 8px;

  &.is-loading {
    border-color: var(--main-color);
  }

  .image-container {
    position: relative;
    overflow: hidden;
    width: 244px;
    height: 244px;

    .image {
      display: block;
      width: 100%;
      height: 100%;
      cursor: pointer;
      transition: transform 0.3s ease;

      &:hover {
        transform: scale(1.02);
      }

      :deep(.el-image-viewer__mask) {
        opacity: 0.5;
      }

      .image-error {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        background-color: #f5f7fa;

        i {
          color: #c0c4cc;
          font-size: 48px;
        }
      }
    }

    // 蒙层渐显效果
    .mask {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      height: 100%;
      text-align: center;
      letter-spacing: 0.72px;
      color: var(--bi-2025, #bfbfbf);
      background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwLDAsMjAlLDEwMCUiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciPgogICAgICA8c3RvcCBzdG9wLWNvbG9yPSIjRjJGM0Y1IiBvZmZzZXQ9IjI1JSIgLz4KICAgICAgPHN0b3Agc3RvcC1jb2xvcj0iI0U1RTZFQiIgb2Zmc2V0PSIzNyUiIC8+CiAgICAgIDxzdG9wIHN0b3AtY29sb3I9IiNGMkYzRjUiIG9mZnNldD0iNjMlIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3QgaWQ9InIiIHdpZHRoPSI0MDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiIC8+CiAgPGFuaW1hdGUgeGxpbms6aHJlZj0iI3IiIGF0dHJpYnV0ZU5hbWU9IngiIGZyb209Ii0zMDAlIiB0bz0iMCUiIGR1cj0iMS41cyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiICAvPgo8L3N2Zz4=");
      background-position: 0% 0%;
      background-size: cover;
      font-size: 14px;
      font-weight: 400;
      font-style: normal;
      line-height: 160%; /* 19.2px */
      backdrop-filter: blur(8px);

      @include flex-gap(8px, column);

      .iconfont {
        color: #bfbfbf;
        font-size: 32px;
      }
    }

    // 蒙层过渡动画
    .mask-fade-enter-active,
    .mask-fade-leave-active {
      transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mask-fade-enter-from,
    .mask-fade-leave-to {
      opacity: 0;
    }
  }
}

// 脉冲动画
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.05);
    opacity: 0.6;
  }
}

// 淡入淡出动画
@keyframes fade-in-out {
  0%,
  100% {
    opacity: 0.5;
  }

  50% {
    opacity: 1;
  }
}
</style>
