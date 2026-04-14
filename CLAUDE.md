# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ChatLLM 是一个基于 Vue 3 的 AI 对话应用，当前除了基础多模型对话外，还包含：

- 树形消息结构与多分支对话
- `reasoning_content` 深度思考展示
- OpenAI 兼容 SSE 流式响应
- 视觉模型图片输入
- 输入框中英互译
- 本地知识库 / RAG / 引用来源展示 / rerank
- Streamable HTTP MCP 工具调用与日志展示
- 本地导入导出与 WebDAV 备份


## 技术栈

- **框架**: Vue 3 + Vite 7
- **状态管理**: Pinia + pinia-plugin-persistedstate
- **UI 组件**: Element Plus (SCSS 主题定制)
- **Markdown 渲染**: unified/remark/rehype + KaTeX + Mermaid
- **本地向量检索**: edgevec + IndexedDB

## 核心架构

### 状态管理

**`useChatRoomsStore`** (`src/stores/chat-rooms/index.js`)
- 管理对话房间和消息树
- 消息使用树形结构存储，每个节点有 `children` 数组和 `currentIndex` 索引
- 支持多分支对话：用户编辑消息或重新生成回答时创建新分支
- 房间级别还保存 `model`、`mcpEnabled`、`mcpServerIds`、`kbIds`
- 持久化 key: `chat-llm-rooms`

**房间结构（简化）**:
```javascript
{
  id, title, model,
  mcpEnabled, mcpServerIds: [], kbIds: [],
  isTitleLoading, topFlag, pinTime,
  createdAt, updatedAt
}
```

**消息节点结构（常见字段）**:
```javascript
{
  id, role, content, reasoningContent, reasoningTime,
  model, parentId, children: [], currentIndex: 0,
  finished, error, usage, createdAt,
  fileList, ragSources, mcpTimeline, mcpLogs,
  messageType, pageIndex, siblingCount
}
```

**`useApiSettingsStore`** (`src/stores/api-settings/index.js`)
- 管理 API 配置（baseURL、apiKey、模型列表）
- 管理默认模型（chat / summary / translate）
- 能力标签包含 `vision` / `tool_call` / `rerank` / `embedding`
- 持久化 key: `chat-llm-api-settings`

**`useKnowledgeBaseStore`** (`src/stores/knowledge-base/index.js`)
- 管理知识库列表与配置
- 字段包含 `embeddingModel`、`rerankModel`、`dimensions`、`chunkSize`、`chunkOverlap`、`topK`
- 维护 `documentCount` / `chunkCount`
- 持久化 key: `chat-llm-knowledge-base`

**`useMcpSettingsStore`** (`src/stores/mcp-settings/index.js`)
- 管理 MCP 全局开关与服务列表
- 单个服务包含 `endpoint`、`apiKey`、`headers`、`timeoutMs`
- 持久化 key: `chat-llm-mcp-settings`

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

### 对话逻辑（当前已拆分为主流程 + 子模块）

**`useCompletions`** (`src/views/completions/hooks/use-completions.js`)
- 负责主对话流程编排
- 消息发送主链路：
  1. 创建 user 节点
  2. 创建空 assistant 节点
  3. 构建 OpenAI messages
  4. 可选注入 RAG system message
  5. 可选进入 MCP tool-calls 流程
  6. 流式同步 assistant 内容
  7. 完成后回写 usage / ragSources / mcpTimeline
- 支持消息编辑、重新生成、分支切换、停止生成

**`useCompletionsEntry`** (`src/views/completions/hooks/use-completions-entry.js`)
- 首页输入框逻辑
- 创建房间时会同时落下 `mcpEnabled` / `mcpServerIds` / `kbIds`
- 通过 `sessionStorage` 传递待发送消息到对话页

**`src/views/completions/hooks/use-completions/` 子模块**
- `openai-messages.js`：把消息树转换成 OpenAI 兼容 messages，处理图片输入
- `openai-files.js`：提取图片文件、生成 data URL、清理存储字段
- `openai-stream.js`：发起 OpenAI completion 请求
- `streaming-sync.js`：节流同步流式内容，减少高频 store 更新
- `rag-inject.js`：执行知识库检索并插入 system message
- `mcp-runner.js`：处理 tool calls → MCP 调用 → tool 结果回传 → 二轮模型生成

