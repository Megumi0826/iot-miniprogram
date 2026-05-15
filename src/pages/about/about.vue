<script lang="ts" setup>
definePage({
  style: {
    navigationBarTitleText: '关于',
  },
})
</script>

<template>
  <view class="about-page">
    <yt-page-header
      title="关于"
    >
      <view class="px-4 py-4">
        <view class="border border-[var(--app-border)] rounded-24rpx bg-[var(--app-surface)] p-4">
          <view class="text-36rpx text-[var(--app-text)] font-600">
            Tabbar 遮挡测试
          </view>
          <view class="mt-2 text-26rpx text-[var(--app-text-muted)]">
            这个页面用来测试长内容滚动到底部时，最后一块内容是否会被底部自定义 tabbar 遮住。
          </view>
        </view>

        <view class="mt-4 space-y-3">
          <view
            v-for="item in 10"
            :key="item"
            class="border border-[var(--app-border)] rounded-20rpx bg-[var(--app-surface)] p-4 text-[var(--app-text)]"
          >
            测试内容 {{ item }}
          </view>
        </view>

        <view class="mt-4 border border-[var(--app-primary)] rounded-24rpx bg-[var(--app-primary-soft)] p-4 text-center text-[var(--app-text)]">
          如果这块内容完整显示在 tabbar 上方，说明页面底部安全距离是够的。
        </view>
      </view>
    </yt-page-header>
  </view>
</template>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;

  box-sizing: border-box;
}
</style>
