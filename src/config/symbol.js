/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-13
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-09-03
 * @FilePath     : /bi-agents/src/config/symbol.js
 * @Description  : 符号常量
 *
 */

// 对话房间事件总线
export const CHAT_ROOM_COMMAND = Symbol('chat-room-command')

// 智能体操作事件总线
export const AGENT_OPERATION_COMMAND = Symbol('agent-command')

// 未读数事件总线
export const AGENT_UNREADCOUNT_COMMAND = Symbol('agent-command')

// 发送消息事件总线
export const RECEIVE_CHAT_TASK_COMMAND = Symbol('receive-chat-task-command')

//
export const FETCH_CHAR_HISTORY = Symbol('fetch-history')

// x-markdown-core 的 provider 键
export const MARKDOWN_PROVIDER_KEY = Symbol('vue-element-plus-x-markdown-provider')
