<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { uploadUserAvatar } from '@/api/login'
import { LOGIN_PAGE } from '@/router/config'
import { useUserStore } from '@/store'
import { useTokenStore } from '@/store/token'

definePage({
  style: {
    navigationBarTitleText: '我的',
  },
})

const userStore = useUserStore()
const tokenStore = useTokenStore()
const { userInfo } = storeToRefs(userStore)
const avatarUploading = ref(false)

const displayName = computed(() => {
  return userInfo.value.nickname || userInfo.value.username || '微信用户'
})

const avatarUrl = computed(() => {
  return userInfo.value.avatar || '/static/images/default-avatar.png'
})

function handleTodo() {
  uni.showToast({
    title: '开发中',
    icon: 'none',
  })
}

function handleChooseAvatar(event: any) {
  const tempAvatarUrl = event.detail?.avatarUrl
  if (!tempAvatarUrl) {
    uni.showToast({
      title: '未选择头像',
      icon: 'none',
    })
    return
  }

  avatarUploading.value = true
  const { run } = uploadUserAvatar(tempAvatarUrl, {
    onSuccess: async (avatar) => {
      userStore.setUserAvatar(avatar as unknown as string)
      await userStore.fetchUserInfo()
      uni.showToast({
        title: '头像更新成功',
        icon: 'success',
      })
    },
    onError: () => {
      uni.showToast({
        title: '头像上传失败',
        icon: 'none',
      })
    },
    onComplete: () => {
      avatarUploading.value = false
    },
  })

  run()
}

async function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (!res.confirm)
        return

      await tokenStore.logout()

      uni.showToast({
        title: '退出登录成功',
        icon: 'success',
      })

      uni.reLaunch({
        url: `${LOGIN_PAGE}?redirect=${encodeURIComponent('/pages/me/me')}`,
      })
    },
  })
}
</script>

<template>
  <view class="me-page">
    <yt-page-header title="我的" subtitle="管理账号资料与设备偏好" />

    <view class="me-content">
      <view class="profile-card" @click="handleTodo">
        <button
          class="avatar-button"
          open-type="chooseAvatar"
          @click.stop
          @chooseavatar="handleChooseAvatar"
        >
          <image class="profile-avatar" :src="avatarUrl" mode="aspectFill" />
          <view v-if="avatarUploading" class="avatar-mask">
            上传中
          </view>
        </button>
        <view class="profile-main">
          <view class="profile-name">
            {{ displayName }}
          </view>
          <view class="profile-desc">
            完善头像、昵称与健康资料
          </view>
        </view>
        <view class="profile-action">
          完善资料
        </view>
      </view>

      <view class="menu-card">
        <view class="menu-item" @click="handleTodo">
          <view class="menu-left">
            <view class="menu-icon i-carbon-user-profile" />
            <view class="menu-title">
              个人资料
            </view>
          </view>
          <view class="menu-arrow i-carbon-chevron-right" />
        </view>

        <view class="menu-item" @click="handleTodo">
          <view class="menu-left">
            <view class="menu-icon i-carbon-devices" />
            <view class="menu-title">
              我的设备
            </view>
          </view>
          <view class="menu-arrow i-carbon-chevron-right" />
        </view>

        <view class="menu-item" @click="handleTodo">
          <view class="menu-left">
            <view class="menu-icon i-carbon-information" />
            <view class="menu-title">
              关于我们
            </view>
          </view>
          <view class="menu-arrow i-carbon-chevron-right" />
        </view>
      </view>

      <wd-button
        block
        type="danger"
        size="large"
        custom-class="logout-button"
        @click="handleLogout"
      >
        退出登录
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.me-page {
  min-height: 100vh;
  background: var(--app-bg);
  color: var(--app-text);
}

.me-content {
  padding: 0 32rpx 48rpx;
}

.profile-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  border: 1px solid var(--app-border);
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: 0 18rpx 48rpx var(--app-primary-soft);
}

.avatar-button {
  position: relative;
  flex-shrink: 0;
  width: 112rpx;
  height: 112rpx;
  padding: 0;
  overflow: hidden;
  border-radius: 50%;
  background: var(--app-surface-2);
  line-height: 1;

  &::after {
    border: 0;
  }
}

.profile-avatar {
  width: 112rpx;
  height: 112rpx;
  border: 2rpx solid var(--app-border);
  border-radius: 50%;
  background: var(--app-surface-2);
  box-sizing: border-box;
}

.avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20rpx;
  background: rgb(0 0 0 / 45%);
}

.profile-main {
  min-width: 0;
  flex: 1;
  margin-left: 24rpx;
}

.profile-name {
  overflow: hidden;
  color: var(--app-text);
  font-size: 34rpx;
  font-weight: 700;
  line-height: 44rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-desc {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 34rpx;
}

.profile-action {
  flex-shrink: 0;
  margin-left: 16rpx;
  color: var(--app-primary);
  font-size: 24rpx;
}

.menu-card {
  margin-top: 28rpx;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 28rpx;
  background: var(--app-surface);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 104rpx;
  padding: 0 28rpx;
  border-bottom: 1px solid var(--app-border);
}

.menu-item:last-child {
  border-bottom: 0;
}

.menu-left {
  display: flex;
  align-items: center;
  min-width: 0;
}

.menu-icon {
  flex-shrink: 0;
  color: var(--app-primary);
  font-size: 40rpx;
}

.menu-title {
  margin-left: 20rpx;
  color: var(--app-text);
  font-size: 30rpx;
}

.menu-arrow {
  color: var(--app-text-subtle);
  font-size: 32rpx;
}

:deep(.logout-button) {
  margin-top: 48rpx;
  height: 92rpx;
  border-radius: 24rpx;
}
</style>
