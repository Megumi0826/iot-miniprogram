<script lang="ts" setup>
import { ref } from 'vue'
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
