/*
 * @Author       : zhuiyue132
 * @Date         : 2025-10-27
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-10-27
 * @FilePath     : /bi-agents/src/hooks/use-progress/index.js
 * @Description  : 进度条控制 Hook - 提供进度条显示、自动递增、完成/失败状态等完整生命周期控制
 */

import { ref, onBeforeUnmount } from 'vue'

/**
 * 进度条状态枚举
 * @property {string} IDLE - 空闲状态
 * @property {string} STARTING - 启动中
 * @property {string} RUNNING - 运行中
 * @property {string} COMPLETING - 完成中
 * @property {string} COMPLETED - 已完成
 * @property {string} FAILED - 失败
 * @property {string} CANCELLED - 已取消
 */
export const PROGRESS_STATE = {
  IDLE: 'idle',
  STARTING: 'starting',
  RUNNING: 'running',
  COMPLETING: 'completing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

/**
 * 进度条控制 Hook
 *
 * 特性：
 * - 支持延迟显示(避免快速操作时的闪烁)
 * - 自动递增模拟(提升用户体验)
 * - 最小展示时长(避免进度条一闪而过)
 * - 组件卸载自动清理
 *
 * @param {Object} options - 配置选项
 * @param {number} options.showDelay - 延迟展示时间(ms)，默认0
 * @param {number} options.minVisibleTime - 最小展示时长(ms)，默认1000
 * @param {number} options.autoStep - 自动递增步长，默认2
 * @param {number} options.autoMax - 自动递增最大值(避免直接到100%)，默认90
 * @param {number} options.autoInterval - 自动递增间隔(ms)，默认500
 * @param {number} options.completeDelay - 完成后停留时间(ms)，默认800
 * @param {Function} options.onStart - 启动回调
 * @param {Function} options.onUpdate - 进度更新回调
 * @param {Function} options.onComplete - 完成回调
 * @param {Function} options.onFail - 失败回调
 * @param {Function} options.onCancel - 取消回调
 * @returns {Object} 返回进度条管理相关的方法和状态
 */
export const useProgress = (options = {}) => {
  const {
    showDelay = 0,
    minVisibleTime = 1000,
    autoStep = 2,
    autoMax = 90,
    autoInterval = 500,
    completeDelay = 800,
    onStart,
    onUpdate,
    onComplete,
    onFail,
    onCancel
  } = options

  // ========== 响应式状态 ==========

  // 进度值(0-100)
  const progressValue = ref(0)

  // 是否显示进度条
  const progressVisible = ref(false)

  // 进度条状态
  const progressState = ref(PROGRESS_STATE.IDLE)

  // 是否正在运行
  const isRunning = ref(false)

  // 是否已完成
  const isCompleted = ref(false)

  // 是否失败
  const isFailed = ref(false)

  // ========== 定时器引用 ==========

  // 自动递增定时器
  const autoTimer = ref(null)

  // 延迟显示定时器
  const delayTimer = ref(null)

  // 完成延迟定时器
  const completeTimer = ref(null)

  // ========== 时间记录 ==========

  // 进度条开始时间(用于计算最小展示时长)
  const startTime = ref(0)

  // 自动递增是否运行中
  const isAutoRunning = ref(false)

  // ========== 内部工具函数 ==========

  /**
   * 安全的延迟函数
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  const sleep = ms =>
    new Promise(resolve => {
      const timer = setTimeout(resolve, ms)
      // 避免内存泄漏
      if (progressState.value === PROGRESS_STATE.CANCELLED) {
        clearTimeout(timer)
      }
    })

  /**
   * 清理所有定时器
   * - 自动递增定时器
   * - 延迟显示定时器
   * - 完成延迟定时器
   */
  const clearTimers = () => {
    if (autoTimer.value) {
      clearInterval(autoTimer.value)
      autoTimer.value = null
    }
    if (delayTimer.value) {
      clearTimeout(delayTimer.value)
      delayTimer.value = null
    }
    if (completeTimer.value) {
      clearTimeout(completeTimer.value)
      completeTimer.value = null
    }
    isAutoRunning.value = false
  }

  /**
   * 更新进度值（带校验）
   * @param {number} value - 进度值
   */
  const setProgressValue = value => {
    const safeValue = Math.max(0, Math.min(100, Math.round(value)))
    if (progressValue.value !== safeValue) {
      progressValue.value = safeValue
      if (onUpdate) {
        onUpdate(safeValue)
      }
    }
  }

  /**
   * 更新状态
   * @param {string} newState - 新状态
   */
  const setState = newState => {
    if (progressState.value !== newState) {
      progressState.value = newState

      // 更新衍生的布尔状态
      isRunning.value = [
        PROGRESS_STATE.STARTING,
        PROGRESS_STATE.RUNNING,
        PROGRESS_STATE.COMPLETING
      ].includes(newState)

      isCompleted.value = newState === PROGRESS_STATE.COMPLETED
      isFailed.value = newState === PROGRESS_STATE.FAILED
    }
  }

  // ========== 公开的方法 ==========

  /**
   * 启动进度条
   * - 重置进度为初始值
   * - 清理现有定时器
   * - 延迟 showDelay 毫秒后显示进度条
   *
   * @param {number} initialValue - 初始进度值，默认10
   */
  const startProgress = (initialValue = 10) => {
    // 防止重复启动
    if (isRunning.value) {
      console.warn('[useProgress] 进度条已在运行中')
      return
    }

    resetProgress()
    setState(PROGRESS_STATE.STARTING)
    setProgressValue(initialValue)

    if (onStart) {
      onStart()
    }

    if (showDelay > 0) {
      delayTimer.value = setTimeout(() => {
        if (progressState.value === PROGRESS_STATE.STARTING) {
          progressVisible.value = true
          startTime.value = Date.now()
          setState(PROGRESS_STATE.RUNNING)
        }
      }, showDelay)
    } else {
      progressVisible.value = true
      startTime.value = Date.now()
      setState(PROGRESS_STATE.RUNNING)
    }
  }

  /**
   * 手动更新进度
   * @param {number} value - 进度值(0-100)
   */
  const updateProgress = value => {
    if (!isRunning.value && progressState.value !== PROGRESS_STATE.COMPLETED) {
      console.warn('[useProgress] 无法更新进度：进度条未运行')
      return
    }
    setProgressValue(value)
  }

  /**
   * 启动自动递增模拟
   * - 用于长时间操作时提供进度反馈
   * - 递增到 autoMax (90%) 后停止
   * - 避免直接到100%显得不真实
   */
  const startAutoProgress = () => {
    if (isAutoRunning.value) {
      return
    }

    if (!isRunning.value) {
      console.warn('[useProgress] 无法启动自动递增：进度条未启动')
      return
    }

    isAutoRunning.value = true

    autoTimer.value = setInterval(() => {
      if (progressState.value === PROGRESS_STATE.RUNNING && progressValue.value < autoMax) {
        setProgressValue(progressValue.value + autoStep)
      } else {
        stopAutoProgress()
      }
    }, autoInterval)
  }

  /**
   * 停止自动递增
   * - 清理自动递增定时器
   */
  const stopAutoProgress = () => {
    if (autoTimer.value) {
      clearInterval(autoTimer.value)
      autoTimer.value = null
    }
    isAutoRunning.value = false
  }

  /**
   * 完成进度条
   * - 停止自动递增
   * - 设置进度为100%
   * - 确保满足最小展示时长
   * - 100%状态停留 completeDelay 毫秒后关闭
   *
   * @returns {Promise<void>}
   */
  const completeProgress = async () => {
    if (!isRunning.value && progressState.value !== PROGRESS_STATE.RUNNING) {
      console.warn('[useProgress] 无法完成进度：进度条未运行')
      return
    }

    setState(PROGRESS_STATE.COMPLETING)
    stopAutoProgress()
    setProgressValue(100)

    const elapsed = Date.now() - startTime.value
    const delayToSatisfyMinVisible = Math.max(0, minVisibleTime - elapsed)

    try {
      // 等待最小展示时长
      if (delayToSatisfyMinVisible > 0) {
        await sleep(delayToSatisfyMinVisible)
      }

      // 完成后停留时间
      if (completeDelay > 0) {
        await sleep(completeDelay)
      }

      if (progressState.value === PROGRESS_STATE.COMPLETING) {
        setState(PROGRESS_STATE.COMPLETED)
        if (onComplete) {
          onComplete()
        }

        // 延迟隐藏，给用户视觉反馈
        setTimeout(() => {
          if (progressState.value === PROGRESS_STATE.COMPLETED) {
            resetProgress()
          }
        }, 100)
      }
    } catch (error) {
      // 被取消或其他异常
      console.debug('[useProgress] 进度完成被中断:', error)
    }
  }

  /**
   * 进度失败/中断处理
   * - 停止自动递增
   * - 延迟重置，给用户看到失败状态
   *
   * @param {Error} error - 错误对象（可选）
   */
  const failProgress = error => {
    setState(PROGRESS_STATE.FAILED)
    stopAutoProgress()

    if (onFail) {
      onFail(error)
    }

    // 延迟重置，给用户看到失败状态
    setTimeout(() => {
      if (progressState.value === PROGRESS_STATE.FAILED) {
        resetProgress()
      }
    }, 1000)
  }

  /**
   * 取消进度
   * - 立即停止所有操作
   * - 清理定时器
   * - 重置状态
   */
  const cancelProgress = () => {
    setState(PROGRESS_STATE.CANCELLED)
    clearTimers()

    if (onCancel) {
      onCancel()
    }

    resetProgress()
  }

  /**
   * 重置进度条状态
   * - 进度归零
   * - 隐藏进度条
   * - 清理所有定时器
   */
  const resetProgress = () => {
    setProgressValue(0)
    progressVisible.value = false
    setState(PROGRESS_STATE.IDLE)
    clearTimers()
  }

  // 组件卸载时清理
  onBeforeUnmount(() => {
    clearTimers()
  })

  /**
   * 返回的进度条管理接口
   * @property {import('vue').Ref<number>} progressValue - 进度值(0-100)
   * @property {import('vue').Ref<boolean>} progressVisible - 是否显示进度条
   * @property {import('vue').Ref<string>} progressState - 进度条状态
   * @property {import('vue').Ref<boolean>} isRunning - 是否正在运行
   * @property {import('vue').Ref<boolean>} isCompleted - 是否已完成
   * @property {import('vue').Ref<boolean>} isFailed - 是否失败
   * @property {Function} startProgress - 启动进度条
   * @property {Function} updateProgress - 更新进度
   * @property {Function} startAutoProgress - 启动自动递增
   * @property {Function} stopAutoProgress - 停止自动递增
   * @property {Function} completeProgress - 完成进度条
   * @property {Function} failProgress - 失败处理
   * @property {Function} cancelProgress - 取消进度
   * @property {Function} resetProgress - 重置进度条
   */
  return {
    progressValue,
    progressVisible,
    progressState,
    isRunning,
    isCompleted,
    isFailed,
    startProgress,
    updateProgress,
    startAutoProgress,
    stopAutoProgress,
    completeProgress,
    failProgress,
    cancelProgress,
    resetProgress
  }
}
