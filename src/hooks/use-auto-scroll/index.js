/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-24
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-28
 * @FilePath     : /bi-agents/src/hooks/use-auto-scroll/index.js
 * @Description  : 自动滚动
 *
 */
import { ref, onMounted } from "vue";
import { useEventListener } from "@vueuse/core";

export const useAutoScroll = (scrollable) => {
  const isAutoScrollEnabled = ref(true);
  // 是否正在位置设置中;
  const isPositionSetting = ref(false);

  // 设置页面滚动位置, 滚动到最底部；
  const scrollToBottom = (force, delay = 200) => {
    console.log("scrollToBottom", force);
    if (!isAutoScrollEnabled.value || isPositionSetting.value) return;
    isPositionSetting.value = true;

    window.setTimeout(() => {
      if (isAutoScrollEnabled.value) {
        // 使用页面级滚动，滚动到页面底部
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        if (scrollHeight > clientHeight) {
          window.scrollTo({
            top: scrollHeight,
            behavior: force ? "auto" : "smooth",
          });
        }
      }
      isPositionSetting.value = false;
    }, delay);
  };

  const enableAutoScroll = () => {
    isAutoScrollEnabled.value = true;
  };

  // 鼠标滚动事件
  const handleWheel = () => {
    if (scrollable.value) {
      isAutoScrollEnabled.value = false;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;
      // 这里20px是经验值，根据实际情况调整
      if (scrollHeight - scrollTop - clientHeight <= 20) {
        isAutoScrollEnabled.value = true;
      }
    }
  };

  const handleScroll = () => {
    if (!isAutoScrollEnabled.value && scrollable.value) {
      // 滚动到底部时，设置isAutoScrollEnabled为true; 距离底部100px,认为到底了。
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;
      if (scrollHeight - scrollTop - clientHeight <= 100) {
        isAutoScrollEnabled.value = true;
      }
    }
  };

  onMounted(() => {
    // 监听页面级滚动事件
    useEventListener(window, "wheel", handleWheel);
    useEventListener(window, "scroll", handleScroll);
  });

  return {
    isAutoScrollEnabled,
    scrollToBottom,
    handleWheel,
    handleScroll,
    enableAutoScroll,
  };
};
