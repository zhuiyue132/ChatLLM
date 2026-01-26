#!/usr/bin/env node

import { execSync } from 'child_process'
import chalk from 'chalk'
import dayjs from 'dayjs'

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log(chalk.cyan('Git Tag 脚本使用说明：'))
  console.log('')
  console.log(chalk.yellow('用法:'))
  console.log('  npm run tag                    # 使用当前日期（YYYYMMDD格式）创建tag')
  console.log('  npm run tag -- -n <tagname>   # 使用指定名称创建tag')
  console.log('  npm run tag -- --name <tagname>  # 使用指定名称创建tag（完整参数）')
  console.log('')
  console.log(chalk.yellow('示例:'))
  console.log('  npm run tag -- -n v1.0.0')
  console.log('  npm run tag -- --name release-2024')
  console.log('')
  console.log(chalk.gray('注意: 脚本只能在master分支执行，且工作目录必须是干净的'))
}

/**
 * 解析命令行参数
 */
function parseArguments() {
  const args = process.argv.slice(2)
  let tagName = null

  // 检查是否需要显示帮助
  if (args.includes('-h') || args.includes('--help')) {
    showHelp()
    process.exit(0)
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n' || args[i] === '--name') {
      if (i + 1 < args.length) {
        tagName = args[i + 1]
        break
      } else {
        console.error(chalk.red('错误: -n/--name 参数需要提供tag名称'))
        showHelp()
        process.exit(1)
      }
    }
  }

  return tagName
}

/**
 * 获取YYYYMMDD格式的日期字符串
 */
function getDateTag() {
  const currentBranch = executeCommand('git branch --show-current', '获取当前分支')
  return `${currentBranch}-${dayjs().format('YYYYMMDD')}`
}

/**
 * 获取相同分支的上一个tag
 * 优化版本：精确匹配分支前缀，避免匹配到其他分支的标签
 * 例如：master 分支只匹配 master-YYYYMMDD，不匹配 master-v2-YYYYMMDD
 */
