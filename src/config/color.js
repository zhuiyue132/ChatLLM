/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-17
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/config/color.js
 * @Description  : 颜色配置
 *
 */

// 基础10色
/**
 * 折线图颜色顺序
 * @type {string[]}
 */
export const base10Colors = [
  '#4684F4',
  '#FFA500',
  '#38D39F',
  '#F1BD2F',
  '#5DCDF5',
  '#6558F7',
  '#EE5E46',
  '#5061BA',
  '#F78C36',
  '#007B79',
  '#F780AA',
  '#F3F6FF'
]

// 拓展10色
/**
 * 折线图颜色顺序
 * @type {string[]}
 */
export const extend10Colors = [
  '#D5E8FF',
  '#FFE2AD',
  '#D4FAED',
  '#FFF1D1',
  '#DAF5FE',
  '#E2DCFF',
  '#FFDCD5',
  '#E0E6FF',
  '#FFE4CC',
  '#C6EDEE',
  '#FFDCEA'
]

// 基础6色
/**
 * @deprecated
 * @type {string[]}
 */
export const base6Colors = [
  '#4684F4',
  '#38D39F',
  '#5061BA',
  '#EE5E46',
  '#F1BD2F',
  '#F780AA',
  '#F3F6FF'
]

// 拓展6色
/**
 * @deprecated
 * @type {string[]}
 */
export const extend6Colors = [
  '#D4E8FF',
  '#D4FAED',
  '#E0E6FF',
  '#FFDCD5',
  '#FFF1D1',
  '#FFDCEA',
  '#F3F6FF'
]

// 顺序色
/**
 * @deprecated
 * @type {string[]}
 */
export const sequenceColors = [
  '#2F6CF6',
  '#4E82F7',
  '#789FF9',
  '#A1BDFB',
  '#A1BDFB',
  '#E0E9FE',
  '#F3F6FF'
]

/**
 * 饼图、柱图色表
 * @type {string[]}
 */
export const BAR_BASE_COLOR = base10Colors.filter((item, index) => index !== 1)

/**
 * 饼图、柱图扩展色色表
 * @type {string[]}
 */
export const BAR_EXTEND_COLOR = extend10Colors.filter((item, index) => index !== 1)

/**
 * 图中只有一个bar时 bar的颜色
 * @type {string}
 */
export const SINGLE_BAR_COLOR = base10Colors[0]

/**
 * 线柱组合中 线的颜色
 * @type {string}
 */
export const LINE_COLOR_IN_LINE_BAR = base10Colors[1]

/**
 *
 * @type {{lineStyle: {color: string, type: string}, show: boolean}}
 */
export const CHART_SPLIT_LINE_STYLE = {
  show: true,
  lineStyle: {
    type: 'dashed',
    color: 'rgba(240, 240, 240, .65)'
  }
}

/**
 * echarts图图例size
 * @type {{bar: {itemHeight: number, itemWidth: number}, line: {itemHeight: number, itemWidth: number}}}
 */
export const CHART_LEGEND_SIZE = {
  line: {
    itemWidth: 22,
    itemHeight: 10
  },
  bar: {
    itemWidth: 10,
    itemHeight: 10
  }
}

/**
 * x轴刻度与刻线剧中
 * @type {{axisTick: {alignWithLabel: boolean}}}
 */
export const COMMON_AXIS_TICK = {
  axisTick: {
    alignWithLabel: true
  }
}

/**
 * 表格中分组的颜色配置
 */
export const tableGroupColors = [
  {
    // 主题色
    color: '#339EFF',
    // 主题色的hover颜色
    hoverColor: '#006cdb',
    // 表格单元格的背景色
    bgColor: '#F5FBFF'
  },
  { color: '#FF7000', hoverColor: '#B83E00', bgColor: '#FFFAF3' },
  { color: '#2AD09D', hoverColor: '#00A377', bgColor: '#F7FFFC' },
  { color: '#FFC700', hoverColor: '#D59B00', bgColor: '#FFFEF3' },
  { color: '#7657EF', hoverColor: '#4A23C7', bgColor: '#F8F7FF' },
  { color: '#2E6CF4', hoverColor: '#1840AF', bgColor: '#F2F8FF' },
  { color: '#3EC832', hoverColor: '#268620', bgColor: '#F5FBF5' },
  { color: '#FFFF00', hoverColor: '#D9D900', bgColor: '#FFFFF1' },
  { color: '#FF389B', hoverColor: '#B8006E', bgColor: '#FFF9FB' },
  { color: '#43CAD6', hoverColor: '#29838D', bgColor: '#F4FFFE' },
  { color: '#BAE637', hoverColor: '#7CB305', bgColor: '#FCFFE6' },
  { color: '#9F1BD0', hoverColor: '#7D11AC', bgColor: '#F0CBF6' },
  { color: '#FF7875', hoverColor: '#CF1322', bgColor: '#FFF1F0' }
]

/**
 * 平台品牌色
 * @type {string[]}
 */
export const platformBrandColors = {
  TX: '#FF5000', // 淘宝天猫
  XHS: '#FF0035', // 小红书
  RZBJ: '#007E54', // 认知边界
  PDD: '#D81E06', // 拼多多
  DY: '#170B1A' // 抖音
}
