# useProgress Hook

进度条控制 Hook，提供进度条显示、自动递增、完成/失败状态等完整生命周期控制。

## 特性

- ✨ 支持延迟显示(避免快速操作时的闪烁)
- 🚀 自动递增模拟(提升用户体验)
- ⏱️ 最小展示时长(避免进度条一闪而过)
- 🔄 完整的状态管理和生命周期
- 🧹 组件卸载自动清理
- 📦 丰富的回调函数支持

## 基础用法

```vue
<template>
  <div>
    <!-- 进度条 -->
    <el-progress
      v-if="progressVisible"
      :percentage="progressValue"
      :status="isFailed ? 'exception' : isCompleted ? 'success' : ''"
    />

    <!-- 控制按钮 -->
    <el-button @click="handleStart">开始任务</el-button>
    <el-button @click="handleComplete">完成任务</el-button>
  </div>
</template>

<script setup>
import { useProgress } from '@/hooks'

const {
  progressValue,
  progressVisible,
  isFailed,
  isCompleted,
  startProgress,
  completeProgress
} = useProgress({
  showDelay: 300,        // 延迟300ms显示
  minVisibleTime: 2000,  // 最少显示2秒
  autoStep: 3,           // 自动递增步长3%
  autoMax: 85            // 最大自动递增到85%
})

const handleStart = () => {
  startProgress()
}

const handleComplete = async () => {
  await completeProgress()
}
</script>
```

## 配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| showDelay | number | 0 | 延迟显示时间(ms) |
| minVisibleTime | number | 1000 | 最小展示时长(ms) |
| autoStep | number | 2 | 自动递增步长 |
| autoMax | number | 90 | 自动递增最大值 |
| autoInterval | number | 500 | 自动递增间隔(ms) |
| completeDelay | number | 800 | 完成后停留时间(ms) |
| onStart | Function | - | 启动回调 |
| onUpdate | Function | - | 进度更新回调 |
| onComplete | Function | - | 完成回调 |
| onFail | Function | - | 失败回调 |
| onCancel | Function | - | 取消回调 |

## 返回值

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| progressValue | Ref\<number\> | 进度值(0-100) |
| progressVisible | Ref\<boolean\> | 是否显示进度条 |
| progressState | Ref\<string\> | 进度条状态 |
| isRunning | Ref\<boolean\> | 是否正在运行 |
| isCompleted | Ref\<boolean\> | 是否已完成 |
| isFailed | Ref\<boolean\> | 是否失败 |
| startProgress | Function | 启动进度条 |
| updateProgress | Function | 更新进度 |
| startAutoProgress | Function | 启动自动递增 |
| stopAutoProgress | Function | 停止自动递增 |
| completeProgress | Function | 完成进度条(Promise) |
| failProgress | Function | 失败处理 |
| cancelProgress | Function | 取消进度 |
| resetProgress | Function | 重置进度条 |

## 进度状态

通过 `PROGRESS_STATE` 常量访问：

```javascript
import { PROGRESS_STATE } from '@/hooks'

PROGRESS_STATE.IDLE        // 空闲状态
PROGRESS_STATE.STARTING    // 启动中
PROGRESS_STATE.RUNNING     // 运行中
PROGRESS_STATE.COMPLETING  // 完成中
PROGRESS_STATE.COMPLETED   // 已完成
PROGRESS_STATE.FAILED      // 失败
PROGRESS_STATE.CANCELLED   // 已取消
```

## 高级用法

### 带回调函数

