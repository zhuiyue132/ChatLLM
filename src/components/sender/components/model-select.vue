<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-21
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/components/sender/components/model-select.vue
 * @Description  : 模型下拉框
 * 
-->
<template>
  <xs-dropdown
    v-title="popperTitle"
    trigger="click"
    placement="top-start"
    :popper-options="setPopperPosition(0, 4)"
    :hide-on-click="hideOnClick"
    @visible-change="onVisiableChange"
    @command="onCommand"
  >
    <div class="trigger">
      <div class="sender-button">
        <i class="iconfont icon-moxing-lora sender-icon"></i>
        <span>{{ currentModelName }}</span>

        <div class="arrow-icon" :class="{ visible: poperVisible }">
          <i class="iconfont icon-arrowDown"></i>
        </div>
      </div>
    </div>
    <template #dropdown>
      <xs-dropdown-menu>
        <xs-dropdown-item
          v-for="model in modelList"
          :key="model?.code"
          :command="model?.code"
          :disabled="isDisabled(model?.code)"
        >
          <div
            class="model-item"
            :class="{
              active: selectedModels.includes(model.code),
              disabled: isDisabled(model?.code),
            }"
          >
            <div v-if="isMultipleMode" class="model-check">
              <i class="icon-rightPlain"></i>
            </div>

            <div class="model-name">
              <span>{{ model.name }} </span>
              <i
                v-if="model.enableGenerateImage || model.enableVision"
                v-title="getImageTitle(model)"
                class="iconfont icon-tupian"
              ></i>
            </div>
          </div>
        </xs-dropdown-item>
      </xs-dropdown-menu>
    </template>
  </xs-dropdown>
</template>
<script setup>
import { useVModel } from "@vueuse/core";
import {
  XsDropdown,
  XsDropdownMenu,
  XsDropdownItem,
} from "@/components/xs-dropdown";
import { setPopperPosition } from "@/utils";
import { computed, ref } from "vue";

defineOptions({
  name: "ModelSelector",
});

const props = defineProps({
  modelList: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: [String, Array],
    default: "",
  },
  // 是否启用多选
  enableMultiple: {
    type: Boolean,
    default: true,
  },
  // 最大选择数量
  maxSelectCount: {
    type: Number,
    default: 2,
  },
  // TODO: 需要在真实联调后再加上hover提示
  popperTitle: {
    type: String,
    default: "",
  },
  // 校验模式配置
  // both = 启用多选后，组件需要支持既可以单选，也可以多选；
  // single = 组件只支持单选；
  // multiple = 启用多选后，组件只支持多选, 且取消选中其中一个模型时，如未选择其他模型，则关闭下拉框后恢复原本选中模型；
  validateMode: {
    type: String,
    values: ["single", "multiple", "both"],
    default: "both",
  },
});

const emits = defineEmits(["update:modelValue"]);

const currentModel = useVModel(props, "modelValue", emits);

// 保存下拉框打开时的原始选中状态（用于 multiple 模式恢复）
const originalValue = ref(null);

// 是否为多选模式
const isMultipleMode = computed(() => {
  if (props.validateMode === "single") return false;
  if (props.validateMode === "multiple") return true;
  // both 模式下，根据 enableMultiple 决定
  return props.enableMultiple;
});

// 点击是否关闭下拉框（单选时关闭，多选时不关闭）
const hideOnClick = computed(() => !isMultipleMode.value);

// 统一处理选中的模型列表（数组或单个值）
const selectedModels = computed(() => {
  if (isMultipleMode.value) {
    return Array.isArray(currentModel.value)
      ? currentModel.value
      : [currentModel.value];
  }
  return currentModel.value;
});

// 显示的模型名称
const currentModelName = computed(() => {
  if (isMultipleMode.value) {
    // 多选模式：显示逗号分隔的所有模型名称
    const names = selectedModels.value
      .map((code) => props.modelList.find((item) => item.code === code)?.name)
      .filter(Boolean);
    return names.join(" & ") || "";
  } else {
    // 单选模式：显示单个模型名称
    const model = Array.isArray(currentModel.value)
      ? currentModel.value[0]
      : currentModel.value;
    return props.modelList.find((item) => item.code === model)?.name || "";
  }
});

