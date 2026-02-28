/*
 * @Author       : zhuiyue132
 * @Date         : 2026-01-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-30
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/config.js
 * @Description  : 设置弹窗菜单和步骤配置
 */

// 左侧菜单配置
export const MENU_LIST = [
  { key: 'api-model', label: 'API与模型', icon: 'iconfont icon-api' },
  { key: 'appearance', label: '外观', icon: 'iconfont icon-zhengyan' },
  { key: 'knowledge', label: '知识库', icon: 'iconfont icon-zhishiku' },
  { key: 'backup', label: '数据备份', icon: 'iconfont icon-download' },
  { key: 'webdav', label: 'WebDAV备份', icon: 'iconfont icon-export' }
]

// API与模型 分步骤配置
export const WIZARD_STEPS = [
  {
    key: 'api-config',
    title: '设置 API',
    description: '配置 API 地址和密钥'
  },
  {
    key: 'model-select',
    title: '选择模型',
    description: '选择要使用的模型'
  },
  {
    key: 'default-models',
    title: '默认模型',
    description: '设置各场景默认模型'
  }
]
