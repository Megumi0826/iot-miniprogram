<script lang="ts" setup>
import { ref } from 'vue'
import { useTokenStore } from '@/store/token'
import { isPageTabbar } from '@/tabbar/store'

definePage({
  style: {
    navigationBarTitleText: '登录',
  },
})

const tokenStore = useTokenStore()

const loading = ref(false)
const agreed = ref(false)
const redirect = ref('')

onLoad((query) => {
  redirect.value = query?.redirect ? decodeURIComponent(String(query.redirect)) : ''
})

function toggleAgreement() {
  agreed.value = !agreed.value
}

function goAfterLogin() {
  const target = redirect.value || '/pages/index/index'
  const targetPath = target.split('?')[0]

  if (isPageTabbar(targetPath)) {
    uni.switchTab({ url: targetPath })
    return
  }

  uni.reLaunch({ url: target })
}

async function handleLogin() {
  if (loading.value)
    return

  if (!agreed.value) {
    uni.showToast({
      title: '请先同意用户协议和隐私政策',
      icon: 'none',
    })
    return
  }

  loading.value = true
  try {
    await tokenStore.wxLogin()
    goAfterLogin()
  }
  catch (error) {
    console.error('微信登录失败:', error)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="login-page">
    <view class="login-top" />

    <view class="login-hero">
      <view class="login-orb">
        <view class="login-orb__ring" />
        <view class="login-orb__core">
          <view class="i-carbon-network-4 text-70rpx" />
        </view>
      </view>

      <view class="login-title">
        智联未来
      </view>
      <view class="login-subtitle">
        智能设备与健康数据管理平台
      </view>
    </view>

    <view class="login-panel">
      <wd-button
        block
        size="large"
        type="primary"
        :loading="loading"
        custom-class="login-button"
        @click="handleLogin"
      >
        微信一键登录
      </wd-button>

      <view class="login-agreement" @click="toggleAgreement">
        <view class="login-check" :class="{ checked: agreed }">
          <view v-if="agreed" class="i-carbon-checkmark text-22rpx" />
        </view>
        <text>我已阅读并同意</text>
        <text class="login-link">用户协议</text>
        <text>和</text>
        <text class="login-link">隐私政策</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  padding: calc(env(safe-area-inset-top) + 28rpx) 40rpx 56rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 74% 18%, var(--app-primary-soft), transparent 34%),
    radial-gradient(circle at 12% 76%, rgba(54, 217, 255, 0.12), transparent 30%), var(--app-page-bg);
  color: var(--app-text);
}

.login-top {
  display: flex;
  justify-content: flex-start;
}

.login-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 110rpx;
  text-align: center;
}

.login-orb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220rpx;
  height: 220rpx;
}

.login-orb__ring {
  position: absolute;
  inset: 0;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: radial-gradient(circle, var(--app-primary-soft), transparent 64%);
  box-shadow: 0 0 56rpx var(--app-primary-soft);
}

.login-orb__core {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132rpx;
  height: 132rpx;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  background: var(--app-surface);
  color: var(--app-primary);
}

.login-title {
  margin-top: 28rpx;
  font-size: 52rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.login-subtitle {
  margin-top: 14rpx;
  color: var(--app-text-muted);
  font-size: 28rpx;
}

.login-panel {
  margin-top: 140rpx;
}

:deep(.login-button) {
  height: 96rpx;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 40rpx var(--app-primary-soft);
}

.login-agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 28rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 36rpx;
}

.login-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28rpx;
  height: 28rpx;
  border: 1px solid var(--app-border);
  border-radius: 8rpx;
  color: #fff;
  box-sizing: border-box;
}

.login-check.checked {
  border-color: var(--app-primary);
  background: var(--app-primary);
}

.login-link {
  color: var(--app-primary);
}
</style>
