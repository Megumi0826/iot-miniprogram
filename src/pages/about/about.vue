<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
import { useBleStore } from '@/store'

definePage({
  style: {
    navigationBarTitleText: '关于',
  },
})

const bleStore = useBleStore()
const logs = ref<string[]>([])
const wifiSsid = ref('')
const wifiPassword = ref('')

function addLog(message: string) {
  logs.value = [...logs.value, message]
}

function clearLogs() {
  logs.value = []
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return JSON.stringify(error)
}

function formatBoolean(value?: boolean): string {
  if (value === undefined) {
    return '无'
  }

  return value ? '是' : '否'
}

function formatMonitorValue(value: number | boolean | undefined, unit = ''): string {
  if (value === undefined) {
    return '无'
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  return `${value}${unit}`
}

function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString()
}

function formatSavedPassword(password?: string): string {
  if (password === undefined) {
    return '无'
  }

  if (!password) {
    return '空'
  }

  return `已保存(${password.length}位)`
}

function logCurrentDeviceStatus() {
  const identity = bleStore.currentIdentity
  const status = bleStore.currentStatus

  addLog(`连接状态: ${bleStore.connectionState}`)
  addLog(`设备: ${bleStore.currentDevice?.name || '无'}`)
  addLog(`dn: ${identity?.dn || '无'}`)
  addLog(`SN: ${identity?.deviceSn || '无'}`)
  addLog(`MAC: ${identity?.macAddress || '无'}`)
  addLog(`设备类型: ${identity?.deviceType || '无'}`)
  addLog(`固件: ${identity?.firmwareVersion || '无'}`)
  addLog(`协议版本: ${identity?.protocolVersion || '无'}`)
  addLog(`WiFi 状态: ${status?.wifiStatus ?? '无'}`)
  addLog(`MQTT 状态: ${status?.mqttStatus ?? '无'}`)
  addLog(`雷达睡眠查询状态: ${status?.radarSleepStatus ?? '无'}`)
  addLog(`WiFi 已配置: ${formatBoolean(status?.wifiConfigured)}`)
  addLog(`WiFi 已连接: ${formatBoolean(status?.wifiConnected)}`)
  addLog(`IP: ${status?.ipAddress || '无'}`)
}

async function testStoreScan() {
  try {
    await bleStore.startScan()
    addLog('Store 扫描已开始')
  }
  catch (error) {
    addLog(`Store 扫描失败: ${formatError(error)}`)
  }
}

async function testStoreStopScan() {
  try {
    await bleStore.stopScan()
    addLog('Store 扫描已停止')
  }
  catch (error) {
    addLog(`Store 停止扫描失败: ${formatError(error)}`)
  }
}

async function testStoreConnectFirstDevice() {
  const device = bleStore.nearbyDevices[0]

  if (!device) {
    addLog('请先扫描到设备')
    return
  }

  try {
    addLog(`开始连接: ${device.name}`)
    await bleStore.connectDevice(device)
    addLog('Store 连接成功')
    logCurrentDeviceStatus()
  }
  catch (error) {
    addLog(`Store 连接失败: ${formatError(error)}`)
  }
}

async function testStoreRefreshStatus() {
  try {
    await bleStore.refreshCurrentStatus()
    addLog('Store 刷新状态成功')
    logCurrentDeviceStatus()
  }
  catch (error) {
    addLog(`Store 刷新状态失败: ${formatError(error)}`)
  }
}

async function testStoreDisconnect() {
  try {
    await bleStore.disconnectDevice()
    addLog('Store 已断开')
  }
  catch (error) {
    addLog(`Store 断开失败: ${formatError(error)}`)
  }
}

async function testStoreScanWifi() {
  try {
    const result = await bleStore.scanWifi()
    addLog(`Store WiFi 扫描成功，数量: ${result.networks.length}`)

    result.networks.forEach((network, index) => {
      addLog(`${index + 1}. ${network.ssid}, RSSI=${network.rssi ?? '无'}, security=${network.security ?? '无'}`)
    })
  }
  catch (error) {
    addLog(`Store WiFi 扫描失败: ${formatError(error)}`)
  }
}

