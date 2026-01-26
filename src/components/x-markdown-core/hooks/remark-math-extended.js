/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-10
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-12-10
 * @FilePath     : /bi-agents/src/components/x-markdown-core/hooks/remark-math-extended.js
 * @Description  : 扩展数学公式格式支持
 *
 */

import { visit } from "unist-util-visit";

/**
 * 预处理函数：在 markdown 解析之前转换公式格式
 *
 * 必须在 parse 之前运行，因为 `\(` `\)` `\[` `\]` 中的反斜杠
 * 会在 markdown 解析过程中被当作转义字符处理掉
 *
 * 支持的格式：
 * - \[formula\] -> $$\nformula\n$$ (块级公式，LaTeX 标准格式)
 * - \(formula\) -> $formula$ (行内公式，LaTeX 标准格式)
 *
 * 注意：对于块级公式，$$ 必须独占一行，否则 remark-math 会错误解析
 * （把 $$内容 当作类似 ```language 的语法，第一行被当作 meta）
 *
 * @param {string} markdown - 原始 markdown 字符串
 * @returns {string} - 转换后的 markdown 字符串
 */
export function preprocessMathFormulas(markdown) {
  if (!markdown || typeof markdown !== "string") {
    return markdown;
  }

  let result = markdown;

  // 1. 转换 \[...\] 为 $$...$$ (块级公式)
  // 重要：
  // - $$ 必须独占一行，否则 remark-math 会错误解析多行公式
  // - 开头和结尾的 $$ 缩进必须一致，否则 remark-math 无法正确匹配
  // - 保留原始缩进，以支持列表项内的公式
  result = result.replace(
    /([ \t]*)\\\[([\s\S]*?)\\\]/g,
    (_, indent, formula) => {
      const trimmed = formula.trim();
      // 保持开头和结尾 $$ 的缩进一致
      return `\n${indent}$$\n${indent}${trimmed}\n${indent}$$\n`;
    },
  );

  // 2. 转换 \(...\) 为 $...$ (行内公式)
  // 行内公式通常不跨行，使用 .*? 即可
  result = result.replace(
    /\\\((.*?)\\\)/g,
    (_, formula) => `$${formula.trim()}$`,
  );

  return result;
}

/**
 * remark 插件：处理 [...] 格式的块级公式
 *
 * 注意：\(...\) 和 \[...\] 格式必须由 preprocessMathFormulas 在 parse 前处理，
 * 因为反斜杠会被 markdown 解析器当作转义字符消耗掉。
 *
 * 此插件仅处理：
 * - [formula] -> $$formula$$ (独立行的方括号块级公式)
 */
export default function remarkMathExtended() {
  return (tree) => {
    // 处理独立行的 [...] 格式
    visit(tree, "text", (node) => {
      if (!node.value) return;

      const beforeBracket = node.value;
      const newValue = node.value.replace(
        /(?:^|\n)\s*\[\s*([\s\S]*?)\s*\](?:\s*$|\n)/g,
        (match, formula, offset) => {
          const beforeText = beforeBracket.slice(0, offset);
          const isStartOfLine =
            beforeText.length === 0 || beforeText.endsWith("\n");

          if (isStartOfLine) {
            return `\n$$${formula.trim()}$$\n`;
          }
          return match;
        },
      );

      if (newValue !== beforeBracket) {
        node.value = newValue;
      }
    });

    // 处理段落节点中的数学公式
    visit(tree, "paragraph", (node) => {
      if (!node.children || node.children.length === 0) return;

      // 检查段落是否只包含一个文本节点，且该文本以 [ 开头
      if (node.children.length === 1 && node.children[0].type === "text") {
        const text = node.children[0].value;
        const trimmed = text.trim();

        // 如果整个段落是 [...] 格式，转换为块级公式
        const fullBracketRegex = /^\[\s*([\s\S]*?)\s*\]$/;
        const match = trimmed.match(fullBracketRegex);

        if (match) {
          node.children[0].value = `$$${match[1].trim()}$$`;
        }
      }
    });
  };
}
