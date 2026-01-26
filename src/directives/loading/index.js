/*
 * @Author       : zhuiyue132
 * @Date         : 2025-09-04
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-09-04
 * @FilePath     : /bi-agents/src/directives/loading/index.js
 * @Description  : 优化后的 Loading 指令 - 支持响应式配置和多种主题
 *
 * 使用场景：
 * - 为任意元素添加加载状态遮罩
 * - 支持响应式配置更新
 * - 提供多种主题和尺寸选择
 * - 支持全屏、锁定屏幕等高级功能
 *
 * 功能特性：
 * - 响应式配置：支持动态更新loading状态和样式
 * - 多种主题：light、dark、transparent三种内置主题
 * - 灵活配置：支持对象配置和修饰符两种使用方式
 * - 自动清理：组件卸载时自动清理loading实例和监听器
 * - 性能优化：智能监听响应式数据变化，避免不必要的更新
 *
 * 使用方式：
 * 1. 基本使用：v-xs-loading="true"
 * 2. 对象配置：v-xs-loading="{ text: '加载中...', size: 'large' }"
 * 3. 修饰符：v-xs-loading.fullscreen.lock
 * 4. 属性配置：xs-loading-text="加载中..." xs-loading-size="large"
 */

import { isRef, ref, watch, unref } from "vue";
import { ElLoading } from "element-plus";
import {
  CIRCLE_SVG_TEMPLATE,
  LOADING_SIZES,
  LOADING_THEMES,
} from "@/config/loading";
// eslint-disable-next-line vue/prefer-import-from-vue
import { hyphenate, isObject, isString } from "@vue/shared";

/**
 * 实例存储键名 - 用于在DOM元素上存储loading实例
 * @type {Symbol}
 */
const INSTANCE_KEY = Symbol("XSLoading");

/**
 * 监听器存储键名 - 用于在DOM元素上存储响应式监听器
 * @type {Symbol}
 */
const WATCHERS_KEY = Symbol("XSLoadingWatchers");

/**
 * 解析表达式，支持字符串形式的Vue实例属性引用
 * @param {string|any} key - 属性名或值
 * @param {import('vue').ComponentInternalInstance} vm - Vue实例
 * @returns {import('vue').Ref<any>|null} 响应式引用或null
 */
const resolveExpression = (key, vm) => {
  if (!key) return null;
  // 优先从Vue实例中获取属性，如果不存在则使用原始值
  const data = (isString(key) && vm?.[key]) || key;
  return data ? ref(data) : null;
};

/**
 * 从绑定对象中获取指定属性的值
 * @param {Object} binding - Vue指令绑定对象
 * @param {string} key - 属性名
 * @param {any} defaultValue - 默认值
 * @returns {any} 属性值或默认值
 */
const getBindingValue = (binding, key, defaultValue = undefined) => {
  if (isObject(binding.value)) {
    return binding.value[key] ?? defaultValue;
  }
  return defaultValue;
};

/**
 * 从元素属性中获取配置值
 * @param {HTMLElement} el - DOM元素
 * @param {string} key - 属性名
 * @returns {string|null} 属性值或null
 */
const getAttributeValue = (el, key) => {
  return el.getAttribute(`xs-loading-${hyphenate(key)}`);
};

/**
 * 构建Loading配置选项
 * 整合绑定值、属性配置和主题配置，生成最终的ElLoading配置
 * @param {HTMLElement} el - DOM元素
 * @param {Object} binding - Vue指令绑定对象
 * @param {import('vue').ComponentInternalInstance} vm - Vue实例
 * @returns {Object} ElLoading配置选项
 */
