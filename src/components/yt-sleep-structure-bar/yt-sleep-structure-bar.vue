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

const segments = computed(() => {
  const report = props.report
  const raw = [
    { key: 'deep', label: '深睡', value: report?.deepSleepTime || 0, color: '#7c5cff' },
    { key: 'light', label: '浅睡', value: report?.lightSleepTime || 0, color: '#44b9ff' },
    { key: 'rem', label: 'REM', value: report?.remSleepTime || 0, color: '#ff73c7' },
    { key: 'awake', label: '清醒', value: report?.awakeTime || 0, color: '#ffb84d' },
    { key: 'out', label: '离床', value: report?.outOfBedTime || 0, color: '#94a3b8' },
  ]
  const total = raw.reduce((sum, item) => sum + item.value, 0)

  return raw.map(item => ({
    ...item,
    width: total > 0 ? `${Math.max(item.value / total * 100, item.value > 0 ? 3 : 0)}%` : '0%',
    time: formatMinutes(item.value),
  }))
})

const totalText = computed(() => formatMinutes(props.report?.totalSleepTime || 0))

function formatMinutes(value: number) {
  if (!value || value <= 0) {
    return '--'
  }

  const hours = Math.floor(value / 60)
  const minutes = value % 60
  if (hours <= 0) {
    return `${minutes}分`
  }
  if (minutes <= 0) {
    return `${hours}小时`
  }
  return `${hours}小时${minutes}分`
}
</script>

<template>
  <view class="sleep-structure" :class="{ 'is-dark': isDark }">
    <view class="sleep-structure__head">
      <view>
        <view class="sleep-structure__title">
          睡眠结构
        </view>
        <view class="sleep-structure__subtitle">
          总睡眠 {{ totalText }}
        </view>
      </view>
    </view>

    <view class="sleep-structure__bar">
      <view
        v-for="segment in segments"
        :key="segment.key"
        class="sleep-structure__segment"
        :style="{ width: segment.width, background: segment.color }"
      />
    </view>

    <view class="sleep-structure__legend">
      <view
        v-for="segment in segments"
        :key="segment.key"
        class="sleep-structure__legend-item"
      >
        <view class="sleep-structure__dot" :style="{ background: segment.color }" />
        <text class="sleep-structure__legend-label">
          {{ segment.label }}
        </text>
        <text class="sleep-structure__legend-time">
          {{ segment.time }}
        </text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.sleep-structure {
  padding: 28rpx;
  border: 1px solid rgba(147, 127, 255, 0.18);
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 255, 0.9)), var(--app-surface);
  box-shadow: 0 18rpx 46rpx var(--app-shadow);
  box-sizing: border-box;
  backdrop-filter: blur(18rpx);
}

.sleep-structure.is-dark {
  border-color: rgba(147, 127, 255, 0.22);
  background: linear-gradient(145deg, rgba(21, 28, 64, 0.98), rgba(12, 17, 42, 0.94)), var(--app-surface);
  box-shadow: 0 18rpx 46rpx rgba(0, 0, 0, 0.24);
}

.sleep-structure__title {
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 850;
  line-height: 42rpx;
}

.sleep-structure__subtitle {
  margin-top: 6rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 32rpx;
}

.sleep-structure__bar {
  display: flex;
  overflow: hidden;
  height: 30rpx;
  margin-top: 28rpx;
  border-radius: 999rpx;
  background: var(--app-surface-2);
  box-shadow: inset 0 0 0 1px rgba(147, 127, 255, 0.1);
}

.sleep-structure__segment {
  height: 100%;
  min-width: 0;
}

.sleep-structure__segment + .sleep-structure__segment {
  border-left: 2rpx solid rgba(255, 255, 255, 0.36);
}

.sleep-structure__legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx 20rpx;
  margin-top: 28rpx;
}

.sleep-structure__legend-item {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 12rpx 14rpx;
  border-radius: 16rpx;
  background: rgba(147, 127, 255, 0.08);
  box-sizing: border-box;
}

.sleep-structure.is-dark .sleep-structure__legend-item {
  background: rgba(147, 127, 255, 0.12);
}

.sleep-structure__dot {
  flex: 0 0 auto;
  width: 16rpx;
  height: 16rpx;
  margin-right: 10rpx;
  border-radius: 50%;
  box-shadow: 0 0 14rpx currentcolor;
}

.sleep-structure__legend-label {
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.sleep-structure__legend-time {
  margin-left: auto;
  color: var(--app-text);
  font-size: 24rpx;
  font-weight: 750;
}
</style>
