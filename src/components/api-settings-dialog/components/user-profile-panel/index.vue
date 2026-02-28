<!--
 * @Author       : zhuiyue132
 * @Date         : 2026-02-28
 * @LastEditors  : zhuiyue132
 * @LastEditTime : 2026-02-28
 * @FilePath     : /ChatLLM/src/components/api-settings-dialog/components/user-profile-panel/index.vue
 * @Description  : 用户信息设置面板
-->

<template>
  <div class="user-profile-panel">
    <div class="panel-header">
      <div class="panel-title">用户信息</div>
      <div class="panel-desc">设置用户名和头像，头像会以 base64 形式保存在本地配置</div>
    </div>

    <div class="panel-body">
      <div class="profile-card">
        <div class="avatar-section">
          <el-avatar :size="88" :src="avatarPreview" class="user-avatar">
            {{ avatarFallbackText }}
          </el-avatar>
          <div class="avatar-actions">
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              :limit="1"
              accept="image/*"
              @change="handleAvatarChange"
            >
              <el-button type="primary" plain>上传头像</el-button>
            </el-upload>
            <el-button text :disabled="!profileForm.avatarBase64" @click="handleRemoveAvatar">
              移除头像
            </el-button>
          </div>
          <div class="setting-tip">建议上传 2MB 以内图片，支持常见图片格式</div>
        </div>

        <el-form label-position="top" class="settings-form">
          <el-form-item label="用户名">
            <el-input
              v-model="profileForm.username"
              maxlength="30"
              show-word-limit
              clearable
              placeholder="请输入用户名"
            />
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserProfileStore } from '@/stores/user-profile'

defineOptions({
  name: 'UserProfilePanel'
})

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const userProfileStore = useUserProfileStore()

const profileForm = reactive({
  username: '',
  avatarBase64: ''
})

const avatarPreview = computed(() => profileForm.avatarBase64 || '')
const avatarFallbackText = computed(() => {
  const name = `${profileForm.username || ''}`.trim()
  return (name || 'U').slice(0, 1).toUpperCase()
})

const fileToBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result || '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const loadFromStore = () => {
  profileForm.username = userProfileStore.username || ''
  profileForm.avatarBase64 = userProfileStore.avatarBase64 || ''
}

const persistProfile = () => {
  userProfileStore.updateProfile({
    username: profileForm.username,
    avatarBase64: profileForm.avatarBase64
  })
}

const handleAvatarChange = async uploadFile => {
  const rawFile = uploadFile?.raw
  if (!rawFile) return

  if (!`${rawFile.type || ''}`.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  if (rawFile.size > 2 * 1024 * 1024) {
    ElMessage.warning('头像大小不能超过 2MB')
    return
  }

  try {
    profileForm.avatarBase64 = await fileToBase64(rawFile)
    ElMessage.success('头像更新成功')
  } catch (e) {
    ElMessage.error('头像读取失败，请重试')
  }
}

const handleRemoveAvatar = () => {
  profileForm.avatarBase64 = ''
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      loadFromStore()
    }
  },
  { immediate: true }
)

watch(profileForm, persistProfile, { deep: true })
</script>

<style lang="scss" scoped>
.user-profile-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.panel-header {
  flex-shrink: 0;
  margin-bottom: 24px;

  .panel-title {
    margin-bottom: 8px;
    color: var(--text-normal-color);
    font-size: 18px;
    font-weight: 600;
  }

  .panel-desc {
    color: var(--text-dblight-color);
    font-size: 14px;
  }
}

.panel-body {
  flex: 1;
  overflow-y: auto;
}

.profile-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  border: 1px solid var(--border-color-light);
  border-radius: 10px;
  background: var(--bg-panel);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.avatar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-form {
  :deep(.el-form-item) {
    margin-bottom: 0;

    .el-form-item__label {
      padding-bottom: 6px;
      color: var(--text-normal-color);
      font-size: 14px;
      font-weight: 500;
      line-height: 22px;
    }

    .el-input {
      .el-input__wrapper {
        padding: 8px 12px;
        border-radius: 6px;
      }
    }
  }
}

.setting-tip {
  color: var(--text-dblight-color);
  font-size: 12px;
  line-height: 18px;
}
</style>
