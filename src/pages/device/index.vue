<script lang="ts" setup>
import type { DevicePropertyTrendPoint } from '@/api/types/device'
import type { MonitorMetricItem } from '@/components/yt-monitor-metric-card/metric'
import type { DeviceListItem } from '@/store/device'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { getDevicePropertyTrend } from '@/api/device'
import { findProfileByType } from '@/ble/profiles'
import { useBleStore } from '@/store/ble'
import { useCloudMonitorStore } from '@/store/cloudMonitor'
import { getDeviceKey, useDeviceStore } from '@/store/device'

type DeviceTab = 'monitor' | 'config'
type MonitorSource = 'ble' | 'mqtt'
type TrendRange = '1h' | '1d' | '3d' | '7d' | '30d'

defineOptions({
  name: 'Device',
})

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '设备',
  },
})

const DEVICE_TABS = [
  { label: '监控', value: 'monitor' },
  { label: '配置', value: 'config' },
]

const TREND_RANGES: Array<{
  key: TrendRange
  label: string
  duration: number
  maxPoints: number
}> = [
  { key: '1h', label: '最近1小时', duration: 60 * 60 * 1000, maxPoints: 60 },
  { key: '1d', label: '最近1天', duration: 24 * 60 * 60 * 1000, maxPoints: 96 },
  { key: '3d', label: '最近3天', duration: 3 * 24 * 60 * 60 * 1000, maxPoints: 96 },
  { key: '7d', label: '最近7天', duration: 7 * 24 * 60 * 60 * 1000, maxPoints: 120 },
  { key: '30d', label: '最近30天', duration: 30 * 24 * 60 * 60 * 1000, maxPoints: 120 },
]

const deviceStore = useDeviceStore()
const bleStore = useBleStore()
const cloudMonitorStore = useCloudMonitorStore()

const {
  binding,
  currentDeviceItem,
  deviceList,
  errorMessage,
  loading,
  unbindingDeviceId,
} = storeToRefs(deviceStore)

const {
  connected,
  currentIdentity,
  currentStatus,
  disconnecting,
  monitorSamples,
  monitoring,
  monitorSnapshot,
  refreshingStatus,
} = storeToRefs(bleStore)

const activeTab = ref<DeviceTab>('monitor')
const monitorSource = ref<MonitorSource>('ble')
const pickerOpen = ref(false)
const actionLoading = ref('')
const trendLoading = ref(false)
const trendPoints = ref<DevicePropertyTrendPoint[]>([])
const trendRange = ref<TrendRange>('1h')
let trendRequestSeq = 0

const systemInfo = uni.getSystemInfoSync()
const menuButton = getMenuButtonRect()

