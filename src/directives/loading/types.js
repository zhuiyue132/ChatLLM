/*
 * @Author       : zhuiyue132
 * @Date         : 2025-09-04
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-09-04
 * @FilePath     : /bi-agents/src/directives/loading/types.js
 * @Description  : Loading 指令 TypeScript 类型定义
 *
 * 此文件定义了Loading指令相关的所有TypeScript类型
 * 提供完整的类型支持，包括配置选项、绑定值、实例等
 */

/**
 * Loading指令绑定值类型定义
 * 支持多种配置选项，用于自定义loading的显示效果和行为
 * @typedef {Object} LoadingBindingValue
 * @property {string} [text] - 加载文本，支持响应式数据绑定
 * @property {string} [size] - 尺寸：small | medium | large，默认为medium
 * @property {number} [customSize] - 自定义尺寸（像素），优先级高于预设尺寸
 * @property {string} [theme] - 主题：light | dark | transparent，默认为light
 * @property {string} [background] - 背景色，支持CSS颜色值，覆盖主题默认背景
 * @property {string} [customClass] - 自定义类名，支持响应式数据绑定
 * @property {boolean} [fullscreen] - 全屏显示，默认为false
 * @property {HTMLElement} [target] - 目标元素，指定loading的挂载目标
 * @property {boolean} [body] - 添加到body，默认为false
 * @property {boolean} [lock] - 锁定屏幕，防止滚动，默认为false
 */

/**
 * Loading选项类型定义
 * 用于ElLoading.service的配置选项，支持响应式数据绑定
 * @typedef {Object} LoadingOptions
 * @property {import('vue').Ref<string>|string} [text] - 加载文本，支持响应式数据绑定
 * @property {string} [svg] - SVG模板，用于自定义loading图标
 * @property {import('vue').Ref<string>|string} [background] - 背景色，支持响应式数据绑定
 * @property {import('vue').Ref<string>|string} [customClass] - 自定义类名，支持响应式数据绑定
 * @property {boolean} [fullscreen] - 全屏显示，默认为false
 * @property {HTMLElement} [target] - 目标元素，指定loading的挂载目标
 * @property {boolean} [body] - 添加到body，默认为false
 * @property {boolean} [lock] - 锁定屏幕，防止滚动，默认为false
 */

/**
 * Loading实例类型定义
 * 存储loading实例及其配置选项
 * @typedef {Object} LoadingInstance
 * @property {LoadingOptions} options - 配置选项
 * @property {ReturnType<typeof import('element-plus').ElLoading.service>} instance - ElLoading实例
 */

/**
 * Loading修饰符类型定义
 * 支持通过指令修饰符快速配置常用选项
 * @typedef {Object} LoadingModifiers
 * @property {boolean} [fullscreen] - 全屏修饰符，等同于fullscreen: true
 * @property {boolean} [body] - body修饰符，等同于body: true
 * @property {boolean} [lock] - 锁定修饰符，等同于lock: true
 */

/**
 * Loading指令绑定对象类型定义
 * Vue指令钩子函数中的binding参数类型
 * @typedef {Object} LoadingBinding
 * @property {LoadingBindingValue|boolean} value - 绑定值，可以是配置对象或布尔值
 * @property {LoadingBindingValue|boolean} oldValue - 旧值，用于检测变化
 * @property {import('vue').ComponentInternalInstance} instance - Vue实例，用于访问响应式数据
 * @property {LoadingModifiers} modifiers - 修饰符对象
 */
