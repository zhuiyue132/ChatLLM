/*
 * @Author       : zhuiyue132
 * @Date         : 2025-08-25
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-09-16
 * @FilePath     : /bi-agents/src/hooks/use-paste/index.js
 * @Description  : 粘贴数据处理 Hook - 支持表格数据解析、Excel生成和文本处理
 */

import { showMessage as showMessageHook } from '@/hooks/use-message'
import ExcelJS from 'exceljs'

/**
 * 粘贴数据处理 Hook
 * @param {Object} props - 配置对象
 * @param {Object} props.fieldObj - 字段映射对象，用于将列名映射为字段名
 * @param {boolean} props.toExcel - 是否将粘贴数据转换为Excel文件
 * @param {string|null} props.sliceTableKey - 分割表格的键名，用于分割复杂数据结构
 * @param {Function} pasteCallback - 粘贴完成后的回调函数
 * @returns {Object} 返回粘贴处理相关的方法
 */
export const usePaste = (props, pasteCallback) => {
  // 解构配置参数，设置默认值
  const { fieldObj = {}, toExcel = false, sliceTableKey = null } = props || {}

  /**
   * 将二维数组表格数据转换为JSON数组
   * 根据fieldObj配置的映射关系，将列名转换为字段名
   * @param {Array<Array<string>>} rows - 二维数组形式的表格数据
   * @returns {Array<Object>} 转换后的JSON数据数组
   */
  const transformTableDataToJson = rows => {
    // 创建列索引与字段名的映射关系
    const headerFieldMap = new Map()
    // 分离表头行和数据行
    const [headerRow, ...dataRows] = rows

    if (!headerRow) return []

    // 构建列索引与字段映射
    headerRow.forEach((columnName, index) => {
      if (fieldObj[columnName]) {
        headerFieldMap.set(index, fieldObj[columnName])
      }
    })

    if (headerFieldMap.size === 0) return []

    // 将每行数据转换为JSON对象
    return (
      dataRows
        .map(row => {
          const rowData = {}
          // 根据映射关系填充字段值
          headerFieldMap.forEach((fieldName, columnIndex) => {
            if (row[columnIndex] !== undefined) {
              rowData[fieldName] = row[columnIndex]
            }
          })
          return rowData
        })
        // 过滤掉空行
        .filter(row => Object.keys(row).length > 0)
    )
  }

  /**
   * 提取剪贴板文本内容
   * 优先使用现代浏览器的Clipboard API，降级到传统方法
   * @param {Event} fallbackEvent - 降级时使用的输入事件
   * @returns {Promise<string>} 剪贴板中的文本内容
   * @throws {Error} 当无法访问剪贴板时抛出错误
   */
  const extractClipboardText = async fallbackEvent => {
    try {
      // 优先使用现代浏览器的Clipboard API
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText()
      }

      // 降级方案：使用临时的textarea元素
      const textarea = document.createElement('textarea')
      // 设置样式使textarea不可见且不影响页面布局
      textarea.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;padding:0;border:none;opacity:0'
      document.body.appendChild(textarea)

      try {
        textarea.focus()
        // 使用execCommand进行粘贴操作
        document.execCommand('paste')
        return textarea.value
      } catch {
        // 如果降级方案也失败，尝试从事件对象获取值
        return fallbackEvent?.target?.value || ''
      } finally {
        // 清理临时创建的元素
        document.body.removeChild(textarea)
      }
    } catch (error) {
      throw new Error('无法访问剪贴板，请检查浏览器权限')
    }
  }

  /**
   * 解析剪贴板中的表格内容
   * 将Tab分隔的文本转换为二维数组，处理数字格式化
   * @param {string} text - 剪贴板中的原始文本
   * @returns {Array<Array<string>>} 解析后的二维数组表格数据
   * @throws {Error} 当内容为空或格式错误时抛出错误
   */
  const parseClipboardContent = text => {
    // 检查剪贴板内容是否为空
    if (!text.trim()) throw new Error('剪贴板内容为空')
    // 检查是否包含表格分隔符（Tab）
    if (!text.includes('\t')) throw new Error('数据格式错误')

    // 预处理文本：移除回车符，处理引号内的换行符
    const rows = text
      .replace(/\r/g, '') // 移除Windows风格的回车符
      .replace(/"[^"]*"/g, match => match.replace(/\n/g, ' ')) // 处理引号内的换行符
      .split('\n') // 按换行符分割行
      .map(row =>
        // 处理每行的单元格：移除数字中的千位分隔符
        row.split('\t').map(cell => (/^[\d,]+$/.test(cell) ? cell.replace(/,/g, '') : cell))
      )
      // 过滤掉空行（所有单元格都为空的行）
      .filter(item => item.some(txt => !!txt))

    if (rows.length === 0) throw new Error('无法解析有效数据')

    return rows
  }

  /**
   * 分割表格数据
   * 根据指定的分割键将表格数据分成两部分
   * 常用于处理包含主从表结构的复杂数据
   * @param {Array<Array<string>>} rows - 原始表格数据
   * @param {string} splitKey - 分割键，用于定位分割位置
   * @returns {Array<Array<Object>>} 分割后的两个JSON数据数组
   */
  const splitTableData = (rows, splitKey) => {
    // 在表头行中查找分割键的位置
    const splitIndex = rows[0].findIndex(header => header === splitKey)
    if (splitIndex === -1) {
      // 如果未找到分割键，返回整个表格的JSON数据
      return [transformTableDataToJson(rows)]
    }

    // 分割表格：第一部分（分割键左侧）
    const firstPart = rows.map(row => row.slice(0, splitIndex))
    // 分割表格：第二部分（分割键右侧，保留第一列作为关联键）
    const secondPart = rows.map(row => [row[0], ...row.slice(splitIndex)])

    // 分别转换为JSON格式并返回
    return [transformTableDataToJson(firstPart), transformTableDataToJson(secondPart)]
  }

  /**
   * 创建Excel文件
   * 将表格数据转换为可下载的Excel文件
   * @param {Array<Array<string>>} rows - 表格数据
   * @param {string} fileName - 文件名（不含扩展名）
   * @returns {Promise<File>} 生成的Excel文件对象
   * @throws {Error} 当Excel生成失败时抛出错误
   */
  const createExcelFile = async (rows, fileName = '剪切板表格') => {
    try {
      // 创建Excel工作簿和工作表
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Sheet1')

      // 添加数据到工作表
      rows.forEach(row => {
        const excelRow = worksheet.addRow(row)
        excelRow.font = { size: 12 }
      })

      // 设置列宽自适应：根据内容长度调整列宽
      worksheet.columns.forEach(column => {
        let maxLength = 0
        column.eachCell({ includeEmpty: false }, cell => {
          maxLength = Math.max(maxLength, cell.value?.toString().length || 0)
        })
        // 设置列宽：最小10，最大50个字符宽度
        column.width = Math.min(Math.max(maxLength + 2, 10), 50)
      })

      // 生成Excel文件缓冲区
      const buffer = await workbook.xlsx.writeBuffer()
      // 创建File对象用于下载
      return new File([buffer], `${fileName}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    } catch (error) {
      throw new Error(`Excel生成失败: ${error.message}`)
    }
  }

  /**
   * 显示消息提示
   * 封装消息提示功能，提供统一的接口
   * @param {string} message - 提示消息内容
   * @param {string} type - 消息类型（success/warning/error/info）
   */
  const showMessage = (message, type = 'warning') => {
    showMessageHook(message, { type })
  }

  /**
   * 粘贴处理主函数
   * 处理粘贴事件，支持表格数据解析和Excel生成
   * @param {Event} event - 粘贴事件对象
   * @returns {Promise<Object>} 处理结果对象
   * @property {boolean} success - 是否成功
   * @property {File|Array<Object>} data - 处理后的数据
   * @property {File} [file] - 生成的Excel文件（当toExcel为true时）
   * @property {string} [error] - 错误信息（当失败时）
   */
  const onPaste = async event => {
    try {
      // 提取并解析剪贴板内容
      const text = await extractClipboardText(event)
      const rows = parseClipboardContent(text)

      // 如果配置为生成Excel文件
      if (toExcel) {
        // 生成带时间戳的文件名
        const filename = `粘贴数据_${new Date().getTime()}`
        const file = await createExcelFile(rows, filename)
        pasteCallback?.(file, rows)
        return { success: true, file, data: rows }
      }

      // 处理表格数据：过滤有效行
      const filteredRows = filterValidTableRows(rows)
      // 根据配置决定是否分割表格
      const processedData =
        sliceTableKey && text.includes(sliceTableKey)
          ? splitTableData(filteredRows, sliceTableKey)
          : [transformTableDataToJson(filteredRows)]

      pasteCallback?.(processedData)
      return { success: true, data: processedData }
    } catch (error) {
      // 错误处理：显示错误信息并返回失败结果
      showMessage(error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * 过滤有效的表格行
   * 移除列数过少的无效行，保留主要数据结构
   * @param {Array<Array<string>>} rows - 原始表格数据
   * @returns {Array<Array<string>>} 过滤后的有效数据行
   */
  const filterValidTableRows = rows => {
    if (rows.length === 0) return []

    // 按列数降序排序，找到最大列数
    const sortedByColumns = [...rows].sort((a, b) => b.length - a.length)
    const maxColumnCount = sortedByColumns[0].length

    // 保留列数不少于最大列数-2的行（允许一定的列数差异）
    return rows.filter(row => row.filter(Boolean).length >= Math.max(maxColumnCount - 2, 1))
  }

  /**
   * 获取纯文本剪贴板内容
   * 专门用于处理纯文本粘贴场景
   * @returns {Promise<Object>} 处理结果
   * @property {boolean} success - 是否成功
   * @property {string|null} text - 粘贴的文本内容
   */
  const onPasteTxt = async () => {
    try {
      const text = await extractClipboardText()
      if (!text.trim()) {
        showMessage('粘贴内容不能为空！')
        return { success: false, text: null }
      }

      return { success: true, text }
    } catch (error) {
      showMessage(error.message)
      return { success: false, text: null }
    }
  }

  /**
   * 将文本转换为Excel文件
   * 专门用于将文本格式的表格数据转换为Excel文件
   * @param {string} text - 要转换的文本内容
   * @param {string} fileName - 输出文件名
   * @returns {Promise<File|null>} 生成的Excel文件，失败时返回null
   */
  const txtToExcel = async (text, fileName = '表格') => {
    try {
      // 解析文本为表格数据
      const rows = parseClipboardContent(text)
      // 生成Excel文件
      return await createExcelFile(rows, fileName)
    } catch (error) {
      showMessage(error.message)
      return null
    }
  }

  /**
   * 返回的粘贴处理接口
   * @property {Function} onPaste - 主粘贴处理函数
   * @property {Function} onPasteTxt - 纯文本粘贴处理
   * @property {Function} txtToExcel - 文本转Excel
   * @property {Function} createExcelFile - Excel文件生成
   * @property {Function} parseClipboardContent - 剪贴板内容解析
   */
  return {
    onPaste,
    onPasteTxt,
    txtToExcel,
    createExcelFile,
    parseClipboardContent
  }
}
