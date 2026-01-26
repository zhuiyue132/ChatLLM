# BiDialog 通用弹窗组件

基于 Element Plus el-dialog 封装的通用弹窗组件，符合 BIPC 设计规范。

## 功能特点

- 🎨 符合 BIPC 设计规范的视觉样式
- 📱 响应式设计，支持自定义宽度
- 🎛️ 丰富的配置选项和插槽支持
- ⚡ 支持 loading 状态和事件回调
- 🔧 基于 Element Plus，稳定可靠

## 基础用法

```vue
<template>
  <div>
    <el-button @click="dialogVisible = true">打开弹窗</el-button>

    <BiDialog
      v-model="dialogVisible"
      title="智能体设置"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    >
      <div>这里是弹窗内容</div>
    </BiDialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BiDialog from '@/components/dialog/index.vue'

const dialogVisible = ref(false)

const handleConfirm = () => {
  console.log('确认按钮被点击')
  dialogVisible.value = false
}

const handleCancel = () => {
  console.log('取消按钮被点击')
  dialogVisible.value = false
}
</script>
```

## API

### Props

| 参数                 | 说明                      | 类型            | 默认值   |
| -------------------- | ------------------------- | --------------- | -------- |
| modelValue / v-model | 控制弹窗显示隐藏          | Boolean         | false    |
| title                | 弹窗标题                  | String          | ''       |
| width                | 弹窗宽度                  | String / Number | '1200px' |
| fullscreen           | 是否全屏显示              | Boolean         | false    |
| center               | 是否居中对齐              | Boolean         | false    |
| modal                | 是否显示遮罩层            | Boolean         | true     |
| lockScroll           | 是否锁定body滚动          | Boolean         | true     |
| closeOnClickModal    | 是否可以通过点击modal关闭 | Boolean         | false    |
| closeOnPressEscape   | 是否可以通过ESC关闭       | Boolean         | true     |
| showClose            | 是否显示关闭按钮          | Boolean         | false    |
| beforeClose          | 关闭前的回调              | Function        | null     |
| appendToBody         | 是否插入到body            | Boolean         | false    |
| destroyOnClose       | 关闭时销毁元素            | Boolean         | false    |
| customClass          | 自定义类名                | String          | ''       |
| showFooter           | 是否显示底部              | Boolean         | true     |
| showCancelButton     | 是否显示取消按钮          | Boolean         | true     |
| showConfirmButton    | 是否显示确认按钮          | Boolean         | true     |
| cancelButtonText     | 取消按钮文字              | String          | '取消'   |
| confirmButtonText    | 确认按钮文字              | String          | '保存'   |
| cancelLoading        | 取消按钮loading状态       | Boolean         | false    |
| confirmLoading       | 确认按钮loading状态       | Boolean         | false    |

### Events

| 事件名  | 说明                   | 回调参数 |
| ------- | ---------------------- | -------- |
| open    | 弹窗打开时触发         | -        |
| opened  | 弹窗打开动画结束时触发 | -        |
| close   | 弹窗关闭时触发         | -        |
| closed  | 弹窗关闭动画结束时触发 | -        |
| cancel  | 取消按钮点击时触发     | -        |
| confirm | 确认按钮点击时触发     | -        |

### Slots

| 插槽名     | 说明           |
| ---------- | -------------- |
| default    | 弹窗内容       |
| title      | 自定义标题内容 |
| footer     | 自定义底部内容 |
| close-icon | 自定义关闭图标 |

## 高级用法

### 自定义标题

```vue
<BiDialog v-model="dialogVisible">
  <template #title>
    <div class="custom-title">
      <Icon name="setting" />
      <span>自定义标题</span>
    </div>
  </template>
  
  <div>弹窗内容</div>
</BiDialog>
```

### 自定义底部按钮

```vue
<BiDialog v-model="dialogVisible" :show-footer="false">
  <div>弹窗内容</div>
  
  <template #footer>
    <el-button @click="dialogVisible = false">自定义取消</el-button>
    <el-button type="primary" @click="handleSave">自定义保存</el-button>
    <el-button type="danger" @click="handleDelete">删除</el-button>
  </template>
</BiDialog>
```

### Loading 状态

```vue
<template>
  <BiDialog
    v-model="dialogVisible"
    title="保存中..."
    :confirm-loading="saving"
    @confirm="handleSave"
  >
    <div>内容正在保存...</div>
  </BiDialog>
</template>

<script setup>
import { ref } from 'vue'

const dialogVisible = ref(false)
const saving = ref(false)

const handleSave = async () => {
  saving.value = true
  try {
    await saveData()
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}
</script>
```

### 阻止关闭

```vue
<BiDialog v-model="dialogVisible" title="确认关闭？" :before-close="handleBeforeClose">
  <div>有未保存的内容，确定要关闭吗？</div>
</BiDialog>

<script setup>
const handleBeforeClose = done => {
  if (hasUnsavedChanges.value) {
    ElMessageBox.confirm('有未保存的内容，确定要关闭吗？')
      .then(() => {
        done()
      })
      .catch(() => {
        // 取消关闭
      })
  } else {
    done()
  }
}
</script>
```
