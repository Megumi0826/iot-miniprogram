<script lang="ts" setup>
import type {
  BleSavedWifiNetwork,
  BleWifiNetwork,
} from '@/ble/application'
import { computed, ref } from 'vue'
import { BleWifiSecurityType } from '@/ble/application'
import { useBleStore } from '@/store/ble'

type WifiTab = 'nearby' | 'saved' | 'manual'
type LoadingAction = '' | 'scan' | 'saved' | 'connect'

const PROVISION_RETURN_DELAY = 300

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'WiFi 配网',
  },
})

const bleStore = useBleStore()

const activeTab = ref<WifiTab>('nearby')
const loadingAction = ref<LoadingAction>('')
const pageMessage = ref('')

const selectedNearbyNetwork = ref<BleWifiNetwork | null>(null)
const nearbyPassword = ref('')
const nearbyNoPassword = ref(false)
const nearbyPasswordVisible = ref(false)

const manualSsid = ref('')
const manualPassword = ref('')
const manualNoPassword = ref(false)
const manualPasswordVisible = ref(false)

const connected = computed(() => bleStore.connected)
const nearbyNetworks = computed(() => bleStore.wifiNetworks)
const savedNetworks = computed(() => bleStore.savedWifiNetworks)
const scanningWifi = computed(() => loadingAction.value === 'scan' || bleStore.wifiScanning)
const loadingSaved = computed(() => loadingAction.value === 'saved' || bleStore.savedWifiLoading)
const connectingWifi = computed(() => loadingAction.value === 'connect' || bleStore.provisioning)
const selectedNearbySsid = computed(() => selectedNearbyNetwork.value?.ssid || '')

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function ensureBleConnected() {
  if (connected.value) {
    return true
  }

  uni.showToast({
    icon: 'none',
    title: '请先连接 BLE',
  })

  return false
}

function switchTab(tab: WifiTab) {
  activeTab.value = tab
  pageMessage.value = ''

  if (tab === 'saved') {
    void loadSavedWifi()
  }
}

function goDevicePage() {
  uni.switchTab({
    url: '/pages/device/index',
  })
}

function returnAfterProvisioning() {
  setTimeout(() => {
    if (getCurrentPages().length > 1) {
      uni.navigateBack()
      return
    }

    goDevicePage()
  }, PROVISION_RETURN_DELAY)
}

