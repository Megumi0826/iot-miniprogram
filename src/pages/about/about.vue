<script lang="ts" setup>
import type {
  BleLocalConnection,
  BleNearbyDevice,
  BleRadarMonitorSession,
  BleRadarMonitorSnapshot,
} from '@/ble/application'
import { onUnmounted, ref } from 'vue'
import {
  configureWifi,
  connectLocalDevice,
  createRadarMonitorSession,
  getDeviceStatusCodeDisplay,
  getResultCodeDisplay,
  queryDeviceStatus,
  scanNearbyDevices,
  scanWifiNetworks,
} from '@/ble/application'
import {
  BleCommand,
  decodeUtf8,
  encodeFrame,
  encodeTlvs,
  encodeUtf8,
  findTlv,
  FrameAssembler,
  parseTlvs,
  readTlvString,
  readTlvU8,
  tlvString,
  TlvType,
  tlvU8,
} from '@/ble/protocol'

definePage({
  style: {
    navigationBarTitleText: '关于',
  },
})

const protocolTestLogs = ref<string[]>([])
const nearbyDevices = ref<BleNearbyDevice[]>([])
const wifiSsid = ref('')
const wifiPassword = ref('')

let stopBleScan: (() => Promise<void>) | undefined
let currentConnection: BleLocalConnection | undefined
let currentMonitor: BleRadarMonitorSession | undefined

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

function addLog(message: string) {
  protocolTestLogs.value = [...protocolTestLogs.value, message]
}

function clearProtocolTestLogs() {
  protocolTestLogs.value = []
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return JSON.stringify(error)
}