const currentDevice = computed(() => currentDeviceItem.value)
const hasDevice = computed(() => deviceList.value.length > 0)
const currentBleConnected = computed(() => !!currentDevice.value?.bleConnected && connected.value)
const displayIdentity = computed(() => currentBleConnected.value ? currentIdentity.value : null)
const displayStatus = computed(() => currentBleConnected.value ? currentStatus.value : null)
const displaySnapshot = computed(() => currentBleConnected.value ? monitorSnapshot.value : null)
const displaySampleCount = computed(() => currentBleConnected.value ? monitorSamples.value.length : 0)
const currentMonitoring = computed(() => currentBleConnected.value && monitoring.value)
const mqttSnapshot = computed(() => cloudMonitorStore.activeSnapshot)
const activeMonitorMatched = computed(() => {
  const device = currentDevice.value

  return !!device?.cloudBound
    && cloudMonitorStore.activeProductKey === device.productKey
    && cloudMonitorStore.activeDn === device.dn
})
const monitorPanelSubtitle = computed(() => {
  if (monitorSource.value === 'ble') {
    return currentBleConnected.value
      ? `近场 BLE 实时数据，最近 ${displaySampleCount.value} 个采样点`
      : '连接 BLE 后可查看近场实时数据'
  }

  return cloudMonitorStore.activeSubscribed && activeMonitorMatched.value
    ? '云端 MQTT 实时同步数据'
    : '选择已绑定设备后订阅云端数据'
})
const monitorPanelStatus = computed(() => {
  if (monitorSource.value === 'ble') {
    return currentMonitoring.value ? 'active' : 'idle'
  }

  return activeMonitorMatched.value && cloudMonitorStore.activeMqttOnline ? 'active' : 'offline'
})
const monitorPanelStatusText = computed(() => {
  if (monitorSource.value === 'ble') {
    return currentMonitoring.value ? '监控中' : '未开始'
  }

  return activeMonitorMatched.value && cloudMonitorStore.activeMqttOnline ? '在线' : '离线'
})
const bleMetrics = computed<MonitorMetricItem[]>(() => [
  {
    key: 'ble-heart-rate',
    label: '心率',
    status: getMetricStatus(displaySnapshot.value?.heartRate),
    type: 'heartRate',
    value: displaySnapshot.value?.heartRate,
  },
  {
    key: 'ble-breathing-rate',
    label: '呼吸',
    status: getMetricStatus(displaySnapshot.value?.breathRate),
    type: 'breathingRate',
    value: displaySnapshot.value?.breathRate,
  },
  {
    key: 'ble-presence',
    label: '在床',
    status: getMetricStatus(displaySnapshot.value?.presence),
    type: 'presence',
    value: displaySnapshot.value?.presence,
  },
  {
    key: 'ble-distance',
    label: '距离',
    status: getMetricStatus(displaySnapshot.value?.distanceCm),
    type: 'distance',
    value: displaySnapshot.value?.distanceCm,
  },
  {
    key: 'ble-activity',
    label: '活动',
    status: getMetricStatus(displaySnapshot.value?.motion),
    type: 'activity',
    value: displaySnapshot.value?.motion,
  },
  {
    key: 'ble-body-movement',
    label: '体动',
    status: getMetricStatus(displaySnapshot.value?.bodyMovement),
    type: 'bodyMovement',
    value: displaySnapshot.value?.bodyMovement,
  },
])
const mqttMetrics = computed<MonitorMetricItem[]>(() => [
  {
    key: 'mqtt-heart-rate',
    label: '心率',
    status: getMetricStatus(readMqttNumber('heartRate')),
    type: 'heartRate',
    value: readMqttNumber('heartRate'),
  },
  {
    key: 'mqtt-breathing-rate',
    label: '呼吸',
    status: getMetricStatus(readMqttNumber('breathingRate')),
    type: 'breathingRate',
    value: readMqttNumber('breathingRate'),
  },
  {
    key: 'mqtt-human-activity',
    label: '活动',
    status: getMetricStatus(readMqttNumber('humanActivity')),
    type: 'activity',
    value: readMqttNumber('humanActivity'),
  },
  {
    key: 'mqtt-algorithm-state',
    label: '睡眠状态',
    status: getMetricStatus(readMqttNumber('algorithmState')),
    type: 'algorithmState',
    value: readMqttNumber('algorithmState'),
  },
  {
    key: 'mqtt-secondary-emotion',
    label: '情绪',
    status: getMetricStatus(readMqttNumber('secondaryEmotion')),
    type: 'secondaryEmotion',
    value: readMqttNumber('secondaryEmotion'),
  },
  {
    key: 'mqtt-sleep-progress',
    label: '入睡进度',
    status: getMetricStatus(readMqttNumber('sleepProgress')),
    type: 'sleepProgress',
    value: readMqttNumber('sleepProgress'),
  },
])
const currentMonitorMetrics = computed(() => {
  return monitorSource.value === 'ble' ? bleMetrics.value : mqttMetrics.value
})
const currentRadarPosition = computed(() => {
  if (monitorSource.value === 'ble') {
    return {
      distance: displaySnapshot.value?.distanceCm,
      unit: 'cm',
      updatedAt: displaySnapshot.value?.updatedAt,
      x: mmToCm(displaySnapshot.value?.posXmm),
      y: mmToCm(displaySnapshot.value?.posYmm),
      z: mmToCm(displaySnapshot.value?.posZmm),
    }
  }

  return {
    distance: readMqttNumber('humanDistance'),
    unit: 'cm',
    updatedAt: activeMonitorMatched.value ? cloudMonitorStore.activeLastMessageAt : undefined,
    x: readMqttNumber('humanPositionX'),
    y: readMqttNumber('humanPositionY'),
    z: readMqttNumber('humanPositionZ'),
  }
})
const trendSubtitle = computed(() => {
  const range = TREND_RANGES.find(item => item.key === trendRange.value)
  return currentDevice.value?.cloudBound
    ? `${range?.label || '最近1小时'}平均心率 / 平均呼吸率`
    : '绑定设备后可查看云端历史趋势'
})
const trendEmptyText = computed(() => {
  return currentDevice.value?.cloudBound ? '暂无趋势数据' : '设备未绑定，暂无云端趋势'
})
const monitorSourceOptions = computed(() => [
  {
    label: 'BLE',
    value: 'ble' as const,
  },
  {
    label: 'MQTT',
    value: 'mqtt' as const,
    disabled: !currentDevice.value?.cloudBound,
  },
])
const pageBodyStyle = computed(() => {
  return {
    paddingTop: `${menuButton.top}px`,
  }
})
const switcherAnchorStyle = computed(() => {
  const availableWidth = menuButton.left - 32 - 12
  const preferredWidth = systemInfo.windowWidth * 0.4

  return {
    width: `${Math.max(220, Math.min(preferredWidth, availableWidth))}px`,
  }
})

