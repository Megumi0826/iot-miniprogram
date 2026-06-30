<script lang="ts" setup>
import type { DeviceSleepReportResp } from '@/api/types/device'
import type { MonitorMetricItem } from '@/components/yt-monitor-metric-card/metric'
import type { DeviceListItem } from '@/store/device'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { getLatestDeviceSleepReport } from '@/api/device'
import { useDeviceStore } from '@/store'
import { useCloudMonitorStore } from '@/store/cloudMonitor'

defineOptions({
  name: 'Home',
})

definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
  },
})

const deviceStore = useDeviceStore()
const cloudMonitorStore = useCloudMonitorStore()
const { currentDeviceItem, deviceList, hasCloudDevices } = storeToRefs(deviceStore)

const loadingSleep = ref(false)
const latestReport = ref<DeviceSleepReportResp | null>(null)
const sleepError = ref('')
const pickerOpen = ref(false)

const systemInfo = uni.getSystemInfoSync()
const menuButton = getMenuButtonRect()

const sleepDevice = computed(() => {
  const current = currentDeviceItem.value

  if (current?.cloudBound) {
    return current
  }

  return deviceList.value.find(device => device.cloudBound) || null
})

const currentDevice = computed(() => currentDeviceItem.value)
const hasDevice = computed(() => deviceList.value.length > 0)
const mqttSnapshot = computed(() => cloudMonitorStore.activeSnapshot)

const activeMonitorMatched = computed(() => {
  const device = currentDevice.value

  return !!device?.cloudBound
    && cloudMonitorStore.activeProductKey === device.productKey
    && cloudMonitorStore.activeDn === device.dn
})

const activeMqttOnline = computed(() => {
  const device = currentDevice.value

  if (!device?.cloudBound) {
    return false
  }

  return (activeMonitorMatched.value && cloudMonitorStore.activeMqttOnline) || device.mqttOnline
})

const monitorPanelSubtitle = computed(() => {
  if (!currentDevice.value?.cloudBound) {
    return '绑定云端设备后展示 MQTT 实时体征'
  }

  return (cloudMonitorStore.activeSubscribed && activeMonitorMatched.value)
    ? '来自云端 MQTT 的实时体征数据'
    : '正在等待实时数据订阅'
})

const monitorPanelStatus = computed(() => {
  if (!currentDevice.value?.cloudBound) {
    return 'idle'
  }

  return activeMqttOnline.value ? 'active' : 'offline'
})

const monitorPanelStatusText = computed(() => {
  if (!currentDevice.value?.cloudBound) {
    return '未绑定'
  }

  return activeMqttOnline.value ? '在线' : '离线'
})

const vitalMetrics = computed<MonitorMetricItem[]>(() => [
  {
    key: 'mqtt-heart-rate',
    label: '心率',
    status: getMetricStatus(readMqttNumber('heartRate')),
    type: 'heartRate',
    value: readMqttNumber('heartRate'),
  },
  {
    key: 'mqtt-breathing-rate',
    label: '呼吸率',
    status: getMetricStatus(readMqttNumber('breathingRate')),
    type: 'breathingRate',
    value: readMqttNumber('breathingRate'),
  },
  {
    key: 'mqtt-secondary-emotion',
    label: '情绪',
    status: getMetricStatus(readMqttNumber('secondaryEmotion')),
    type: 'secondaryEmotion',
    value: readMqttNumber('secondaryEmotion'),
  },
  {
    key: 'mqtt-algorithm-state',
    label: '睡眠状态',
    status: getMetricStatus(readMqttNumber('algorithmState')),
    type: 'algorithmState',
    value: readMqttNumber('algorithmState'),
  },
])

const todayAdvice = computed(() => buildTodayAdvice())

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

onShow(async () => {
  if (!hasCloudDevices.value) {
    try {
      await deviceStore.loadBoundDevices()
    }
    catch (error) {
      console.warn('[home] load devices failed:', error)
    }
  }

  await subscribeCurrentCloudMonitor()
  await loadLatestSleepReport()
})