const buildOptions = (el, binding, vm) => {
  // 解析加载文本：支持响应式数据绑定
  const text = resolveExpression(
    getBindingValue(binding, "text") || getAttributeValue(el, "text"),
    vm,
  );

  // 获取尺寸和主题配置
  const size = getBindingValue(binding, "size", "medium");
  const theme = getBindingValue(binding, "theme", "light");
  const themeConfig = LOADING_THEMES[theme] || LOADING_THEMES.light;

  // 计算最终尺寸：优先使用自定义尺寸，否则使用预设尺寸
  const customSize = getBindingValue(binding, "customSize");
  const circleSize = customSize || LOADING_SIZES[size] || LOADING_SIZES.medium;

  // 处理特殊功能开关：支持配置对象和修饰符两种方式
  const fullscreen =
    getBindingValue(binding, "fullscreen") ?? binding.modifiers.fullscreen;
  const body = getBindingValue(binding, "body") ?? binding.modifiers.body;
  const lock = getBindingValue(binding, "lock") ?? binding.modifiers.lock;

  // 解析背景色：支持响应式数据绑定和主题默认值
  const background = resolveExpression(
    getBindingValue(binding, "background") || themeConfig.background,
    vm,
  );

  // 解析自定义类名：支持响应式数据绑定和主题默认值
  const customClass = resolveExpression(
    getBindingValue(binding, "customClass") || themeConfig.customClass,
    vm,
  );

  return {
    text,
    svg: CIRCLE_SVG_TEMPLATE(circleSize),
    background,
    customClass,
    fullscreen,
    // 目标元素：全屏模式下不需要指定，否则使用当前元素
    target: getBindingValue(binding, "target") ?? (fullscreen ? undefined : el),
    body,
    lock,
  };
};

/**
 * 清理所有监听器
 * 在组件更新或卸载时调用，防止内存泄漏
 * @param {HTMLElement} el - DOM元素
 */
const cleanupWatchers = (el) => {
  if (el[WATCHERS_KEY]) {
    // 执行所有监听器的清理函数
    el[WATCHERS_KEY].forEach((cleanup) => cleanup());
    // 删除监听器存储
    delete el[WATCHERS_KEY];
  }
};

/**
 * 设置响应式监听器
 * 监听配置对象中的响应式数据变化，自动更新loading状态
 * @param {HTMLElement} el - DOM元素
 * @param {Object} binding - Vue指令绑定对象
 * @param {import('vue').ComponentInternalInstance} vm - Vue实例
 */
const setupReactiveWatchers = (el, binding, vm) => {
  // 清理现有监听器，避免重复监听
  cleanupWatchers(el);

  const watchers = [];

  // 监听对象类型绑定的深度变化
  if (isObject(binding.value)) {
    const stopWatch = watch(
      () => binding.value,
      (newValue, oldValue) => {
        // 当整个配置对象发生变化时，更新loading实例
        if (newValue !== oldValue) {
          updateReactiveInstance(el, binding);
        }
      },
      { deep: true, immediate: false },
    );
    watchers.push(stopWatch);
  }

  // 监听 Vue 实例中的响应式数据
  const watchedProps = new Set();

  // 递归收集需要监听的响应式属性
  const collectWatchProps = (obj, prefix = "") => {
    if (!isObject(obj)) return;

    Object.keys(obj).forEach((key) => {
      const fullPath = prefix ? `${prefix}.${key}` : key;

      // 检查是否为响应式数据或Vue实例属性引用
      if (isRef(obj[key]) || (vm && isString(obj[key]) && vm[obj[key]])) {
        watchedProps.add(fullPath);
      } else if (isObject(obj[key])) {
        // 递归处理嵌套对象
        collectWatchProps(obj[key], fullPath);
      }
    });
  };

  if (isObject(binding.value)) {
    collectWatchProps(binding.value);
  }

  // 为每个响应式属性设置监听器
  watchedProps.forEach((propPath) => {
    const stopWatch = watch(
      () => {
        const obj = binding.value;
        if (!isObject(obj)) return null;

        // 解析属性路径，支持嵌套对象访问
        const keys = propPath.split(".");
        let value = obj;

        for (const key of keys) {
          if (value && isRef(value[key])) {
            // 如果是响应式引用，返回解包后的值
            return unref(value[key]);
          } else if (value && vm && isString(value[key]) && vm[value[key]]) {
            // 如果是Vue实例属性引用，返回解包后的值
            return unref(vm[value[key]]);
          } else if (value && isObject(value[key])) {
            // 继续深入嵌套对象
            value = value[key];
          } else {
            // 返回最终值
            return value?.[key];
          }
        }

        return null;
      },
      () => {
        // 当响应式数据变化时，更新loading实例
        updateReactiveInstance(el, binding);
      },
      { immediate: false },
    );
    watchers.push(stopWatch);
  });

  // 存储所有监听器，用于后续清理
  el[WATCHERS_KEY] = watchers;
};

