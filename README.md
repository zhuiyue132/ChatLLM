# ChatLLM

<div align="center">

![ChatLLM Logo](./src/assets/logo.svg)

**一个功能强大的 AI 对话应用，支持多模型对话、深度思考和多分支对话树**

[![Vue 3](https://img.shields.io/badge/Vue-3.5+-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.0+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.11+-409EFF?style=flat-square&logo=element&logoColor=white)](https://element-plus.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[在线演示](https://chatllm-demo.example.com) · [功能介绍](#-核心功能) · [快速开始](#-快速开始) · [文档](./docs)

</div>

## ✨ 核心功能

### 🌳 树形对话结构
- **多分支对话**：编辑消息或重新生成时自动创建新分支
- **历史浏览**：在分支间自由切换，探索不同的对话路径
- **完整保留**：所有对话版本都被保存，方便回顾和对比

### 🧠 深度思考展示
- **推理过程可视化**：实时显示 AI 的推理内容
- **推理时长统计**：自动计算并显示思考时间
- **双层展示**：推理过程与最终答案分离显示，更清晰

### 🚀 流式响应体验
- **实时流式输出**：基于 SSE 的流式响应，极速呈现
- **多模型支持**：兼容 OpenAI API 格式的各类模型
- **智能识别**：自动处理流式和非流式响应

### 💾 数据管理
- **本地持久化**：使用 IndexedDB 可靠存储对话数据
- **数据导入导出**：支持备份和迁移对话历史
- **格式兼容**：支持 Cherry Studio 数据格式转换

### 🎨 精美界面
- **响应式设计**：完美适配桌面和移动设备
- **主题定制**：支持深色/浅色主题切换
- **动画效果**：流畅的过渡动画和加载效果
- **Markdown 渲染**：支持数学公式、代码高亮、图表渲染

## 🛠 技术栈

### 核心框架
- **[Vue 3](https://vuejs.org/)** - 渐进式 JavaScript 框架
- **[Vite 7](https://vitejs.dev/)** - 新一代前端构建工具
- **[Vue Router 4](https://router.vuejs.org/)** - 官方路由管理
- **[Pinia](https://pinia.vuejs.org/)** - Vue 3 状态管理库

### UI 组件
- **[Element Plus](https://element-plus.org/)** - Vue 3 UI 组件库
- **SCSS** - CSS 预处理器，支持主题定制

### Markdown 渲染
- **[unified](https://unifiedjs.com/)** - 强大的内容处理管道
- **[remark](https://remark.js.org/)** - Markdown 处理器
- **[rehype](https://rehypejs.com/)** - HTML 处理器
- **[KaTeX](https://katex.org/)** - 数学公式渲染
- **[Mermaid](https://mermaid-js.github.io/)** - 图表和流程图

### 工具库
- **[axios](https://axios-http.com/)** - HTTP 请求库
- **[localforage](https://localforage.github.io/localForage/)** - 离线存储
- **[dayjs](https://day.js.org/)** - 轻量级日期处理
- **[@vueuse/core](https://vueuse.org/)** - Vue 组合式工具集

## 📦 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0


## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

```bash
# 构建并启动服务
docker-compose up -d

# 访问 http://localhost:3002
```

### 使用 Dockerfile

```bash
# 构建镜像
docker build -t chatllm .

# 运行容器
docker run -p 3002:80 chatllm
```

## 📖 使用指南

### 基础对话

1. 在输入框中输入您的问题
2. 点击发送或按 `Ctrl+Enter` 发送消息
3. AI 将以流式方式返回响应

### 多分支对话

1. **编辑消息**：点击已发送消息旁的编辑图标，修改后发送将创建新分支
2. **重新生成**：点击 AI 回答旁的重新生成按钮，获得不同答案
3. **切换分支**：使用消息旁的分支切换按钮浏览不同对话路径

### 深度思考

- 支持 `reasoning_content` 的模型会显示推理过程
- 推理时长会自动计算并显示
- 可以折叠/展开推理内容区域

### 数据管理

1. **导出数据**：设置页面支持导出所有对话数据
2. **导入数据**：支持导入之前备份的数据文件
3. **格式转换**：可导入 Cherry Studio 导出的 JSON 文件

## 🏗 项目架构

```
src/
├── components/          # 可复用组件
│   ├── sender/         # 消息发送器
│   └── x-markdown/     # Markdown 渲染组件
├── views/              # 页面组件
│   ├── completions/    # 对话页面
│   └── settings/       # 设置页面
├── stores/             # Pinia 状态管理
│   ├── chat-rooms/     # 对话房间管理
│   └── api-settings/   # API 配置管理
├── hooks/              # 组合式函数
│   ├── use-sse/        # SSE 通信封装
│   └── use-completions/ # 对话逻辑
├── utils/              # 工具函数
│   └── data-backup.js  # 数据备份工具
└── styles/             # 样式文件
    ├── mixins.scss     # 全局 mixins
    └── element-plus/   # Element Plus 主题定制
```

## 🔧 开发指南

### 代码规范

项目使用 ESLint + Prettier + Stylelint 确保代码质量：

```bash
# 代码检查和修复
npm run lint

# 代码格式化
npm run format

# 样式检查和修复
npm run stylelint
```

### 提交规范

使用 Conventional Commits 规范：

```bash
# 使用 commitizen 提交
npm run commit

# 提交类型
feat: 新功能
fix: 修复问题
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

### 目录结构说明

- `components/` - 可复用的 Vue 组件
- `views/` - 页面级组件，配合路由使用
- `stores/` - Pinia 状态管理模块
- `hooks/` - Vue 3 Composition API 组合式函数
- `utils/` - 纯函数工具库
- `assets/` - 静态资源（图片、字体等）
- `styles/` - 全局样式文件

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐️**

</div>