function formatSnapshotValue(value: number | boolean | undefined): string {
  if (value === undefined) {
    return '无'
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  return String(value)
}

function formatRadarSnapshot(snapshot: BleRadarMonitorSnapshot): string {
  return [
    `心率=${formatSnapshotValue(snapshot.heartRate)}`,
    `呼吸=${formatSnapshotValue(snapshot.breathRate)}`,
    `存在=${formatSnapshotValue(snapshot.presence)}`,
    `运动=${formatSnapshotValue(snapshot.motion)}`,
    `距离=${formatSnapshotValue(snapshot.distanceCm)}cm`,
    `坐标=(${formatSnapshotValue(snapshot.posXmm)},${formatSnapshotValue(snapshot.posYmm)},${formatSnapshotValue(snapshot.posZmm)})`,
    `体动=${formatSnapshotValue(snapshot.bodyMovement)}`,
  ].join(', ')
}

async function testBleScan() {
  try {
    nearbyDevices.value = []
    await stopBleScan?.()

    const result = await scanNearbyDevices({
      allowDuplicatesKey: true,
      onDeviceFound: (device, devices) => {
        nearbyDevices.value = devices
        addLog(`发现设备: ${device.name}, RSSI=${device.RSSI ?? '未知'}, type=${device.profileType}`)
      },
    })

    stopBleScan = result.stop
    addLog('BLE 扫描已开始')
  }
  catch (error) {
    addLog(`BLE 扫描失败: ${formatError(error)}`)
  }
}

async function testStopBleScan() {
  try {
    await stopBleScan?.()
    stopBleScan = undefined
    addLog('BLE 扫描已停止')
  }
  catch (error) {
    addLog(`停止扫描失败: ${formatError(error)}`)
  }
}

async function testConnectAndQueryStatus() {
  const device = nearbyDevices.value[0]

  if (!device) {
    addLog('请先扫描到设备')
    return
  }

  try {
    await stopBleScan?.()
    stopBleScan = undefined

    await currentConnection?.disconnect()
    currentConnection = await connectLocalDevice(device.deviceId, {
      enableEventNotify: true,
      profile: device.profile,
    })

    addLog(`已连接: ${device.name}`)
    addLog(`write: ${currentConnection.channels.write.characteristicId}`)
    addLog(`response: ${currentConnection.channels.responseNotify?.characteristicId || '无'}`)
    addLog(`events: ${currentConnection.channels.eventNotifies.length}`)

    const result = await queryDeviceStatus(currentConnection)

    addLog(`查询结果码: ${result.resultCode ?? '无'}`)
    addLog(`dn: ${result.identity?.dn || '未解析到'}`)
    addLog(`SN: ${result.identity?.deviceSn || '无'}`)
    addLog(`MAC: ${result.identity?.macAddress || '无'}`)
    addLog(`设备类型: ${result.identity?.deviceType || '无'}`)
    addLog(`固件: ${result.identity?.firmwareVersion || '无'}`)
    addLog(`协议版本: ${result.identity?.protocolVersion || '无'}`)
    addLog(`WiFi 状态: ${result.status.wifiStatus ?? '无'}`)
    addLog(`MQTT 状态: ${result.status.mqttStatus ?? '无'}`)
    addLog(`雷达睡眠查询状态: ${result.status.radarSleepStatus ?? '无'}`)
    addLog(`WiFi 已配置: ${result.status.wifiConfigured === undefined ? '无' : result.status.wifiConfigured ? '是' : '否'}`)
    addLog(`WiFi 已连接: ${result.status.wifiConnected === undefined ? '无' : result.status.wifiConnected ? '是' : '否'}`)
    addLog(`IP: ${result.status.ipAddress || '无'}`)
  }
  catch (error) {
    addLog(`连接/查询失败: ${formatError(error)}`)
  }
}

async function testDisconnectBle() {
  try {
    await currentMonitor?.close()
    currentMonitor = undefined
    await currentConnection?.disconnect()
    currentConnection = undefined
    addLog('BLE 已断开')
  }
  catch (error) {
    addLog(`断开 BLE 失败: ${formatError(error)}`)
  }
}

async function testStartRadarMonitor() {
  if (!currentConnection) {
    addLog('请先连接设备')
    return
  }

  try {
    await currentMonitor?.close()
    currentMonitor = createRadarMonitorSession(currentConnection)

    currentMonitor.onSnapshot((snapshot) => {
      addLog(`监控快照: ${formatRadarSnapshot(snapshot)}`)
    })

    addLog('开始启动雷达实时监控...')

    const response = await currentMonitor.start({
      interval: 1000,
    })

    addLog(`启动监控结果: ${getResultCodeDisplay(response.resultCode)}`)
  }
  catch (error) {
    addLog(`启动监控失败: ${formatError(error)}`)
  }
}

async function testStopRadarMonitor() {
  if (!currentMonitor) {
    addLog('监控未启动')
    return
  }

  try {
    const response = await currentMonitor.stop()
    await currentMonitor.close()
    currentMonitor = undefined

    addLog(`停止监控结果: ${getResultCodeDisplay(response.resultCode)}`)
  }
  catch (error) {
    addLog(`停止监控失败: ${formatError(error)}`)
  }
}

async function testScanWifiNetworks() {
  if (!currentConnection) {
    addLog('请先连接设备')
    return
  }

  try {
    addLog('开始扫描 WiFi...')

    const result = await scanWifiNetworks(currentConnection)

    addLog(`WiFi 扫描结果: ${getResultCodeDisplay(result.resultCode)}`)
    addLog(`WiFi 数量: ${result.count ?? result.networks.length}`)

    if (result.networks.length === 0) {
      addLog('未解析到 WiFi 热点')
      return
    }

    result.networks.forEach((network, index) => {
      addLog(`${index + 1}. ${network.ssid}, RSSI=${network.rssi ?? '无'}, security=${network.security ?? '无'}`)
    })
  }
  catch (error) {
    addLog(`WiFi 扫描失败: ${formatError(error)}`)
  }
}

async function testConfigureWifi() {
  if (!currentConnection) {
    addLog('请先连接设备')
    return
  }

  if (!wifiSsid.value) {
    addLog('请先输入 WiFi 名称')
    return
  }

  try {
    addLog(`开始配网: ${wifiSsid.value}`)

    const result = await configureWifi(currentConnection, {
      password: wifiPassword.value,
      ssid: wifiSsid.value,
    })

    addLog(`配网结果: ${getResultCodeDisplay(result.resultCode)}`)
    addLog(`SSID: ${result.ssid || '无'}`)
    addLog(`IP: ${result.ipAddress || '无'}`)

    const status = await queryDeviceStatus(currentConnection)

    addLog(`配网后 WiFi 状态: ${getDeviceStatusCodeDisplay(status.status.wifiStatus)}`)
    addLog(`配网后 MQTT 状态: ${getDeviceStatusCodeDisplay(status.status.mqttStatus)}`)
    addLog(`配网后 IP: ${status.status.ipAddress || '无'}`)
  }
  catch (error) {
    addLog(`配网失败: ${formatError(error)}`)
  }
}

onUnmounted(() => {
  void stopBleScan?.()
  void currentMonitor?.close()
  void currentConnection?.disconnect()
})

function testUtf8Codec() {
  const text = 'Radar_客厅_测试 WiFi 😀'
  const encoded = encodeUtf8(text)
  const decoded = decodeUtf8(encoded)

  addLog(`UTF-8 原文: ${text}`)
  addLog(`UTF-8 bytes: ${bytesToHex(encoded)}`)
  addLog(`UTF-8 解码: ${decoded}`)
  addLog(`UTF-8 结果: ${decoded === text ? '通过' : '失败'}`)
}

function testTlvCodec() {
  const ssid = '家里的 WiFi 5G'
  const password = '密码123456'
  const tlvBytes = encodeTlvs([
    tlvString(TlvType.SSID, ssid),
    tlvString(TlvType.PASSWORD, password),
    tlvU8(TlvType.RESULT_CODE, 0),
  ])
  const tlvs = parseTlvs(tlvBytes)
  const ssidTlv = findTlv(tlvs, TlvType.SSID)
  const passwordTlv = findTlv(tlvs, TlvType.PASSWORD)
  const resultTlv = findTlv(tlvs, TlvType.RESULT_CODE)

  addLog(`TLV bytes: ${bytesToHex(tlvBytes)}`)
  addLog(`TLV 数量: ${tlvs.length}`)
  addLog(`SSID: ${ssidTlv ? readTlvString(ssidTlv) : '未找到'}`)
  addLog(`密码: ${passwordTlv ? readTlvString(passwordTlv) : '未找到'}`)
  addLog(`结果码: ${resultTlv ? readTlvU8(resultTlv) : '未找到'}`)
}

function testFrameCodec() {
  const payload = encodeTlvs([
    tlvString(TlvType.SSID, 'Office_中文'),
    tlvString(TlvType.PASSWORD, 'abc123中文'),
  ])
  const frameBytes = encodeFrame({
    cmd: BleCommand.WIFI_CONFIG,
    seq: 7,
    payload,
  })
  const assembler = new FrameAssembler()
  const firstFrames = assembler.push(frameBytes.slice(0, 8))
  const secondFrames = assembler.push(frameBytes.slice(8))
  const frame = secondFrames[0]

  addLog(`Frame bytes: ${bytesToHex(frameBytes)}`)
  addLog(`半包输入后帧数量: ${firstFrames.length}`)
  addLog(`补齐输入后帧数量: ${secondFrames.length}`)
  addLog(`Frame cmd: 0x${frame.cmd.toString(16).toUpperCase()}`)
  addLog(`Frame seq: ${frame.seq}`)
  addLog(`Frame payload TLV 数量: ${parseTlvs(frame.payload).length}`)
}

function testCrcFailure() {
  const frameBytes = encodeFrame({
    cmd: BleCommand.QUERY_STATUS,
    seq: 8,
    payload: encodeTlvs([tlvString(TlvType.DEVICE_SN, 'SN-中文-001')]),
  })
  const brokenFrameBytes = frameBytes.slice()
  brokenFrameBytes[10] ^= 0xFF

  const assembler = new FrameAssembler()
  const frames = assembler.push(brokenFrameBytes)

  addLog(`CRC 错误帧输入后帧数量: ${frames.length}`)
  addLog(`CRC 错误帧结果: ${frames.length === 0 ? '通过，已丢弃' : '失败，错误帧被解析'}`)
}
</script>

<template>
  <view class="about-page">
    <yt-page-header title="关于" />

    <view class="protocol-test">
      <view class="test-title">
        BLE 协议临时测试
      </view>

      <view class="test-actions">
        <button class="test-button" @click="testUtf8Codec">
          测试 UTF-8
        </button>
        <button class="test-button" @click="testTlvCodec">
          测试 TLV
        </button>
        <button class="test-button" @click="testFrameCodec">
          测试 Frame
        </button>
        <button class="test-button" @click="testCrcFailure">
          测试 CRC 错误
        </button>
        <button class="test-button" @click="testBleScan">
          扫描 BLE
        </button>
        <button class="test-button" @click="testStopBleScan">
          停止扫描
        </button>
        <button class="test-button" @click="testConnectAndQueryStatus">
          连接并查询状态
        </button>
        <button class="test-button" @click="testScanWifiNetworks">
          扫描 WiFi
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
        <button class="test-button" @click="testConfigureWifi">
          测试配网
        </button>
        <button class="test-button" @click="testStartRadarMonitor">
          开始监控
        </button>
        <button class="test-button" @click="testStopRadarMonitor">
          停止监控
        </button>
        <button class="test-button secondary" @click="testDisconnectBle">
          断开 BLE
        </button>
        <button class="test-button secondary" @click="clearProtocolTestLogs">
          清空日志
        </button>
      </view>

      <view class="test-log">
        <view
          v-for="(log, index) in protocolTestLogs"
          :key="`${index}-${log}`"
          class="test-line"
        >
          {{ log }}
        </view>
        <view v-if="protocolTestLogs.length === 0" class="test-empty">
          点击上面的按钮查看编码、解码和拆包结果。
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

.protocol-test {
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

.test-log {
  margin-top: 24rpx;
  padding: 20rpx;
  min-height: 320rpx;
  border: 1rpx solid #d1d5db;
  border-radius: 8rpx;
  background: #ffffff;
}

.test-line {
  margin-bottom: 12rpx;
  color: #111827;
  font-family: Consolas, Monaco, monospace;
  font-size: 24rpx;
  line-height: 1.45;
  word-break: break-all;
}

.test-empty {
  color: #6b7280;
  font-size: 26rpx;
  line-height: 1.5;
}
</style>
