<script lang="ts" setup>
import type { DeviceListItem, DeviceType } from '@/store/device'

interface Props {
  open: boolean
  devices?: DeviceListItem[]
  currentKey?: string
}

defineOptions({
  name: 'YtDeviceSelectorSheet',
})

withDefaults(defineProps<Props>(), {
  devices: () => [],
  currentKey: '',
})

const emit = defineEmits<{
  close: []
  select: [device: DeviceListItem]
  add: []
}>()

function getDeviceImage(type: DeviceType) {
  return type === 'radar' ? '/static/device/radar.png' : ''
}

function getDeviceTypeName(type: DeviceType) {
  return type === 'radar' ? '毫米波雷达' : '未知设备'
}

function getBleText(device: DeviceListItem) {
  if (device.bleConnected) {
    return 'BLE 在线'
  }

  return device.bleKnown ? '可重连' : '未连接'
}

function getBindText(device: DeviceListItem) {
  return device.cloudBound ? '已绑定' : '未绑定'
}

function getMqttText(device: DeviceListItem) {
  return device.mqttOnline ? '在线' : '离线'
}
</script>

<template>
  <view v-if="open" class="selector-root">
    <view class="selector-mask" @click="emit('close')" />

    <view class="selector-panel">
      <view class="sheet-head">
        <view>
          <view class="sheet-title">
            选择设备
          </view>
          <view class="sheet-subtitle">
            已绑定与本地蓝牙设备
          </view>
        </view>

        <button class="close-button" @click="emit('close')">
          <view class="i-carbon-close" />
        </button>
      </view>

      <scroll-view scroll-y class="device-list">
        <button
          v-for="device in devices"
          :key="device.key"
          class="device-option"
          :class="{ active: device.key === currentKey }"
          @click="emit('select', device)"
        >
          <image
            v-if="getDeviceImage(device.deviceType)"
            class="option-image"
            mode="aspectFit"
            :src="getDeviceImage(device.deviceType)"
          />
          <view v-else class="option-image fallback i-carbon-devices" />

          <view class="option-main">
            <view class="option-name">
              {{ device.name }}
            </view>
            <view class="option-meta">
              {{ getDeviceTypeName(device.deviceType) }} · {{ device.dn }}
            </view>
            <view class="option-status">
              <view class="status-item" :class="{ active: device.bleConnected }">
                <view class="status-dot" />
                <text>{{ getBleText(device) }}</text>
              </view>
              <view class="status-item" :class="{ active: device.cloudBound }">
                <view class="status-dot" />
                <text>{{ getBindText(device) }}</text>
              </view>
              <view class="status-item" :class="{ active: device.mqttOnline }">
                <view class="status-dot" />
                <text>{{ getMqttText(device) }}</text>
              </view>
            </view>
          </view>

          <view v-if="device.key === currentKey" class="selected-icon i-carbon-checkmark" />
        </button>

        <view v-if="devices.length === 0" class="empty">
          暂无设备
        </view>
      </scroll-view>

      <button class="add-row" @click="emit('add')">
        <view class="i-carbon-add" />
        <text>添加设备</text>
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.selector-root {
  position: absolute;
  z-index: 60;
  top: calc(100% + 12rpx);
  left: 0;
  width: calc(100vw - 64rpx);
}

.selector-mask {
  position: fixed;
  z-index: 0;
  inset: 0;
  background: transparent;
}

.selector-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 640rpx;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 24rpx;
  background: var(--app-surface);
  box-shadow: 0 18rpx 42rpx rgba(15, 23, 42, 0.12);
  box-sizing: border-box;
  animation: sheet-down 0.16s ease-out;
}

@keyframes sheet-down {
  from {
    opacity: 0;
    transform: translateY(-10rpx);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  padding: 22rpx 24rpx 18rpx;
  border-bottom: 1px solid var(--app-border);
}

.sheet-title {
  color: var(--app-text);
  font-size: 34rpx;
  font-weight: 760;
  line-height: 44rpx;
}

.sheet-subtitle {
  margin-top: 4rpx;
  color: var(--app-text-muted);
  font-size: 22rpx;
  line-height: 30rpx;
}

button {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: normal;
  text-align: left;
}

button::after {
  border: 0;
}

.close-button {
  justify-content: center;
  flex-shrink: 0;
  width: 58rpx;
  height: 58rpx;
  border: 1px solid var(--app-border);
  border-radius: 16rpx;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 28rpx;
}

.device-list {
  min-height: 0;
  flex: 1;
  padding: 10rpx 14rpx;
  box-sizing: border-box;
}

.device-option {
  position: relative;
  width: 100%;
  min-height: 126rpx;
  padding: 16rpx 12rpx;
  border-radius: 20rpx;
  color: var(--app-text);
  box-sizing: border-box;
}

.device-option.active,
.device-option:active {
  background: var(--app-surface-2);
}

.option-image {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
}

.option-image.fallback {
  color: var(--app-primary);
  font-size: 36rpx;
}

.option-main {
  min-width: 0;
  flex: 1;
  margin-left: 16rpx;
}

.option-name {
  overflow: hidden;
  color: var(--app-text);
  font-size: 28rpx;
  font-weight: 720;
  line-height: 38rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-meta {
  overflow: hidden;
  margin-top: 2rpx;
  color: var(--app-text-muted);
  font-size: 21rpx;
  line-height: 30rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-status {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 8rpx;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  color: var(--app-text-subtle);
  font-size: 20rpx;
  line-height: 28rpx;
}

.status-item.active {
  color: var(--app-text-muted);
}

.status-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: var(--app-text-subtle);
}

.status-item.active .status-dot {
  background: #22c55e;
}

.selected-icon {
  flex-shrink: 0;
  margin-left: 12rpx;
  color: var(--app-primary);
  font-size: 28rpx;
}

.empty {
  padding: 60rpx 20rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  text-align: center;
}

.add-row {
  justify-content: flex-start;
  gap: 12rpx;
  height: 92rpx;
  padding: 0 28rpx calc(env(safe-area-inset-bottom) / 2);
  border-top: 1px solid var(--app-border);
  color: var(--app-primary);
  font-size: 26rpx;
  font-weight: 680;
}
</style>
