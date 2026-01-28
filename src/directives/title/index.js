import { useEventListener } from '@vueuse/core'

/*
 * 使用示例：
 *
 * 1. 基础字符串：
 *    v-title="'基础文本'"
 *
 * 2. 对象配置：
 *    v-title="{ title: '带关键词的文本', keyWord: ['关键词'], color: 'blue' }"
 *
 * 3. 普通函数：
 *    v-title="() => '动态返回的文本'"
 *
 * 4. 异步函数：
 *    v-title="async () => await api.getTitle()"
 *
 * 5. 带参数的函数：
 *    v-title="(el) => el.dataset.title"
 */

/**
 * 默认配置常量
 * 定义标题提示的默认行为参数
 */
const DEFAULT_CONFIG = {
  openDelay: 150, // 显示延迟时间（毫秒）
  closeDelay: 150, // 隐藏延迟时间（毫秒）
  timeGap: 500 // 快速显示时间间隔（毫秒）
}

/**
 * 标题管理器类
 * 负责管理自定义标题提示的创建、显示、隐藏和事件处理
 * 使用单例模式确保全局只有一个标题实例
 */
class TitleManager {
  constructor() {
    // 标题DOM元素
    this.titleElement = null
    // 当前激活的元素（鼠标悬停的元素）
    this.activeElement = null
    // 定时器管理
    this.timers = {
      open: null, // 显示标题的定时器
      close: null // 隐藏标题的定时器
    }
    // 上次关闭时间，用于快速显示判断
    this.lastCloseTime = 0
    // 鼠标按下状态标志
    this.isMouseDown = false
    // 初始化管理器
    this.init()
  }

  /**
   * 初始化标题管理器
   * 创建标题元素并绑定全局事件
   */
  init() {
    this.createTitleElement()
    this.bindGlobalEvents()
  }

  /**
   * 创建标题DOM元素
   * 创建用于显示标题的div元素并添加到页面中
   */
  createTitleElement() {
    this.titleElement = document.createElement('div')
    this.titleElement.className = 'xs-custom-title'
    document.body.appendChild(this.titleElement)
  }

  /**
   * 绑定全局事件
   * 为标题元素和文档绑定必要的事件监听器
   */
  bindGlobalEvents() {
    // 标题元素鼠标进入事件：取消关闭定时器
    useEventListener(this.titleElement, 'mouseenter', this.onTitleEnter.bind(this))
    // 标题元素鼠标离开事件：隐藏标题
    useEventListener(this.titleElement, 'mouseleave', this.onTitleLeave.bind(this))
    // 文档鼠标按下事件：设置鼠标按下状态
    useEventListener(document, 'mousedown', this.onMouseDown.bind(this))
    // 文档鼠标移动事件：检测鼠标按键状态
    useEventListener(document, 'mousemove', this.onMouseMove.bind(this))
  }

  // ===== 事件处理方法 =====

  /**
   * 标题元素鼠标进入事件处理
   * 取消关闭定时器，保持标题显示
   */
  onTitleEnter() {
    this.clearTimer('close')
  }

  /**
   * 标题元素鼠标离开事件处理
   * 隐藏标题提示
   */
  onTitleLeave() {
    this.hideTitle()
  }

  /**
   * 文档鼠标按下事件处理
   * 设置鼠标按下状态并立即隐藏标题
   */
  onMouseDown() {
    this.isMouseDown = true
    this.hideTitle(true)
  }

  /**
   * 文档鼠标移动事件处理
   * 检测鼠标按键状态，如果没有按下则重置状态
   * @param {MouseEvent} e - 鼠标事件对象
   */
  onMouseMove(e) {
    // 如果没有鼠标按键按下，重置按下状态
    if (!e.buttons) {
      this.isMouseDown = false
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
      clearTimeout(this.timers[type])
      this.timers[type] = null
    }
  }

  /**
   * 检查值是否为函数类型
   * 类型判断工具方法，用于配置解析
   * @param {any} value - 要检查的值
   * @returns {boolean} 是否为函数
   */
  isFunction(value) {
    return typeof value === 'function'
  }

  /**
   * 解析元素的标题配置
   * 支持字符串、函数、对象等多种配置格式，提供统一的配置接口
   * 异步处理函数配置，支持动态内容生成
   * @param {HTMLElement} el - DOM元素
   * @returns {Promise<Object|null>} 解析后的配置对象，失败时返回null
   */
  async resolveTitleConfig(el) {
    const config = el.titleConfig

    // 如果是字符串，返回标准对象格式
    if (typeof config === 'string') {
      return { title: config }
    }

    // 如果是函数，执行函数获取结果
    if (this.isFunction(config)) {
      try {
        const result = await config(el)

        // 处理返回值是字符串或对象的情况
        if (typeof result === 'string') {
          return { title: result }
        } else if (result && typeof result === 'object') {
          return result
        } else {
          return { title: String(result) }
        }
      } catch (error) {
        console.error('Error resolving title function:', error)
        return null
      }
    }

    // 如果是对象，直接使用
    if (config && typeof config === 'object') {
      return config
    }

    // 其他情况返回空对象
    return {}
  }

