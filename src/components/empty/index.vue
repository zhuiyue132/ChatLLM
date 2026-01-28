<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-07-22
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2025-08-12
 * @FilePath     : /bi-agents/src/components/empty/index.vue
 * @Description  : empty 组件
 * 
-->

<template>
  <div class="bi-empty">
    <el-empty
      :image="imageUrl"
      :image-size="imageSize || '100%'"
      :description="computedDescription"
      class="bi-empty__content"
    >
      <!-- 自定义图片插槽 -->
      <template v-if="$slots.image" #image>
        <slot name="image"></slot>
      </template>

      <!-- 自定义描述插槽 -->
      <template v-if="$slots.description" #description>
        <slot name="description"></slot>
      </template>

      <!-- 默认描述 -->
      <template v-else-if="computedDescription" #description>
        <p class="bi-empty__description">{{ computedDescription }}</p>
      </template>

      <!-- 操作按钮插槽 -->
      <template v-if="$slots.default || showAction" #default>
        <slot>
          <el-button v-if="showAction" :type="actionType" :size="actionSize" @click="handleAction">
            {{ actionText }}
          </el-button>
        </slot>
      </template>
    </el-empty>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import emptyImg from '@/assets/images/agents/empty.png'
import noSearchImg from '@/assets/images/common/no-search-result.png'
import page404Img from '@/assets/images/common/page-404.png'

const props = defineProps({
  // 空状态类型：data（无数据）、search（无搜索结果）、404（页面不存在）、custom（自定义）
  type: {
    type: String,
    default: 'data',
    validator: value => ['data', 'search', '404', 'custom'].includes(value)
  },
  // 自定义图片地址
  image: {
    type: String,
    default: ''
  },
  // 图片尺寸
  imageSize: {
    type: Number,
    default: null
  },
  // 描述文本
  description: {
    type: String,
    default: ''
  },
  // 是否显示操作按钮
  showAction: {
    type: Boolean,
    default: false
  },
  // 操作按钮文本
  actionText: {
    type: String,
    default: '重新加载'
  },
  // 操作按钮类型
  actionType: {
    type: String,
    default: 'primary'
  },
  // 操作按钮尺寸
  actionSize: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['action'])

// 预设配置
const presetConfig = {
  data: {
    image: emptyImg,
    description: '暂无数据'
  },
  search: {
    image: noSearchImg,
    description: '未找到相关内容'
  },
  404: {
    image: page404Img,
    description: '页面不存在'
  },
  custom: {
    image: '',
    description: ''
  }
}

// 计算图片地址
const imageUrl = computed(() => {
  if (props.image) {
    return props.image
  }
  return presetConfig[props.type]?.image || presetConfig.data.image
})

// 计算描述文本
const computedDescription = computed(() => {
  if (props.description) {
    return props.description
  }
  return presetConfig[props.type]?.description || presetConfig.data.description
})

// 处理操作按钮点击
const handleAction = () => {
  emit('action')
}
</script>

<style lang="scss" scoped>
.bi-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 200px;

  &__content {
    :deep(.el-empty__image) {
      margin-bottom: 20px;

      img {
        max-width: 100%;
        height: auto;
      }
    }

    :deep(.el-empty__description) {
      margin-bottom: 20px;
    }
  }

  &__description {
    margin: 0;
    color: var(--text-tblight-color, #bfbfbf);
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
  }
}
</style>
