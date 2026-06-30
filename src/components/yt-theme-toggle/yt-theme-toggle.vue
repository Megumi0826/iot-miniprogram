<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { onUnmounted, ref } from 'vue'
import { useThemeStore } from '@/store/theme'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)
const isUserToggling = ref(false)
let toggleTimer: ReturnType<typeof setTimeout> | null = null

function handleToggle() {
  isUserToggling.value = true

  if (toggleTimer) {
    clearTimeout(toggleTimer)
  }

  themeStore.toggleTheme()

  toggleTimer = setTimeout(() => {
    isUserToggling.value = false
    toggleTimer = null
  }, 320)
}

onUnmounted(() => {
  if (toggleTimer) {
    clearTimeout(toggleTimer)
  }
})
</script>

<template>
  <view
    class="theme-switch"
    :class="{ 'is-dark': isDark, 'is-user-toggling': isUserToggling }"
    role="button"
    @click="handleToggle"
  >
    <view class="theme-switch__sky">
      <view class="theme-switch__cloud theme-switch__cloud--one" />
      <view class="theme-switch__cloud theme-switch__cloud--two" />
      <view class="theme-switch__star theme-switch__star--one" />
      <view class="theme-switch__star theme-switch__star--two" />
      <view class="theme-switch__star theme-switch__star--three" />
    </view>

    <view class="theme-switch__thumb">
      <view :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.theme-switch {
  position: relative;
  width: 112rpx;
  height: 56rpx;
  overflow: hidden;
  border: 1px solid rgba(109, 76, 255, 0.18);
  border-radius: 999rpx;
  background: linear-gradient(135deg, #9bd7ff 0%, #eaf7ff 100%);
  box-shadow: 0 8rpx 24rpx rgba(109, 76, 255, 0.16);
}

.theme-switch.is-user-toggling {
  transition:
    background 0.28s ease,
    border-color 0.28s ease,
    box-shadow 0.28s ease;
}

.theme-switch.is-dark {
  border-color: rgba(139, 92, 246, 0.36);
  background: linear-gradient(135deg, #121936 0%, #2a2458 100%);
  box-shadow: 0 8rpx 28rpx rgba(139, 92, 246, 0.24);
}

.theme-switch__sky {
  position: absolute;
  inset: 0;
}

.theme-switch__thumb {
  position: absolute;
  top: 6rpx;
  left: 6rpx;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  color: #fff;
  border-radius: 50%;
  background: #ffd34d;
  box-shadow: 0 4rpx 12rpx rgba(255, 181, 30, 0.45);
}

.theme-switch.is-user-toggling .theme-switch__thumb {
  transition:
    transform 0.28s ease,
    background-color 0.28s ease,
    color 0.28s ease,
    box-shadow 0.28s ease;
}

.theme-switch.is-dark .theme-switch__thumb {
  color: #5d6475;
  background: #d7dbe7;
  box-shadow: 0 4rpx 14rpx rgba(214, 219, 231, 0.28);
  transform: translateX(56rpx);
}

.theme-switch__cloud,
.theme-switch__star {
  position: absolute;
}

.theme-switch.is-user-toggling .theme-switch__cloud,
.theme-switch.is-user-toggling .theme-switch__star {
  transition:
    opacity 0.24s ease,
    transform 0.28s ease;
}

.theme-switch__cloud {
  width: 34rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
}

.theme-switch__cloud::before,
.theme-switch__cloud::after {
  position: absolute;
  content: '';
  border-radius: 50%;
  background: inherit;
}

.theme-switch__cloud::before {
  left: 7rpx;
  top: -8rpx;
  width: 18rpx;
  height: 18rpx;
}

.theme-switch__cloud::after {
  right: 5rpx;
  top: -5rpx;
  width: 14rpx;
  height: 14rpx;
}

.theme-switch__cloud--one {
  right: 14rpx;
  bottom: 11rpx;
}

.theme-switch__cloud--two {
  right: 31rpx;
  top: 12rpx;
  transform: scale(0.72);
  opacity: 0.72;
}

.theme-switch.is-dark .theme-switch__cloud {
  opacity: 0;
  transform: translateX(-12rpx);
}

.theme-switch__star {
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: #ffffff;
  opacity: 0;
}

.theme-switch__star--one {
  left: 18rpx;
  top: 14rpx;
}

.theme-switch__star--two {
  left: 34rpx;
  top: 30rpx;
  width: 4rpx;
  height: 4rpx;
}

.theme-switch__star--three {
  left: 50rpx;
  top: 16rpx;
  width: 3rpx;
  height: 3rpx;
}

.theme-switch.is-dark .theme-switch__star {
  opacity: 1;
}
</style>
