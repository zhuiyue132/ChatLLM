# BiEmpty 空状态组件

基于 Element Plus `el-empty` 组件封装的项目空状态组件，支持多种预设场景和自定义配置。

## 功能特性

- 🎨 基于 Element Plus el-empty 组件
- 📦 预设多种常见空状态场景
- 🔧 支持完全自定义图片、文本和操作按钮
- 📱 响应式设计，移动端友好
- 🎯 支持插槽自定义内容

## 基础用法

```vue
<template>
  <!-- 默认空状态 -->
  <BiEmpty />

  <!-- 无搜索结果 -->
  <BiEmpty type="search" />

  <!-- 404页面 -->
  <BiEmpty type="404" />

  <!-- 带操作按钮 -->
  <BiEmpty type="data" :show-action="true" action-text="重新加载" @action="handleReload" />
</template>

<script setup>
import { BiEmpty } from '@/components'

const handleReload = () => {
  console.log('重新加载')
}
</script>
```

## API

### Props

| 参数        | 说明             | 类型    | 可选值                               | 默认值     |
| ----------- | ---------------- | ------- | ------------------------------------ | ---------- |
| type        | 空状态类型       | string  | `data` / `search` / `404` / `custom` | `data`     |
| image       | 自定义图片地址   | string  | —                                    | —          |
| imageSize   | 图片尺寸         | number  | —                                    | 200        |
| description | 描述文本         | string  | —                                    | —          |
| showAction  | 是否显示操作按钮 | boolean | —                                    | false      |
| actionText  | 操作按钮文本     | string  | —                                    | `重新加载` |
| actionType  | 操作按钮类型     | string  | Element Plus button type             | `primary`  |
| actionSize  | 操作按钮尺寸     | string  | Element Plus button size             | `default`  |

### Events

| 事件名 | 说明             | 回调参数 |
| ------ | ---------------- | -------- |
| action | 操作按钮点击事件 | —        |

### Slots

| 插槽名      | 说明               |
| ----------- | ------------------ |
| image       | 自定义图片内容     |
| description | 自定义描述内容     |
| default     | 自定义操作区域内容 |

## 预设类型

### data - 无数据

默认的空状态，适用于列表、表格等无数据的场景。

### search - 无搜索结果

适用于搜索无结果的场景。

### 404 - 页面不存在

适用于 404 页面场景。

### custom - 自定义

完全自定义的空状态，需要通过 props 或插槽自定义内容。

## 高级用法

### 自定义图片和文本

```vue
<template>
  <BiEmpty
    type="custom"
    image="/path/to/custom-image.png"
    description="自定义描述文本"
    :image-size="160"
  />
</template>
```

### 使用插槽自定义

```vue
<template>
  <BiEmpty>
    <template #image>
      <img src="/custom-image.png" alt="自定义图片" />
    </template>

    <template #description>
      <div>
        <h3>自定义标题</h3>
        <p>自定义描述内容</p>
      </div>
    </template>

    <template #default>
      <el-button type="primary" @click="handleCustomAction"> 自定义操作 </el-button>
      <el-button @click="handleSecondAction"> 第二个操作 </el-button>
    </template>
  </BiEmpty>
</template>
```

### 响应式图片尺寸

```vue
<template>
  <BiEmpty
    type="data"
    :image-size="isMobile ? 120 : 200"
    :description="isMobile ? '暂无数据' : '当前列表暂无数据，请稍后再试'"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isMobile = ref(false)

const checkDevice = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkDevice()
  window.addEventListener('resize', checkDevice)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkDevice)
})
</script>
```