async function loadLatestSleepReport() {
  const device = sleepDevice.value

  latestReport.value = null
  sleepError.value = ''

  if (!device) {
    return
  }

  loadingSleep.value = true

  try {
    const result = await getLatestDeviceSleepReport(toSleepQuery(device))
    latestReport.value = result.hasReport ? result.report || null : null
  }
  catch (error) {
    console.warn('[home] latest sleep report failed:', error)
    sleepError.value = '睡眠报告加载失败'
  }
  finally {
    loadingSleep.value = false
  }
}

function toSleepQuery(device: DeviceListItem) {
  return {
    dn: device.dn,
    productKey: device.productKey,
  }
}

function selectDevice(device: DeviceListItem) {
  deviceStore.selectDevice(device.key)
  pickerOpen.value = false
  void subscribeCurrentCloudMonitor()
  void loadLatestSleepReport()
}

function goAddDevice() {
  pickerOpen.value = false
  uni.navigateTo({
    url: '/pages/device/add',
  })
}

async function subscribeCurrentCloudMonitor() {
  const device = currentDevice.value

  if (!device?.cloudBound || !device.productKey || !device.dn) {
    if (cloudMonitorStore.activeSubscribed) {
      cloudMonitorStore.unsubscribe()
    }
    return
  }

  try {
    await cloudMonitorStore.subscribeDevice({
      dn: device.dn,
      productKey: device.productKey,
    })
  }
  catch (error) {
    console.warn('[home] subscribe mqtt monitor failed:', error)
  }
}

