/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-05
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-05
 * @FilePath     : /bi-agents/src/components/x-markdown-core/hooks/use-components.js
 * @Description  :
 *
 */
import { h } from "vue";
import { CodeX } from "../components/index";

function useComponents() {
  const components = {
    code: (raw) => h(CodeX, { raw }),
  };
  return components;
}

export { useComponents };