  /**
   * 获取元素的配置对象
   * 安全地获取元素配置，避免未定义错误
   * @param {HTMLElement} el - DOM元素
   * @returns {Object} 配置对象
   */
  getElementConfig(el) {
    return el.titleConfig || {}
  }

  /**
   * 判断是否应该快速显示标题
   * 基于时间间隔的智能显示优化，提升用户体验
   * @returns {boolean} 是否应该快速显示
   */
  shouldShowQuickOpen() {
    const now = Date.now()
    return now - this.lastCloseTime <= DEFAULT_CONFIG.timeGap
  }

  /**
   * 获取完整的配置选项
   * 合并默认配置和元素配置，确保配置完整性
   * @param {HTMLElement|null} el - DOM元素，可选
   * @returns {Promise<Object>} 完整的配置对象
   */
  async getConfig(el = null) {
    try {
      const config = el ? await this.resolveTitleConfig(el) : {}
      return { ...DEFAULT_CONFIG, ...config }
    } catch (error) {
      return DEFAULT_CONFIG
    }
  }

  // ===== 核心功能方法 =====

  /**
   * 显示标题提示
   * 核心功能方法，处理标题的显示逻辑，包括异步加载和错误处理
   * @param {MouseEvent} event - 鼠标事件对象，用于定位
   * @param {HTMLElement} el - DOM元素
   */
  async showTitle(event, el) {
    // 如果鼠标按下状态，不显示标题
    if (this.isMouseDown) return

    try {
      const config = await this.resolveTitleConfig(el)
      if (!config?.title) return

      // 高亮关键词，增强视觉效果
      const content = this.highlightKeywords(config.title, config.keyWord, config.color)

      // 添加加载状态：异步函数配置显示加载提示
      if (this.isFunction(el.titleConfig) && !config._loaded) {
        this.titleElement.innerHTML =
          '<span style="color: #999; font-style: italic;">加载中...</span>'
      } else {
        this.titleElement.innerHTML = content
      }

      // 定位并显示标题
      this.positionTitle(event)
    } catch (error) {
      console.error('Error showing title:', error)
      this.titleElement.innerHTML = '<span style="color: red;">加载失败</span>'
      this.positionTitle(event)
    }
  }

  /**
   * 隐藏标题提示
   * 支持立即隐藏和延迟隐藏两种模式，提供平滑的用户体验
   * @param {boolean} immediate - 是否立即隐藏，默认为false
   */
  hideTitle(immediate = false) {
    // 如果已经隐藏，直接返回
    if (this.titleElement.style.display === 'none') return

    // 清除显示定时器，防止冲突
    this.clearTimer('open')

    // 获取关闭延迟时间
    const closeDelay = immediate ? 0 : this.getConfig().closeDelay

    // 设置关闭定时器
    this.timers.close = setTimeout(() => {
      this.titleElement.style.display = 'none'
      this.lastCloseTime = Date.now()
    }, closeDelay || 0)
  }

  /**
   * 定位标题元素
   * 智能边界检测，确保标题始终在可视区域内显示
   * 支持鼠标跟随和边界自动调整
   * @param {MouseEvent} event - 鼠标事件对象
   */
  positionTitle(event) {
    const { x, y } = event
    const { offsetWidth: width, offsetHeight: height } = this.titleElement
    const { innerWidth: screenWidth, innerHeight: screenHeight } = window

    // 默认位置：鼠标右下角偏移10像素
    let left = x + 10
    let top = y + 10

    // 边界检测：防止超出屏幕右边界
    if (left + width > screenWidth) {
      left = screenWidth - width - 10
    }

    // 边界检测：防止超出屏幕底部边界
    if (top + height > screenHeight) {
      top = screenHeight - height - 10
    }

    // 应用定位样式
    Object.assign(this.titleElement.style, {
      left: `${left}px`,
      top: `${top}px`,
      display: 'block'
    })
  }

  /**
   * 高亮文本中的关键词
   * 支持多关键词高亮和自定义颜色，增强信息展示效果
   * 使用正则表达式进行安全的文本替换
   * @param {string} text - 原始文本
   * @param {Array<string>} keywords - 关键词数组
   * @param {string} color - 高亮颜色
   * @returns {string} 高亮处理后的HTML文本
   */
  highlightKeywords(text, keywords, color) {
    if (!Array.isArray(keywords) || !color) return text

    return keywords.reduce((result, keyword) => {
      // 转义正则表达式特殊字符，防止注入攻击
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      return result.replace(regex, `<span style="color: ${color}">${keyword}</span>`)
    }, text)
  }

  // ===== 事件处理方法 =====