```vue
<script setup>
import { ElMessage } from 'element-plus'
import { useProgress } from '@/hooks'

const {
  progressValue,
  progressVisible,
  startProgress,
  updateProgress,
  startAutoProgress,
  completeProgress,
  failProgress
} = useProgress({
  onStart: () => {
    ElMessage.info('任务开始执行')
    startAutoProgress() // 启动自动递增
  },
  onUpdate: value => {
    console.log(`进度更新: ${value}%`)
  },
  onComplete: () => {
    ElMessage.success('任务完成')
  },
  onFail: error => {
    ElMessage.error(`任务失败: ${error?.message || '未知错误'}`)
  }
})

// 执行异步任务
const executeTask = async () => {
  startProgress(5)

  try {
    // 模拟API请求
    await someAsyncOperation()

    // 手动更新到最终进度
    updateProgress(95)

    // 完成进度条
    await completeProgress()
  } catch (error) {
    failProgress(error)
  }
}
</script>
```

### 文件上传场景

```vue
<template>
  <div>
    <el-upload
      :before-upload="handleBeforeUpload"
      :on-success="handleUploadSuccess"
      :on-error="handleUploadError"
    >
      <el-button type="primary">上传文件</el-button>
    </el-upload>

    <div v-if="progressVisible" class="upload-progress">
      <el-progress :percentage="progressValue" />
      <span>{{ progressText }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useProgress, PROGRESS_STATE } from '@/hooks'

const {
  progressValue,
  progressVisible,
  progressState,
  startProgress,
  updateProgress,
  completeProgress,
  failProgress
} = useProgress({
  showDelay: 200,
  minVisibleTime: 800
})

const progressText = computed(() => {
  const textMap = {
    [PROGRESS_STATE.STARTING]: '准备上传...',
    [PROGRESS_STATE.RUNNING]: `上传中... ${progressValue.value}%`,
    [PROGRESS_STATE.COMPLETING]: '处理中...',
    [PROGRESS_STATE.COMPLETED]: '上传完成',
    [PROGRESS_STATE.FAILED]: '上传失败'
  }
  return textMap[progressState.value] || ''
})

const handleBeforeUpload = () => {
  startProgress(10)
  return true
}

const handleUploadSuccess = () => {
  updateProgress(100)
  completeProgress()
}

const handleUploadError = error => {
  failProgress(error)
}
</script>
```

### 手动控制进度

```vue
<script setup>
import { useProgress } from '@/hooks'

const {
  progressValue,
  progressVisible,
  startProgress,
  updateProgress,
  completeProgress
} = useProgress({
  showDelay: 0,
  minVisibleTime: 500
})

// 分步执行任务
const executeStepByStep = async () => {
  startProgress(0)

  // 第一步
  await step1()
  updateProgress(25)

  // 第二步
  await step2()
  updateProgress(50)

  // 第三步
  await step3()
  updateProgress(75)

  // 第四步
  await step4()
  updateProgress(95)

  // 完成
  await completeProgress()
}
</script>
```

### 自动递增进度

```vue
<script setup>
import { useProgress } from '@/hooks'

const {
  startProgress,
  startAutoProgress,
  stopAutoProgress,
  completeProgress
} = useProgress({
  autoStep: 3,      // 每次递增3%
  autoMax: 90,      // 最大递增到90%
  autoInterval: 600 // 每600ms递增一次
})

// 长时间任务，使用自动递增
const executeLongTask = async () => {
  startProgress()
  startAutoProgress() // 启动自动递增

  try {
    await longRunningOperation()
    stopAutoProgress() // 停止自动递增
    await completeProgress()
  } catch (error) {
    failProgress(error)
  }
}
</script>
```

## 注意事项

1. **避免重复启动**: 在进度条运行时再次调用 `startProgress` 会输出警告并忽略
2. **异步完成**: `completeProgress()` 是异步函数，需要使用 `await` 或 `.then()`
3. **最小展示时长**: 即使任务很快完成，进度条也会展示至少 `minVisibleTime` 毫秒
4. **自动清理**: 组件卸载时会自动清理所有定时器，无需手动清理
5. **状态持久**: 失败状态会短暂保留(1秒)以便用户看到，然后自动重置

## 完整示例

参考 `src/hooks/use-async-task/index.js` 的使用方式，该 Hook 可以很好地配合异步任务轮询使用。
