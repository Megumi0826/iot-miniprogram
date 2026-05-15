<script lang="ts" setup>
import { computed } from 'vue'

interface Props {
  title: string
  subtitle?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
})

const systemInfo = uni.getSystemInfoSync()
const menuButton = uni.getMenuButtonBoundingClientRect()

const headerStyle = computed(() => {
  const capsuleRightGap = systemInfo.windowWidth - menuButton.left

  return {
    paddingTop: `${menuButton.top}px`,
    paddingRight: `${capsuleRightGap + 12}px`,
  }
})

const mainStyle = computed(() => ({
  minHeight: `${menuButton.height}px`,
}))
</script>

<template>
  <view class="yt-page-header" :style="headerStyle">
    <view class="yt-page-header__main" :style="mainStyle">
      <view class="yt-page-header__title">
        {{ title }}
      </view>
      <view v-if="subtitle" class="yt-page-header__subtitle">
        {{ subtitle }}
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.yt-page-header {
  box-sizing: border-box;
  padding-left: 32rpx;
  padding-bottom: 28rpx;
  color: var(--app-text);
}

.yt-page-header__main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.yt-page-header__title {
  font-size: 52rpx;
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: 0;
}

.yt-page-header__subtitle {
  margin-top: 10rpx;
  color: var(--app-text-muted);
  font-size: 26rpx;
  line-height: 1.45;
}
</style>
