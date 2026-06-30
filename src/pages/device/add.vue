<script lang="ts" setup>
import type { BleNearbyDevice } from '@/ble/application'
import { computed, onUnmounted, ref } from 'vue'
import { useBleStore } from '@/store/ble'
import { getDeviceKey, useDeviceStore } from '@/store/device'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '添加设备',
  },
})

const bleStore = useBleStore()
const deviceStore = useDeviceStore()
const connectingDeviceId = ref('')

const hasNearbyDevices = computed(() => bleStore.nearbyDevices.length > 0)
const scanVisualDisabled = computed(() => bleStore.connecting || !!connectingDeviceId.value)

const scanningTitle = computed(() => {
  if (bleStore.connecting) {
    return '正在连接设备...'
  }

  if (bleStore.scanning) {
    return hasNearbyDevices.value
      ? '已发现附近设备'
      : '正在扫描附近设备...'
  }

  if (hasNearbyDevices.value) {
    return '发现可连接设备'
  }

  return '点击蓝牙图标开始扫描'
})

const scanningSubtitle = computed(() => {
  if (bleStore.connecting) {
    return '正在读取设备信息并启动实时监控'
  }

  if (bleStore.scanning) {
    return '请将设备靠近手机，并保持设备通电'
  }

  if (hasNearbyDevices.value) {
    return '选择设备并连接，连接成功后可继续配网或查看数据'
  }

  return '支持附近雷达设备，自动扫描 10 秒后停止'
})

function formatError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function formatRssi(rssi?: number) {
  return rssi === undefined ? '未知信号' : `${rssi} dBm`
}

function getSignalClass(rssi?: number) {
  if (rssi === undefined) {
    return 'unknown'
  }

  if (rssi >= -55) {
    return 'strong'
  }

  if (rssi >= -70) {
    return 'good'
  }

  return 'weak'
}

function getSignalText(rssi?: number) {
  if (rssi === undefined) {
    return '未知'
  }

  if (rssi >= -55) {
    return '强'
  }

  if (rssi >= -70) {
    return '良好'
  }

  return '较弱'
}

function isConnectingDevice(device: BleNearbyDevice) {
  return connectingDeviceId.value === device.deviceId
}

function goAfterConnected() {
  uni.switchTab({
    url: '/pages/device/index',
  })
}

async function handleToggleScan() {
  if (bleStore.connecting) {
    return
  }

  try {
    if (bleStore.scanning) {
      await bleStore.stopScan()
      return
    }

    await bleStore.startScan()
  }
  catch (error) {
    uni.showToast({
      icon: 'none',
      title: formatError(error, '蓝牙扫描失败'),
    })
  }
}

async function handleConnect(device: BleNearbyDevice) {
  if (bleStore.connecting || connectingDeviceId.value) {
    return
  }

  connectingDeviceId.value = device.deviceId

  try {
    await bleStore.connectDevice(device)
    const record = deviceStore.rememberCurrentBleDevice()

    if (record) {
      deviceStore.selectDevice(getDeviceKey(record.productKey, record.dn))
    }

    uni.showToast({
      icon: 'success',
      title: '连接成功',
    })

    goAfterConnected()
  }
  catch (error) {
    uni.showToast({
      icon: 'none',
      title: formatError(error, '连接设备失败'),
    })
  }
  finally {
    connectingDeviceId.value = ''
  }
}

onUnmounted(() => {
  void bleStore.stopScan()
})
</script>

<template>
  <view class="add-device-page">
    <yt-page-header title="添加设备" subtitle="搜索附近可连接的蓝牙设备" />

    <view class="scan-section">
      <ble-scan-visual
        :disabled="scanVisualDisabled"
        :found-count="bleStore.nearbyDevices.length"
        :scanning="bleStore.scanning"
        @toggle="handleToggleScan"
      />

      <view class="scan-copy">
        <view class="scan-title">
          {{ scanningTitle }}
        </view>
        <view class="scan-subtitle">
          {{ scanningSubtitle }}
        </view>
        <view v-if="bleStore.scanning" class="scan-hint">
          自动扫描 10 秒后停止，再次点击可立即停止
        </view>
      </view>
    </view>

    <view class="device-section">
      <view class="section-head">
        <view>
          <view class="section-title">
            附近设备
          </view>
          <view class="section-subtitle">
            仅显示当前支持的设备类型
          </view>
        </view>

        <view class="scan-state" :class="{ active: bleStore.scanning }">
          <view class="scan-state__dot" />
          <text>{{ bleStore.scanning ? '扫描中' : '已停止' }}</text>
        </view>
      </view>

      <view v-if="hasNearbyDevices" class="device-list">
        <view
          v-for="device in bleStore.nearbyDevices"
          :key="device.deviceId"
          class="device-item"
        >
          <view class="device-icon-wrap">
            <image
              v-if="device.profileType === 'radar'"
              class="device-icon device-icon--radar"
              mode="aspectFit"
              src="/static/device/radar.png"
            />
            <view v-else class="device-icon device-icon--fallback">
              <view class="i-carbon-bluetooth" />
            </view>
          </view>

          <view class="device-main">
            <view class="device-name">
              {{ device.name }}
            </view>
            <view class="device-meta">
              <text>{{ device.profileName }}</text>
              <text class="device-divider">|</text>
              <text>{{ formatRssi(device.RSSI) }}</text>
            </view>
            <view class="device-tags">
              <view class="device-tag">
                支持配网
              </view>
              <view class="signal-tag" :class="getSignalClass(device.RSSI)">
                信号{{ getSignalText(device.RSSI) }}
              </view>
            </view>
          </view>

          <button
            class="connect-button"
            :class="{ loading: isConnectingDevice(device) }"
            :disabled="bleStore.connecting || !!connectingDeviceId"
            @click.stop="handleConnect(device)"
          >
            {{ isConnectingDevice(device) ? '连接中' : '连接' }}
          </button>
        </view>
      </view>

      <view v-else class="empty-state">
        <view class="empty-icon i-carbon-bluetooth" />
        <view class="empty-title">
          暂未发现设备
        </view>
        <view class="empty-desc">
          点击上方蓝牙图标开始扫描，建议手机距离设备 1 米以内
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.add-device-page {
  min-height: 100vh;
  padding-bottom: calc(env(safe-area-inset-bottom) + 48rpx);
  box-sizing: border-box;
  background:
    radial-gradient(circle at 80% 8%, var(--app-primary-soft), transparent 28%),
    radial-gradient(circle at 12% 34%, rgba(54, 217, 255, 0.1), transparent 24%), var(--app-page-bg);
  color: var(--app-text);
}