### 知识库 / RAG

**配置与入口**
- 设置页入口：`src/components/api-settings-dialog/components/knowledge-panel/`
- 发送器选择器：`src/components/sender/components/kb-selector.vue`
- 房间级选择：保存在 room 的 `kbIds`

**处理流程**
1. 上传文档后，`document-processor.js` 负责切分文本
2. 嵌入后写入 `vector-store.js`
3. `rag.js` 会按 `embeddingModel + dimensions` 对知识库分组，只做一次 query embedding
4. 检索结果可选调用 `src/api/rerank.js` 走 `/v1/rerank`
5. `rag-inject.js` 将生成的上下文插入 OpenAI `system` message
6. assistant 节点上保存 `ragSources`
7. `src/components/completions-message/assistant.vue` 渲染“引用来源”

**`vector-store.js` 注意点**
- 没直接使用 edgevec 自带持久化
- 原始向量和 metadata 自行存 IndexedDB
- 需要时重建内存 HNSW 索引
- 支持按知识库列出文件、按文件删除向量数据

### MCP

**配置与入口**
- 设置页入口：`src/components/api-settings-dialog/components/mcp-panel/index.vue`
- 发送器选择器：`src/components/sender/components/mcp-selector.vue`

**客户端实现**
- `src/api/mcp/index.js` 是 MCP Streamable HTTP 客户端
- 优先通过 `/mcp-proxy` + `X-MCP-Target` 动态代理访问目标服务
- 支持协议版本协商、session 复用、工具列表读取、工具调用

**对话集成**
- `mcp-runner.js` 将 MCP 工具包装成 OpenAI tools
- tool call 执行过程中会插入 `role: 'mcp'` / `messageType: 'mcp-log'` 的日志节点
- assistant 节点会附带 `mcpTimeline` 与 `mcpLogs`
- `use-chat-display-history.js` 会把这些日志整理进当前展示链路

### 渲染与性能

- `use-chat-display-history.js` 对 assistant 内容做分段展示，减少长消息整块重复解析
- MCP 桥接产生的空 assistant 节点会被隐藏，避免破坏日志时序
- `createStreamingSync()` 默认 100ms 才同步一次流式内容到 store
- `chat-rooms` store 自带持久化节流，避免流式阶段频繁序列化

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
- `src/views/completions/hooks/use-completions-entry.js` - 首页发送入口
- `src/views/completions/hooks/use-completions/` - OpenAI / RAG / MCP 子模块
- `src/hooks/use-sse/use-openai-sse.js` - SSE 通信实现
- `src/stores/chat-rooms/index.js` - 房间和消息状态管理
- `src/stores/knowledge-base/index.js` - 知识库配置
- `src/stores/mcp-settings/index.js` - MCP 配置
- `src/services/rag.js` - RAG 检索与上下文构建
- `src/services/vector-store.js` - 本地向量存储
- `src/api/mcp/index.js` - MCP 客户端
- `src/components/sender/index.vue` - 消息发送器组件
- `src/components/api-settings-dialog/components/knowledge-panel/` - 知识库 UI
- `src/components/api-settings-dialog/components/mcp-panel/` - MCP UI
- `src/components/x-markdown/` - Markdown 渲染组件

## 开发注意事项

- 近期对话页已经从单文件逻辑拆成多个子模块，优先在对应子模块中修改，不要把逻辑重新塞回 `use-completions.js`
- 涉及知识库功能时，同时关注：
  - store 配置
  - 文档上传 / 删除
  - 向量存储
  - RAG 注入
  - assistant 引用来源 UI
- 涉及 MCP 时，同时关注：
  - 设置页配置
  - sender 选择器
  - `/mcp-proxy` 部署前提
  - `mcp-log` 节点展示
- 该仓库没有正式测试脚本；改动后至少执行：
  - `npm run lint`
  - `npm run stylelint`
  - `npm run build`

## 环境变量

位于 `./env` 目录，通过 `import.meta.env` 访问：
- `VITE_APP_WEB_URL`: API 基础地址
