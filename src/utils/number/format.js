import dayjs from 'dayjs'

// 空值展示
export const EMPTY_VALUE = '--'

// 已知的空值列表，-1为空的需另行判断
export const emptyList = [null, undefined, '', ' ', '-', '--', NaN]

// 判断是否是空值
export const isEmpty = val => emptyList.includes(val)

// 判断是否是可计算的类型
export const checkCalculateType = val => ['string', 'number'].includes(typeof val)

// 判断参数是否可参与计算
export const checkNumberValid = val => {
  if (!checkCalculateType(val) || isEmpty(val)) return false
  return !isNaN(+val)
}

/**
 * @description 格式化数字显示千分符，保留原有的小数
 * @param number：要格式化的数字
 * @param unite: 是否转换单位
 */
export const formatNumber = (number, unite = Boolean()) => {
  if (isEmpty(number)) return EMPTY_VALUE // 检查number是否为空，如果为空，返回EMPTY_VALUE
  if (!checkNumberValid(number)) return number // 检查number是否合法，如果不合法，直接返回number

  if (unite) {
    return setUnite(number) // 如果unite为true，调用setUnite(number)处理数字
  } else {
    const DIGIT_PATTERN = /(^|\s)\d+(?=\.?\d*($|\s))/g // 匹配整数部分的数字
    const MILLI_PATTERN = /(?=(?!\b)(\d{3})+$)/g // 用于在每三个数字之间插入逗号

    let isNegative = false
    let n = number

    if (String(number).slice(0, 1) === '-') {
      // 检查number是否为负数
      n = String(number).slice(1) // 去掉负号
      isNegative = true
    }

    let ret = String(n).replace(
      DIGIT_PATTERN,
      m => m.replace(MILLI_PATTERN, ',') // 插入千分位逗号
    )

    if (isNegative && Number(ret) !== 0) return `-${ret}` // 如果是负数，添加负号
    return ret // 返回格式化后的数字
  }
}

/**
 * @description 格式化数字显示千分符，显示 2 位小数点
 * @param number：要格式化的数字
 * @param unite: 是否转换单位
 */