async function testStoreLoadSavedWifi() {
  try {
    const result = await bleStore.loadSavedWifiNetworks()
    addLog(`Store 读取已保存 WiFi 成功，数量: ${result.networks.length}`)

    result.networks.forEach((network, index) => {
      addLog(`${index + 1}. ${network.ssid}, password=${formatSavedPassword(network.password)}`)
    })
  }
  catch (error) {
    addLog(`Store 读取已保存 WiFi 失败: ${formatError(error)}`)
  }
}

async function testStoreConfigureWifiByInput() {
  try {
    await bleStore.configureWifiByInput(wifiSsid.value, wifiPassword.value)
    addLog(`Store 手输配网成功: ${wifiSsid.value}`)
    logCurrentDeviceStatus()
  }
  catch (error) {
    addLog(`Store 手输配网失败: ${formatError(error)}`)
  }
}

async function testStoreConfigureFirstSavedWifi() {
  const network = bleStore.savedWifiNetworks[0]

  if (!network) {
    addLog('请先读取到设备已保存 WiFi')
    return
  }

  try {
    await bleStore.configureWifiBySavedNetwork(network)
    addLog(`Store 已保存 WiFi 配网成功: ${network.ssid}`)
    logCurrentDeviceStatus()
  }
  catch (error) {
    addLog(`Store 已保存 WiFi 配网失败: ${formatError(error)}`)
  }
}

async function testStoreDeleteFirstSavedWifi() {
  const network = bleStore.savedWifiNetworks[0]

  if (!network) {
    addLog('请先读取到设备已保存 WiFi')
    return
  }

  try {
    await bleStore.deleteSavedWifi(network)
    addLog(`Store 删除已保存 WiFi 成功: ${network.ssid}`)
  }
  catch (error) {
    addLog(`Store 删除已保存 WiFi 失败: ${formatError(error)}`)
  }
}

async function testStoreStartMonitor() {
  try {
    await bleStore.startMonitor()
    addLog('Store 实时监控已启动')
  }
  catch (error) {
    addLog(`Store 启动实时监控失败: ${formatError(error)}`)
  }
}

async function testStoreStopMonitor() {
  try {
    await bleStore.stopMonitor()
    addLog('Store 实时监控已停止')
  }
  catch (error) {
    addLog(`Store 停止实时监控失败: ${formatError(error)}`)
  }
}

onUnmounted(() => {
  void bleStore.stopMonitor()
  void bleStore.stopScan()
  void bleStore.disconnectDevice()
})
</script>