const poperVisible = ref(false);
const onVisiableChange = (visible) => {
  poperVisible.value = visible;

  if (visible) {
    // 下拉框打开时，保存当前选中状态（用于 multiple 模式恢复）
    if (props.validateMode === "multiple") {
      originalValue.value = Array.isArray(currentModel.value)
        ? [...currentModel.value]
        : currentModel.value;
    }
  } else {
    // 下拉框关闭时，检查是否需要恢复
    if (props.validateMode === "multiple" && originalValue.value) {
      const currentSelected = Array.isArray(currentModel.value)
        ? currentModel.value
        : [];
      const original = Array.isArray(originalValue.value)
        ? originalValue.value
        : [];

      // 检查是否有新增的模型（不在原始列表中的模型）
      const hasNewModel = currentSelected.some(
        (item) => !original.includes(item),
      );

      // 如果没有新增模型，且选中数量变少了（说明只做了取消操作），则恢复原始状态
      if (!hasNewModel || currentSelected.length < original.length) {
        currentModel.value = originalValue.value;
      }

      // 清空保存的原始值
      originalValue.value = null;
    }
  }
};

// 判断模型是否应该被禁用
const isDisabled = (modelCode) => {
  if (!isMultipleMode.value) return false;
  // 如果模型已选中，不禁用（允许取消选中）
  if (selectedModels.value.includes(modelCode)) return false;
  // 如果达到最大选择数量，禁用未选中的项
  return selectedModels.value.length >= props.maxSelectCount;
};

const onCommand = (model) => {
  console.log("model", model);
  if (isMultipleMode.value) {
    // 多选模式
    const currentSelected = Array.isArray(currentModel.value)
      ? [...currentModel.value]
      : currentModel.value
        ? [currentModel.value]
        : [];
    const index = currentSelected.indexOf(model);
    console.log("index", index);

    if (index > -1) {
      // 已选中，则移除
      if (props.validateMode === "multiple") {
        // multiple 模式：允许取消选中，关闭下拉框时如果为空则恢复
        if (currentSelected.length > 1) {
          currentSelected.splice(index, 1);
        }
      } else {
        // both 模式：至少保留一个
        if (currentSelected.length > 1) {
          currentSelected.splice(index, 1);
        }
      }
    } else {
      // 未选中，检查是否达到最大数量
      if (currentSelected.length < props.maxSelectCount) {
        currentSelected.push(model);
      }
    }

    currentModel.value = currentSelected;
  } else {
    // 单选模式
    currentModel.value = [model];
  }
};

const getImageTitle = (model) => {
  if (model.enableGenerateImage && model.enableVision)
    return "支持识别图片和生成图片";
  if (model.enableGenerateImage) return "支持生成图片";
  if (model.enableVision) return "支持识别图片";
  return "";
};
</script>

<style lang="scss" scoped>
.trigger {
  outline: none;

  .sender-button {
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
      "Microsoft YaHei", sans-serif;

    .arrow-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 4px;
      transition: transform 0.2s ease;
      transform: rotate(0deg);
      font-size: 14px;

      .iconfont {
        font-size: 14px;
      }

      &.visible {
        transform: rotate(180deg);
      }
    }
  }
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;

  @include flex-gap(4px, row);

  span {
    margin-bottom: 1px;
  }

  .icon-rightPlain {
    margin-right: 0;
    font-size: 12px;
  }

  .model-check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    color: rgb(255 255 255 / 0%);
    border: 1px solid #595959;
    border-radius: 2px;
  }

  .model-name {
    display: flex;
    align-items: center;

    @include flex-gap(4px, row);

    .iconfont {
      transform: translateY(1px);
      color: #595959;
      font-size: 14px;
    }
  }
}

.model-item.active {
  color: #007e54;

  .model-check {
    color: #fff;
    border-color: #007e54;
    background: #007e54;
  }
}

.model-item.disabled {
  cursor: not-allowed;
  color: #c0c4cc;

  .model-check {
    border-color: #c0c4cc;
  }
}
</style>
