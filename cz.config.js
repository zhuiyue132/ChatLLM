/*
 * @Author       : zhuiyue132
 * @Date         : 2025-07-15
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-07-16
 * @FilePath     : /bi-agents/cz.config.js
 * @Description  :
 *
 */
import { definePrompt } from 'cz-git'

export default definePrompt({
  subjectLimit: 100,
  requireScope: false,
  messages: {
    scope: '选择一个提交范围（可选）:',
    body: '填写更加详细的变更描述（可选）。使用 "|" 换行 :\n',
    breaking: '列举非兼容性重大的变更（可选）。使用 "|" 换行 :\n',
    footerPrefixesSelect: '选择关联issue前缀（可选）:',
    customFooterPrefix: '输入自定义issue前缀 :',
    footer: '列举关联issue (可选) 例如: #31, #I3244 :\n',
    generatingByAI: '正在通过 AI 生成你的提交简短描述...',
    generatedSelectByAI: '选择一个 AI 生成的简短描述:',
    type: '请选择提交类型:',
    customScope: '请输入修改范围:',
    subject: '请简要描述提交(必填):',
    confirmCommit: '确认使用以上信息提交？(y/n/e/h)'
  },
  types: [
    { value: 'feat', name: 'feat:     ✨ 新功能', emoji: '✨' },
    { value: 'fix', name: 'fix:      🐛 修复', emoji: '🐛' },
    { value: 'docs', name: 'docs:     📝 文档变更', emoji: '📝' },
    { value: 'style', name: 'style:    💄 代码格式(不影响代码运行的变动)', emoji: '💄' },
    {
      value: 'refactor',
      name: 'refactor: ♻️  重构(既不是增加feature，也不是修复bug)',
      emoji: '♻️'
    },
    { value: 'perf', name: 'perf:     ⚡️ 性能优化', emoji: '⚡️' },
    { value: 'test', name: 'test:     ✅ 增加测试', emoji: '✅' },
    { value: 'chore', name: 'chore:    🔨 构建过程或辅助工具的变动', emoji: '🔨' },
    { value: 'revert', name: 'revert:   ⏪️ 回退', emoji: '⏪️' },
    { value: 'build', name: 'build:    📦️ 打包', emoji: '📦️' },
    { value: 'ci', name: 'ci:       🎡 CI相关变更', emoji: '🎡' }
  ],
  useEmoji: true,
  emojiAlign: 'center',
  useAI: false,
  aiNumber: 1,
  themeColorCode: '',
  scopes: [],
  allowCustomScopes: true,
  allowEmptyScopes: false,
  customScopesAlign: 'bottom',
  customScopesAlias: 'custom',
  emptyScopesAlias: 'empty',
  upperCaseSubject: null,
  markBreakingChangeMode: false,
  allowBreakingChanges: ['feat', 'fix'],
  breaklineNumber: 100,
  breaklineChar: '|',
  skipQuestions: ['body', 'footer', 'footerPrefix', 'breaking'],
  issuePrefixes: [{ value: 'closed', name: 'closed:   ISSUES has been processed' }],
  customIssuePrefixAlign: 'top',
  emptyIssuePrefixAlias: 'skip',
  customIssuePrefixAlias: 'custom',
  allowCustomIssuePrefix: true,
  allowEmptyIssuePrefix: true,
  confirmColorize: true,
  maxHeaderLength: Infinity,
  maxSubjectLength: Infinity,
  minSubjectLength: 0,
  scopeOverrides: undefined,
  defaultBody: '',
  defaultIssues: '',
  defaultScope: '',
  defaultSubject: ''
})