function readMqttNumber(key: string) {
  if (!activeMonitorMatched.value) {
    return undefined
  }

  const value = mqttSnapshot.value[key]

  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

function getMetricStatus(value: unknown): MonitorMetricItem['status'] {
  return value === undefined || value === null || value === '' ? 'muted' : 'normal'
}

function openMonitorPage() {
  uni.switchTab({
    url: '/pages/device/index',
  })
}

function openSleepDetail() {
  const device = sleepDevice.value
  const report = latestReport.value

  if (!device || !report) {
    return
  }

  uni.navigateTo({
    url: `/pages/sleep/detail?productKey=${encodeURIComponent(device.productKey)}&dn=${encodeURIComponent(device.dn)}&sleepStartTime=${report.sleepStartTime || ''}&endTime=${report.endTime || ''}`,
  })
}

function openSleepList() {
  const device = sleepDevice.value

  if (!device) {
    uni.showToast({ icon: 'none', title: '请先绑定设备' })
    return
  }

  uni.navigateTo({
    url: `/pages/sleep/list?productKey=${encodeURIComponent(device.productKey)}&dn=${encodeURIComponent(device.dn)}`,
  })
}

function buildTodayAdvice() {
  const report = latestReport.value
  const heartRate = readMqttNumber('heartRate')
  const breathingRate = readMqttNumber('breathingRate')
  const sleepState = readMqttNumber('algorithmState')
  const advice: Array<{ key: string, icon: string, title: string, text: string }> = []

  if (!currentDevice.value?.cloudBound) {
    return [
      {
        key: 'bind',
        icon: 'i-carbon-devices',
        title: '先连接一台云端设备',
        text: '绑定设备后，首页会自动汇总睡眠报告、在线状态和 MQTT 实时体征。',
      },
    ]
  }

  if (report?.score !== undefined) {
    advice.push({
      key: 'score',
      icon: report.score >= 80 ? 'i-carbon-thumbs-up' : 'i-carbon-moon',
      title: report.score >= 80 ? '昨晚睡眠表现不错' : '今晚可以更早进入睡前节奏',
      text: report.score >= 80
        ? '继续保持固定入睡时间，睡前减少强光和高刺激内容。'
        : '建议睡前 30 分钟降低屏幕亮度，保持卧室安静、温度稳定。',
    })
  }

  if (heartRate !== undefined || breathingRate !== undefined) {
    const heartText = heartRate !== undefined ? `心率 ${heartRate} bpm` : '心率暂无'
    const breathingText = breathingRate !== undefined ? `呼吸 ${breathingRate} rpm` : '呼吸暂无'

    advice.push({
      key: 'vital',
      icon: 'i-carbon-favorite',
      title: '关注当前体征节奏',
      text: `${heartText}，${breathingText}。若持续明显偏离平时水平，建议先放松休息并继续观察。`,
    })
  }

  if (sleepState !== undefined && [3, 4, 5].includes(sleepState)) {
    advice.push({
      key: 'quiet',
      icon: 'i-carbon-volume-mute',
      title: '当前可能处于睡眠阶段',
      text: '尽量减少灯光、声音和走动打扰，让睡眠阶段自然延续。',
    })
  }

  if (!advice.length) {
    advice.push({
      key: 'default',
      icon: 'i-carbon-light',
      title: '今天先保持稳定作息',
      text: '等待更多实时数据后，首页会结合睡眠报告和 MQTT 体征给出更贴近当天状态的建议。',
    })
  }

  return advice.slice(0, 3)
}
</script>

<template>
  <view class="home-page">
    <view class="home-page__body" :style="pageBodyStyle">
      <view class="home-page__switcher-anchor" :style="switcherAnchorStyle">
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

      <view class="home-page__header">
        <view class="home-page__title">
          星眠
        </view>
        <view class="home-page__subtitle">
          睡眠健康监测
        </view>
      </view>

      <view class="home-page__content">
        <yt-sleep-summary-card
          :report="latestReport"
          :loading="loadingSleep"
          :list-enabled="!!sleepDevice"
          @detail="openSleepDetail"
          @list="openSleepList"
        />

        <view v-if="sleepError" class="home-page__tip">
          <view class="i-carbon-warning-alt" />
          <text>{{ sleepError }}</text>
        </view>

        <view v-else-if="!sleepDevice" class="home-page__tip">
          <view class="i-carbon-devices" />
          <text>绑定设备后即可查看睡眠报告。</text>
        </view>

        <view class="home-action-section">
          <view class="home-quick-grid">
            <button class="home-quick-card add" @click="goAddDevice">
              <view class="home-quick-card__icon i-carbon-add" />
              <view class="home-quick-card__text">
                添加设备
              </view>
            </button>

            <button class="home-quick-card report" @click="openSleepList">
              <view class="home-quick-card__icon i-carbon-report" />
              <view class="home-quick-card__text">
                睡眠报告
              </view>
            </button>

            <button class="home-quick-card monitor" @click="openMonitorPage">
              <view class="home-quick-card__icon i-carbon-data-vis-1" />
              <view class="home-quick-card__text">
                数据监控
              </view>
            </button>
          </view>
        </view>

        <yt-monitor-panel
          class="home-vitals-panel"
          :columns="2"
          :metrics="vitalMetrics"
          :status="monitorPanelStatus"
          :status-text="monitorPanelStatusText"
          :subtitle="monitorPanelSubtitle"
          title="实时体征概览"
        />

        <view class="home-advice-panel">
          <view class="home-section-head">
            <view>
              <view class="home-section-title">
                今日建议
              </view>
              <view class="home-section-subtitle">
                基于最近睡眠和实时体征的本地建议
              </view>
            </view>
            <view class="home-section-mark i-carbon-light" />
          </view>

          <view class="home-advice-list">
            <view
              v-for="item in todayAdvice"
              :key="item.key"
              class="home-advice-item"
            >
              <view class="home-advice-item__icon" :class="item.icon" />
              <view class="home-advice-item__copy">
                <view class="home-advice-item__title">
                  {{ item.title }}
                </view>
                <view class="home-advice-item__text">
                  {{ item.text }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  padding-bottom: calc(env(safe-area-inset-bottom) + 120rpx);
  background:
    radial-gradient(circle at 78% 8%, var(--app-primary-soft), transparent 30%),
    radial-gradient(circle at 8% 42%, rgba(68, 185, 255, 0.1), transparent 22%), var(--app-page-bg);
  color: var(--app-text);
}

.home-page__body {
  position: relative;
  padding: 0 32rpx;
}

.home-page__switcher-anchor {
  position: relative;
  z-index: 20;
}

.home-page__header {
  margin-top: 32rpx;
  margin-bottom: 28rpx;
}

.home-page__title {
  color: var(--app-text);
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: 0;
}

.home-page__subtitle {
  margin-top: 10rpx;
  color: var(--app-text-muted);
  font-size: 26rpx;
  line-height: 1.45;
}

.home-page__content {
  position: relative;
  z-index: 1;
}

.home-page__tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 22rpx;
  padding: 20rpx 24rpx;
  border: 1px solid var(--app-border);
  border-radius: 18rpx;
  background: var(--app-surface);
  color: var(--app-text-muted);
  font-size: 24rpx;
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

.home-action-section {
  margin-top: 34rpx;
  margin-bottom: 38rpx;
}

.home-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
}