function isOpenNetwork(network: BleWifiNetwork) {
  return network.security === BleWifiSecurityType.OPEN
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

function getSecurityText(security?: number) {
  switch (security) {
    case BleWifiSecurityType.OPEN:
      return '无密码'
    case BleWifiSecurityType.WEP:
      return 'WEP'
    case BleWifiSecurityType.WPA:
      return 'WPA'
    case BleWifiSecurityType.WPA2:
      return 'WPA2'
    case BleWifiSecurityType.WPA3:
      return 'WPA3'
    default:
      return '未知加密'
  }
}

function openNearbyPassword(network: BleWifiNetwork) {
  selectedNearbyNetwork.value = network
  nearbyPassword.value = ''
  nearbyNoPassword.value = isOpenNetwork(network)
  nearbyPasswordVisible.value = false
}

function closeNearbyPassword() {
  if (connectingWifi.value) {
    return
  }

  selectedNearbyNetwork.value = null
  nearbyPassword.value = ''
  nearbyNoPassword.value = false
  nearbyPasswordVisible.value = false
}

async function runWifiAction(action: LoadingAction, task: () => Promise<void>): Promise<boolean> {
  if (loadingAction.value) {
    return false
  }

  if (!ensureBleConnected()) {
    return false
  }

  loadingAction.value = action
  pageMessage.value = ''

  try {
    await task()
    return true
  }
  catch (error) {
    const message = getErrorMessage(error, '操作失败')
    pageMessage.value = message
    uni.showToast({
      icon: 'none',
      title: message,
    })
    return false
  }
  finally {
    loadingAction.value = ''
  }
}

async function scanNearbyWifi() {
  await runWifiAction('scan', async () => {
    const result = await bleStore.scanWifi()
    pageMessage.value = result.networks.length
      ? `发现 ${result.networks.length} 个 WiFi`
      : '未发现可用 WiFi'
  })
}

async function loadSavedWifi() {
  await runWifiAction('saved', async () => {
    const result = await bleStore.loadSavedWifiNetworks()
    pageMessage.value = result.networks.length
      ? `已读取 ${result.networks.length} 个已保存 WiFi`
      : '设备暂无已保存 WiFi'
  })
}

async function configureWifi(ssid: string, password: string): Promise<boolean> {
  const trimmedSsid = ssid.trim()

  if (!trimmedSsid) {
    uni.showToast({
      icon: 'none',
      title: '请输入 WiFi 名称',
    })
    return false
  }

  return runWifiAction('connect', async () => {
    await bleStore.configureWifiByInput(trimmedSsid, password)
    pageMessage.value = `已向设备发送 ${trimmedSsid} 配网信息`
    uni.showToast({
      icon: 'success',
      title: '配网成功',
    })
    returnAfterProvisioning()
  })
}

async function connectNearbyWifi() {
  const network = selectedNearbyNetwork.value

  if (!network) {
    return
  }

  if (!nearbyNoPassword.value && !nearbyPassword.value) {
    uni.showToast({
      icon: 'none',
      title: '请输入密码或选择无密码',
    })
    return
  }

  const succeeded = await configureWifi(
    network.ssid,
    nearbyNoPassword.value ? '' : nearbyPassword.value,
  )

  if (succeeded) {
    closeNearbyPassword()
  }
}

async function connectSavedWifi(network: BleSavedWifiNetwork) {
  await configureWifi(network.ssid, network.password || '')
}

async function connectManualWifi() {
  if (!manualNoPassword.value && !manualPassword.value) {
    uni.showToast({
      icon: 'none',
      title: '请输入密码或选择无密码',
    })
    return
  }

  await configureWifi(
    manualSsid.value,
    manualNoPassword.value ? '' : manualPassword.value,
  )
}
</script>

<template>
  <view class="wifi-page">
    <yt-page-header title="WiFi 配网" subtitle="通过蓝牙为设备配置网络" />

    <view class="wifi-body">
      <view class="tab-bar">
        <button class="tab" :class="{ active: activeTab === 'nearby' }" @click="switchTab('nearby')">
          选择 WiFi
        </button>
        <button class="tab" :class="{ active: activeTab === 'saved' }" @click="switchTab('saved')">
          已保存 WiFi
        </button>
        <button class="tab" :class="{ active: activeTab === 'manual' }" @click="switchTab('manual')">
          手动输入
        </button>
      </view>

      <view v-if="!connected" class="empty-panel">
        <view class="empty-icon i-carbon-bluetooth" />
        <view class="empty-title">
          请先连接 BLE
        </view>
        <view class="empty-text">
          WiFi 配网需要通过当前已连接的蓝牙设备下发网络信息
        </view>
        <button class="primary-btn" @click="goDevicePage">
          返回设备页
        </button>
      </view>

      <template v-else>
        <view v-if="activeTab === 'nearby'" class="section">
          <button class="scan-btn" :disabled="scanningWifi || connectingWifi" @click="scanNearbyWifi">
            <view :class="scanningWifi ? 'i-carbon-renew scan-spin' : 'i-carbon-wifi'" />
            <text>{{ scanningWifi ? '扫描中...' : '扫描附近 WiFi' }}</text>
          </button>

          <view v-if="nearbyNetworks.length" class="wifi-list">
            <button
              v-for="network in nearbyNetworks"
              :key="`${network.ssid}-${network.rssi ?? 'unknown'}`"
              class="wifi-item"
              :disabled="connectingWifi"
              @click="openNearbyPassword(network)"
            >
              <view class="wifi-icon i-carbon-wifi" />
              <view class="wifi-main">
                <view class="wifi-name">
                  {{ network.ssid }}
                </view>
                <view class="wifi-meta">
                  {{ getSecurityText(network.security) }} · {{ network.rssi ?? '未知' }} dBm
                </view>
              </view>
              <view class="signal" :class="getSignalClass(network.rssi)">
                {{ getSignalText(network.rssi) }}
              </view>
            </button>
          </view>

          <view v-else class="list-empty">
            <view class="i-carbon-wifi" />
            <text>{{ scanningWifi ? '正在等待扫描结果' : '点击扫描后展示附近 WiFi' }}</text>
          </view>
        </view>

        <view v-if="activeTab === 'saved'" class="section">
          <view class="section-head">
            <view>
              <view class="section-title">
                设备已保存网络
              </view>
              <view class="section-subtitle">
                点击后直接使用设备保存的密码连接
              </view>
            </view>
            <button class="text-btn" :disabled="loadingSaved || connectingWifi" @click="loadSavedWifi">
              {{ loadingSaved ? '读取中' : '刷新' }}
            </button>
          </view>

          <view v-if="savedNetworks.length" class="wifi-list">
            <button
              v-for="network in savedNetworks"
              :key="network.ssid"
              class="wifi-item"
              :disabled="connectingWifi"
              @click="connectSavedWifi(network)"
            >
              <view class="wifi-icon saved i-carbon-wifi" />
              <view class="wifi-main">
                <view class="wifi-name">
                  {{ network.ssid }}
                </view>
                <view class="wifi-meta">
                  {{ network.password ? '已保存密码' : '无密码网络' }}
                </view>
              </view>
              <view class="connect-label">
                连接
              </view>
            </button>
          </view>

          <view v-else class="list-empty">
            <view class="i-carbon-wifi-off" />
            <text>{{ loadingSaved ? '正在读取已保存 WiFi' : '设备暂无已保存 WiFi' }}</text>
          </view>
        </view>

        <view v-if="activeTab === 'manual'" class="section manual-panel">
          <view class="field">
            <view class="field-label">
              WiFi 名称
            </view>
            <input v-model="manualSsid" class="field-input" placeholder="输入 SSID" placeholder-class="field-placeholder">
          </view>

          <view class="field">
            <view class="field-label">
              WiFi 密码
            </view>
            <view class="password-row">
              <input
                v-model="manualPassword"
                class="field-input password-input"
                :disabled="manualNoPassword"
                :password="!manualPasswordVisible"
                placeholder="输入密码"
                placeholder-class="field-placeholder"
              >
              <button class="icon-btn" :disabled="manualNoPassword" @click="manualPasswordVisible = !manualPasswordVisible">
                <view :class="manualPasswordVisible ? 'i-carbon-view-off' : 'i-carbon-view'" />
              </button>
            </view>
          </view>

          <button class="check-row" @click="manualNoPassword = !manualNoPassword">
            <view class="check-box" :class="{ checked: manualNoPassword }">
              <view v-if="manualNoPassword" class="i-carbon-checkmark" />
            </view>
            <text>无密码网络</text>
          </button>

          <button class="primary-btn" :disabled="connectingWifi" @click="connectManualWifi">
            {{ connectingWifi ? '配网中...' : '开始配网' }}
          </button>
        </view>

        <view v-if="pageMessage" class="page-message">
          {{ pageMessage }}
        </view>
      </template>
    </view>

    <view v-if="selectedNearbyNetwork" class="sheet-mask" @click="closeNearbyPassword">
      <view class="password-sheet" @click.stop>
        <view class="sheet-title">
          {{ selectedNearbySsid }}
        </view>
        <view class="sheet-subtitle">
          输入密码后设备会通过蓝牙接收网络信息
        </view>

        <view class="field sheet-field">
          <view class="field-label">
            WiFi 密码
          </view>
          <view class="password-row">
            <input
              v-model="nearbyPassword"
              class="field-input password-input"
              :disabled="nearbyNoPassword"
              :password="!nearbyPasswordVisible"
              placeholder="输入密码"
              placeholder-class="field-placeholder"
            >
            <button class="icon-btn" :disabled="nearbyNoPassword" @click="nearbyPasswordVisible = !nearbyPasswordVisible">
              <view :class="nearbyPasswordVisible ? 'i-carbon-view-off' : 'i-carbon-view'" />
            </button>
          </view>
        </view>

        <button class="check-row sheet-check" @click="nearbyNoPassword = !nearbyNoPassword">
          <view class="check-box" :class="{ checked: nearbyNoPassword }">
            <view v-if="nearbyNoPassword" class="i-carbon-checkmark" />
          </view>
          <text>无密码网络</text>
        </button>

        <view class="sheet-actions">
          <button class="secondary-btn" :disabled="connectingWifi" @click="closeNearbyPassword">
            取消
          </button>
          <button class="primary-btn sheet-primary" :disabled="connectingWifi" @click="connectNearbyWifi">
            {{ connectingWifi ? '配网中...' : '开始配网' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  line-height: normal;
  text-align: left;
}

button::after {
  border: 0;
}

.wifi-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 78% 8%, var(--app-primary-soft), transparent 28%),
    radial-gradient(circle at 8% 34%, rgba(54, 217, 255, 0.1), transparent 24%), var(--app-page-bg);
  color: var(--app-text);
}

