# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ChatLLM 是一个基于 Vue 3 的 AI 对话应用，支持多模型对话、深度思考（推理内容）、流式响应等功能。核心特性是树形消息结构，支持多分支对话。


## 技术栈

- **框架**: Vue 3 + Vite 7
- **状态管理**: Pinia + pinia-plugin-persistedstate
- **UI 组件**: Element Plus (SCSS 主题定制)
- **Markdown 渲染**: unified/remark/rehype + KaTeX + Mermaid

## 核心架构

### 状态管理

**`useChatRoomsStore`** (`src/stores/chat-rooms/index.js`)
- 管理对话房间和消息树
- 消息使用树形结构存储，每个节点有 `children` 数组和 `currentIndex` 索引
- 支持多分支对话：用户编辑消息或重新生成回答时创建新分支
- 持久化 key: `chat-llm-rooms`

**消息树结构**:
```javascript
{
  id, role, content, reasoningContent, reasoningTime,
  model, parentId, children: [], currentIndex: 0,
  finished, error, usage, createdAt
}
```

**`useApiSettingsStore`** (`src/stores/api-settings/index.js`)
- 管理 API 配置（baseURL、apiKey、模型列表）
- 持久化 key: `chat-llm-api-settings`

### SSE 通信

**三层 API 设计** (`src/hooks/use-sse/use-openai-sse.js`):
1. `createOpenAISSERequest` - 单个请求实例
2. `useOpenAISSE` - 多请求管理器
3. `useOpenAISSESingle` - 单请求简化版（对话场景推荐）

**状态**: `idle` → `connecting` → `streaming` → `done`/`error`/`aborted`

**特性**:
- 支持推理内容（`delta.reasoning_content`）和推理计时
- 自动处理非流式响应
- 支持 AbortController 取消

### 对话逻辑

**`useCompletions`** (`src/views/completions/hooks/use-completions.js`)
- 核心对话 hook，处理消息发送、流式接收、分支切换
- 消息发送流程：创建用户消息 → 创建空 assistant 消息 → 发送 SSE → 实时更新内容
- 支持消息编辑、重新生成、分页浏览分支

### 组件通信

| 方式 | 场景 |
|-----|------|
| Props + Emit | 父子组件 |
| Pinia Store | 全局状态 |
| Event Bus | 跨组件事件（`src/config/symbol.js` 定义符号） |
| Provide/Inject | Markdown 组件配置注入 |
| SessionStorage | 首页到对话页的消息传递 |

### 路径别名

- `@` → `src/`
- `@img` → `src/assets/images/`

### 样式约定

- 全局 SCSS mixins: `src/styles/mixins.scss`
- Element Plus 主题覆盖: `src/styles/element-plus/`
- 组件样式使用 `<style lang="scss" scoped>`

## 关键文件

- `src/views/completions/hooks/use-completions.js` - 对话核心逻辑
- `src/hooks/use-sse/use-openai-sse.js` - SSE 通信实现
- `src/stores/chat-rooms/index.js` - 房间和消息状态管理
- `src/components/sender/index.vue` - 消息发送器组件
- `src/components/x-markdown/` - Markdown 渲染组件


## 环境变量

位于 `./env` 目录，通过 `import.meta.env` 访问：
- `VITE_APP_WEB_URL`: API 基础地址