/**
 * 响应式更新loading实例
 * 当配置中的响应式数据变化时，更新loading实例的配置
 * @param {HTMLElement} el - DOM元素
 * @param {Object} binding - Vue指令绑定对象
 */
const updateReactiveInstance = (el, binding) => {
  const instance = el[INSTANCE_KEY];
  if (!instance) return;

  try {
    // 重新构建配置选项
    const newOptions = buildOptions(el, binding, binding.instance);
    // 更新现有实例的配置
    updateOptions(newOptions, instance.options);
  } catch (error) {
    console.error("[XSLoading] 响应式更新失败:", error);
  }
};

/**
 * 创建loading实例
 * 初始化新的loading实例并设置响应式监听
 * @param {HTMLElement} el - DOM元素
 * @param {Object} binding - Vue指令绑定对象
 */
const createInstance = (el, binding) => {
  try {
    const vm = binding.instance;
    // 构建配置选项
    const options = buildOptions(el, binding, vm);

    // 创建并存储loading实例
    el[INSTANCE_KEY] = {
      options,
      instance: ElLoading.service(options),
    };

    // 设置响应式监听，支持动态更新
    setupReactiveWatchers(el, binding, vm);
  } catch (error) {
    console.error("[XSLoading] 创建实例失败:", error);
  }
};

/**
 * 更新loading实例
 * 根据绑定值的变化创建、更新或销毁loading实例
 * @param {HTMLElement} el - DOM元素
 * @param {Object} binding - Vue指令绑定对象
 */
const updateInstance = (el, binding) => {
  const instance = el[INSTANCE_KEY];

  try {
    if (binding.value && !binding.oldValue) {
      // 从无到有：创建新实例
      createInstance(el, binding);
    } else if (binding.value && binding.oldValue) {
      // 从有到有：更新现有实例
      if (isObject(binding.value)) {
        updateReactiveInstance(el, binding);
        // 重新设置监听器，处理新的响应式数据
        setupReactiveWatchers(el, binding, binding.instance);
      }
    } else {
      // 从有到无：销毁实例
      instance?.instance.close();
      delete el[INSTANCE_KEY];
      cleanupWatchers(el);
    }
  } catch (error) {
    console.error("[XSLoading] 更新实例失败:", error);
  }
};

/**
 * 更新配置选项
 * 将新配置的值更新到原始配置的响应式引用中
 * @param {Object} newOptions - 新的配置选项
 * @param {Object} originalOptions - 原始配置选项（包含响应式引用）
 */
const updateOptions = (newOptions, originalOptions) => {
  for (const key of Object.keys(originalOptions)) {
    // 只更新响应式引用的值，保持响应性
    if (isRef(originalOptions[key]) && newOptions[key] !== undefined) {
      originalOptions[key].value = newOptions[key];
    }
  }
};

/**
 * 注册xs-loading指令
 * @param {import('vue').App} app - Vue应用实例
 */
export default (app) => {
  app.directive("xs-loading", {
    /**
     * 指令挂载时触发
     * @param {HTMLElement} el - DOM元素
     * @param {Object} binding - 指令绑定对象
     */
    mounted(el, binding) {
      if (binding.value) {
        createInstance(el, binding);
      }
    },
    /**
     * 指令更新时触发
     * @param {HTMLElement} el - DOM元素
     * @param {Object} binding - 指令绑定对象
     */
    updated(el, binding) {
      if (binding.oldValue !== binding.value) {
        updateInstance(el, binding);
      }
    },
    /**
     * 指令卸载时触发
     * 清理loading实例和监听器，防止内存泄漏
     * @param {HTMLElement} el - DOM元素
     */
    unmounted(el) {
      const instance = el[INSTANCE_KEY];
      if (instance) {
        try {
          // 关闭loading实例
          instance.instance.close();
          // 清理存储的实例引用
          delete el[INSTANCE_KEY];
          // 清理所有监听器
          cleanupWatchers(el);
        } catch (error) {
          console.error("[XSLoading] 销毁实例失败:", error);
        }
      }
    },
  });
};
