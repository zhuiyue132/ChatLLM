/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-30
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-30
 * @FilePath     : /bi-agents/src/utils/time/week-to-date.js
 * @Description  :
 *
 */
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'

dayjs.extend(weekOfYear)

function weekToDate(year, week) {
  const startOfWeek = dayjs().year(year).week(week).startOf('week')
  const endOfWeek = dayjs().year(year).week(week).endOf('week')

  return {
    start: startOfWeek,
    end: endOfWeek,
    startFormat: startOfWeek.format('YYYY-MM-DD'),
    endFormat: endOfWeek.format('YYYY-MM-DD'),
    startDateTime: startOfWeek.format('YYYY-MM-DD HH:mm:ss'),
    endDateTime: endOfWeek.format('YYYY-MM-DD HH:mm:ss')
  }
}

/**
 * 解析周字符串为日期对象
 * @param {*} weekString
 * @returns
 */
export function parseWeekString(weekString) {
  // 解析 "2025年30周" 格式
  const match = weekString.match(/(\d{4})年(\d+)周/)
  if (!match) {
    return undefined
  }

  const year = parseInt(match[1])
  const week = parseInt(match[2])

  return weekToDate(year, week)
}
