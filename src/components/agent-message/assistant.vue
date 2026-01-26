<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-22
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-08-27 18:26:03
 * @FilePath     : /ChatLLM/src/components/agent-message/assistant.vue
 * @Description  : 助手消息组件
 * 
-->
<template>
  <div class="assistant-message">
    <loadingComponent v-if="loading" />
    <div class="message-content">
      <div
        ref="mdContainer"
        class="message-text markdown-body"
        :class="{ 'is-douyin-agent': agentCode.startsWith('dy_') }"
      >
        <MarkdownRenderer
          :content="message"
          :agent-id="agentId"
          :agent-code="agentCode"
        />
      </div>
    </div>

    <!-- 操作按钮栏，只在消息完成时显示 -->
    <div v-if="finished" class="message-actions">
      <div class="action-button">
        <i v-title="'复制内容'" class="icon-copy" @click.stop="copyMessage"></i>
      </div>

      <div
        v-if="exportTypes?.length && exportInfo?.enable"
        class="action-button"
      >
        <!-- 导出下拉菜单 -->
        <el-dropdown
          v-if="exportTypes?.length > 1"
          :popper-options="setPopperPosition(2, 6)"
          :disabled="isDownloading"
          placement="bottom-start"
          :persistent="false"
          @command="exportMessage"
        >
          <template #default>
            <span class="export-icon">
              <el-icon
                v-if="isDownloading"
                class="is-loading"
                color="#000"
                size="16"
              >
                <Loading />
              </el-icon>
              <i v-else class="icon-export"></i>
            </span>
          </template>

          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="item in exportTypeList"
                :key="item.key"
                :command="item.key"
              >
                {{ item.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <template v-else>
          <i
            v-if="!isDownloading"
            v-title="'导出报告'"
            class="icon-export"
            @click="exportMessage(exportTypes[0])"
          ></i>
          <el-icon v-else class="is-loading">
            <Loading />
          </el-icon>
        </template>
      </div>

      <div
        v-if="
          exportInfo?.enable &&
          [
            AGENT_CODE.SOARING_SHOP_ANALYST,
            AGENT_CODE.XHS_PROMOTE_ANALYST,
            AGENT_CODE.SOARING_GOOD_ANALYST,
            AGENT_CODE.DY_SOARING_GOOD_ANALYST,
          ].includes(agentCode)
        "
        class="action-button"
        @click="regenerateMessage"
      >
        <el-dropdown
          :popper-options="setPopperPosition(2, 6)"
          placement="bottom-start"
          :hide-on-click="false"
          :persistent="false"
          popper-class="with-input-popper"
          @visible-change="onVisibleChange"
        >
          <template #default>
            <span class="export-icon">
              <i class="icon-shuaxin"></i>
            </span>
          </template>

          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="current">
                <div
                  class="trigger"
                  @mouseenter="onVisibleChange(false)"
                  @click="onReGenerate(datePickerValue)"
                >
                  <span>当前周期</span>
                </div>
                <div class="trigger-placeholder">当前周期</div>
              </el-dropdown-item>
              <el-dropdown-item command="other">
                <div ref="triggerRef" class="trigger">
                  <span>其他周期</span>

                  <el-date-picker
                    ref="datePickerRef"
                    class="date-picker-hidden-input"
                    :disabled-date="disabledDate"
                    :teleported="false"
                    :model-value="datePickerValue"
                    :type="datePickerType"
                    :value-format="datePickerValueFormat"
                    placement="right-start"
                    :popper-options="setPopperPosition(0, 0)"
                    @update:model-value="onDateChange"
                  />
                </div>
                <div class="trigger-placeholder">其他周期</div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup>
import MarkdownRenderer from "../markdown-renderer/index.vue";
import { onCopy } from "@/utils";
import { useExport } from "@/hooks/use-export";
import { ref, watch, computed } from "vue";
import { showMessage } from "@/hooks";
import dayjs from "dayjs";
import { Loading } from "@element-plus/icons-vue";
import ChatMessageItemLoading from "./loading.vue";
// import FakeProgress from './fake-progress.vue'
import { setPopperPosition } from "@/utils";
import { useEventListener } from "@vueuse/core";
import { AGENT_CODE } from "@/config/agent-code";

defineOptions({
  name: "AgentAssistantMessage",
});

const props = defineProps({
  message: {
    type: String,
    default: "",
  },
  // 是否正在加载, 即对话输出前的loading
  loading: {
    type: Boolean,
    default: true,
  },
  finished: {
    type: Boolean,
    default: true,
  },

  agentId: {
    type: [String, Number],
    default: "",
  },
  reportId: {
    type: [String, Number],
    default: "",
  },
  conversationId: {
    type: [String, Number],
    default: "",
  },
  exportTypes: {
    type: Array,
    default: () => ["png"],
  },
  agentCode: {
    type: String,
    default: "",
  },
  messageId: {
    type: [Number, String],
    default: "",
  },
  exportInfo: {
    type: Object,
    default: () => ({
      // enable: false, // 是否可以导出  主要是权限的，还有报告完成的  注意，那些提示的信息的哪些，没有导出意义最好设为false
      // date: '', // 日期
      // name: '', // 报告名字  店铺里是用shopName  类目里是类目名
      // fileName: '', // 建议导出名字 有前端就用，没有就前端自己造
      // secTitle: '', // 二级标题    店铺：淘宝天猫数据分析报告   类目：市场消费需求分析
      // wxUrl: '', // 联系人微信二维码
      // phone: '' // 联系人电话
    }),
  },
});

const emits = defineEmits(["regenerate"]);

const loadingComponent = computed(() => {
  return ChatMessageItemLoading;
});

const mdContainer = ref(null);
const triggerRef = ref(null);
const datePickerRef = ref(null);

const onVisibleChange = (visible) => {
  if (!visible) {
    datePickerRef.value?.handleClose?.();
  }
};
const onMouseIn = () => {
  datePickerRef.value?.handleOpen?.();
};

useEventListener(triggerRef, "mouseenter", onMouseIn);
// useEventListener(triggerRef, 'mouseleave', () => onVisibleChange(false))

// 复制消息
const copyMessage = async () => {
  await onCopy(mdContainer.value?.innerText);
};

// 重新生成消息
const regenerateMessage = () => {
  console.log("重新生成消息");
  // 这里可以实现重新生成功能
};

// 是否正在下载
const isDownloading = ref(false);

const pngShowName = {
  [AGENT_CODE.XHS_PROMOTE_ANALYST]: "导出长图",
};

// 导出的可选列表
const exportTypeList = computed(() => {
  return props.exportTypes.map((type) => {
    return {
      key: type,
      name: {
        png: pngShowName[props.agentCode] || "导出图片",
        pdf: "导出PDF",
        zip: "导出压缩包",
      }[type],
    };
  });
});

// 是否是safari浏览器
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// 获取指定时间当前月的最后一周的周日 当没有dateRange时使用，应该不会有这个场景
const getLastWeekSundayOfMonth = (date) => {
  const lastDayOfMonth = dayjs(date).endOf("month");
  const lastDayWeekDay = lastDayOfMonth.day();
  // 如果最后一天是周日，直接返回；否则向前找到最近的周日
  const daysToSubtract = lastDayWeekDay === 0 ? 0 : lastDayWeekDay;
  return lastDayOfMonth.subtract(daysToSubtract, "day").format("YYYY-MM-DD");
};

const datePickerValue = computed(() => {
  if (
    [
      AGENT_CODE.SOARING_GOOD_ANALYST, // 飙升商品分析
      AGENT_CODE.DY_SOARING_GOOD_ANALYST, // // 抖音飙升商品分析师
    ].includes(props.agentCode)
  ) {
    const value =
      props.exportInfo?.dateRange?.split("~")?.[1] ||
      getLastWeekSundayOfMonth(props.exportInfo.date) ||
      "";
    const result = dayjs(value).format("YYYY-MM-DD");

    // console.log('datePickerValue result', value, result)
    return result;
  }

  return props.exportInfo.date;
});

const datePickerType = computed(() => {
  if (
    [
      AGENT_CODE.SOARING_GOOD_ANALYST, // 飙升商品分析
      AGENT_CODE.DY_SOARING_GOOD_ANALYST, // // 抖音飙升商品分析师
    ].includes(props.agentCode)
  ) {
    return "week";
  }

  return "month";
});

const datePickerValueFormat = computed(() => {
  if (
    [
      AGENT_CODE.SOARING_GOOD_ANALYST, // 飙升商品分析
      AGENT_CODE.DY_SOARING_GOOD_ANALYST, // // 抖音飙升商品分析师
    ].includes(props.agentCode)
  ) {
    return "YYYY-MM-DD";
  }
  return "YYYY-MM";
});

const disabledDateEnd = computed(() => {
  if (
    [
      AGENT_CODE.SOARING_GOOD_ANALYST, // 飙升商品分析
      AGENT_CODE.DY_SOARING_GOOD_ANALYST, // // 抖音飙升商品分析师
    ].includes(props.agentCode)
  ) {
    return dayjs().startOf("week").valueOf();
  }
  return dayjs().startOf("month").valueOf();
});

// 导出消息
const exportMessage = async (type) => {
  if (isSafari) {
    showMessage("当前浏览器不支持导出，推荐使用Chrome浏览器");
    return;
  }
  // 店铺报告 先临时走历史的   后面走下面统一的导出方式
  const { date, name, fileName, secTitle, wxUrl, phone } =
    props.exportInfo ?? {};

  // 1. 判断是否有权限
  if (!isDownloading.value) {
    const { loading, onExport } = useExport();
    isDownloading.value = loading.value;
    watch(loading, (value) => {
      isDownloading.value = value;
    });

    const time = dayjs(date).isValid()
      ? dayjs(date).format("YYYY年MM月")
      : date;
    try {
      await onExport(
        mdContainer.value,
        {
          time,
          name,
          tips: secTitle,
          ewm: wxUrl,
          phone,
          filename: (
            fileName || `${name || secTitle || "智能体报告"}-${time}`
          ).trim(),
          message: props.message,
          reportTypeText:
            props.agentCode === AGENT_CODE.SOARING_GOOD_ANALYST
              ? "飙升商品"
              : "",
        },
        {
          agentCode: props.agentCode,
          downType: type,
          filename: (fileName || `${name}-${time}`).trim(),
        },
      );
    } catch (e) {
      showMessage("导出报告失败，请稍后重试");
    }
  } else {
    // 没有报告ID，此时导出按钮是隐藏的，暂不处理任何事宜。
  }
};

// 重新生成消息 date 可能是YYYY-MM-DD格式，也可能是YYYY-MM格式
const onReGenerate = (date) => {
  const payload = {
    messageId: props.messageId,
  };

  if (date) {
    if (
      [
        AGENT_CODE.SOARING_GOOD_ANALYST, // 飙升商品分析
        AGENT_CODE.DY_SOARING_GOOD_ANALYST, // // 抖音飙升商品分析师
      ].includes(props.agentCode)
    ) {
      // 选中周的周日
      payload.day = dayjs(date).endOf("week").format("YYYY-MM-DD");
    }
    payload.month = dayjs(date).format("YYYY-MM");
  }

  // console.log('onReGenerate payload', payload, omitBy(payload, isUndefined))

  emits("regenerate", payload);
};

const onDateChange = (date) => {
  onReGenerate(date);
};

const disabledDate = (time) => {
  return (
    time.getTime() >= disabledDateEnd.value || //
    time.getTime() < dayjs("2020-01-01").valueOf() // 20年之前的数据，不可以查看，会报错
  );
};
</script>
<style lang="scss">
.with-input-popper {
  .el-date-picker__header {
    cursor: default;

    .el-date-picker__header-label {
      cursor: default !important;
      pointer-events: none !important;
    }
  }

  .date-picker-hidden-input {
    position: absolute;
    top: 0;
    right: -2px;
    visibility: hidden;
    width: 0;
    height: 0;
    opacity: 0;
    background-color: red;

    .el-input__wrapper {
      visibility: hidden;
      width: 0;
      height: 0;
      opacity: 0;
    }
  }

  .el-scrollbar,
  .el-scrollbar__view.el-dropdown__list,
  .el-scrollbar__wrap.el-scrollbar__wrap--hidden-default {
    overflow: visible;
  }

  .el-scrollbar__bar {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.export-icon {
  outline: none;
}

.trigger {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  text-align: center;
  line-height: 32px;

  & + &-placeholder {
    z-index: 1;
    opacity: 0;
  }
}

.assistant-message {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;

  .message-content {
    display: flex;
    align-items: center;
    flex: 1;
    width: 100%;
    padding: 8px 0;

    @include flex-gap(12px, row);

    .message-text {
      flex: 1;
      width: 100%;
      color: #000;
      font-family: "Source Han Sans CN", sans-serif;
      font-size: 16px;
      font-weight: 400;
      line-height: 1.6em;
    }
  }

  .message-actions {
    display: flex;
    align-items: center;

    @include flex-gap(16px, row);

    .action-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      cursor: pointer;
      transition: all 0.2s ease;

      i {
        color: #8c8c8c;
        font-size: 16px;
      }

      &:hover {
        opacity: 0.8;
      }
    }
  }
}
</style>
