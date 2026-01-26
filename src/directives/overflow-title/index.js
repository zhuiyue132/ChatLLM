import { useEventListener } from "@vueuse/core";

/*
 * 使用示例：
 *
 * 1. 基础字符串（文字溢出时显示）：
 *    v-overflow-title="'溢出时显示的文本'"
 *
 * 2. 对象配置：
 *    v-overflow-title="{ title: '带关键词的文本', keyWord: ['关键词'], color: 'blue' }"
 *
 * 3. 普通函数：
 *    v-overflow-title="() => '动态返回的文本'"
 *
 * 4. 异步函数：
 *    v-overflow-title="async () => await api.getTitle()"
 *
 * 5. 带参数的函数：
 *    v-overflow-title="(el) => el.textContent"
 *
 * 6. 自动使用元素文本内容（当检测到溢出时显示元素的文本内容）：
 *    v-overflow-title
 */

/**
 * 默认配置常量
 * 定义标题提示的默认行为参数
 */
const DEFAULT_CONFIG = {
  openDelay: 150, // 显示延迟时间（毫秒）
  closeDelay: 150, // 隐藏延迟时间（毫秒）
  timeGap: 500, // 快速显示时间间隔（毫秒）
  checkMultiline: true, // 是否检查多行文本溢出
};

/**
 * 溢出标题管理器类
 * 继承自普通标题管理器的功能，增加了文字溢出检测
 */
class OverflowTitleManager {
  constructor() {
    // 标题DOM元素
    this.titleElement = null;
    // 当前激活的元素（鼠标悬停的元素）
    this.activeElement = null;
    // 定时器管理
    this.timers = {
      open: null, // 显示标题的定时器
      close: null, // 隐藏标题的定时器
    };
    // 上次关闭时间，用于快速显示判断
    this.lastCloseTime = 0;
    // 鼠标按下状态标志
    this.isMouseDown = false;
    // 初始化管理器
    this.init();
  }

  /**
   * 初始化标题管理器
   * 创建标题元素并绑定全局事件
   */
  init() {
    this.createTitleElement();
    this.bindGlobalEvents();
  }

  /**
   * 创建标题DOM元素
   * 创建用于显示标题的div元素并添加到页面中
   */
  createTitleElement() {
    this.titleElement = document.createElement("div");
    this.titleElement.className = "xs-custom-overflow-title";
    document.body.appendChild(this.titleElement);
  }

  /**
   * 绑定全局事件
   * 为标题元素和文档绑定必要的事件监听器
   */
  bindGlobalEvents() {
    // 标题元素鼠标进入事件：取消关闭定时器
    useEventListener(
      this.titleElement,
      "mouseenter",
      this.onTitleEnter.bind(this),
    );
    // 标题元素鼠标离开事件：隐藏标题
    useEventListener(
      this.titleElement,
      "mouseleave",
      this.onTitleLeave.bind(this),
    );
    // 文档鼠标按下事件：设置鼠标按下状态
    useEventListener(document, "mousedown", this.onMouseDown.bind(this));
    // 文档鼠标移动事件：检测鼠标按键状态
    useEventListener(document, "mousemove", this.onMouseMove.bind(this));
  }

  // ===== 事件处理方法 =====

  /**
   * 标题元素鼠标进入事件处理
   * 取消关闭定时器，保持标题显示
   */
  onTitleEnter() {
    this.clearTimer("close");
  }

  /**
   * 标题元素鼠标离开事件处理
   * 隐藏标题提示
   */
  onTitleLeave() {
    this.hideTitle();
  }

  /**
   * 文档鼠标按下事件处理
   * 设置鼠标按下状态并立即隐藏标题
   */
  onMouseDown() {
    this.isMouseDown = true;
    this.hideTitle(true);
  }

  /**
   * 文档鼠标移动事件处理
   * 检测鼠标按键状态，如果没有按下则重置状态
   * @param {MouseEvent} e - 鼠标事件对象
   */
  onMouseMove(e) {
    // 如果没有鼠标按键按下，重置按下状态
    if (!e.buttons) {
      this.isMouseDown = false;
    }
  }

  // ===== 工具方法 =====

  /**
   * 清理指定类型的定时器
   * 防止内存泄漏，确保定时器被正确清除
   * @param {string} type - 定时器类型（'open' 或 'close'）
   */
  clearTimer(type) {
    if (this.timers[type]) {
      clearTimeout(this.timers[type]);
      this.timers[type] = null;
    }
  }

  /**
   * 检查值是否为函数类型
   * 类型判断工具方法，用于配置解析
   * @param {any} value - 要检查的值
   * @returns {boolean} 是否为函数
   */
  isFunction(value) {
    return typeof value === "function";
  }