<template>
  <view class="about-page">
    <yt-page-header title="关于" />

    <view class="ble-store-test">
      <view class="test-title">
        BLE Store 测试
      </view>

      <view class="test-actions">
        <button class="test-button" @click="testStoreScan">
          Store 扫描
        </button>
        <button class="test-button" @click="testStoreStopScan">
          停止扫描
        </button>
        <button class="test-button" @click="testStoreConnectFirstDevice">
          连接首个设备
        </button>
        <button class="test-button" @click="testStoreRefreshStatus">
          刷新状态
        </button>
        <button class="test-button" @click="testStoreScanWifi">
          扫描 WiFi
        </button>
        <button class="test-button" @click="testStoreLoadSavedWifi">
          读取保存 WiFi
        </button>
        <input
          v-model="wifiSsid"
          class="test-input"
          placeholder="WiFi 名称"
        >
        <input
          v-model="wifiPassword"
          class="test-input"
          password
          placeholder="WiFi 密码"
        >
        <button class="test-button" @click="testStoreConfigureWifiByInput">
          手输配网
        </button>
        <button class="test-button" @click="testStoreConfigureFirstSavedWifi">
          首个保存配网
        </button>
        <button class="test-button" @click="testStoreStartMonitor">
          开始监控
        </button>
        <button class="test-button" @click="testStoreStopMonitor">
          停止监控
        </button>
        <button class="test-button secondary" @click="testStoreDeleteFirstSavedWifi">
          删除首个保存
        </button>
        <button class="test-button secondary" @click="testStoreDisconnect">
          断开设备
        </button>
        <button class="test-button secondary" @click="clearLogs">
          清空日志
        </button>
      </view>

      <view class="status-panel">
        <view class="status-title">
          Store 状态
        </view>
        <view class="status-line">
          scanState: {{ bleStore.scanState }}
        </view>
        <view class="status-line">
          connectionState: {{ bleStore.connectionState }}
        </view>
        <view class="status-line">
          scanning: {{ bleStore.scanning ? '是' : '否' }}
        </view>
        <view class="status-line">
          connecting: {{ bleStore.connecting ? '是' : '否' }}
        </view>
        <view class="status-line">
          connected: {{ bleStore.connected ? '是' : '否' }}
        </view>
        <view class="status-line">
          refreshingStatus: {{ bleStore.refreshingStatus ? '是' : '否' }}
        </view>
        <view class="status-line">
          wifiScanning: {{ bleStore.wifiScanning ? '是' : '否' }}
        </view>
        <view class="status-line">
          savedWifiLoading: {{ bleStore.savedWifiLoading ? '是' : '否' }}
        </view>
        <view class="status-line">
          provisioning: {{ bleStore.provisioning ? '是' : '否' }}
        </view>
        <view class="status-line">
          monitoring: {{ bleStore.monitoring ? '是' : '否' }}
        </view>
        <view class="status-line">
          devices: {{ bleStore.nearbyDevices.length }}
        </view>
        <view v-if="bleStore.errorMessage" class="status-line error">
          error: {{ bleStore.errorMessage }}
        </view>
      </view>

      <view class="device-list">
        <view class="section-title">
          附近设备
        </view>
        <view
          v-for="device in bleStore.nearbyDevices"
          :key="device.deviceId"
          class="device-item"
        >
          <view class="device-name">
            {{ device.name }}
          </view>
          <view class="device-meta">
            {{ device.profileName }} / RSSI={{ device.RSSI ?? '未知' }}
          </view>
        </view>
        <view v-if="bleStore.nearbyDevices.length === 0" class="empty-text">
          暂无设备，点击 Store 扫描。
        </view>
      </view>

      <view class="status-panel">
        <view class="status-title">
          实时监控快照
        </view>
        <view class="status-line">
          心率: {{ formatMonitorValue(bleStore.monitorSnapshot?.heartRate, ' bpm') }}
        </view>
        <view class="status-line">
          呼吸: {{ formatMonitorValue(bleStore.monitorSnapshot?.breathRate, ' rpm') }}
        </view>
        <view class="status-line">
          存在: {{ formatMonitorValue(bleStore.monitorSnapshot?.presence) }}
        </view>
        <view class="status-line">
          运动: {{ formatMonitorValue(bleStore.monitorSnapshot?.motion) }}
        </view>
        <view class="status-line">
          距离: {{ formatMonitorValue(bleStore.monitorSnapshot?.distanceCm, ' cm') }}
        </view>
        <view class="status-line">
          坐标:
          {{ formatMonitorValue(bleStore.monitorSnapshot?.posXmm) }},
          {{ formatMonitorValue(bleStore.monitorSnapshot?.posYmm) }},
          {{ formatMonitorValue(bleStore.monitorSnapshot?.posZmm) }}
        </view>
        <view class="status-line">
          体动: {{ formatMonitorValue(bleStore.monitorSnapshot?.bodyMovement) }}
        </view>
        <view class="status-line">
          样本数: {{ bleStore.monitorSamples.length }}
        </view>
      </view>

      <view class="device-list">
        <view class="section-title">
          监控曲线样本
        </view>
        <view
          v-for="(sample, index) in bleStore.monitorSamples.slice(-8)"
          :key="`${sample.updatedAt}-${index}`"
          class="device-item"
        >
          <view class="device-name">
            {{ formatTime(sample.updatedAt) }}
          </view>
          <view class="device-meta">
            心率={{ formatMonitorValue(sample.heartRate) }} /
            呼吸={{ formatMonitorValue(sample.breathRate) }} /
            距离={{ formatMonitorValue(sample.distanceCm, 'cm') }} /
            体动={{ formatMonitorValue(sample.bodyMovement) }}
          </view>
        </view>
        <view v-if="bleStore.monitorSamples.length === 0" class="empty-text">
          暂无样本，连接设备后点击开始监控。
        </view>
      </view>

      <view class="device-list">
        <view class="section-title">
          附近 WiFi
        </view>
        <view
          v-for="network in bleStore.wifiNetworks"
          :key="network.ssid"
          class="device-item"
        >
          <view class="device-name">
            {{ network.ssid }}
          </view>
          <view class="device-meta">
            RSSI={{ network.rssi ?? '无' }} / security={{ network.security ?? '无' }}
          </view>
        </view>
        <view v-if="bleStore.wifiNetworks.length === 0" class="empty-text">
          暂无 WiFi，连接设备后点击扫描 WiFi。
        </view>
      </view>

      <view class="device-list">
        <view class="section-title">
          已保存 WiFi
        </view>
        <view
          v-for="network in bleStore.savedWifiNetworks"
          :key="network.ssid"
          class="device-item"
        >
          <view class="device-name">
            {{ network.ssid }}
          </view>
          <view class="device-meta">
            password={{ formatSavedPassword(network.password) }}
          </view>
        </view>
        <view v-if="bleStore.savedWifiNetworks.length === 0" class="empty-text">
          暂无已保存 WiFi，连接设备后点击读取保存 WiFi。
        </view>
      </view>

      <view class="status-panel">
        <view class="status-title">
          当前连接
        </view>
        <view class="status-line">
          设备: {{ bleStore.currentDevice?.name || '无' }}
        </view>
        <view class="status-line">
          dn: {{ bleStore.currentIdentity?.dn || '无' }}
        </view>
        <view class="status-line">
          MAC: {{ bleStore.currentIdentity?.macAddress || '无' }}
        </view>
        <view class="status-line">
          固件: {{ bleStore.currentIdentity?.firmwareVersion || '无' }}
        </view>
        <view class="status-line">
          WiFi 状态: {{ bleStore.currentStatus?.wifiStatus ?? '无' }}
        </view>
        <view class="status-line">
          MQTT 状态: {{ bleStore.currentStatus?.mqttStatus ?? '无' }}
        </view>
        <view class="status-line">
          IP: {{ bleStore.currentStatus?.ipAddress || '无' }}
        </view>
      </view>

      <view class="test-log">
        <view
          v-for="(log, index) in logs"
          :key="`${index}-${log}`"
          class="test-line"
        >
          {{ log }}
        </view>
        <view v-if="logs.length === 0" class="empty-text">
          点击上面的按钮查看 Store 扫描和连接结果。
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #f6f8fa;
}

