# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

ChatLLM 是一个基于 Vue 3 的 AI 对话应用，支持多模型对话、深度思考、图片生成等功能。使用 SSE (Server-Sent Events) 实现流式对话响应。

## 常用命令

```bash
# 开发（用户会自行启动，不要主动启动）
npm run dev

# 构建
npm run build

# 代码检查
npm run lint

# 代码格式化
npm run format

# 样式检查
npm run stylelint

# 提交代码（使用 commitizen）
npm run commit
```

## 技术栈

- **框架**: Vue 3 + Vite 7
- **状态管理**: Pinia (带持久化插件)
- **UI 组件**: Element Plus (SCSS 主题定制)
- **路由**: Vue Router 4
- **样式**: SCSS + Element Plus 主题覆盖
- **Markdown 渲染**: unified/remark/rehype 生态 + KaTeX + Mermaid

## 架构概览

### 目录结构

```
src/
├── api/           # API 请求模块
├── components/    # 通用组件
├── config/        # 应用配置
├── directives/    # 自定义指令 (v-title, v-xs-loading, v-overflow-title)
├── hooks/         # 组合式函数
├── layouts/       # 布局组件
├── stores/        # Pinia 状态管理
├── styles/        # 全局样式和 Element Plus 主题覆盖
├── utils/         # 工具函数
└── views/         # 页面视图
```

### 核心模块

**SSE 通信 (`src/hooks/use-sse/index.js`)**
- 基于 `@microsoft/fetch-event-source` 封装
- 支持自动重连、手动断开、状态管理
- 通过 UUID 匹配请求和响应

**对话管理 (`src/views/completions/hooks/use-completions.js`)**
- 树形结构存储对话历史，支持多分支对话
- 通过 `currentIndex` 在不同分支间切换
- 支持消息编辑、重新生成、分页浏览

**Markdown 渲染 (`src/components/x-markdown-core/`)**
- 支持同步和异步渲染模式
- 内置 Mermaid 图表、KaTeX 数学公式支持
- 可通过 `codeXRender` 自定义代码块渲染

### 路径别名

- `@` → `src/`
- `@img` → `src/assets/images/`

### 样式约定

- 全局 SCSS mixins: `src/styles/mixins.scss`
- Element Plus 主题覆盖: `src/styles/element-plus/`
- 组件样式使用 `<style lang="scss" scoped>`

## 提交规范

使用 cz-git 进行规范化提交，支持的类型：
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档变更
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `chore`: 构建/工具变动

## 环境变量

环境变量文件位于 `./env` 目录，通过 `import.meta.env` 访问：
- `VITE_APP_WEB_URL`: API 基础地址
