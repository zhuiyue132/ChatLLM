# ChatLLM

<div align="center">

![ChatLLM Logo](./src/assets/logo.svg)

**一个本地优先的 AI 对话应用，支持多模型对话、树形分支、深度思考、本地知识库 RAG 与 MCP 工具调用**

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.11+-409EFF?style=flat-square&logo=element&logoColor=white)](https://element-plus.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[功能介绍](#-核心功能) · [快速开始](#-快速开始) · [使用指南](#-使用指南) · [开发指南](#-开发指南)

</div>

## ✨ 核心功能

### 🌳 树形对话结构
- **多分支对话**：编辑消息或重新生成时自动创建新分支
- **历史浏览**：在分支间自由切换，探索不同对话路径
- **完整保留**：所有对话版本都会保存在本地

### 🧠 深度思考 + 流式输出
- **推理过程可视化**：支持展示 `reasoning_content`
- **推理时长统计**：自动计算并显示思考耗时
- **流式响应**：基于 SSE 实时更新内容
- **分段渲染优化**：减少长消息流式输出时的重渲染开销

### 📚 本地知识库 RAG
- **本地知识库管理**：在设置页创建、启用、编辑知识库
- **文档上传与切分**：上传文档后自动分块、向量化并存入本地 IndexedDB
- **检索增强对话**：发送消息时可按条选择知识库参与检索
- **引用来源展示**：回答完成后可展开查看命中的引用来源
- **Rerank 重排序**：可为知识库配置 rerank 模型，对召回结果进行重排
- **文件查看与删除**：支持查看知识库内文件列表，并按文件删除已索引内容

### 🛠 MCP 工具调用
- **Streamable HTTP MCP**：支持配置和管理 MCP 服务
- **会话级开关 + 单条选择**：可按会话启用，再按消息选择具体服务
- **工具调用日志**：对话中展示 MCP 工具调用过程与结果

### 🖼 多模态与输入增强
- **图片输入**：视觉模型下支持上传图片参与对话
- **输入翻译**：输入框支持中英互译
- **Markdown 渲染**：支持代码高亮、数学公式、Mermaid 图表

### 💾 本地数据与备份
- **本地持久化**：对话、配置、知识库配置等均持久化到浏览器本地
- **导入导出**：支持对话数据备份与迁移
- **WebDAV 备份**：支持通过 WebDAV 同步备份
- **格式兼容**：支持 Cherry Studio 数据格式转换

## 🛠 技术栈

### 核心框架
- **[Vue 3](https://vuejs.org/)**
- **[Vite 7](https://vitejs.dev/)**
- **[Vue Router 4](https://router.vuejs.org/)**
- **[Pinia](https://pinia.vuejs.org/)**

### UI 与样式
- **[Element Plus](https://element-plus.org/)**
- **SCSS**

### Markdown / 内容处理
- **[unified](https://unifiedjs.com/)**
- **[remark](https://remark.js.org/)**
- **[rehype](https://rehypejs.com/)**
- **[KaTeX](https://katex.org/)**
- **[Mermaid](https://mermaid.js.org/)**

### 本地数据与工具库
- **[localforage](https://localforage.github.io/localForage/)**
- **[edgevec](https://www.npmjs.com/package/edgevec)** - 本地向量检索
- **[dayjs](https://day.js.org/)**
- **[@vueuse/core](https://vueuse.org/)**

## 📦 快速开始

### 环境要求

- 建议使用较新的 Node.js LTS 版本
- npm / yarn / pnpm 任一可用

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

默认会启动 Vite 开发服务器，并开启 `--host` 方便局域网访问。

### 构建生产版本

```bash
npm run build
npm run preview
```

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
docker-compose up -d
```

访问 `http://localhost:3002`

### 使用 Dockerfile

```bash
docker build -t chatllm .
docker run -p 3002:80 chatllm
```

## 📖 使用指南

### 1. 配置模型

1. 打开设置
2. 配置 OpenAI 兼容接口的 `baseURL` / `apiKey`
3. 选择可用模型，并设置默认对话模型

### 2. 基础对话

1. 在输入框中输入问题
2. 点击发送或按 `Enter`
3. AI 以流式方式返回响应

### 3. 多分支对话

1. **编辑消息**：编辑已发送消息后再次发送，会创建新分支
2. **重新生成**：对 assistant 消息重新生成，得到另一条分支
3. **切换分支**：通过分页/分支切换查看不同回答路径

### 4. 使用知识库

1. 进入设置页的 **知识库**
2. 新建知识库并配置 embedding 模型，可选配置 rerank 模型
3. 上传文档，等待索引完成
4. 在发送器里选择一个或多个知识库
5. 回答完成后，可在 assistant 消息下展开 **引用来源**

### 5. 使用 MCP

1. 进入设置页的 **MCP**
2. 添加 Streamable HTTP MCP 服务
3. 在发送器中打开会话 MCP 开关
4. 为当前消息选择可用 MCP 服务
5. 工具调用过程会以日志形式显示在消息流中

### 6. 数据备份

- 支持本地导入/导出
- 支持 WebDAV 备份

## 🏗 项目结构

```text
src/
├── api/
│   ├── mcp/                          # MCP Streamable HTTP 客户端
│   └── rerank.js                     # /v1/rerank 调用
├── components/
│   ├── api-settings-dialog/          # 设置弹窗（含知识库/MCP/WebDAV）
│   ├── completions-message/          # 对话消息渲染
│   ├── sender/                       # 发送器（模型/MCP/知识库/翻译/图片）
│   └── x-markdown/                   # Markdown 渲染组件
├── services/
│   ├── rag.js                        # RAG 检索与上下文构建
│   ├── vector-store.js               # 本地向量存储
│   └── document-processor.js         # 文档切分处理
├── stores/
│   ├── api-settings/                 # API 与模型配置
│   ├── chat-rooms/                   # 房间与消息树
│   ├── knowledge-base/               # 知识库配置
│   └── mcp-settings/                 # MCP 配置
├── views/
│   └── completions/
│       ├── hooks/use-completions.js  # 对话主流程
│       └── hooks/use-completions/    # RAG / MCP / 文件 / 流式子模块
└── hooks/
    └── use-sse/                      # OpenAI SSE 封装
```

## 🔧 开发指南

### 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format

# 样式检查
npm run stylelint
```

### 提交规范

项目使用 Conventional Commits，提交历史中会配合 emoji 前缀：

```bash
npm run commit
```

示例：

- `✨ feat(knowledge-base): 展示 RAG 引用来源`
- `♻️ refactor(completions): 拆分对话页逻辑并抽离 OpenAI/MCP 子模块`

### 最低验证要求

提交前至少执行：

```bash
npm run lint
npm run stylelint
npm run build
```

并手动验证：
- 聊天发送 / 流式输出
- 模型切换
- 知识库上传 / 检索 / 引用展示
- MCP 配置 / 调用日志
- 数据导入导出

---

<div align="center">

**如果这个项目对你有帮助，欢迎点个 ⭐️**

</div>
