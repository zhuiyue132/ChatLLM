# XS Dropdown 组件

基于 Element Plus 的 `el-dropdown-menu` 和 `el-dropdown-item` 二次封装的下拉菜单组件，提供了更优化的样式和更好的用户体验。

## 特性

- ✅ 完全透传 Element Plus 原组件的所有属性、事件和插槽
- ✅ 优化的视觉样式，更现代的设计风格
- ✅ 更好的交互效果（hover、active 状态）
- ✅ 支持自定义类名扩展样式
- ✅ 完全兼容 Element Plus 的 API

## 基础用法

```vue
<template>
  <el-dropdown>
    <span class="dropdown-link">
      下拉菜单
      <el-icon class="el-icon--right">
        <arrow-down />
      </el-icon>
    </span>
    <template #dropdown>
      <xs-dropdown-menu>
        <xs-dropdown-item>选项 1</xs-dropdown-item>
        <xs-dropdown-item>选项 2</xs-dropdown-item>
        <xs-dropdown-item>选项 3</xs-dropdown-item>
        <xs-dropdown-item disabled>禁用选项</xs-dropdown-item>
        <xs-dropdown-item divided>分割线选项</xs-dropdown-item>
      </xs-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { XsDropdownMenu, XsDropdownItem } from '@/components'
</script>
```

## 支持命令模式

```vue
<template>
  <el-dropdown @command="handleCommand">
    <span class="dropdown-link"> 操作菜单 </span>
    <template #dropdown>
      <xs-dropdown-menu>
        <xs-dropdown-item command="edit">编辑</xs-dropdown-item>
        <xs-dropdown-item command="delete">删除</xs-dropdown-item>
        <xs-dropdown-item command="share" divided>分享</xs-dropdown-item>
      </xs-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
const handleCommand = command => {
  console.log('command:', command)
}
</script>
```

## 自定义布局

```vue
<template>
  <xs-dropdown-menu>
    <!-- 左右布局 -->
    <xs-dropdown-item custom-class="xs-dropdown-item--justify">
      <span>设置</span>
      <i class="iconfont icon-setting"></i>
    </xs-dropdown-item>

    <!-- 居中布局 -->
    <xs-dropdown-item custom-class="xs-dropdown-item--center"> 居中内容 </xs-dropdown-item>
  </xs-dropdown-menu>
</template>
```

## 复杂内容

```vue
<template>
  <xs-dropdown-menu>
    <xs-dropdown-item>
      <div class="custom-item">
        <img src="avatar.jpg" class="avatar" />
        <div class="info">
          <div class="name">用户名</div>
          <div class="email">user@example.com</div>
        </div>
      </div>
    </xs-dropdown-item>
  </xs-dropdown-menu>
</template>
```

## Props

### XsDropdownMenu

| 参数        | 说明                                 | 类型   | 默认值 |
| ----------- | ------------------------------------ | ------ | ------ |
| customClass | 自定义类名                           | string | ''     |
| ...其他     | 支持 el-dropdown-menu 的所有原生属性 | -      | -      |

### XsDropdownItem

| 参数        | 说明                                 | 类型                 | 默认值 |
| ----------- | ------------------------------------ | -------------------- | ------ |
| customClass | 自定义类名                           | string               | ''     |
| command     | 命令值                               | string/number/object | -      |
| disabled    | 是否禁用                             | boolean              | false  |
| divided     | 是否显示分割线                       | boolean              | false  |
| ...其他     | 支持 el-dropdown-item 的所有原生属性 | -                    | -      |

## 样式特点

1. **圆角优化**：使用 8px 和 6px 的圆角，更现代
2. **间距优化**：内边距和外边距更加合理
3. **阴影效果**：使用柔和的阴影，提升层次感
4. **交互反馈**：hover、active 状态过渡流畅
5. **图标动效**：hover 时图标有轻微缩放效果
6. **禁用状态**：清晰的禁用样式

## 注意事项

1. 组件使用 `inheritAttrs: false` 和 `v-bind="$attrs"` 实现属性透传
2. 所有 Element Plus 的 dropdown 相关事件都能正常使用
3. 插槽内容完全自定义，支持任意内容
4. 样式基于项目现有的设计规范

## 迁移指南

如果你已经在使用 `el-dropdown-menu` 和 `el-dropdown-item`，迁移非常简单：

```vue
<!-- 之前 -->
<el-dropdown-menu>
  <el-dropdown-item>选项</el-dropdown-item>
</el-dropdown-menu>

<!-- 之后 -->
<xs-dropdown-menu>
  <xs-dropdown-item>选项</xs-dropdown-item>
</xs-dropdown-menu>
```

只需要替换组件名称即可，所有功能和 API 保持一致！
