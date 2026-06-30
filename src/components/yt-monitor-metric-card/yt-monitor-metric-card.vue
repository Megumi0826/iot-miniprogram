<script lang="ts" setup>
import type { MonitorMetricItem, MonitorMetricStatus } from './metric'
import { computed } from 'vue'
import {
  formatMonitorMetricValue,
  getMonitorMetricMeta,
  getMonitorMetricUnit,
} from './metric'

interface Props {
  metric: MonitorMetricItem
  showStatusText?: boolean
}

defineOptions({
  name: 'YtMonitorMetricCard',
})

const props = withDefaults(defineProps<Props>(), {
  showStatusText: false,
})

const meta = computed(() => getMonitorMetricMeta(props.metric.type))
const displayValue = computed(() => formatMonitorMetricValue(props.metric))
const displayUnit = computed(() => getMonitorMetricUnit(props.metric))
const status = computed<MonitorMetricStatus>(() => props.metric.status || 'muted')
</script>

<template>
  <view class="metric-card" :class="[`status-${status}`, meta.accentClass]">
    <view class="metric-top">
      <view class="metric-icon-wrap">
        <view class="metric-icon" :class="meta.icon" />
      </view>
      <view class="metric-status">
        <view class="status-dot" />
        <text v-if="showStatusText && metric.statusText">
          {{ metric.statusText }}
        </text>
      </view>
    </view>

    <view class="metric-label">
      {{ metric.label }}
    </view>
    <view class="metric-value">
      <text class="metric-value-main">
        {{ displayValue }}
      </text>
      <text v-if="displayUnit && displayValue !== '--'" class="metric-unit">
        {{ displayUnit }}
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.metric-card {
  min-width: 0;
  min-height: 156rpx;
  padding: 18rpx;
  border: 1px solid var(--app-border);
  border-radius: 20rpx;
  background: var(--app-surface-2);
  box-sizing: border-box;
}

.metric-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10rpx;
}

.metric-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42rpx;
  height: 42rpx;
  color: var(--metric-accent);
  filter: drop-shadow(0 0 7rpx var(--metric-glow));
}

.metric-icon {
  font-size: 36rpx;
}

.metric-status {
  display: flex;
  align-items: center;
  gap: 6rpx;
  min-height: 28rpx;
  color: var(--app-text-muted);
  font-size: 19rpx;
  line-height: 28rpx;
}

.status-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: var(--status-color);
}

.metric-label {
  margin-top: 18rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 30rpx;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
  min-width: 0;
  margin-top: 8rpx;
  color: var(--app-text);
}

.metric-value-main {
  overflow: hidden;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 42rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-unit {
  flex-shrink: 0;
  color: var(--app-text-muted);
  font-size: 19rpx;
  font-weight: 600;
}

.heart {
  --metric-accent: var(--app-danger);
  --metric-glow: var(--app-danger-soft);
}

.breath,
.custom {
  --metric-accent: var(--app-cyan);
  --metric-glow: var(--app-cyan-soft);
}

.bed,
.sleep,
.progress {
  --metric-accent: var(--app-primary);
  --metric-glow: var(--app-primary-soft);
}

.activity {
  --metric-accent: var(--app-success);
  --metric-glow: var(--app-success-soft);
}

.movement,
.emotion {
  --metric-accent: var(--app-warning);
  --metric-glow: var(--app-warning-soft);
}

.status-normal {
  --status-color: var(--app-success);
}

.status-warning {
  --status-color: var(--app-warning);
}

.status-danger {
  --status-color: var(--app-danger);
}

.status-muted {
  --status-color: var(--app-text-subtle);
}
</style>