  /**
   * 检测元素是否有文字溢出
   * 支持单行和多行文本溢出检测
   * @param {HTMLElement} el - DOM元素
   * @param {Object} config - 配置对象
   * @returns {boolean} 是否有文字溢出
   */
  hasTextOverflow(el, config = {}) {
    // 如果元素不可见，返回false
    if (!el.offsetWidth && !el.offsetHeight) {
      return false;
    }

    // 获取计算样式
    const computedStyle = window.getComputedStyle(el);
    const overflow = computedStyle.overflow;
    const overflowX = computedStyle.overflowX;
    const overflowY = computedStyle.overflowY;
    const textOverflow = computedStyle.textOverflow;
    const whiteSpace = computedStyle.whiteSpace;

    // 检查是否设置了文本溢出相关的CSS
    const hasOverflowHidden =
      overflow === "hidden" || overflowX === "hidden" || overflowY === "hidden";
    const hasTextOverflowEllipsis = textOverflow === "ellipsis";
    const isNoWrap = whiteSpace === "nowrap";

    // 如果没有设置溢出隐藏样式，且不是nowrap，可能需要检查自然溢出
    let hasOverflow = false;

    // 检查水平方向溢出（单行文本）
    if (el.scrollWidth > el.clientWidth) {
      hasOverflow = true;
    }

    // 检查垂直方向溢出（多行文本）
    if (config.checkMultiline !== false && el.scrollHeight > el.clientHeight) {
      hasOverflow = true;
    }

    // 如果设置了相关CSS样式，更精确地检测
    if (hasOverflowHidden || hasTextOverflowEllipsis || isNoWrap) {
      return hasOverflow;
    }

    // 对于没有明确设置溢出样式的元素，也检查是否有内容溢出
    return hasOverflow;
  }

  /**
   * 获取元素的文本内容
   * 优先获取textContent，如果没有则获取innerText
   * @param {HTMLElement} el - DOM元素
   * @returns {string} 元素文本内容
   */
  getElementText(el) {
    return el.textContent || el.innerText || "";
  }

  /**
   * 解析元素的标题配置
   * 支持字符串、函数、对象等多种配置格式
   * 如果没有配置值，自动使用元素的文本内容
   * @param {HTMLElement} el - DOM元素
   * @returns {Promise<Object|null>} 解析后的配置对象，失败时返回null
   */
  async resolveTitleConfig(el) {
    const config = el.overflowTitleConfig;

    // 如果没有配置，使用元素的文本内容
    if (config === undefined || config === null) {
      const text = this.getElementText(el);
      return text ? { title: text } : null;
    }

    // 如果是字符串，返回标准对象格式
    if (typeof config === "string") {
      return { title: config };
    }

    // 如果是函数，执行函数获取结果
    if (this.isFunction(config)) {
      try {
        const result = await config(el);

        // 处理返回值是字符串或对象的情况
        if (typeof result === "string") {
          return { title: result };
        } else if (result && typeof result === "object") {
          return result;
        } else {
          return { title: String(result) };
        }
      } catch (error) {
        console.error("Error resolving overflow title function:", error);
        // 降级为使用元素文本内容
        const text = this.getElementText(el);
        return text ? { title: text } : null;
      }
    }

    // 如果是对象，直接使用
    if (config && typeof config === "object") {
      return config;
    }

    // 其他情况返回元素文本内容
    const text = this.getElementText(el);
    return text ? { title: text } : null;
  }

  /**
   * 获取元素的配置对象
   * 安全地获取元素配置，避免未定义错误
   * @param {HTMLElement} el - DOM元素
   * @returns {Object} 配置对象
   */
  getElementConfig(el) {
    return el.overflowTitleConfig || {};
  }

  /**
   * 判断是否应该快速显示标题
   * 基于时间间隔的智能显示优化
   * @returns {boolean} 是否应该快速显示
   */
  shouldShowQuickOpen() {
    const now = Date.now();
    return now - this.lastCloseTime <= DEFAULT_CONFIG.timeGap;
  }

  /**
   * 获取完整的配置选项
   * 合并默认配置和元素配置，确保配置完整性
   * @param {HTMLElement|null} el - DOM元素，可选
   * @returns {Promise<Object>} 完整的配置对象
   */
  async getConfig(el = null) {
    try {
      const config = el ? await this.resolveTitleConfig(el) : {};
      return { ...DEFAULT_CONFIG, ...config };
    } catch (error) {
      return DEFAULT_CONFIG;
    }
  }

  // ===== 核心功能方法 =====

