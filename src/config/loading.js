/*
 * @Author       : zhuiyue132
 * @Date         : 2025-09-04
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-09-10
 * @FilePath     : /bi-agents/src/config/loading.js
 * @Description  : Loading 指令默认配置
 */

export const CIRCLE_SVG_TEMPLATE = (size = 48) => {
  const style = `width: ${size}px; height: ${size}px`
  return `
    <foreignObject width="${size}" height="${size}" x="0" y="0">
      <div class="loading-circle big-size" style="${style}">
        <div class="loading-circle-round" style="${style}">
          <div class="loading-circle-grey" style="${style}"></div>
          <div class="loading-circle-blue" style="${style}"></div>
          <div class="loading-circle-line"></div>
        </div>
      </div>
    </foreignObject>
  `
}

export const LOADING_SIZES = {
  small: 32,
  medium: 48,
  large: 64
}

export const LOADING_THEMES = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    customClass: 'xs-global-loading xs-global-loading_circle'
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.7)',
    customClass: 'xs-global-loading xs-global-loading_circle loading-circle white'
  },
  transparent: {
    background: 'transparent',
    customClass: 'xs-global-loading xs-global-loading_circle'
  }
}