export const formatNumberWithDigits = (number, unite = Boolean(), needFixed = true) => {
  if (isEmpty(number)) return EMPTY_VALUE
  if (!checkNumberValid(number)) return number

  if (unite) {
    return setUnite(number)
  } else {
    return needFixed
      ? Number(number)
          .toFixed(2)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : String(Number(number)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
}

export const formatNumberWithDigitsRange = params => {
  const {
    number,
    unite = false,
    needFixed = true,
    separator = '-',
    separatorReplace = ' ~ '
  } = params

  const arrNums = String(number).split(separator)

  return arrNums
    ? arrNums
        ?.map(num => {
          return formatNumberWithDigits(num, unite, needFixed)
        })
        .join(separatorReplace)
    : formatNumberWithDigits(number, unite, needFixed)
}

/**
 * 获取数值单位
 * @param val
 * @returns {string}
 */
export function getUnit(val) {
  if (Math.abs(val) >= Math.pow(100, 4)) {
    return '亿'
  } else if (Math.abs(val) >= Math.pow(100, 2)) {
    return '万'
  } else {
    return ''
  }
}

/**
 *
 * @param number
 * @param keepDecimal 是否保留小数
 * @returns {string}
 */
export function setUnite(number, keepDecimal = true) {
  if (isEmpty(number)) return EMPTY_VALUE
  if (!checkNumberValid(number)) return number

  const fixed = keepDecimal ? 2 : 0
  let _number = Number(number)
  // 数据大于 亿
  if (Math.abs(_number) >= 1e8) {
    return (_number / 1e8).toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  // 数据大于 万
  if (Math.abs(_number) >= 1e4) {
    return (_number / 1e4).toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  // 数据小于一万
  return _number.toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 返回百分比的数字字符串，默认乘以100 ,sign 整数前面需要正号+ unite表示是否需要单位 默认不带单位 如：12345%=》1.23w%
export const percentFormatter = (number, withPositiveSign = false, unite = false) => {
  if (isEmpty(number)) return EMPTY_VALUE
  if (!checkNumberValid(number)) return number

  // 正号
  let positiveSign = number > 0 ? '+' : ''

  // 如果计算结果为0需要去掉前面的负号
  let resultNum = formatNumber((+number * 100).toFixed(2), unite)
  if (resultNum === '-0.00') {
    resultNum = '0.00'
  }
  if (unite) {
    resultNum += getUnit(+number * 100)
  }

  return typeof withPositiveSign === 'boolean' && withPositiveSign
    ? `${positiveSign}${resultNum}%`
    : `${resultNum}%`
}

/**
 * 单位格式化器：将字符串/数字转换为数字并进行格式化
 * @param {string|number} number - 要格式化的数字或字符串
 * @param {boolean} unite - 是否使用单位（万/亿），默认 false
 * @param {number} decimal - 保留小数位数，默认 2
 * @returns {string} 格式化后的字符串
 * @example
 * UnitFormatter(12345) // '12,345.00'
 * UnitFormatter(12345, true) // '1.23万'
 * UnitFormatter(12345, false, 0) // '12,345'
 * UnitFormatter(123456789, true, 2) // '1.23亿'
 */
export const UnitFormatter = (number, unite = false, decimal = 2) => {
  if (isEmpty(number)) return EMPTY_VALUE
  if (!checkNumberValid(number)) return number

  const num = +number

  // 如果计算结果为0需要去掉前面的负号
  let resultNum
  if (unite) {
    // 使用单位格式化
    const fixed = decimal >= 0 ? decimal : 2
    let _number = num
    // 数据大于 亿
    if (Math.abs(_number) >= 1e8) {
      resultNum = (_number / 1e8).toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      resultNum += '亿'
    }
    // 数据大于 万
    else if (Math.abs(_number) >= 1e4) {
      resultNum = (_number / 1e4).toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      resultNum += '万'
    }
    // 数据小于一万
    else {
      resultNum = _number.toFixed(fixed).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
  } else {
    // 不使用单位，只格式化数字和保留小数
    const fixed = decimal >= 0 ? decimal : 2
    resultNum = formatNumber(num.toFixed(fixed), false)
  }

  // 处理 -0.00 的情况
  if (resultNum === '-0.00' || resultNum === '-0') {
    resultNum = resultNum.replace('-', '')
  }

  return resultNum
}

/**
 * 设为小数
 * @param {*} number 数字
 * @param {*} decimal 小数位数
 * @returns
 */
export const toDecimal = (number, decimal = 2) => {
  const isPercent = String(number).includes('%')
  if (Number.isNaN(parseFloat(String(number).replace(/,/g, '')))) return '--'
  return (
    formatNumber(parseFloat(String(number).replace(/,/g, '')).toFixed(decimal)) +
    (isPercent ? '%' : '')
  )
}

/**
 * 数字转中文
 * @param {*} number 数字
 * @returns
 */
export const toZhDigit = number => {
  const str = String(number)
  const len = str.length - 1
  const idxs = [
    '',
    '十',
    '百',
    '千',
    '万',
    '十',
    '百',
    '千',
    '亿',
    '十',
    '百',
    '千',
    '万',
    '十',
    '百',
    '千',
    '亿'
  ]
  const num = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  let resTxt = str.replace(/([1-9]|0+)/g, ($, $1, idx) => {
    let pos = 0
    if ($1[0] !== '0') {
      pos = len - idx
      if (idx === 0 && $1[0] === 1 && idxs[len - idx] === '十') {
        return idxs[len - idx]
      }
      return num[$1[0]] + idxs[len - idx]
    } else {
      let left = len - idx
      let right = len - idx + $1.length
      if (Math.floor(right / 4) - Math.floor(left / 4) > 0) {
        pos = left - (left % 4)
      }
      if (pos) {
        return idxs[pos] + num[$1[0]]
      } else if (idx + $1.length >= len) {
        return ''
      } else {
        return num[$1[0]]
      }
    }
  })
  if (resTxt.indexOf('一十') === 0) {
    return resTxt.substring(1)
  } else {
    return resTxt
  }
}

/**
 * 处理时间
 * @param {*} startTime 时间
 */
export const toFormatDate = (time, format = 'YYYY/MM/DD', empty = '') => {
  // 需要时间符合日期规则
  if (time && dayjs(time).isValid()) {
    return dayjs(time).format(format)
  } else {
    return empty
  }
}

/**
 * 处理数据周期
 * @param {*} startTime 开始时间
 * @param {*} endTime 结束时间
 * 记录: 2023-12-24好直通车 历史数据 的时间周期 出现 startTime:20231218至20231224 这种字段
 */
export const toDateCycle = (startTime, endTime, dateFormat = 'YYYY/MM/DD') => {
  // 需要开始和结束时间都有值同时符合日期规则
  if (startTime && endTime && dayjs(startTime).isValid() && dayjs(endTime).isValid()) {
    return `${dayjs(startTime).format(dateFormat)} ~ ${dayjs(endTime).format(dateFormat)}`
  } else {
    return '--'
  }
}