  /**
   * 元素鼠标进入事件处理
   * 处理鼠标悬停显示标题的逻辑，包括延迟显示和快速显示优化
   * @param {HTMLElement} el - DOM元素
   * @param {MouseEvent} event - 鼠标事件对象
   */
  async onElementEnter(el, event) {
    // 如果元素没有标题配置，直接返回
    if (!el.titleConfig) return

    // 设置当前激活元素
    this.activeElement = el
    // 清除关闭定时器，防止冲突
    this.clearTimer('close')

    // 异步解析配置
    let config
    try {
      config = await this.resolveTitleConfig(el)
    } catch (error) {
      config = null
    }

    // 如果没有标题内容，直接返回
    if (!config?.title) return

    // 智能延迟：快速显示或正常延迟
    const delay = this.shouldShowQuickOpen() ? 200 : config.openDelay || DEFAULT_CONFIG.openDelay

    // 设置显示定时器
    this.timers.open = setTimeout(async () => {
      // 确保仍然是当前激活元素
      if (this.activeElement === el) {
        try {
          // 重新获取最新配置
          const latestConfig = await this.resolveTitleConfig(el)
          if (!latestConfig?.title) return

          // 高亮关键词并显示
          const content = this.highlightKeywords(
            latestConfig.title,
            latestConfig.keyWord,
            latestConfig.color
          )
          this.titleElement.innerHTML = content
          this.positionTitle(event)
        } catch (error) {
          console.error('Error showing delayed title:', error)
        }
      }
    }, delay)
  }

  /**
   * 元素鼠标离开事件处理
   * 清理激活状态并隐藏标题
   * @param {HTMLElement} el - DOM元素
   */
  onElementLeave(el) {
    // 如果不是当前激活元素，直接返回
    if (this.activeElement !== el) return

    // 清理激活状态
    this.activeElement = null
    // 隐藏标题
    this.hideTitle()
  }

  /**
   * 元素鼠标移动事件处理
   * 支持鼠标移动时显示标题，提供更灵活的交互体验
   * @param {HTMLElement} el - DOM元素
   * @param {MouseEvent} event - 鼠标事件对象
   */
  async onElementMouseMove(el, event) {
    // 如果鼠标按下或没有标题配置，不显示标题
    if (this.isMouseDown || !el.titleConfig) return

    // 清除之前的显示定时器
    this.clearTimer('open')

    // 异步解析配置
    let config
    try {
      config = await this.resolveTitleConfig(el)
    } catch (error) {
      config = null
    }

    // 如果没有标题内容，直接返回
    if (!config?.title) return

    // 获取显示延迟时间
    const delay = config.openDelay || DEFAULT_CONFIG.openDelay

    // 设置显示定时器
    this.timers.open = setTimeout(async () => {
      // 确保仍然是当前激活元素
      if (this.activeElement === el) {
        try {
          // 重新获取最新配置
          const latestConfig = await this.resolveTitleConfig(el)
          if (!latestConfig?.title) return

          // 高亮关键词并显示
          const content = this.highlightKeywords(
            latestConfig.title,
            latestConfig.keyWord,
            latestConfig.color
          )
          this.titleElement.innerHTML = content
          this.positionTitle(event)
        } catch (error) {
          console.error('Error showing mousemove title:', error)
        }
      }
    }, delay)
  }

  /**
   * 元素卸载事件处理
   * 组件卸载时清理资源，防止内存泄漏
   * @param {HTMLElement} el - DOM元素
   */
  onElementUnmount(el) {
    // 如果是当前激活元素，立即隐藏标题
    if (this.activeElement === el) {
      this.hideTitle(true)
    }
  }
}

// ===== 全局实例和指令注册 =====

/**
 * 全局单例标题管理器
 * 使用单例模式确保整个应用只有一个标题管理实例
 * 避免重复创建DOM元素和事件监听器
 */
const titleManager = new TitleManager()

/**
 * Vue指令定义
 * 注册v-title指令，提供灵活的标题提示功能
 * @param {import('vue').App} app - Vue应用实例
 */
export default app => {
  app.directive('title', {
    /**
     * 指令挂载时触发
     * 设置元素配置并绑定事件监听器
     * @param {HTMLElement} el - DOM元素
     * @param {Object} binding - 指令绑定对象
     */
    mounted(el, binding) {
      // 存储配置到元素属性
      el.titleConfig = binding.value

      // 绑定鼠标事件监听器
      useEventListener(el, 'mouseenter', e => titleManager.onElementEnter(el, e))
      useEventListener(el, 'mouseleave', () => titleManager.onElementLeave(el))
      useEventListener(el, 'mousemove', e => titleManager.onElementMouseMove(el, e))
    },

    /**
     * 指令更新时触发
     * 当绑定值发生变化时更新元素配置
     * @param {HTMLElement} el - DOM元素
     * @param {Object} binding - 指令绑定对象
     */
    updated(el, binding) {
      // 更新元素配置
      el.titleConfig = binding.value
    },

    /**
     * 指令卸载时触发
     * 清理资源，防止内存泄漏
     * @param {HTMLElement} el - DOM元素
     */
    unmounted(el) {
      // 调用管理器的卸载处理方法
      titleManager.onElementUnmount(el)
    }
  })
}
