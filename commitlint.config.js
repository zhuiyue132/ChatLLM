/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-16
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-16
 * @FilePath     : /bi-agents/commitlint.config.js
 * @Description  :
 *
 */
/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-17
 * @FilePath     : /bi-agents/commitlint.config.js
 * @Description  : commitlint配置
 *
 */
export default {
  extends: ['@commitlint/config-conventional'],
  // 自定义规则
  rules: {
    // type 类型定义，表示 git 提交的 type 必须在以下类型范围内
    'type-enum': [
      2,
      'always',
      [
        'feat', // 新功能
        'fix', // 修复
        'docs', // 文档变更
        'style', // 代码格式
        'refactor', // 重构
        'perf', // 性能优化
        'test', // 增加测试
        'chore', // 构建过程或辅助工具的变动
        'revert', // 回退
        'build', // 打包
        'ci' // CI相关
      ]
    ],
    // subject 大小写不做校验
    'subject-case': [0]
  }
}