.wifi-body {
  padding: 0 32rpx calc(env(safe-area-inset-bottom) + 48rpx);
}

.tab-bar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8rpx;
  padding: 9rpx;
  border: 1px solid var(--app-border);
  border-radius: 28rpx;
  background: var(--app-surface);
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.06);
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  height: 70rpx;
  border-radius: 20rpx;
  box-sizing: border-box;
  color: var(--app-text-muted);
  font-size: 25rpx;
  font-weight: 700;
  text-align: center;
}

.tab.active {
  background: linear-gradient(135deg, var(--app-primary), #36d9ff);
  color: #fff;
  box-shadow: 0 14rpx 30rpx rgba(109, 76, 255, 0.28);
}

.section,
.empty-panel {
  margin-top: 24rpx;
}

.scan-btn,
.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  width: 100%;
  height: 86rpx;
  border-radius: 26rpx;
  background: var(--app-primary);
  color: #fff;
  font-size: 28rpx;
  font-weight: 800;
  box-shadow: 0 18rpx 36rpx rgba(109, 76, 255, 0.24);
}

.scan-btn[disabled],
.primary-btn[disabled],
.secondary-btn[disabled],
.wifi-item[disabled],
.text-btn[disabled],
.icon-btn[disabled] {
  opacity: 0.58;
}

