# v-overflow-title 指令

一个只在文字溢出时才显示提示的 Vue 指令。基于原有的 `v-title` 指令进行封装，增加了文字溢出检测功能。

## 功能特点

- ✅ **智能溢出检测**: 自动检测元素是否有文字溢出（支持单行和多行）
- ✅ **条件显示**: 只有在文字溢出时才显示title提示
- ✅ **多种配置方式**: 支持字符串、对象、函数等多种配置格式
- ✅ **自动文本获取**: 当没有配置值时，自动使用元素的文本内容
- ✅ **异步函数支持**: 支持异步函数动态生成标题内容
- ✅ **关键词高亮**: 支持关键词高亮显示
- ✅ **延迟显示**: 智能延迟显示，提供更好的用户体验
- ✅ **边界检测**: 自动调整位置，确保提示框始终在可视区域内

## 溢出检测原理

指令会检测以下情况来判断是否有文字溢出：

1. **水平溢出**: `element.scrollWidth > element.clientWidth`
2. **垂直溢出**: `element.scrollHeight > element.clientHeight`
3. **CSS样式检测**: 检测是否设置了 `overflow: hidden`、`text-overflow: ellipsis`、`white-space: nowrap` 等相关样式

## 使用方式

### 1. 基础用法（自动使用元素文本）

当元素文字溢出时，自动显示元素的文本内容：

```html
<div
  style="width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
  v-overflow-title
>
  这是一段很长的文字，会被截断显示省略号
</div>
```

### 2. 自定义提示文字

```html
<div
  style="width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
  v-overflow-title="'这是自定义的提示文字'"
>
  截断的文字
</div>
```

### 3. 对象配置（支持关键词高亮）

```html
<div
  style="width: 200px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
  v-overflow-title="{ 
       title: '这是带关键词的提示文字', 
       keyWord: ['关键词'], 
       color: 'red' 
     }"
>
  包含关键词的长文本
</div>
```

### 4. 函数配置

```html
<div
  v-overflow-title="(el) => el.dataset.fullText"
  data-full-text="完整的文本内容"
  style="width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
>
  截断的文本
</div>
```

### 5. 异步函数配置

```html
<div
  v-overflow-title="async (el) => await fetchFullText(el.dataset.id)"
  data-id="123"
  style="width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
>
  截断的文本
</div>
```

### 6. 多行文本溢出

```html
<div
  style="width: 200px; height: 60px; overflow: hidden; 
            display: -webkit-box; -webkit-line-clamp: 3; 
            -webkit-box-orient: vertical;"
  v-overflow-title
>
  这是一段很长的多行文本，会在第三行被截断， 超出的部分会被隐藏。当鼠标悬浮时，
  如果文本确实溢出了，就会显示完整的文本内容。
</div>
```

## 配置选项

### 字符串配置

```javascript
v-overflow-title="'提示文字'"
```

### 对象配置

```javascript
{
  title: '提示文字',           // 必需，要显示的文本
  keyWord: ['关键词'],         // 可选，要高亮的关键词数组
  color: '#ff0000',           // 可选，关键词高亮颜色
  openDelay: 150,             // 可选，显示延迟时间（毫秒）
  closeDelay: 150,            // 可选，隐藏延迟时间（毫秒）
  checkMultiline: true        // 可选，是否检查多行文本溢出
}
```

### 函数配置

```javascript
// 同步函数
el => el.textContent

// 异步函数
async el => await api.getTitle(el.dataset.id)
```

## 常见使用场景

### 1. 表格单元格文字溢出

```html
<table>
  <tr>
    <td
      style="max-width: 150px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
      v-overflow-title
    >
      很长的表格内容会被截断
    </td>
  </tr>
</table>
```

### 2. 卡片标题溢出

```html
<div class="card">
  <h3
    style="width: 200px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
    v-overflow-title
  >
    很长的卡片标题会被截断显示省略号
  </h3>
</div>
```

### 3. 文件名显示

```html
<div
  class="file-name"
  style="max-width: 180px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
  v-overflow-title="getFullFileName"
>
  very-long-filename-that-will-be-truncated.pdf
</div>
```

### 4. 多行文本卡片

```html
<div
  class="text-card"
  style="width: 300px; height: 80px; overflow: hidden; 
            display: -webkit-box; -webkit-line-clamp: 3; 
            -webkit-box-orient: vertical;"
  v-overflow-title
>
  这是一段很长的描述文字，可能会超过3行的限制， 超出的部分会被隐藏。只有当文字确实溢出时，
  鼠标悬浮才会显示完整的内容。
</div>
```

## 与 v-title 指令的区别

| 特性     | v-title              | v-overflow-title    |
| -------- | -------------------- | ------------------- |
| 显示条件 | 始终在鼠标悬浮时显示 | 只在文字溢出时显示  |
| 溢出检测 | ❌ 不检测            | ✅ 智能检测         |
| 自动文本 | ❌ 需要手动配置      | ✅ 自动获取元素文本 |
| 适用场景 | 通用提示             | 文字截断场景        |

## Bug修复记录

### v1.1.0 - 修复tooltip残留问题

**问题描述**: 当鼠标从有文字溢出的元素移动到没有文字溢出的元素时，原本应该消失的tooltip会一直停留在页面上，直到鼠标离开元素才消失。

**修复方案**: 在 `onElementEnter` 和 `onElementMouseMove` 方法中，当检测到元素没有文字溢出时，主动调用 `hideTitle()` 方法隐藏当前显示的tooltip。

**测试方法**:

1. 鼠标悬浮在有溢出的文本上，等待tooltip显示
2. 直接移动到无溢出的文本上（不离开第一个元素的边界）
3. 观察tooltip是否立即开始消失

## 注意事项

1. **CSS样式要求**: 元素需要设置相应的CSS样式来实现文字溢出效果（如 `overflow: hidden`、`text-overflow: ellipsis` 等）

2. **性能考虑**: 指令会在每次鼠标悬浮时检测溢出状态，对于大量元素建议节流使用

3. **动态内容**: 如果元素内容会动态变化，建议使用函数配置来获取最新的文本内容

4. **多行文本**: 对于多行文本溢出检测，确保设置了正确的CSS样式（如 `-webkit-line-clamp`）

## 样式定制

指令创建的提示框使用 `.xs-custom-overflow-title` 类名，你可以通过CSS来自定义样式：

```css
.xs-custom-overflow-title {
  background: rgba(0, 0, 0, 0.8) !important;
  color: white !important;
  padding: 8px 12px !important;
  border-radius: 6px !important;
  font-size: 14px !important;
  max-width: 350px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}
```
