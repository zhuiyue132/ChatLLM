<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-18
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/components/agent-message/progress.vue
 * @Description  : 异步分析进度
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
        <div class="title">
          {{ isError ? failedText : isFinished ? successText : runningText }}
        </div>

        <!-- 进度条容器 -->
        <template v-if="!isError">
          <div v-if="!isFinished" class="tip-text">
            本次分析需要一点时间，您可先关闭窗口，稍后回来即可查看结果。
          </div>
          <div v-else class="tip-text short">点击查看完成报告</div>
        </template>
        <div
          v-else
          class="tip-text"
          :class="{ short: finalFailReason.length <= 18 }"
        >
          {{ finalFailReason }}
        </div>
      </div>

      <!-- 右侧图标 -->
      <div class="icon-section">
        <div class="icon-placeholder">
          <img
            v-if="isError"
            src="@/assets/images/common/analysis-fail.svg"
            alt=""
          />
          <img
            v-else-if="isFinished"
            src="@/assets/images/common/analysis-success.svg"
            alt=""
          />
          <ChatLoading v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, computed, onBeforeUnmount } from "vue";
import { useAsyncTask, TASK_STATUS } from "@/hooks";
import ChatLoading from "./loading.vue";
import {
  AGENT_ASYNC_CARD_TITLE,
  AGENT_ASYNC_CARD_TITLE_DEFAULT_CONFIG,
} from "@/config/agent-async-card-title";

defineOptions({
  name: "AgentProgressMessage",
});

const props = defineProps({
  finished: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  errorText: {
    type: [Number, String],
    default: null,
  },
  chatTaskId: {
    type: [Number, String],
    default: null,
  },
  agentId: {
    type: [Number, String],
    default: null,
  },
  agentCode: {
    type: String,
    default: "",
  },
  conversationId: {
    type: [Number, String],
    default: null,
  },
});

const successText = computed(() => {
  return (
    AGENT_ASYNC_CARD_TITLE[props.agentCode]?.COMPLETED ||
    AGENT_ASYNC_CARD_TITLE_DEFAULT_CONFIG.COMPLETED
  );
});
const failedText = computed(() => {
  return (
    AGENT_ASYNC_CARD_TITLE[props.agentCode]?.FAILED ||
    AGENT_ASYNC_CARD_TITLE_DEFAULT_CONFIG.FAILED
  );
});
const runningText = computed(() => {
  return (
    AGENT_ASYNC_CARD_TITLE[props.agentCode]?.RUNNING ||
    AGENT_ASYNC_CARD_TITLE_DEFAULT_CONFIG.RUNNING
  );
});

const emits = defineEmits(["click"]);

const agentId = computed(() => {
  return props.agentId;
});
const conversationId = computed(() => {
  return props.conversationId;
});

const { startPolling, taskProgress, taskStatus, stopPolling, failReason } =
  useAsyncTask(agentId, conversationId);

const isFinished = computed(() => {
  return (
    (taskProgress.value >= 100 &&
      ![TASK_STATUS.CANCELLED, TASK_STATUS.FAILED].includes(
        taskStatus.value,
      )) ||
    props.finished
  );
});

const isError = computed(() => {
  return props.error || taskStatus.value === TASK_STATUS.FAILED;
});

const finalFailReason = computed(() => {
  return props.errorText || failReason.value;
});

watch(
  () => props.chatTaskId,
  (val) => {
    if (val) {
      if (!props.finished) {
        startPolling(val);
      }
    }
  },
  { immediate: true },
);

const onClick = async () => {};

onBeforeUnmount(stopPolling);
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
  width: 347px;
  height: 90px;
  // padding: 20px 100px 20px 24px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: linear-gradient(
    95deg,
    #fff -0.29%,
    #f0fffa 44.93%,
    #eff9f5 67.7%,
    #f1f7f5 100%
  );
}

/* stylelint-disable-next-line no-duplicate-selectors */
.progress-container {
  &.error {
    .progress-card {
      border: 1px solid #ffe8e4;
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
  width: 247px;
  padding: 13px 24px;
  padding-right: 0;

  &.finished {
    @include flex-gap(0, column);
  }
}

.title {
  height: 29px;
  text-align: left;
  color: #000;
  font-family: "Source Han Sans CN", sans-serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 29px;
}

.icon-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 90px;
  border-radius: 8px;

  img {
    width: 36px;
  }

  :deep(.loading-container) {
    justify-content: center;
  }
}

.tip-text {
  text-align: left;
  color: #8c8c8c;
  font-family: "Source Han Sans CN", sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;

  &.short {
    margin-top: 4px;
    font-size: 14px;
  }
}
</style>