.scan-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.wifi-list {
  margin-top: 22rpx;
}

.wifi-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 112rpx;
  margin-bottom: 16rpx;
  padding: 18rpx 20rpx;
  border: 1px solid var(--app-border);
  border-radius: 24rpx;
  background: var(--app-surface);
  box-sizing: border-box;
  box-shadow: 0 14rpx 32rpx rgba(18, 24, 56, 0.08);
}

.wifi-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, var(--app-primary), #36d9ff);
  box-shadow:
    0 0 0 8rpx rgba(54, 217, 255, 0.08),
    0 14rpx 28rpx rgba(54, 217, 255, 0.18);
  color: #fff;
  font-size: 34rpx;
}

.wifi-icon.saved {
  background: linear-gradient(135deg, #36d9ff, #36d976);
  box-shadow:
    0 0 0 8rpx rgba(54, 217, 118, 0.08),
    0 14rpx 28rpx rgba(54, 217, 255, 0.18);
  color: #fff;
}

.wifi-main {
  min-width: 0;
  flex: 1;
  margin-left: 18rpx;
}

.wifi-name {
  overflow: hidden;
  color: var(--app-text);
  font-size: 29rpx;
  font-weight: 800;
  line-height: 38rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wifi-meta,
.section-subtitle,
.empty-text,
.sheet-subtitle {
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 34rpx;
}

.signal,
.connect-label {
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 22rpx;
  font-weight: 700;
}

.signal.strong {
  background: rgba(54, 217, 118, 0.14);
  color: #36d976;
}

.signal.good,
.connect-label {
  background: rgba(54, 217, 255, 0.13);
  color: var(--app-cyan);
}

.signal.weak {
  background: rgba(245, 158, 11, 0.14);
  color: #f59e0b;
}

.list-empty,
.empty-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300rpx;
  padding: 42rpx 30rpx;
  border: 1px solid var(--app-border);
  border-radius: 28rpx;
  background: var(--app-surface);
  box-sizing: border-box;
  color: var(--app-text-muted);
  text-align: center;
}

.list-empty view,
.empty-icon {
  margin-bottom: 18rpx;
  color: var(--app-primary);
  font-size: 56rpx;
}

.empty-title {
  margin-bottom: 10rpx;
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 900;
}

.empty-panel .primary-btn {
  margin-top: 30rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.section-title {
  color: var(--app-text);
  font-size: 31rpx;
  font-weight: 900;
  line-height: 42rpx;
}

.text-btn {
  flex-shrink: 0;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 23rpx;
  font-weight: 800;
}

.manual-panel {
  padding: 24rpx;
  border: 1px solid var(--app-border);
  border-radius: 28rpx;
  background: var(--app-surface);
}

.field + .field {
  margin-top: 22rpx;
}

.field-label {
  margin-bottom: 12rpx;
  color: var(--app-text);
  font-size: 25rpx;
  font-weight: 800;
}

.field-input {
  width: 100%;
  height: 78rpx;
  padding: 0 22rpx;
  border: 1px solid var(--app-border);
  border-radius: 22rpx;
  background: var(--app-bg-soft);
  box-sizing: border-box;
  color: var(--app-text);
  font-size: 27rpx;
}

.field-placeholder {
  color: var(--app-text-subtle);
}

.password-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.password-input {
  min-width: 0;
  flex: 1;
}

.icon-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 78rpx;
  height: 78rpx;
  border: 1px solid var(--app-border);
  border-radius: 22rpx;
  background: var(--app-bg-soft);
  color: var(--app-text-muted);
  font-size: 34rpx;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 24rpx;
  color: var(--app-text-muted);
  font-size: 25rpx;
  font-weight: 700;
}

.check-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  border: 1px solid var(--app-border);
  border-radius: 10rpx;
  background: var(--app-bg-soft);
  color: #fff;
  font-size: 24rpx;
}