.ble-store-test {
  padding: 24rpx;
}

.test-title {
  margin-bottom: 20rpx;
  color: #111827;
  font-size: 32rpx;
  font-weight: 600;
}

.test-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.test-button {
  margin: 0;
  padding: 0 16rpx;
  height: 76rpx;
  border-radius: 8rpx;
  color: #ffffff;
  background: #2563eb;
  font-size: 26rpx;
  line-height: 76rpx;
}

.test-button.secondary {
  color: #1f2937;
  background: #e5e7eb;
}

.test-input {
  box-sizing: border-box;
  padding: 0 20rpx;
  height: 76rpx;
  border: 1rpx solid #d1d5db;
  border-radius: 8rpx;
  color: #111827;
  background: #ffffff;
  font-size: 26rpx;
  line-height: 76rpx;
}

.status-panel,
.device-list,
.test-log {
  margin-top: 24rpx;
  padding: 20rpx;
  border: 1rpx solid #d1d5db;
  border-radius: 8rpx;
  background: #ffffff;
}

.status-title,
.section-title {
  margin-bottom: 12rpx;
  color: #111827;
  font-size: 28rpx;
  font-weight: 600;
}

.status-line {
  margin-bottom: 8rpx;
  color: #1f2937;
  font-size: 24rpx;
  line-height: 1.4;
}

.status-line.error {
  color: #dc2626;
}

.device-item {
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 8rpx;
  background: #eff6ff;
}

.device-name {
  color: #111827;
  font-size: 26rpx;
  font-weight: 600;
}

.device-meta {
  margin-top: 6rpx;
  color: #6b7280;
  font-size: 22rpx;
}

.test-line {
  margin-bottom: 12rpx;
  color: #111827;
  font-family: Consolas, Monaco, monospace;
  font-size: 24rpx;
  line-height: 1.45;
  word-break: break-all;
}

.empty-text {
  color: #6b7280;
  font-size: 26rpx;
  line-height: 1.5;
}
</style>