.scan-section {
  padding: 4rpx 32rpx 22rpx;
  text-align: center;
}

.scan-copy {
  margin-top: -14rpx;
}

.scan-title {
  color: var(--app-text);
  font-size: 38rpx;
  font-weight: 700;
  line-height: 52rpx;
}

.scan-subtitle {
  margin-top: 14rpx;
  color: var(--app-text-muted);
  font-size: 26rpx;
  line-height: 38rpx;
}

.scan-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 18rpx;
  padding: 10rpx 20rpx;
  border: 1px solid var(--app-border);
  border-radius: 999rpx;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 22rpx;
  line-height: 30rpx;
}

.device-section {
  padding: 24rpx 32rpx 0;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.section-title {
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 700;
  line-height: 44rpx;
}

.section-subtitle {
  margin-top: 6rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
}

.scan-state {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8rpx;
  height: 44rpx;
  padding: 0 16rpx;
  border: 1px solid var(--app-border);
  border-radius: 999rpx;
  color: var(--app-text-muted);
  font-size: 22rpx;
  background: var(--app-surface);
}

.scan-state.active {
  color: var(--app-primary);
  background: var(--app-primary-soft);
}

.scan-state__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: var(--app-text-subtle);
}

.scan-state.active .scan-state__dot {
  background: var(--app-cyan);
  box-shadow: 0 0 16rpx rgba(54, 217, 255, 0.66);
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.device-item {
  display: flex;
  align-items: center;
  min-height: 152rpx;
  padding: 22rpx;
  border: 1px solid var(--app-border);
  border-radius: 24rpx;
  background: var(--app-surface);
  box-shadow: 0 16rpx 42rpx var(--app-shadow);
  box-sizing: border-box;
}

.device-icon-wrap {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
}

.device-icon {
  display: block;
  width: 96rpx;
  height: 96rpx;
}

.device-icon--radar {
  width: 104rpx;
  height: 104rpx;
}

.device-icon--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border: 1px solid var(--app-border);
  border-radius: 24rpx;
  background: var(--app-surface-2);
  color: var(--app-primary);
  font-size: 48rpx;
  filter: none;
}

.device-main {
  min-width: 0;
  flex: 1;
  margin-left: 22rpx;
}

.device-name {
  overflow: hidden;
  color: var(--app-text);
  font-size: 30rpx;
  font-weight: 700;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 6rpx;
  color: var(--app-text-muted);
  font-size: 22rpx;
  line-height: 32rpx;
}

.device-divider {
  color: var(--app-text-subtle);
}

.device-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 12rpx;
}

.device-tag,
.signal-tag {
  height: 34rpx;
  padding: 0 12rpx;
  border-radius: 999rpx;
  color: var(--app-primary);
  font-size: 20rpx;
  line-height: 34rpx;
  background: var(--app-primary-soft);
}

.signal-tag.strong {
  color: #36d976;
  background: rgba(54, 217, 118, 0.12);
}

.signal-tag.good {
  color: var(--app-cyan);
  background: rgba(54, 217, 255, 0.12);
}

.signal-tag.weak {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}

.signal-tag.unknown {
  color: var(--app-text-muted);
  background: var(--app-surface-2);
}

.connect-button {
  flex-shrink: 0;
  min-width: 116rpx;
  height: 64rpx;
  margin-left: 18rpx;
  padding: 0 22rpx;
  border: 0;
  border-radius: 999rpx;
  background: var(--app-primary);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 64rpx;
  box-shadow: 0 12rpx 28rpx var(--app-primary-soft);
}

.connect-button::after {
  border: 0;
}

.connect-button[disabled] {
  opacity: 0.62;
}

.connect-button.loading {
  background: var(--app-cyan);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280rpx;
  padding: 38rpx 40rpx;
  border: 1px dashed var(--app-border);
  border-radius: 24rpx;
  color: var(--app-text-muted);
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  box-sizing: border-box;
}

.empty-icon {
  color: var(--app-text-subtle);
  font-size: 64rpx;
}

.empty-title {
  margin-top: 18rpx;
  color: var(--app-text);
  font-size: 28rpx;
  font-weight: 700;
}

.empty-desc {
  margin-top: 10rpx;
  max-width: 480rpx;
  font-size: 24rpx;
  line-height: 36rpx;
}
</style>