function getLastTagFromSameBranch(currentBranch) {
  try {
    const allTags = executeCommand('git tag -l', '获取所有tags')

    // 构建精确的分支前缀模式
    // 如果分支名不包含 '-'，则匹配 'branchName-数字' 格式（如 master-20250929）
    // 如果分支名包含 '-'，则完全匹配分支名作为前缀（如 master-v2-20250902）
    const branchTags = allTags
      .split('\n')
      .filter(tag => {
        if (!tag) return false

        if (currentBranch.includes('-')) {
          // 对于包含 '-' 的分支名（如 master-v2），完全匹配分支名后跟 '-'
          return tag.startsWith(`${currentBranch}-`)
        } else {
          // 对于不包含 '-' 的分支名（如 master），精确匹配 'branchName-数字' 格式
          // 避免匹配到 master-v2-* 这样的其他分支标签
          const pattern = new RegExp(`^${currentBranch}-\\d`)
          return pattern.test(tag)
        }
      })
      // 按时间倒序排序，确保获取到最新的tag
      .sort((a, b) => {
        // 提取日期部分进行比较
        const dateA = a.match(/-(\d{8})$/)?.[1] || '0'
        const dateB = b.match(/-(\d{8})$/)?.[1] || '0'
        return dateB.localeCompare(dateA) || b.localeCompare(a)
      })

    if (branchTags.length > 0) {
      return branchTags[0]
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * 获取两个tag之间的提交日志
 * 优化版本：正确处理包含 merge commit 的提交历史
 */
function getCommitHistoryBetweenTags(fromTag) {
  try {
    if (fromTag) {
      // 策略：

      // 1. 直接使用 fromTag 作为基准，获取 fromTag..HEAD 的所有非merge提交
      // 2. 这样可以包含所有在 fromTag 之后的新提交，包括merge进来的提交

      // 使用 --no-merges 排除merge commit，获取实际功能提交
      // 从fromTag（不含）到HEAD（含）的所有非merge提交
      const commitLog = executeCommand(
        `git log --no-merges --pretty=format:"%h %s" ${fromTag}..HEAD`,
        '获取提交历史（排除merge）'
      )

      if (!commitLog.trim()) {
        console.log(chalk.yellow('⚠️  没有找到新的提交'))
        console.log(chalk.yellow('⚠️  使用最近10条提交作为默认...'))
        return executeCommand(
          'git log --no-merges --pretty=format:"%h %s" -10',
          '获取最近10条提交历史'
        )
      }

      return commitLog
    } else {
      return executeCommand(
        'git log --no-merges --pretty=format:"%h %s" -10',
        '获取最近10条提交历史'
      )
    }
  } catch (error) {
    console.error(chalk.red('获取提交历史失败'))
    console.error(chalk.red(error.message))
    return ''
  }
}

/**
 * 生成AI总结的tag描述信息
 */
async function generateTagDescriptionAI(commitHistory) {
  if (!commitHistory.trim()) {
    return '自动创建的版本标签'
  }

  const prompt = `请分析以下Git提交记录，生成一个详细的版本更新描述：

${commitHistory}

要求：
1. 总结本次版本的主要更新内容
2. 识别功能模块的变更和优化
3. 使用专业、简洁的语言
4. 描述控制在100-200字之间
5. 如果提交记录中包含emoji表情，请忽略它们
6. 不要包含任何其他旁白内容

示例：
1. 增加了用户管理功能
2. 修复了数据分析页面无法正常显示的问题
3. 优化了性能，提高了页面加载速度

请直接返回描述文本，不要添加任何额外说明。`

  const url = 'https://api.siliconflow.cn/v1/chat/completions'
  const options = {
    method: 'POST',
    headers: {
      Authorization: 'Bearer sk-puazyhkyjjiveklitbxhwiqazybgoabslxejmisxxdgzzbqr',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'THUDM/GLM-4-9B-0414',
      messages: [
        {
          role: 'system',
          content:
            '你是一个专业的软件工程助手，需要基于Git提交历史生成一个简洁、专业的版本标签描述。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    })
  }

  try {
    console.log(chalk.blue('🤖 正在使用AI生成tag描述...'))
    const response = await fetch(url, options)
    const data = await response.json()

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiDescription = data.choices[0].message.content.trim()
      console.log(chalk.green('✅ AI描述生成成功'))
      return aiDescription
    } else {
      throw new Error('AI返回格式异常')
    }
  } catch (error) {
    console.error(chalk.red('❌ AI描述生成失败，使用降级方案'))
    console.error(chalk.red(error.message))
    return generateFallbackDescription(commitHistory)
  }
}

/**
 * 降级方案：基于规则生成tag描述
 */
function generateFallbackDescription(commitHistory) {
  if (!commitHistory.trim()) {
    return '自动创建的版本标签'
  }

  const commits = commitHistory.split('\n').filter(line => line.trim())

  // 提取提交类型和功能描述
  const commitTypes = {}
  const features = []

  commits.forEach(commit => {
    // 解析提交信息，提取类型和描述
    const match = commit.match(
      /^[a-f0-9]+\s+(?:(feat|fix|docs|style|refactor|perf|test|chore|revert)[(]?)\s*(.+)?/
    )
    if (match) {
      const [, type, message] = match
      commitTypes[type] = (commitTypes[type] || 0) + 1

      // 提取功能关键词
      if (message) {
        const keywords = message
          .split(/[\s:，,。]/)
          .filter(word => word.length > 1 && !word.startsWith('(') && !word.startsWith('['))
        features.push(...keywords.slice(0, 2))
      }
    }
  })

  // 生成描述
  let description = '版本更新：'

  if (Object.keys(commitTypes).length > 0) {
    const types = Object.entries(commitTypes)
      .map(([type, count]) => `${type}(${count})`)
      .join(', ')
    description += types
  }

  if (features.length > 0) {
    const uniqueFeatures = [...new Set(features)].slice(0, 5)
    description += ` - 包含${uniqueFeatures.join('、')}等功能`
  }

  return description.length > 200 ? description.substring(0, 200) + '...' : description
}

/**
 * 执行命令并返回结果
 */
function executeCommand(command, description) {
  try {
    console.log(chalk.blue(`执行: ${description}`))
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' })
    return result.trim()
  } catch (error) {
    console.error(chalk.red(`错误: ${description} 失败`))
    console.error(chalk.red(error.message))
    process.exit(1)
  }
}

/**
 * 检查当前分支是否为master
 */
function checkMasterBranch() {
  const currentBranch = executeCommand('git branch --show-current', '获取当前分支')
  if (currentBranch.indexOf('master') === -1) {
    console.error(
      chalk.red(`错误: 当前分支是 "${currentBranch}"，但脚本只能在 master 或master相关分支执行`)
    )
    process.exit(1)
  }
  console.log(chalk.green('✓ 当前在 master 分支'))
}

/**
 * 检查tag是否已存在
 */
function checkTagExists(tagName) {
  try {
    executeCommand(`git tag -l "${tagName}"`, `检查tag ${tagName} 是否存在`)
    const existingTag = execSync(`git tag -l "${tagName}"`, { encoding: 'utf8' }).trim()
    if (existingTag) {
      console.error(chalk.red(`错误: tag "${tagName}" 已存在`))
      process.exit(1)
    }
    console.log(chalk.green(`✓ tag "${tagName}" 不存在，可以创建`))
  } catch (error) {
    // 如果命令失败，说明tag不存在，可以继续
  }
}

/**
 * 创建并推送tag
 */
function createAndPushTag(tagName, description = '') {
  // 创建带描述的tag
  if (description) {
    executeCommand(`git tag -a "${tagName}" -m "${description}"`, `创建tag ${tagName}`)
  } else {
    executeCommand(`git tag "${tagName}"`, `创建tag ${tagName}`)
  }
  console.log(chalk.green(`✓ 成功创建tag: ${tagName}`))

  if (description) {
    console.log(chalk.blue(`📝 tag描述: ${description}`))
  }

  // 推送tag到远程
  executeCommand(`git push origin "${tagName}"`, `推送tag ${tagName} 到远程`)
  console.log(chalk.green(`✓ 成功推送tag到远程: ${tagName}`))
}

/**
 * 主函数
 */
async function main() {
  // 首先解析参数，如果是帮助命令则直接返回
  const customTagName = parseArguments()

  console.log(chalk.cyan('开始执行Git Tag脚本...\n'))

  // 1. 检查当前分支
  checkMasterBranch()

  // 2. 检查工作目录状态
  // checkWorkingDirectory()

  // 3. 获取当前分支信息
  const currentBranch = executeCommand('git branch --show-current', '获取当前分支')

  // 4. 获取tag名称（从参数或生成日期）
  const tagName = customTagName || getDateTag()

  if (customTagName) {
    console.log(chalk.blue(`使用指定的tag名称: ${tagName}`))
  } else {
    console.log(chalk.blue(`生成的tag名称: ${tagName}`))
  }

  // 5. 检查tag是否已存在
  checkTagExists(tagName)

  // 6. 获取相同分支的上一个tag
  const lastTag = getLastTagFromSameBranch(currentBranch)
  if (lastTag) {
    console.log(chalk.blue(`上一个相同分支的tag: ${lastTag}`))
  }

  // 7. 获取提交历史并生成描述
  const commitHistory = getCommitHistoryBetweenTags(lastTag, tagName)

  console.log(chalk.blue(`\n📋 提交历史摘要：`))
  console.log(chalk.gray(commitHistory || '无提交历史'))

  // 8. 使用AI生成tag描述
  const tagDescription = await generateTagDescriptionAI(commitHistory)

  // 9. 创建并推送tag
  createAndPushTag(tagName, tagDescription)

  console.log(chalk.green('\n🎉 Git Tag脚本执行完成！'))
  console.log(chalk.yellow(`创建的tag: ${tagName}`))
  if (tagDescription) {
    console.log(chalk.blue(`tag描述: ${tagDescription}`))
  }
}

// 执行主函数
main()
