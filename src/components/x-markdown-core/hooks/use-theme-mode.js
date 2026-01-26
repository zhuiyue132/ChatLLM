/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-05
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-05
 * @FilePath     : /bi-agents/src/components/x-markdown-core/hooks/use-theme-mode.js
 * @Description  :
 *
 */
import { onMounted, onUnmounted, ref } from "vue";

export function useDarkModeWatcher() {
  const isDark = ref(document.body.classList.contains("dark"));

  let observer;

  onMounted(() => {
    observer = new MutationObserver(() => {
      isDark.value = document.body.classList.contains("dark");
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"], // 只监听 class 变化
    });
  });

  onUnmounted(() => {
    observer && observer.disconnect();
  });

  return {
    isDark,
  };
}
