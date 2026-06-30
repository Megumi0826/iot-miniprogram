<script lang="ts" setup>
import type { BleDeviceIdentity, BleDeviceStatus } from '@/ble/application'
import type { DeviceListItem } from '@/store/device'
import { computed } from 'vue'
import { getDeviceStatusCodeDisplay } from '@/ble/application'

interface Props {
  device?: DeviceListItem | null
  identity?: BleDeviceIdentity | null
  status?: BleDeviceStatus | null
  bleConnected?: boolean
  connecting?: boolean
  refreshingStatus?: boolean
  disconnecting?: boolean
  binding?: boolean
  unbinding?: boolean
}

defineOptions({
  name: 'YtDeviceConfigPanel',
})

const props = withDefaults(defineProps<Props>(), {
  device: null,
  identity: null,
  status: null,
  bleConnected: false,
  connecting: false,
  refreshingStatus: false,
  disconnecting: false,
  binding: false,
  unbinding: false,
})

const emit = defineEmits<{
  'refresh-status': []
  'wifi-config': []
  'connect-ble': []
  'disconnect-ble': []
  'bind-device': []
  'unbind-device': []
}>()

const bleActionText = computed(() => {
  if (props.bleConnected) {
    return props.disconnecting ? '断开中' : '断开'
  }

  return props.connecting ? '连接中' : '连接'
})

const bindActionText = computed(() => {
  if (props.device?.cloudBound) {
    return props.unbinding ? '解绑中' : '解绑'
  }

  return props.binding ? '绑定中' : '绑定'
})

const refreshDisabled = computed(() => props.refreshingStatus || !props.bleConnected)
const wifiDisabled = computed(() => !props.bleConnected)
const bleDisabled = computed(() => props.connecting || props.disconnecting)
const bindDisabled = computed(() => !props.device || props.binding || props.unbinding)

function handleBleAction() {
  if (bleDisabled.value) {
    return
  }

  if (props.bleConnected) {
    emit('disconnect-ble')
    return
  }

  emit('connect-ble')
}

function handleBindAction() {
  if (bindDisabled.value) {
    return
  }

  if (props.device?.cloudBound) {
    emit('unbind-device')
    return
  }

  emit('bind-device')
}
</script>

<template>
  <view class="config-panel">
    <view class="action-grid">
      <button class="action-card" :disabled="refreshDisabled" @click="emit('refresh-status')">
        <view class="i-carbon-renew action-icon" />
        <text>{{ refreshingStatus ? '刷新中' : '刷新' }}</text>
      </button>

      <button class="action-card" :disabled="wifiDisabled" @click="emit('wifi-config')">
        <view class="i-carbon-wifi action-icon" />
        <text>配网</text>
      </button>

      <button class="action-card" :disabled="bleDisabled" @click="handleBleAction">
        <view class="action-icon" :class="bleConnected ? 'i-carbon-bluetooth-off' : 'i-carbon-bluetooth'" />
        <text>{{ bleActionText }}</text>
      </button>

      <button
        class="action-card"
        :class="{ danger: device?.cloudBound }"
        :disabled="bindDisabled"
        @click="handleBindAction"
      >
        <view class="action-icon" :class="device?.cloudBound ? 'i-carbon-unlink' : 'i-carbon-link'" />
        <text>{{ bindActionText }}</text>
      </button>
    </view>

    <view class="info-card">
      <view class="card-title">
        设备基础信息
      </view>
      <view class="info-row">
        <text>设备 DN</text>
        <text>{{ device?.dn || '暂无' }}</text>
      </view>
      <view class="info-row">
        <text>ProductKey</text>
        <text>{{ device?.productKey || '暂无' }}</text>
      </view>
      <view class="info-row">
        <text>MAC</text>
        <text>{{ identity?.macAddress || device?.local?.mac || '暂无' }}</text>
      </view>
      <view class="info-row">
        <text>固件版本</text>
        <text>{{ identity?.firmwareVersion || device?.cloud?.firmVersion || '暂无' }}</text>
      </view>
    </view>

    <view class="info-card">
      <view class="card-title">
        网络状态
      </view>
      <view class="info-row">
        <text>WiFi</text>
        <text>{{ status ? getDeviceStatusCodeDisplay(status.wifiStatus) : '需连接 BLE' }}</text>
      </view>
      <view class="info-row">
        <text>MQTT</text>
        <text>{{ device?.mqttOnline ? '在线' : '离线' }}</text>
      </view>
      <view class="info-row">
        <text>IP 地址</text>
        <text>{{ status?.ipAddress || '暂无' }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: normal;
}

button::after {
  border: 0;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14rpx;
}

.action-card {
  position: relative;
  flex-direction: column;
  gap: 10rpx;
  min-width: 0;
  height: 144rpx;
  border: 1px solid var(--app-border);
  border-radius: 22rpx;
  background: var(--app-surface-2);
  color: var(--app-text);
  font-size: 23rpx;
  font-weight: 700;
  letter-spacing: 0;
  transition:
    background-color 0.15s ease,
    opacity 0.15s ease,
    transform 0.15s ease;
}

.action-card:not([disabled]):active {
  background: var(--app-primary-soft);
  transform: scale(0.98);
}

.action-card[disabled] {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(148, 163, 184, 0.08);
  color: var(--app-text-subtle);
  opacity: 1;
}

.action-card[disabled]:active {
  background: rgba(148, 163, 184, 0.08);
  transform: none;
}

.action-card.danger {
  color: #ff6f91;
}

.action-icon {
  color: var(--app-primary);
  font-size: 38rpx;
}

.action-card[disabled] .action-icon {
  color: var(--app-text-subtle);
}

.danger .action-icon {
  color: #ff6f91;
}

.info-card {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 22rpx;
  background: var(--app-surface-2);
}

.card-title {
  padding: 20rpx 22rpx 10rpx;
  color: var(--app-text);
  font-size: 27rpx;
  font-weight: 800;
  line-height: 36rpx;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  min-height: 72rpx;
  padding: 0 22rpx;
  border-top: 1px solid var(--app-border);
  color: var(--app-text-muted);
  font-size: 23rpx;
}

.info-row text:last-child {
  min-width: 0;
  overflow: hidden;
  color: var(--app-text);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
