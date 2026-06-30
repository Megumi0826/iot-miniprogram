<script lang="ts" setup>
import type { MonitorMetricItem } from '../yt-monitor-metric-card/metric'

export type MonitorPanelStatus = 'active' | 'idle' | 'offline' | 'warning'

interface Props {
  title: string
  subtitle?: string
  statusText?: string
  status?: MonitorPanelStatus
  metrics: MonitorMetricItem[]
  columns?: 2 | 3
  emptyText?: string
}

defineOptions({
  name: 'YtMonitorPanel',
})

withDefaults(defineProps<Props>(), {
  subtitle: '',
  statusText: '',
  status: 'idle',
  columns: 3,
  emptyText: '暂无监控数据',
})
</script>

<template>
  <view class="monitor-panel">
    <view class="panel-head">
      <view class="panel-title-wrap">
        <view class="panel-title">
          {{ title }}
        </view>
        <view v-if="subtitle" class="panel-subtitle">
          {{ subtitle }}
        </view>
      </view>

      <view class="panel-side">
        <slot name="source" />
        <view v-if="statusText" class="panel-status" :class="`status-${status}`">
          <view class="status-dot" />
          <text>{{ statusText }}</text>
        </view>
      </view>
    </view>

    <view
      v-if="metrics.length"
      class="metric-grid"
      :class="columns === 2 ? 'columns-2' : 'columns-3'"
    >
      <yt-monitor-metric-card
        v-for="metric in metrics"
        :key="metric.key"
        :metric="metric"
      />
    </view>

    <view v-else class="empty">
      {{ emptyText }}
    </view>

    <view v-if="$slots.footer" class="panel-footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.monitor-panel {
  padding: 24rpx;
  border: 1px solid var(--app-border);
  border-radius: 26rpx;
  background: var(--app-surface);
  box-shadow: 0 16rpx 42rpx var(--app-shadow);
  box-sizing: border-box;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.panel-title-wrap {
  min-width: 0;
}

.panel-title {
  overflow: hidden;
  color: var(--app-text);
  font-size: 31rpx;
  font-weight: 800;
  line-height: 42rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-subtitle {
  margin-top: 3rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
}

.panel-side {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
}

.panel-status {
  display: flex;
  align-items: center;
  gap: 8rpx;
  min-height: 34rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 19rpx;
  line-height: 34rpx;
}

.status-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: var(--status-color);
}

.status-active {
  --status-color: #36d976;
}

.status-idle {
  --status-color: var(--app-text-subtle);
}

.status-offline {
  --status-color: #ff5f7a;
}

.status-warning {
  --status-color: #f59e0b;
}

.metric-grid {
  display: grid;
  gap: 14rpx;
  margin-top: 22rpx;
}

.columns-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.columns-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180rpx;
  margin-top: 22rpx;
  border: 1px dashed var(--app-border);
  border-radius: 20rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
}

.panel-footer {
  margin-top: 22rpx;
}
</style>