.check-box.checked {
  border-color: var(--app-primary);
  background: var(--app-primary);
}

.manual-panel .primary-btn {
  margin-top: 32rpx;
}

.page-message {
  margin-top: 22rpx;
  padding: 18rpx 22rpx;
  border-radius: 20rpx;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  font-size: 23rpx;
  line-height: 34rpx;
}

.sheet-mask {
  position: fixed;
  z-index: 20;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.42);
}

.password-sheet {
  width: 100%;
  padding: 34rpx 32rpx calc(env(safe-area-inset-bottom) + 32rpx);
  border-radius: 34rpx 34rpx 0 0;
  background: var(--app-surface);
  box-sizing: border-box;
}

.sheet-title {
  overflow: hidden;
  color: var(--app-text);
  font-size: 34rpx;
  font-weight: 900;
  line-height: 44rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-subtitle {
  margin-top: 8rpx;
}

.sheet-field {
  margin-top: 28rpx;
}

.sheet-check {
  margin-top: 22rpx;
}

.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 16rpx;
  margin-top: 32rpx;
}

.secondary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 82rpx;
  border-radius: 24rpx;
  background: var(--app-bg-soft);
  color: var(--app-text-muted);
  font-size: 27rpx;
  font-weight: 800;
}

.sheet-primary {
  height: 82rpx;
}
</style>