  /**
   * 显示标题提示（仅在有文字溢出时）
   * 核心功能方法，处理标题的显示逻辑
   * @param {MouseEvent} event - 鼠标事件对象，用于定位
   * @param {HTMLElement} el - DOM元素
   */
  async showTitle(event, el) {
    // 如果鼠标按下状态，不显示标题
    if (this.isMouseDown) return;

    try {
      const config = await this.resolveTitleConfig(el);
      if (!config?.title) return;

      // 检查是否有文字溢出，只有溢出时才显示
      if (!this.hasTextOverflow(el, config)) {
        return;
      }

      // 高亮关键词，增强视觉效果
      const content = this.highlightKeywords(
        config.title,
        config.keyWord,
        config.color,
      );

      // 添加加载状态：异步函数配置显示加载提示
      if (this.isFunction(el.overflowTitleConfig) && !config._loaded) {
        this.titleElement.innerHTML =
          '<span style="color: #999; font-style: italic;">加载中...</span>';
      } else {
        this.titleElement.innerHTML = content;
      }

      // 定位并显示标题
      this.positionTitle(event);
    } catch (error) {
      console.error("Error showing overflow title:", error);
      this.titleElement.innerHTML = '<span style="color: red;">加载失败</span>';
      this.positionTitle(event);
    }
  }

  /**
   * 隐藏标题提示
   * 支持立即隐藏和延迟隐藏两种模式
   * @param {boolean} immediate - 是否立即隐藏，默认为false
   */
  hideTitle(immediate = false) {
    // 如果已经隐藏，直接返回
    if (this.titleElement.style.display === "none") return;

    // 清除显示定时器，防止冲突
    this.clearTimer("open");

    // 获取关闭延迟时间
    const closeDelay = immediate ? 0 : DEFAULT_CONFIG.closeDelay;

    // 设置关闭定时器
    this.timers.close = setTimeout(() => {
      this.titleElement.style.display = "none";
      this.lastCloseTime = Date.now();
    }, closeDelay || 0);
  }

  /**
   * 定位标题元素
   * 智能边界检测，确保标题始终在可视区域内显示
   * @param {MouseEvent} event - 鼠标事件对象
   */
  positionTitle(event) {
    const { x, y } = event;
    const { offsetWidth: width, offsetHeight: height } = this.titleElement;
    const { innerWidth: screenWidth, innerHeight: screenHeight } = window;

    // 默认位置：鼠标右下角偏移10像素
    let left = x + 10;
    let top = y + 10;

    // 边界检测：防止超出屏幕右边界
    if (left + width > screenWidth) {
      left = screenWidth - width - 10;
    }

    // 边界检测：防止超出屏幕底部边界
    if (top + height > screenHeight) {
      top = screenHeight - height - 10;
    }

    // 应用定位样式
    Object.assign(this.titleElement.style, {
      left: `${left}px`,
      top: `${top}px`,
      display: "block",
    });
  }

  /**
   * 高亮文本中的关键词
   * 支持多关键词高亮和自定义颜色
   * @param {string} text - 原始文本
   * @param {Array<string>} keywords - 关键词数组
   * @param {string} color - 高亮颜色
   * @returns {string} 高亮处理后的HTML文本
   */
  highlightKeywords(text, keywords, color) {
    if (!Array.isArray(keywords) || !color) return text;

    return keywords.reduce((result, keyword) => {
      // 转义正则表达式特殊字符，防止注入攻击
      const regex = new RegExp(
        keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g",
      );
      return result.replace(
        regex,
        `<span style="color: ${color}">${keyword}</span>`,
      );
    }, text);
  }

  // ===== 事件处理方法 =====

  /**
   * 元素鼠标进入事件处理
   * 处理鼠标悬停显示标题的逻辑，只有在文字溢出时才显示
   * @param {HTMLElement} el - DOM元素
   * @param {MouseEvent} event - 鼠标事件对象
   */
  async onElementEnter(el, event) {
    // 设置当前激活元素
    this.activeElement = el;
    // 清除关闭定时器，防止冲突
    this.clearTimer("close");

    // 异步解析配置
    let config;
    try {
      config = await this.resolveTitleConfig(el);
    } catch (error) {
      config = null;
    }

    // 如果没有标题内容，隐藏当前tooltip并返回
    if (!config?.title) {
      this.hideTitle();
      return;
    }

    // 检查是否有文字溢出，只有溢出时才继续，否则隐藏tooltip
    if (!this.hasTextOverflow(el, config)) {
      this.hideTitle();
      return;
    }

    // 智能延迟：快速显示或正常延迟
    const delay = this.shouldShowQuickOpen()
      ? 200
      : config.openDelay || DEFAULT_CONFIG.openDelay;

    // 设置显示定时器
    this.timers.open = setTimeout(async () => {
      // 确保仍然是当前激活元素
      if (this.activeElement === el) {
        try {
          // 重新获取最新配置
          const latestConfig = await this.resolveTitleConfig(el);
          if (!latestConfig?.title) return;

          // 再次检查是否有文字溢出
          if (!this.hasTextOverflow(el, latestConfig)) {
            return;
          }

          // 高亮关键词并显示
          const content = this.highlightKeywords(
            latestConfig.title,
            latestConfig.keyWord,
            latestConfig.color,
          );
          this.titleElement.innerHTML = content;
          this.positionTitle(event);
        } catch (error) {
          console.error("Error showing delayed overflow title:", error);
        }
      }
    }, delay);
  }

