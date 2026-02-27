<!--
 * @Author       : zhuiyue132
 * @Date         : 2025-08-08
 * @LastEditors: LMMQ 11288531+lmmq@user.noreply.gitee.com
 * @LastEditTime: 2025-08-27 19:06:05
 * @FilePath     : /ChatLLM/src/components/header/index-v2.vue
 * @Description  : header v2
 * 
-->
<template>
  <div class="header-v2-wrapper">
    <div class="header-v2-left">
      <!-- 移动端汉堡菜单按钮 -->
      <div v-if="isMobile" class="hamburger-btn" @click="toggleSidebar">
        <i class="iconfont icon-fenlan"></i>
      </div>
      <!-- 返回按钮（桌面端） -->
      <div v-else-if="showBackBtn && !isCollapsed">
        <div class="back-btn__wrapper" @click="handleBackClick">
          <i class="icon-arrowRight icon-back"></i>
          <span>返回</span>
        </div>
      </div>
    </div>

    <div class="header-v2-right">
      <!-- 用户头像 下拉菜单 -->
      <xs-dropdown
        placement="bottom-end"
        :show-arrow="false"
        :hide-on-click="true"
        trigger="click"
        :popper-options="setPopperPosition(2, 6)"
        custom-class="user-dropdown-menu-wrapper"
        @command="handleUserCommand"
        @visible-change="handleUserDropdownVisibleChange"
      >
        <el-avatar :size="40" style="cursor: pointer; border: 1px solid rgb(34 39 34 / 8%)" />
        <template #dropdown>
          <xs-dropdown-menu class="user-dropdown-menu">
            <!-- 用户信息区域 -->
            <div class="user-info-section">
              <!-- <el-avatar :src="headUrl" :size="40" style="border: 1px solid rgb(34 39 34 / 8%)" /> -->
              <div class="user-details">
                <div class="user-item user-name">User</div>
              </div>
            </div>

            <!-- 选择列表 -->
            <div class="user-operation-section">
              <xs-dropdown-item
                v-for="item in menuList"
                :key="item.command"
                :command="item.command"
                style="width: 100%; padding: 0"
              >
                <!-- 常规类型 -->
                <xs-dropdown-item :command="item.command" style="width: 100%; padding: 0">
                  <div class="user-operation-section-item">
                    <div class="user-operation-section-item-content">
                      <i :class="item.icon" style="margin-right: 8px"></i>
                      <span>{{ item.label }}</span>
                    </div>
                  </div>
                </xs-dropdown-item>
              </xs-dropdown-item>
            </div>
          </xs-dropdown-menu>
        </template>
      </xs-dropdown>
    </div>

    <!-- API 配置弹窗 -->
    <api-settings-dialog v-model="apiSettingsVisible" />
  </div>
</template>

<script setup>
import { computed, watch, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// import { useEventBus } from '@vueuse/core'
import { setPopperPosition } from '@/utils'
// import { AGENT_OPERATION_COMMAND } from '@/config/symbol'
import { useSidebar } from '@/hooks/use-sidebar'
import { XsDropdown, XsDropdownMenu, XsDropdownItem } from '../xs-dropdown'
import { useDebounceFn } from '@vueuse/core'
import ApiSettingsDialog from '@/components/api-settings-dialog/index.vue'

// const route = useRoute()
const router = useRouter()
// const eventBus = useEventBus(AGENT_OPERATION_COMMAND)

defineOptions({
  name: 'PageHeader'
})

defineProps({
  showBackBtn: {
    type: Boolean,
    default: false
  }
})

const { isCollapsed, isMobile, toggleSidebar } = useSidebar()

// API 配置弹窗显示状态
const apiSettingsVisible = ref(false)

const menuList = ref([
  {
    command: 'api-settings',
    icon: 'iconfont icon-setting',
    label: '设置'
  }
])

const handleUserCommand = useDebounceFn(command => {
  console.log('handleUserCommand', command)
  if (command === 'api-settings') {
    apiSettingsVisible.value = true
  }
}, 200)

const handleUserDropdownVisibleChange = visible => {}

const handleBackClick = () => {
  router.replace({
    path: '/completions'
  })
}
</script>

<style lang="scss">
.user-dropdown-menu-wrapper {
  width: 268px;

  .user-dropdown-menu {
    display: flex;
    flex-direction: column;

    @include flex-gap(16px, column);
  }
}

.user-info-section {
  display: flex;
  align-items: center;
  min-width: 200px;
  padding: 8px 16px 0;

  @include flex-gap(12px, row);

  .user-avatar {
    width: 48px;
  }

  .user-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    height: 20px;
  }

  .user-name {
    color: var(--text-normal-color);
    font-size: 14px;
    font-weight: 700;
    line-height: 100%;
  }

  .user-company {
    color: var(--text-dblight-color);
    font-size: 12px;
    font-weight: 400;
    line-height: 160%;
  }
}

.user-score-section {
  box-sizing: border-box;
  padding: 0 16px;

  .user-score-section-card {
    box-sizing: border-box;
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;

    @include flex-gap(4px, column);

    .user-score-label {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 20px;
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 400;
      line-height: 100%;

      @include flex-gap(8px, row);

      .user-score-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
      }

      .user-score-label-text {
        white-space: nowrap;
        font-size: 14px;
      }
    }

    .user-score-desc {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 20px;
      color: var(--text-tblight-color);
      font-size: 12px;
      font-weight: 400;
      line-height: 100%;
    }
  }

  .user-score-section-card-service {
    background: linear-gradient(91.04deg, #ffeabb 0.89%, #ffd281 99.29%);
  }
}

.user-operation-section {
  .user-operation-section-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 41px;
    padding: 0 16px;
    color: var(--text-normal-color);
    outline: none;

    &:active {
      color: var(--main-color, #007e54);
    }

    .user-operation-section-item-content {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 100%;

      @include flex-gap(8px, row);

      i {
        font-size: 20px;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.header-v2-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 72px;
  padding: 16px;
  background-color: var(--bg-header);

  .back-btn__wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s ease;
    letter-spacing: 0.84px;
    color: var(--text-normal-color);
    font-family: 'Source Han Sans CN', sans-serif;
    font-size: 16px;
    font-weight: 400;
    font-style: normal;
    line-height: 100%; /* 14px */

    @include flex-gap(4px, row);

    .icon-back {
      height: 20px;
      margin-right: 4px;
      transform: scaleX(-1);
      font-size: 20px;
      line-height: 22px;
    }

    span {
      vertical-align: middle;
      font-size: 16px;
      line-height: 20px;
    }
  }

  .header-v2-right {
    display: flex;
    align-items: center;

    @include flex-gap(12px, row);

    .agent-btn {
      height: 32px;
      padding: 8px 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--text-white-color);
      border: none;
      border-radius: 4px;
      outline: none;
      background-color: var(--main-color, #007e54);
      font-size: 14px;
      font-weight: 500;

      &:hover,
      &:active {
        opacity: 0.8;
      }

      i {
        margin: 0;
        padding: 0;
      }
    }
  }

  .hamburger-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    cursor: pointer;
    border-radius: 8px;
    transition: background-color 0.2s ease;

    .iconfont {
      font-size: 24px;
      color: var(--text-light-color);
    }

    &:active {
      background-color: var(--bg-hover);
    }
  }

  @include mobile {
    height: 56px;
    padding: 8px 12px;
  }
}
</style>
