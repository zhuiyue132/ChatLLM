/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-22
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-28
 * @FilePath     : /ChatLLM/src/hooks/use-sse/index.js
 * @Description  : SSE（Server-Sent Events）请求钩子，基于 @microsoft/fetch-event-source
 */

import { ref, onUnmounted, onMounted } from "vue";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import qs from "qs";
import { showMessage } from "../use-message";
import { uuid as getUuid } from "@/utils/random";

// 导出 OpenAI SSE hook
export * from "./use-openai-sse";

/**
 * SSE 连接状态
 */
export const SSEStatus = {
  CONNECTING: "connecting", // 正在连接
  OPEN: "open", // 已连接
  CLOSED: "closed", // 已关闭
  ERROR: "error", // 连接错误
};

/**
 * SSE 请求钩子
 * @param {Object} options 配置项
 * @param {string} options.url SSE 请求地址，需要是完整的 URL
 * @param {Function} options.onMessage 消息回调函数，参数为 EventSourceMessage 对象
 * @param {Function} options.onOpen 连接成功回调函数
 * @param {Function} options.onClose 连接关闭回调函数
 * @param {Function} options.onError 连接错误回调函数，参数为错误对象
 * @param {Object} options.headers 自定义请求头
 * @param {boolean} options.autoConnect 是否自动连接，默认为 false
 * @param {Object} options.fetchOptions 自定义 fetch 选项
 * @param {Function} options.customFetch 自定义 fetch 函数，用于替代默认的 fetch
 * @param {string} options.openWhen 控制何时打开连接的响应式变量，当其值为真时建立连接
 * @returns {Object} SSE 控制对象
 * @returns {Function} SSE 控制对象.connect 手动连接方法
 * @returns {Function} SSE 控制对象.disconnect 手动断开方法
 * @returns {Ref<string>} SSE 控制对象.status 连接状态，值为 SSEStatus 中的一种
 * @returns {Ref<Error|null>} SSE 控制对象.error 错误对象，连接正常时为 null
 */
export const useSSE = (options) => {
  const {
    url,
    onMessage = () => {},
    onOpen = () => {},
    onClose = () => {},
    onError = () => {},

    autoConnect = false,
    fetchOptions = {},
    openWhen = true,
    ignoreUUID = false,
  } = options;

  // 当前连接状态
  const status = ref(SSEStatus.CLOSED);
  // 错误对象
  const error = ref(null);
  // 控制器，用于手动断开连接
  let controller = new AbortController();
  // 是否手动断开
  let manuallyDisconnected = false;

  const uuid = ref(null);

  /**
   * 连接到 SSE 源
   */
  const connect = async (requestBody) => {
    if (
      status.value === SSEStatus.CONNECTING ||
      status.value === SSEStatus.OPEN
    ) {
      return;
    }

    // 重置状态
    error.value = null;
    manuallyDisconnected = false;
    status.value = SSEStatus.CONNECTING;

    try {
      uuid.value = getUuid();
      await fetchEventSource(url, {
        ...fetchOptions,
        fetch: (url) =>
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: qs.stringify({ ...requestBody, uniqId: uuid.value }),
            // 带入 cookie
            credentials: "include",
            mode: "cors",
          }).then(async (response) => {
            // 检查响应头，如果不是SSE流，则按普通JSON处理
            const contentType = response.headers.get("Content-Type");
            if (contentType && !contentType.includes("text/event-stream")) {
              // 如果不是 SSE，则作为普通 JSON 处理
              const data = await response.json();
              if (data.code !== 0) {
                showMessage(data.content, { type: "error" });
                onError(data);
              }
            }
            return response;
          }),
        openWhenHidden: true,
        signal: controller.signal,
        onopen: async (response) => {
          if (response.ok && response.status === 200) {
            status.value = SSEStatus.OPEN;
            onOpen(response);
          } else {
            throw new Error(
              `Failed to connect: ${response.status} ${response.statusText}`,
            );
          }
        },
        onmessage: (event) => {
          // 如果手动断开或连接已关闭，则不处理消息
          // console.log('manuallyDisconnected', manuallyDisconnected)
          // console.log('status.value', status.value)
          // console.log('uuid.value', uuid.value)
          // console.log('event', event)
          if (manuallyDisconnected || status.value === SSEStatus.CLOSED) {
            return;
          }

          try {
            const data = JSON.parse(event.data || "{}");
            if (data.code === 0) {
              // 请求成功，判断UUID是否一致
              const { uniqId: responseUuid, reqId, title } = data.data;
              if (
                ignoreUUID ||
                responseUuid === uuid.value ||
                reqId === uuid.value ||
                title
              ) {
                onMessage(event);
              }
            } else if ([-1, -7, 9901].includes(data.code)) {
              const messageCodeMap = {
                "-1": "登录已过期，请重新登录",
                "-7": "该账号已在其他设备登录",
                9901: "该账号已被禁用，请联系管理员",
              };

              showMessage(messageCodeMap[data.code] || "请求出错", {
                type: "error",
              });
            } else {
              // 请求失败，直接处理消息
              return Promise.reject(event);
            }
          } catch (error) {
            console.error("SSE message processing error:", error);
            return Promise.reject(event);
          }
        },
        onclose: () => {
          // 只有当不是手动断开时，才尝试重连
          if (!manuallyDisconnected) {
            status.value = SSEStatus.CLOSED;
            onClose();
          }
          return false;
        },
        onerror: (err) => {
          // 如果是手动断开，不处理错误
          if (manuallyDisconnected) {
            return;
          }

          status.value = SSEStatus.ERROR;
          error.value = err;
          onError(err);

          throw err;
        },
      });
    } catch (err) {
      if (!manuallyDisconnected) {
        status.value = SSEStatus.ERROR;
        error.value = err;
        onError(err);
      }
    }
  };

  /**
   * 断开 SSE 连接
   */
  const disconnect = async (taskId) => {
    if (controller) {
      manuallyDisconnected = true;
      controller.abort();
      controller = new AbortController();
      status.value = SSEStatus.CLOSED;
    }
  };

  // 自动连接
  onMounted(() => {
    if (autoConnect && openWhen) {
      connect();
    }
  });

  // 组件卸载时自动断开连接
  onUnmounted(() => {
    disconnect();
  });

  return {
    status,
    error,
    connect,
    disconnect,
  };
};

export default useSSE;