function getMenuButtonRect() {
  if (typeof uni.getMenuButtonBoundingClientRect === 'function') {
    return uni.getMenuButtonBoundingClientRect()
  }

  const top = (systemInfo.statusBarHeight || 0) + 8

  return {
    top,
    bottom: top + 32,
    left: systemInfo.windowWidth - 88,
    height: 32,
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function getMetricStatus(value: unknown): MonitorMetricItem['status'] {
  return value === undefined || value === null || value === '' ? 'muted' : 'normal'
}

function readMqttNumber(key: string) {
  if (!activeMonitorMatched.value) {
    return undefined
  }

  const value = mqttSnapshot.value[key]

  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

function mmToCm(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return undefined
  }

  return Number((value / 10).toFixed(1))
}

function getTrendRangeConfig(rangeKey: TrendRange) {
  return TREND_RANGES.find(item => item.key === rangeKey) || TREND_RANGES[0]
}

function createTrendTimeWindow(rangeKey: TrendRange) {
  const range = getTrendRangeConfig(rangeKey)
  const endTime = Date.now()

  return {
    endTime,
    maxPoints: range.maxPoints,
    startTime: endTime - range.duration,
  }
}

async function loadTrendData() {
  const device = currentDevice.value
  const requestSeq = ++trendRequestSeq
  const timeWindow = createTrendTimeWindow(trendRange.value)

  if (!device?.cloudBound || !device.productKey || !device.dn) {
    trendPoints.value = []
    return
  }

  trendLoading.value = true

  try {
    const result = await getDevicePropertyTrend({
      dn: device.dn,
      endTime: timeWindow.endTime,
      maxPoints: timeWindow.maxPoints,
      productKey: device.productKey,
      properties: ['heartRate', 'breathingRate'],
      startTime: timeWindow.startTime,
    })

    if (requestSeq === trendRequestSeq) {
      trendPoints.value = result.points || []
    }
  }
  catch (error) {
    if (requestSeq === trendRequestSeq) {
      trendPoints.value = []
    }
    console.warn('加载设备历史趋势失败:', error)
  }
  finally {
    if (requestSeq === trendRequestSeq) {
      trendLoading.value = false
    }
  }
}

function changeTrendRange(range: string) {
  if (!TREND_RANGES.some(item => item.key === range)) {
    return
  }

  trendRange.value = range as TrendRange
  void loadTrendData()
}

function selectDevice(device: DeviceListItem) {
  deviceStore.selectDevice(device.key)
  pickerOpen.value = false
  activeTab.value = 'monitor'
  void subscribeCurrentCloudMonitor()
  void loadTrendData()
}

async function subscribeCurrentCloudMonitor() {
  const device = currentDevice.value

  if (!device?.cloudBound || !device.productKey || !device.dn) {
    cloudMonitorStore.unsubscribe()
    return
  }

  try {
    await cloudMonitorStore.subscribeDevice({
      dn: device.dn,
      productKey: device.productKey,
    })
  }
  catch (error) {
    console.warn('订阅当前设备云端实时数据失败:', error)
  }
}

function goAddDevice() {
  pickerOpen.value = false
  uni.navigateTo({
    url: '/pages/device/add',
  })
}

function createHistoryBleDevice(device: DeviceListItem) {
  if (!device.bleDeviceId) {
    throw new Error('没有历史 BLE 连接记录，请先重新扫描设备')
  }

  const profile = findProfileByType(device.deviceType)

  if (!profile) {
    throw new Error('当前设备类型暂不支持 BLE 连接')
  }

  return {
    deviceId: device.bleDeviceId,
    name: device.name,
    profile,
    profileName: profile.displayName,
    profileType: profile.type,
    raw: {
      deviceId: device.bleDeviceId,
      name: device.name,
    },
  }
}

function connectCurrentBle() {
  const device = currentDevice.value

  if (!device) {
    return
  }

  if (device.bleConnected) {
    uni.showToast({ icon: 'none', title: '设备已连接' })
    return
  }

  if (!device.bleDeviceId) {
    uni.showToast({ icon: 'none', title: '没有历史连接记录，请重新扫描' })
    goAddDevice()
    return
  }

  void runAction(
    'connect',
    async () => {
      const bleDevice = createHistoryBleDevice(device)
      await bleStore.connectDevice(bleDevice)
      const record = deviceStore.rememberCurrentBleDevice()

      if (record) {
        deviceStore.selectDevice(getDeviceKey(record.productKey, record.dn))
      }
    },
    '已连接',
  )
}

function goWifiProvisionPage() {
  uni.navigateTo({
    url: '/pages/device/wifi',
  })
}

async function refreshDevices(showToast = false) {
  try {
    if (connected.value) {
      deviceStore.rememberCurrentBleDevice()
    }

    await deviceStore.loadBoundDevices()

    if (showToast) {
      uni.showToast({ icon: 'success', title: '已刷新' })
    }
  }
  catch (error) {
    if (showToast) {
      uni.showToast({
        icon: 'none',
        title: errorMessage.value || getErrorMessage(error, '加载设备失败'),
      })
    }
  }
}

async function runAction(key: string, action: () => Promise<unknown>, successTitle: string) {
  if (actionLoading.value) {
    return
  }

  actionLoading.value = key

  try {
    await action()
    uni.showToast({ icon: 'success', title: successTitle })
  }
  catch (error) {
    uni.showToast({
      icon: 'none',
      title: getErrorMessage(error, '操作失败'),
    })
  }
  finally {
    actionLoading.value = ''
  }
}

function refreshBleStatus() {
  if (!currentBleConnected.value) {
    uni.showToast({ icon: 'none', title: '请先连接 BLE' })
    return
  }

  void runAction('refreshStatus', () => bleStore.refreshCurrentStatus(), '已刷新')
}

function disconnectBle() {
  void runAction('disconnect', () => bleStore.disconnectDevice(), '已断开')
}

function bindCurrentDevice() {
  const device = currentDevice.value

  if (!device) {
    return
  }

  void runAction(
    'bind',
    () => deviceStore.bindByIdentity(device.productKey, device.dn),
    '已绑定',
  )
}

function unbindCurrentDevice() {
  const deviceId = currentDevice.value?.cloud?.deviceId

  if (!deviceId) {
    return
  }

  void runAction('unbind', () => deviceStore.unbindCloudDevice(deviceId), '已解绑')
}

onShow(() => {
  void (async () => {
    await refreshDevices()
    await subscribeCurrentCloudMonitor()
    await loadTrendData()
  })()
})
</script>

<template>
  <view class="device-page">
    <view class="page-body" :style="pageBodyStyle">
      <view v-if="!hasDevice" class="empty panel">
        <view class="empty-icon i-carbon-devices" />
        <view class="empty-title">
          还没有设备
        </view>
        <view class="muted">
          先通过蓝牙添加一台设备，连接成功后会自动出现在这里。
        </view>
        <button class="btn primary" @click="goAddDevice">
          <view class="i-carbon-add" />
          <text>添加设备</text>
        </button>
      </view>

      <template v-else>
        <view class="device-switcher-anchor" :style="switcherAnchorStyle">
          <yt-device-switcher
            :device="currentDevice"
            :disabled="!hasDevice"
            :open="pickerOpen"
            @add="goAddDevice"
            @switch="pickerOpen = !pickerOpen"
          />

          <yt-device-selector-sheet
            :current-key="currentDevice?.key"
            :devices="deviceList"
            :open="pickerOpen"
            @add="goAddDevice"
            @close="pickerOpen = false"
            @select="selectDevice"
          />
        </view>

        <view v-if="currentDevice" class="device-card-anchor">
          <yt-device-card :device="currentDevice" />
        </view>

        <yt-section-tabs
          v-model="activeTab"
          class="device-tabs"
          :items="DEVICE_TABS"
        />

        <template v-if="activeTab === 'monitor'">
          <view class="section">
            <yt-monitor-panel
              :metrics="currentMonitorMetrics"
              :status="monitorPanelStatus"
              :status-text="monitorPanelStatusText"
              :subtitle="monitorPanelSubtitle"
              title="实时监控"
            >
              <template #source>
                <yt-monitor-source-switch
                  v-model="monitorSource"
                  :options="monitorSourceOptions"
                />
              </template>

              <template v-if="monitorSource === 'ble'" #footer>
                <button
                  v-if="currentBleConnected"
                  class="ble-monitor-action disconnect"
                  :disabled="disconnecting || actionLoading === 'disconnect'"
                  @click="disconnectBle"
                >
                  <view class="i-carbon-bluetooth-off" />
                  <text>{{ disconnecting ? '断开中' : '断开 BLE' }}</text>
                </button>
                <button
                  v-else
                  class="ble-monitor-action connect"
                  :disabled="actionLoading === 'connect'"
                  @click="connectCurrentBle"
                >
                  <view class="i-carbon-bluetooth" />
                  <text>{{ actionLoading === 'connect' ? '连接中' : '连接 BLE' }}</text>
                </button>
              </template>
            </yt-monitor-panel>
          </view>

          <view class="section">
            <yt-radar-position-panel
              :position="currentRadarPosition"
              :source="monitorSource"
            />
          </view>

          <view class="section">
            <yt-device-trend-chart
              :empty-text="trendEmptyText"
              :loading="trendLoading"
              :points="trendPoints"
              :range="trendRange"
              :ranges="TREND_RANGES"
              :subtitle="trendSubtitle"
              title="历史趋势"
              @range-change="changeTrendRange"
            />
          </view>
        </template>

        <view v-else class="panel section config-section">
          <yt-device-config-panel
            :binding="binding || actionLoading === 'bind'"
            :ble-connected="currentBleConnected"
            :connecting="actionLoading === 'connect'"
            :device="currentDevice"
            :disconnecting="disconnecting || actionLoading === 'disconnect'"
            :identity="displayIdentity"
            :refreshing-status="refreshingStatus"
            :status="displayStatus"
            :unbinding="!!unbindingDeviceId || actionLoading === 'unbind'"
            @bind-device="bindCurrentDevice"
            @connect-ble="connectCurrentBle"
            @disconnect-ble="disconnectBle"
            @refresh-status="refreshBleStatus"
            @unbind-device="unbindCurrentDevice"
            @wifi-config="goWifiProvisionPage"
          />
        </view>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.device-page {
  min-height: 100vh;
  padding-bottom: calc(env(safe-area-inset-bottom) + 140rpx);
  background:
    radial-gradient(circle at 78% 8%, var(--app-primary-soft), transparent 28%),
    radial-gradient(circle at 8% 34%, var(--app-cyan-soft), transparent 24%), var(--app-page-bg);
  color: var(--app-text);
}

.page-body {
  position: relative;
  padding: 0 32rpx;
}

.device-switcher-anchor {
  position: relative;
  z-index: 20;
}

.device-card-anchor {
  margin-top: 18rpx;
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

.panel {
  border: 1px solid var(--app-border);
  border-radius: 26rpx;
  background: var(--app-surface);
  box-shadow: 0 16rpx 42rpx var(--app-shadow);
  box-sizing: border-box;
}

.muted,
.eyebrow {
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
}

.eyebrow {
  color: var(--app-text-subtle);
  font-size: 20rpx;
}

.min-w-0 {
  min-width: 0;
}

.section-title {
  overflow: hidden;
  color: var(--app-text);
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn.primary {
  background: var(--app-primary);
  color: #ffffff;
}

.pill.active {
  background: var(--app-primary-soft);
}

.device-tabs {
  margin-top: 20rpx;
}

.section {
  margin-top: 28rpx;
}

.config-section {
  padding: 24rpx;
}

.btn {
  gap: 10rpx;
  width: 100%;
  height: 78rpx;
  margin-top: 22rpx;
  border-radius: 24rpx;
  font-size: 27rpx;
  font-weight: 700;
}

.btn.danger {
  border: 1px solid var(--app-danger-soft);
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.ble-monitor-action {
  gap: 10rpx;
  width: 100%;
  height: 76rpx;
  border: 1px solid var(--app-border);
  border-radius: 18rpx;
  background: var(--app-surface-2);
  color: var(--app-text);
  font-size: 26rpx;
  font-weight: 750;
  letter-spacing: 0;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease,
    transform 0.15s ease;
}

.ble-monitor-action.connect {
  border-color: var(--app-cyan-soft);
  background: var(--app-cyan-soft);
  color: var(--app-cyan);
}

.ble-monitor-action.disconnect {
  border-color: var(--app-danger-soft);
  background: var(--app-danger-soft);
  color: var(--app-danger);
}

.ble-monitor-action:not([disabled]):active {
  transform: scale(0.985);
}

.ble-monitor-action.connect:not([disabled]):active {
  background: var(--app-cyan-soft);
}

.ble-monitor-action.disconnect:not([disabled]):active {
  background: var(--app-danger-soft);
}

button[disabled] {
  opacity: 0.55;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 560rpx;
  margin-top: 12rpx;
  padding: 70rpx 44rpx;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 60rpx;
}

.empty-title {
  margin-top: 24rpx;
  color: var(--app-text);
  font-size: 34rpx;
  font-weight: 800;
  line-height: 44rpx;
}
</style>
