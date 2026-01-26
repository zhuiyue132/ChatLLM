/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-05
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-11-10
 * @FilePath     : /bi-agents/src/components/x-markdown-core/main.js
 * @Description  : x-markdown-core 主入口文件
 *
 */

export { MarkdownRenderer, MarkdownRendererAsync } from "./render";
export { VueMarkdown, VueMarkdownAsync } from "./core";
export {
  MarkdownProvider,
  useMarkdownContext,
} from "./components/markdown-provider";
export { CodeX, Mermaid } from "./components";

export * from "./core";
export * from "./render";
export * from "./hooks";

export const version = "1.0.0";
