<script lang="ts" setup>
import type { DeviceSleepReportResp } from '@/api/types/device'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useThemeStore } from '@/store/theme'

interface Props {
  report?: DeviceSleepReportResp | null
}

const props = withDefaults(defineProps<Props>(), {
  report: null,
})

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

const largeRatio = computed(() => normalizeRatio(props.report?.largeMoveRatio))
const smallRatio = computed(() => normalizeRatio(props.report?.smallMoveRatio))
const ringStyle = computed(() => ({
  background: `conic-gradient(#ff73c7 0 ${largeRatio.value}%, #44b9ff ${largeRatio.value}% 100%)`,
}))

function normalizeRatio(value?: number) {
  if (value == null || Number.isNaN(value)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100))
}

function formatRatio(value: number) {
  return `${value.toFixed(value < 10 && value > 0 ? 1 : 0)}%`
}
</script>

<template>
  <view class="motion-ring" :class="{ 'is-dark': isDark }">
    <view class="motion-ring__head">
      <view>
        <view class="motion-ring__title">
          体动比例
        </view>
        <view class="motion-ring__subtitle">
          大体动 / 小体动
        </view>
      </view>
    </view>

    <view class="motion-ring__body">
      <view class="motion-ring__chart" :style="ringStyle">
        <view class="motion-ring__center">
          <view class="motion-ring__number">
            {{ formatRatio(largeRatio) }}
          </view>
          <view class="motion-ring__label">
            大体动
          </view>
        </view>
      </view>

      <view class="motion-ring__legend">
        <view class="motion-ring__legend-item">
          <view class="motion-ring__dot is-large" />
          <view>
            <view class="motion-ring__legend-name">
              大体动
            </view>
            <view class="motion-ring__legend-value">
              {{ formatRatio(largeRatio) }}
            </view>
          </view>
        </view>

        <view class="motion-ring__legend-item">
          <view class="motion-ring__dot is-small" />
          <view>
            <view class="motion-ring__legend-name">
              小体动
            </view>
            <view class="motion-ring__legend-value">
              {{ formatRatio(smallRatio) }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.motion-ring {
  padding: 28rpx;
  border: 1px solid rgba(147, 127, 255, 0.18);
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 255, 0.9)), var(--app-surface);
  box-shadow: 0 18rpx 46rpx var(--app-shadow);
  box-sizing: border-box;
  backdrop-filter: blur(18rpx);
}

.motion-ring.is-dark {
  border-color: rgba(147, 127, 255, 0.22);
  background: linear-gradient(145deg, rgba(21, 28, 64, 0.98), rgba(12, 17, 42, 0.94)), var(--app-surface);
  box-shadow: 0 18rpx 46rpx rgba(0, 0, 0, 0.24);
}

.motion-ring__title {
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 850;
  line-height: 42rpx;
}

.motion-ring__subtitle {
  margin-top: 6rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 32rpx;
}

.motion-ring__body {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-top: 28rpx;
}

.motion-ring__chart {
  position: relative;
  flex: 0 0 auto;
  width: 188rpx;
  height: 188rpx;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.22),
    0 18rpx 38rpx rgba(68, 185, 255, 0.18);
}

.motion-ring__center {
  position: absolute;
  top: 22rpx;
  right: 22rpx;
  bottom: 22rpx;
  left: 22rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--app-surface);
}

.motion-ring__number {
  color: var(--app-text);
  font-size: 36rpx;
  font-weight: 900;
  line-height: 42rpx;
}

.motion-ring__label {
  margin-top: 4rpx;
  color: var(--app-text-muted);
  font-size: 21rpx;
}

.motion-ring__legend {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 0;
}

.motion-ring__legend-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  border-radius: 18rpx;
  background: rgba(147, 127, 255, 0.08);
  box-sizing: border-box;
}

.motion-ring.is-dark .motion-ring__legend-item {
  background: rgba(147, 127, 255, 0.12);
}

.motion-ring__dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
}

.motion-ring__dot.is-large {
  background: #ff73c7;
  box-shadow: 0 0 18rpx rgba(255, 115, 199, 0.45);
}

.motion-ring__dot.is-small {
  background: #44b9ff;
  box-shadow: 0 0 18rpx rgba(68, 185, 255, 0.45);
}

.motion-ring__legend-name {
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 30rpx;
}

.motion-ring__legend-value {
  margin-top: 4rpx;
  color: var(--app-text);
  font-size: 30rpx;
  font-weight: 850;
  line-height: 36rpx;
}
</style>
