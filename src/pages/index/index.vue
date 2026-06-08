<script lang="ts" setup>
defineOptions({
  name: 'Home',
})

definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
  },
})

function goAddDevice() {
  uni.navigateTo({
    url: '/pages/device/add',
  })
}
</script>

<template>
  <view class="home-page">
    <yt-page-header title="首页" subtitle="管理设备连接与近场蓝牙操作" />

    <view class="home-content">
      <view class="quick-card" @click="goAddDevice">
        <view class="quick-icon">
          <view class="i-carbon-bluetooth" />
        </view>

        <view class="quick-main">
          <view class="quick-title">
            添加设备
          </view>
          <view class="quick-desc">
            扫描附近蓝牙设备，连接后可继续配网或查看实时数据
          </view>
        </view>

        <view class="quick-arrow i-carbon-chevron-right" />
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 78% 8%, var(--app-primary-soft), transparent 30%),
    radial-gradient(circle at 8% 40%, rgba(54, 217, 255, 0.09), transparent 24%), var(--app-bg);
  color: var(--app-text);
}

.home-content {
  padding: 0 32rpx 48rpx;
}

.quick-card {
  display: flex;
  align-items: center;
  min-height: 148rpx;
  padding: 28rpx;
  border: 1px solid var(--app-border);
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: 0 18rpx 48rpx var(--app-primary-soft);
  box-sizing: border-box;
}

.quick-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border: 1px solid var(--app-border);
  border-radius: 24rpx;
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.32), transparent 32%),
    linear-gradient(145deg, var(--app-cyan), var(--app-primary));
  color: #ffffff;
  font-size: 50rpx;
  box-shadow: 0 12rpx 32rpx var(--app-primary-soft);
}

.quick-main {
  min-width: 0;
  flex: 1;
  margin-left: 24rpx;
}

.quick-title {
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 42rpx;
}

.quick-desc {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 36rpx;
}

.quick-arrow {
  flex-shrink: 0;
  margin-left: 20rpx;
  color: var(--app-text-subtle);
  font-size: 34rpx;
}
</style>
