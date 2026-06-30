<script lang="ts" setup>
import type { DeviceListItem, DeviceType } from '@/store/device'

interface Props {
  device: DeviceListItem
}

defineOptions({
  name: 'YtDeviceCard',
})

defineProps<Props>()

function getDeviceImage(type: DeviceType) {
  return type === 'radar' ? '/static/device/radar.png' : ''
}

function getDeviceTypeName(type: DeviceType) {
  return type === 'radar' ? '毫米波雷达' : '未知设备'
}
</script>

<template>
  <view class="device-card">
    <image
      v-if="getDeviceImage(device.deviceType)"
      class="device-image"
      mode="aspectFit"
      :src="getDeviceImage(device.deviceType)"
    />
    <view v-else class="device-image fallback i-carbon-devices" />

    <view class="device-main">
      <view class="device-title-row">
        <view class="device-title">
          {{ device.name }}
        </view>
        <view class="device-dot" :class="{ active: device.mqttOnline }" />
      </view>

      <view class="device-meta">
        {{ getDeviceTypeName(device.deviceType) }} · {{ device.dn }}
      </view>

      <view class="status-row">
        <view class="status-tag" :class="{ active: device.bleConnected }">
          <view class="status-dot" />
          <text>BLE</text>
        </view>
        <view class="status-tag" :class="{ active: device.cloudBound }">
          <view class="status-dot" />
          <text>{{ device.cloudBound ? '绑定' : '未绑定' }}</text>
        </view>
        <view class="status-tag" :class="{ active: device.mqttOnline }">
          <view class="status-dot" />
          <text>{{ device.mqttOnline ? '在线' : '离线' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.device-card {
  display: flex;
  align-items: center;
  gap: 26rpx;
  min-height: 160rpx;
  padding: 24rpx 26rpx;
  border: 1px solid var(--app-border);
  border-radius: 24rpx;
  background: var(--app-surface);
  box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}

.device-image {
  flex-shrink: 0;
  width: 136rpx;
  height: 136rpx;
}

.device-image.fallback {
  color: var(--app-primary);
  font-size: 52rpx;
}

.device-main {
  min-width: 0;
  flex: 1;
}

.device-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.device-title {
  min-width: 0;
  overflow: hidden;
  color: var(--app-text);
  font-size: 34rpx;
  font-weight: 750;
  line-height: 44rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-dot {
  flex-shrink: 0;
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: var(--app-text-subtle);
}

.device-dot.active {
  background: #22c55e;
}

.device-meta {
  overflow: hidden;
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-row {
  display: flex;
  gap: 10rpx;
  margin-top: 16rpx;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 38rpx;
  padding: 0 12rpx;
  border: 1px solid var(--app-border);
  border-radius: 999rpx;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 20rpx;
  font-weight: 600;
  line-height: 38rpx;
}

.status-tag.active {
  border-color: rgba(34, 197, 94, 0.22);
  background: rgba(34, 197, 94, 0.1);
  color: var(--app-text);
}

.status-dot {
  width: 9rpx;
  height: 9rpx;
  border-radius: 999rpx;
  background: #ef4444;
}

.status-tag.active .status-dot {
  background: #22c55e;
}
</style>
