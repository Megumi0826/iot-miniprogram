<script lang="ts" setup>
const menuButton = uni.getMenuButtonBoundingClientRect()

const floatStyle = computed(() => ({
  top: `${menuButton.bottom + 16}px`,
  right: '28rpx',
}))
</script>

<template>
  <view class="theme-float" :style="floatStyle">
    <yt-theme-toggle />
  </view>
</template>

<style lang="scss" scoped>
  .theme-float {
  position: fixed;
  z-index: 1200;
}
</style>
