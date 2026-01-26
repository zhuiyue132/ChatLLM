/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-16
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/config/app.js
 * @Description  : 应用配置
 *
 */

// 部署的基础路径
// export const BASE_URL = '/ai'
export const BASE_URL = '/' // 智能体项目改版后，需要独立部署，base 路径为根路径。

// 请求头
export const REQUEST_HEADER_JSON = { 'Content-Type': 'application/json' }

// 文件上传请求头
export const REQUEST_HEADER_FORM_DATA = {
  'Content-Type': 'multipart/form-data'
}

/**
 * 应用名称，侧边栏顶部展示
 */
export const APP_NAME = 'ChatLLM'

/**
 * 侧边栏折叠状态的 key
 */
export const SIDEBAR_COLLAPSED_KEY = 'agents-sidebar-collapsed'

/**
 * 上传文件的限制
 */
export const UPLOAD_LIMIT_KEY = 'agent-upload-limit'

/**
 * 如果消息是此内容，那么会被忽略
 */
export const IGNORE_MESSAGE = 'IGNORE_MESSAGE'