  /**
   * 元素鼠标离开事件处理
   * 清理激活状态并隐藏标题
   * @param {HTMLElement} el - DOM元素
   */
  onElementLeave(el) {
    // 如果不是当前激活元素，直接返回
    if (this.activeElement !== el) return;

    // 清理激活状态
    this.activeElement = null;
    // 隐藏标题
    this.hideTitle();
  }

  /**
   * 元素鼠标移动事件处理
   * 支持鼠标移动时显示标题（仅在溢出时）
   * @param {HTMLElement} el - DOM元素
   * @param {MouseEvent} event - 鼠标事件对象
   */
  async onElementMouseMove(el, event) {
    // 如果鼠标按下，不显示标题
    if (this.isMouseDown) return;

    // 清除之前的显示定时器
    this.clearTimer("open");

    // 异步解析配置
    let config;
    try {
      config = await this.resolveTitleConfig(el);
    } catch (error) {
      config = null;
    }

    // 如果没有标题内容，隐藏当前tooltip并返回
    if (!config?.title) {
      this.hideTitle();
      return;
    }

    // 检查是否有文字溢出，只有溢出时才继续，否则隐藏tooltip
    if (!this.hasTextOverflow(el, config)) {
      this.hideTitle();
      return;
    }

    // 获取显示延迟时间
    const delay = config.openDelay || DEFAULT_CONFIG.openDelay;

    // 设置显示定时器
    this.timers.open = setTimeout(async () => {
      // 确保仍然是当前激活元素
      if (this.activeElement === el) {
        try {
          // 重新获取最新配置
          const latestConfig = await this.resolveTitleConfig(el);
          if (!latestConfig?.title) return;

          // 再次检查是否有文字溢出
          if (!this.hasTextOverflow(el, latestConfig)) {
            return;
          }

          // 高亮关键词并显示
          const content = this.highlightKeywords(
            latestConfig.title,
            latestConfig.keyWord,
            latestConfig.color,
          );
          this.titleElement.innerHTML = content;
          this.positionTitle(event);
        } catch (error) {
          console.error("Error showing mousemove overflow title:", error);
        }
      }
    }, delay);
  }

  /**
   * 元素卸载事件处理
   * 组件卸载时清理资源，防止内存泄漏
   * @param {HTMLElement} el - DOM元素
   */
  onElementUnmount(el) {
    // 如果是当前激活元素，立即隐藏标题
    if (this.activeElement === el) {
      this.hideTitle(true);
    }
  }
}

// ===== 全局实例和指令注册 =====

/**
 * 全局单例溢出标题管理器
 * 使用单例模式确保整个应用只有一个标题管理实例
 */
const overflowTitleManager = new OverflowTitleManager();

/**
 * Vue指令定义
 * 注册v-overflow-title指令，只在文字溢出时显示标题提示
 * @param {import('vue').App} app - Vue应用实例
 */
export default (app) => {
  app.directive("overflow-title", {
    /**
     * 指令挂载时触发
     * 设置元素配置并绑定事件监听器
     * @param {HTMLElement} el - DOM元素
     * @param {Object} binding - 指令绑定对象
     */
    mounted(el, binding) {
      // 存储配置到元素属性
      el.overflowTitleConfig = binding.value;

      // 绑定鼠标事件监听器
      useEventListener(el, "mouseenter", (e) =>
        overflowTitleManager.onElementEnter(el, e),
      );
      useEventListener(el, "mouseleave", () =>
        overflowTitleManager.onElementLeave(el),
      );
      useEventListener(el, "mousemove", (e) =>
        overflowTitleManager.onElementMouseMove(el, e),
      );
    },

    /**
     * 指令更新时触发
     * 当绑定值发生变化时更新元素配置
     * @param {HTMLElement} el - DOM元素
     * @param {Object} binding - 指令绑定对象
     */
    updated(el, binding) {
      // 更新元素配置
      el.overflowTitleConfig = binding.value;
    },

    /**
     * 指令卸载时触发
     * 清理资源，防止内存泄漏
     * @param {HTMLElement} el - DOM元素
     */
    unmounted(el) {
      // 调用管理器的卸载处理方法
      overflowTitleManager.onElementUnmount(el);
    },
  });
};
