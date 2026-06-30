<script lang="ts" setup>
import { computed, ref } from 'vue'

export type RadarPositionSource = 'ble' | 'mqtt'

export interface RadarPosition {
  x?: number | null
  y?: number | null
  z?: number | null
  distance?: number | null
  unit?: string
  updatedAt?: number
}

interface Props {
  title?: string
  subtitle?: string
  source?: RadarPositionSource
  position?: RadarPosition | null
  deviceImage?: string
}

defineOptions({
  name: 'YtRadarPositionPanel',
})

const props = withDefaults(defineProps<Props>(), {
  title: '空间位置',
  subtitle: '雷达坐标系 · 实时人体位置',
  source: 'ble',
  position: null,
  deviceImage: '/static/device/radar.png',
})

const expanded = ref(true)

const unit = computed(() => props.position?.unit || 'cm')
const hasPosition = computed(() => {
  const position = props.position

  return position?.x !== undefined
    || position?.y !== undefined
    || position?.z !== undefined
    || position?.distance !== undefined
})
const sourceText = computed(() => props.source === 'ble' ? 'BLE' : 'MQTT')
const targetPoint = computed(() => {
  const x = toNumber(props.position?.x)
  const y = toNumber(props.position?.y)
  const z = toNumber(props.position?.z)
  const originLeft = 24
  const originTop = 72
  const floorLeft = clamp(originLeft + x / 220 * 24 + y / 300 * 42, 22, 86)
  const floorTop = clamp(originTop - y / 300 * 34 + x / 220 * 4, 24, 78)
  const top = clamp(floorTop - z / 160 * 24, 16, 80)

  return {
    floorLeft,
    floorTop,
    originLeft,
    originTop,
    targetLeft: floorLeft,
    top,
  }
})
const targetStyle = computed(() => ({
  left: `${targetPoint.value.targetLeft}%`,
  top: `${targetPoint.value.top}%`,
}))
const floorPointStyle = computed(() => ({
  left: `${targetPoint.value.floorLeft}%`,
  top: `${targetPoint.value.floorTop}%`,
}))
const verticalLineStyle = computed(() => ({
  height: `${Math.max(targetPoint.value.floorTop - targetPoint.value.top, 0)}%`,
  left: `${targetPoint.value.floorLeft}%`,
  top: `${targetPoint.value.top}%`,
}))
const rangeLineStyle = computed(() => createLineStyle(
  targetPoint.value.originLeft,
  targetPoint.value.originTop,
  targetPoint.value.floorLeft,
  targetPoint.value.floorTop,
))

function toggleExpanded() {
  expanded.value = !expanded.value
}

function toNumber(value?: number | null) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function createLineStyle(startX: number, startY: number, endX: number, endY: number) {
  const dx = endX - startX
  const dy = endY - startY
  const length = Math.sqrt(dx ** 2 + dy ** 2)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI

  return {
    left: `${startX}%`,
    top: `${startY}%`,
    transform: `rotate(${angle}deg)`,
    width: `${length}%`,
  }
}

function formatValue(value?: number | null, digits = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }

  return Number.isInteger(value) ? `${value}` : value.toFixed(digits)
}
</script>

<template>
  <view class="position-panel" :class="{ collapsed: !expanded }">
    <view class="panel-head">
      <view class="title-wrap">
        <view class="panel-title">
          {{ title }}
          <text class="source-tag">
            {{ sourceText }}
          </text>
        </view>
        <view v-if="subtitle && expanded" class="panel-subtitle">
          {{ subtitle }}
        </view>
      </view>

      <button class="toggle-btn" @click="toggleExpanded">
        <view :class="expanded ? 'i-carbon-view-off' : 'i-carbon-view'" />
        <text>{{ expanded ? '隐藏' : '展开' }}</text>
      </button>
    </view>

    <view v-if="expanded" class="panel-body">
      <view class="scene">
        <view class="scene-grid" />
        <view class="axis-origin" />
        <view class="axis-line axis-x">
          <text class="axis-label">X</text>
        </view>
        <view class="axis-line axis-y">
          <text class="axis-label">Y</text>
        </view>
        <view class="axis-line axis-z">
          <text class="axis-label">Z</text>
        </view>

        <image class="radar-image" :src="deviceImage" mode="aspectFit" />

        <template v-if="hasPosition">
          <view class="range-line" :style="rangeLineStyle" />
          <view class="projection vertical" :style="verticalLineStyle" />
          <view class="floor-point" :style="floorPointStyle" />
          <view class="target-point" :style="targetStyle">
            <view class="target-core" />
          </view>
        </template>

        <view v-else class="scene-empty">
          等待坐标数据
        </view>
      </view>

      <view class="position-values">
        <view class="value-card x">
          <text>X</text>
          <view>{{ formatValue(position?.x, 1) }}<text>{{ unit }}</text></view>
        </view>
        <view class="value-card y">
          <text>Y</text>
          <view>{{ formatValue(position?.y, 1) }}<text>{{ unit }}</text></view>
        </view>
        <view class="value-card z">
          <text>Z</text>
          <view>{{ formatValue(position?.z, 1) }}<text>{{ unit }}</text></view>
        </view>
        <view class="value-card distance">
          <text>距离</text>
          <view>{{ formatValue(position?.distance, 1) }}<text>{{ unit }}</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.position-panel {
  padding: 24rpx;
  border: 1px solid var(--app-border);
  border-radius: 26rpx;
  background: var(--app-surface);
  box-shadow: 0 16rpx 42rpx var(--app-shadow);
  box-sizing: border-box;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.title-wrap {
  min-width: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: var(--app-text);
  font-size: 31rpx;
  font-weight: 800;
  line-height: 42rpx;
}

.source-tag {
  height: 30rpx;
  padding: 0 10rpx;
  border: 1px solid var(--app-border);
  border-radius: 999rpx;
  color: var(--app-text-muted);
  font-size: 18rpx;
  font-weight: 700;
  line-height: 30rpx;
}

.panel-subtitle {
  margin-top: 3rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
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

.toggle-btn {
  flex-shrink: 0;
  gap: 7rpx;
  height: 48rpx;
  padding: 0 14rpx;
  border: 1px solid var(--app-border);
  border-radius: 14rpx;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  font-size: 21rpx;
  font-weight: 700;
  transition:
    background-color 0.15s ease,
    transform 0.15s ease;
}

.toggle-btn:active {
  background: var(--app-primary-soft);
  transform: scale(0.97);
}

.panel-body {
  margin-top: 22rpx;
}

.scene {
  position: relative;
  overflow: hidden;
  height: 360rpx;
  border: 1px solid var(--app-border);
  border-radius: 22rpx;
  background:
    radial-gradient(circle at 70% 26%, rgba(54, 217, 255, 0.11), transparent 28%),
    linear-gradient(180deg, rgba(148, 163, 184, 0.08), transparent 70%);
}

.scene-grid {
  position: absolute;
  right: 24rpx;
  bottom: 34rpx;
  width: 500rpx;
  height: 230rpx;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.16) 1px, transparent 1px),
    linear-gradient(0deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px);
  background-size: 54rpx 42rpx;
  opacity: 0.72;
  transform: skewX(-28deg) rotateX(54deg);
  transform-origin: bottom left;
}

