# XS Loading 指令使用文档

## 基础用法

### 1. 简单使用
```vue
<template>
  <div v-xs-loading="isLoading">内容区域</div>
</template>

<script setup>
import { ref } from 'vue'

const isLoading = ref(false)

// 显示加载
const showLoading = () => {
  isLoading.value = true
}

// 隐藏加载
const hideLoading = () => {
  isLoading.value = false
}
</script>
```

### 2. 配置选项
```vue
<template>
  <div v-xs-loading="{
    value: isLoading,
    text: '加载中...',
    size: 'large',
    theme: 'dark'
  }">内容区域</div>
</template>
```

### 3. 修饰符使用
```vue
<template>
  <!-- 全屏加载 -->
  <div v-xs-loading.fullscreen="isLoading">全屏加载</div>
  
  <!-- 锁定屏幕 -->
  <div v-xs-loading.lock="isLoading">锁定屏幕</div>
  
  <!-- 添加到 body -->
  <div v-xs-loading.body="isLoading">Body 加载</div>
</template>
```

### 4. 属性配置
```vue
<template>
  <div 
    v-xs-loading="isLoading"
    xs-loading-text="自定义文本"
    xs-loading-size="small"
    xs-loading-theme="transparent"
  >内容区域</div>
</template>
```

## 配置选项

### 基础配置
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| text | string \| Ref | '' | 加载文本 |
| size | string | 'medium' | 尺寸：small \| medium \| large |
| theme | string | 'light' | 主题：light \| dark \| transparent |
| customSize | number | - | 自定义尺寸（像素） |

### 样式配置
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| background | string \| Ref | 'rgba(255, 255, 255, 0.7)' | 背景色 |
| customClass | string \| Ref | 'xs-global-loading xs-global-loading_circle' | 自定义类名 |

### 行为配置
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| fullscreen | boolean | false | 全屏显示 |
| target | HTMLElement | - | 目标元素 |
| body | boolean | false | 添加到 body |
| lock | boolean | false | 锁定屏幕 |

## 主题样式

### Light 主题
```vue
<div v-xs-loading="{ value: true, theme: 'light' }">Light 主题</div>
```

### Dark 主题
```vue
<div v-xs-loading="{ value: true, theme: 'dark' }">Dark 主题</div>
```

### Transparent 主题
```vue
<div v-xs-loading="{ value: true, theme: 'transparent' }">Transparent 主题</div>
```

## 尺寸规格

### Small (32px)
```vue
<div v-xs-loading="{ value: true, size: 'small' }">小尺寸</div>
```

### Medium (48px)
```vue
<div v-xs-loading="{ value: true, size: 'medium' }">中等尺寸</div>
```

### Large (64px)
```vue
<div v-xs-loading="{ value: true, size: 'large' }">大尺寸</div>
```

### 自定义尺寸
```vue
<div v-xs-loading="{ value: true, customSize: 80 }">80px 尺寸</div>
```

## 响应式配置

```vue
<template>
  <div v-xs-loading="loadingConfig">内容区域</div>
</template>

<script setup>
import { ref, computed } from 'vue'

const loadingText = ref('加载中...')
const isDarkTheme = ref(false)

const loadingConfig = computed(() => ({
  value: true,
  text: loadingText.value,
  theme: isDarkTheme.value ? 'dark' : 'light',
  size: 'large'
}))

// 动态更新配置
const updateText = (newText) => {
  loadingText.value = newText
}
</script>
```

## 最佳实践

### 1. 异步操作
```vue
<template>
  <div v-xs-loading="isLoading">
    <button @click="fetchData">获取数据</button>
    <div v-if="data">{{ data }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isLoading = ref(false)
const data = ref(null)

const fetchData = async () => {
  try {
    isLoading.value = true
    const response = await fetch('/api/data')
    data.value = await response.json()
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    isLoading.value = false
  }
}
</script>
```

### 2. 条件渲染
```vue
<template>
  <div v-xs-loading="shouldShowLoading">
    <div v-if="!isLoading && data">
      <!-- 数据内容 -->
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const isLoading = ref(false)
const data = ref(null)

const shouldShowLoading = computed(() => {
  return isLoading.value && !data.value
})
</script>
```

### 3. 全局加载
```vue
<template>
  <div v-xs-loading.fullscreen="globalLoading">
    <!-- 应用内容 -->
  </div>
</template>

<script setup>
import { ref } from 'vue'

const globalLoading = ref(false)

// 在全局事件中使用
const showGlobalLoading = () => {
  globalLoading.value = true
  setTimeout(() => {
    globalLoading.value = false
  }, 2000)
}
</script>
```

## 注意事项

1. **内存管理**：指令会在组件卸载时自动清理实例
2. **性能优化**：避免频繁切换加载状态
3. **错误处理**：指令内置错误处理，错误信息会在控制台显示
4. **响应式**：支持响应式配置，但建议使用 computed 进行优化
5. **样式覆盖**：可以通过 customClass 自定义样式