.home-quick-card {
  min-width: 0;
  height: 148rpx;
  flex-direction: column;
  gap: 14rpx;
  border: 1px solid var(--app-border);
  border-radius: 24rpx;
  background: var(--app-surface);
  color: var(--app-text);
  box-shadow: 0 14rpx 34rpx var(--app-shadow);
  box-sizing: border-box;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease;
}

.home-quick-card:active {
  background: var(--app-surface-2);
  transform: scale(0.985);
}

.home-quick-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60rpx;
  height: 60rpx;
  border-radius: 18rpx;
  color: #fff;
  font-size: 38rpx;
  box-shadow: 0 10rpx 22rpx var(--app-shadow);
}

.home-quick-card.add .home-quick-card__icon {
  background: linear-gradient(145deg, #44b9ff, #2587f8);
}

.home-quick-card.report .home-quick-card__icon {
  background: linear-gradient(145deg, #ff7db4, #ff4f98);
}

.home-quick-card.monitor .home-quick-card__icon {
  background: linear-gradient(145deg, #39d98a, #16a66a);
}

.home-quick-card__text {
  overflow: hidden;
  max-width: 100%;
  color: var(--app-text);
  font-size: 24rpx;
  font-weight: 760;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-vitals-panel {
  margin-top: 0;
}

.home-advice-panel {
  margin-top: 38rpx;
  padding: 24rpx;
  border: 1px solid var(--app-border);
  border-radius: 26rpx;
  background: var(--app-surface);
  box-shadow: 0 16rpx 42rpx var(--app-shadow);
  box-sizing: border-box;
}

.home-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.home-section-title {
  color: var(--app-text);
  font-size: 31rpx;
  font-weight: 800;
  line-height: 42rpx;
}

.home-section-subtitle {
  margin-top: 3rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
}

.home-section-mark {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52rpx;
  height: 52rpx;
  border-radius: 18rpx;
  background: rgba(255, 184, 77, 0.15);
  color: #ffb84d;
  font-size: 30rpx;
}

.home-advice-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 22rpx;
}

.home-advice-item {
  display: flex;
  gap: 16rpx;
  padding: 18rpx;
  border-radius: 20rpx;
  background: var(--app-surface-2);
}

.home-advice-item__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46rpx;
  height: 46rpx;
  border-radius: 16rpx;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 28rpx;
}

.home-advice-item__copy {
  min-width: 0;
  flex: 1;
}

.home-advice-item__title {
  color: var(--app-text);
  font-size: 26rpx;
  font-weight: 760;
  line-height: 34rpx;
}

.home-advice-item__text {
  margin-top: 6rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 34rpx;
}
</style>