.radar-image {
  position: absolute;
  bottom: 42rpx;
  left: 34rpx;
  width: 142rpx;
  height: 142rpx;
  opacity: 0.94;
}

.axis-origin {
  position: absolute;
  left: 24%;
  top: 72%;
  width: 12rpx;
  height: 12rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: var(--app-cyan);
  box-shadow: 0 0 18rpx rgba(54, 217, 255, 0.42);
  transform: translate(-50%, -50%);
}

.axis-line {
  position: absolute;
  left: 24%;
  top: 72%;
  height: 2rpx;
  border-radius: 999rpx;
  transform-origin: left center;
}

.axis-x {
  width: 58%;
  background: linear-gradient(90deg, rgba(37, 135, 248, 0.85), rgba(37, 135, 248, 0.06));
  color: #2587f8;
}

.axis-y {
  width: 56%;
  background: linear-gradient(90deg, rgba(54, 217, 255, 0.82), rgba(54, 217, 255, 0.06));
  color: var(--app-cyan);
  transform: rotate(-35deg);
}

.axis-z {
  width: 32%;
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.84), rgba(139, 92, 246, 0.06));
  color: var(--app-primary);
  transform: rotate(-90deg);
}

.axis-label {
  position: absolute;
  right: -18rpx;
  top: -18rpx;
  font-size: 18rpx;
  font-weight: 800;
}

.axis-z .axis-label {
  transform: rotate(90deg);
}

.projection {
  position: absolute;
  border-radius: 999rpx;
  background: rgba(37, 135, 248, 0.48);
}

.range-line {
  position: absolute;
  height: 2rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.64), rgba(37, 135, 248, 0.82));
  box-shadow: 0 0 14rpx rgba(37, 135, 248, 0.22);
  transform-origin: left center;
}

.projection.vertical {
  width: 2rpx;
  background: rgba(139, 92, 246, 0.46);
}

.floor-point {
  position: absolute;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.72);
  transform: translate(-50%, -50%);
}

.target-point {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: rgba(37, 135, 248, 0.13);
  box-shadow: 0 0 28rpx rgba(37, 135, 248, 0.42);
  transform: translate(-50%, -50%);
}

.target-core {
  width: 16rpx;
  height: 16rpx;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: #2587f8;
}

.scene-empty {
  position: absolute;
  top: 44%;
  right: 0;
  left: 0;
  color: var(--app-text-muted);
  font-size: 24rpx;
  text-align: center;
}

.position-values {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 16rpx;
}

.value-card {
  min-width: 0;
  padding: 15rpx 12rpx;
  border: 1px solid var(--app-border);
  border-radius: 18rpx;
  background: var(--app-surface-2);
  box-sizing: border-box;
}

.value-card > text {
  color: var(--app-text-muted);
  font-size: 20rpx;
  font-weight: 700;
}

.value-card view {
  overflow: hidden;
  margin-top: 7rpx;
  color: var(--app-text);
  font-size: 26rpx;
  font-weight: 800;
  line-height: 34rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value-card view text {
  margin-left: 3rpx;
  color: var(--app-text-muted);
  font-size: 17rpx;
  font-weight: 600;
}
</style>
