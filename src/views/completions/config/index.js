/*
 * @Author       : zhuiyue132
 * @Date         : 2025-11-04
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-01-26
 * @FilePath     : /ChatLLM/src/views/completions/config/index.js
 * @Description  : 补全配置
 *
 */

/**
 * 不合法的编码区域，这些编码区域的字符不会正常显示，需要过滤掉；
 */
export const ILLEGAL_UNICODE_REG =
  /[\uE000-\uF8FF]|[\uDB80-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g;
