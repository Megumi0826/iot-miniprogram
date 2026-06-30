<script lang="ts" setup>
import type { DevicePropertyTrendPoint } from '@/api/types/device'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface DeviceTrendMetric {
  key: string
  name: string
  unit?: string
  color: string
  defaultVisible?: boolean
}

export interface DeviceTrendRange {
  key: string
  label: string
}

interface ChartTooltipParam {
  dataIndex?: number
  seriesName?: string
}

interface ChartClickParams {
  componentType?: string
  dataIndex?: number
  seriesIndex?: number
}

interface LimeChartInstance {
  clear?: () => void
  dispatchAction?: (payload: Record<string, unknown>) => void
  off?: (eventName: string) => void
  on?: (eventName: string, handler: (params: ChartClickParams) => void) => void
  resize?: () => void
  setOption: (option: Record<string, unknown>, notMerge?: boolean) => void
}

interface LimeChartRef {
  init: (echartsModule: unknown) => Promise<LimeChartInstance>
}

interface Props {
  title?: string
  subtitle?: string
  range?: string
  ranges?: DeviceTrendRange[]
  loading?: boolean
  points?: DevicePropertyTrendPoint[]
  metrics?: DeviceTrendMetric[]
  height?: string
  emptyText?: string
}

defineOptions({
  name: 'YtDeviceTrendChart',
})

const props = withDefaults(defineProps<Props>(), {
  title: '历史趋势',
  subtitle: '',
  range: '1h',
  ranges: () => [
    { key: '1h', label: '最近1小时' },
    { key: '1d', label: '最近1天' },
    { key: '3d', label: '最近3天' },
    { key: '7d', label: '最近7天' },
    { key: '30d', label: '最近30天' },
  ],
  loading: false,
  points: () => [],
  metrics: () => [
    { key: 'heartRate', name: '心率', unit: 'bpm', color: '#ff5aa5' },
    { key: 'breathingRate', name: '呼吸', unit: 'rpm', color: '#26c6f9' },
  ],
  height: '360rpx',
  emptyText: '暂无趋势数据',
})

const emit = defineEmits<{
  'range-change': [range: string]
}>()

// 与 lime-echart 示例保持一致：微信小程序 Vue3 使用组件自带 echarts.min.js。
// eslint-disable-next-line ts/no-require-imports
const echarts = require('../../uni_modules/lime-echart/static/echarts.min')

const chartRef = ref<LimeChartRef | null>(null)
const visibleKeys = ref<string[]>([])

let chart: LimeChartInstance | null = null
let initTimer: ReturnType<typeof setTimeout> | null = null
let initializing = false

const hasPoints = computed(() => props.points.length > 0)
const activeMetrics = computed(() => props.metrics.filter(metric => visibleKeys.value.includes(metric.key)))
const hasVisibleMetric = computed(() => activeMetrics.value.length > 0)
const hasChartData = computed(() => hasPoints.value && hasVisibleMetric.value)
const chartStyle = computed(() => `width: 100%; height: ${props.height};`)

function resetVisibleKeys() {
  const defaults = props.metrics.filter(metric => metric.defaultVisible !== false)
  visibleKeys.value = (defaults.length > 0 ? defaults : props.metrics.slice(0, 1)).map(metric => metric.key)
}

function toggleMetric(key: string) {
  if (visibleKeys.value.includes(key)) {
    if (visibleKeys.value.length <= 1) {
      return
    }

    visibleKeys.value = visibleKeys.value.filter(item => item !== key)
    return
  }

  visibleKeys.value = [...visibleKeys.value, key]
}

function selectRange(key: string) {
  if (key !== props.range) {
    emit('range-change', key)
  }
}

function formatAxisTime(time: number) {
  const date = new Date(time)
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')

  if (props.range === '1h' || props.range === '1d') {
    return `${hour}:${minute}`
  }

  if (props.range === '30d') {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${hour}:${minute}`
}

function formatTooltipTime(time: number) {
  const date = new Date(time)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')

  return `${month}-${day} ${hour}:${minute}`
}

function formatValue(value: number | null | undefined, unit?: string) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--'
  }

  const text = Number.isInteger(value) ? `${value}` : value.toFixed(1)
  return unit ? `${text} ${unit}` : text
}

function getLatestValue(metric: DeviceTrendMetric) {
  for (let index = props.points.length - 1; index >= 0; index -= 1) {
    const value = props.points[index]?.values?.[metric.key]
    if (value !== null && value !== undefined) {
      return formatValue(value, metric.unit)
    }
  }

  return '--'
}

function buildTooltip(params: unknown) {
  const list = (Array.isArray(params) ? params : [params]) as ChartTooltipParam[]
  const first = list.find(item => typeof item.dataIndex === 'number')
  const point = first?.dataIndex === undefined ? undefined : props.points[first.dataIndex]

  if (!point) {
    return ''
  }

  const lines = activeMetrics.value.map((metric) => {
    return `${metric.name}: ${formatValue(point.values?.[metric.key], metric.unit)}`
  })

  return [formatTooltipTime(point.time), ...lines].join('\n')
}

function buildSeries(metric: DeviceTrendMetric) {
  return {
    name: metric.name,
    type: 'line',
    smooth: true,
    connectNulls: false,
    showSymbol: true,
    showAllSymbol: true,
    symbol: 'circle',
    symbolSize: 4,
    data: props.points.map(point => point.values?.[metric.key] ?? null),
    lineStyle: {
      color: metric.color,
      width: 3,
    },
    itemStyle: {
      color: metric.color,
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: `${metric.color}2b` },
          { offset: 1, color: `${metric.color}00` },
        ],
      },
    },
    emphasis: {
      focus: 'series',
      scale: true,
    },
  }
}

function buildChartOption() {
  const selected = props.metrics.reduce<Record<string, boolean>>((result, metric) => {
    result[metric.name] = visibleKeys.value.includes(metric.key)
    return result
  }, {})

  return {
    animation: true,
    animationDuration: 240,
    grid: {
      top: 26,
      right: 12,
      bottom: 26,
      left: 8,
      containLabel: true,
    },
    legend: {
      show: false,
      data: props.metrics.map(metric => metric.name),
      selected,
    },
    tooltip: {
      trigger: 'axis',
      triggerOn: 'mousemove|click',
      confine: true,
      renderMode: 'richText',
      shadowBlur: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'rgba(255, 255, 255, 0.16)',
      borderWidth: 1,
      padding: [8, 10],
      textStyle: {
        color: '#fff',
        fontSize: 11,
        textShadowBlur: 0,
      },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: 'rgba(139, 92, 246, 0.46)',
          width: 1,
        },
      },
      formatter: buildTooltip,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.points.map(point => formatAxisTime(point.time)),
      axisTick: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.32)',
        },
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.14)',
        },
      },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 10,
      },
    },
    series: props.metrics.map(buildSeries),
  }
}

async function initChart() {
  if (chart || initializing || !chartRef.value) {
    return
  }

  initializing = true

  try {
    await nextTick()
    chart = await chartRef.value.init(echarts)
    chart.off?.('click')
    chart.on?.('click', handleChartClick)
    renderChart()
  }
  finally {
    initializing = false
  }
}

function handleChartClick(params: ChartClickParams) {
  if (params.componentType !== 'series' || params.dataIndex === undefined) {
    return
  }

  chart?.dispatchAction?.({
    type: 'showTip',
    dataIndex: params.dataIndex,
    seriesIndex: params.seriesIndex ?? 0,
  })
}

function renderChart() {
  if (!chart || props.loading) {
    return
  }

  chart.clear?.()
  chart.setOption(buildChartOption(), true)
  chart.resize?.()
}

watch(
  () => props.metrics.map(metric => `${metric.key}:${metric.defaultVisible}`).join('|'),
  () => {
    resetVisibleKeys()
  },
  { immediate: true },
)

watch(
  () => [props.points, props.range, props.loading, visibleKeys.value.join('|')],
  () => {
    if (!props.loading) {
      renderChart()
    }
  },
  { deep: true },
)

onMounted(() => {
  initTimer = setTimeout(() => {
    void initChart()
  }, 260)
})

onBeforeUnmount(() => {
  if (initTimer) {
    clearTimeout(initTimer)
  }
  chart?.clear?.()
  chart = null
})
</script>

<template>
  <view class="trend-card">
    <view class="trend-head">
      <view class="trend-title-wrap">
        <view class="trend-title">
          {{ title }}
        </view>
        <view v-if="subtitle" class="trend-subtitle">
          {{ subtitle }}
        </view>
      </view>

      <view v-if="loading" class="trend-loading">
        加载中
      </view>
    </view>

    <view class="range-row">
      <button
        v-for="item in ranges"
        :key="item.key"
        class="range-item"
        :class="{ active: item.key === range }"
        @click="selectRange(item.key)"
      >
        {{ item.label }}
      </button>
    </view>

    <view v-if="metrics.length > 0" class="metric-row">
      <view
        v-for="metric in metrics"
        :key="metric.key"
        class="metric-chip"
        :class="{ 'metric-chip--active': visibleKeys.includes(metric.key) }"
        @click="toggleMetric(metric.key)"
      >
        <view class="metric-dot" :style="{ backgroundColor: metric.color }" />
        <view class="metric-name">
          {{ metric.name }}
        </view>
        <view class="metric-value">
          {{ getLatestValue(metric) }}
        </view>
      </view>
    </view>

    <view class="chart-shell" :style="{ height }">
      <l-echart
        ref="chartRef"
        :custom-style="chartStyle"
        @finished="initChart"
      />

      <view v-if="loading" class="chart-state">
        <view class="state-icon i-carbon-progress-bar-round" />
        <view>正在读取趋势数据</view>
      </view>

      <view v-else-if="!hasChartData" class="chart-state">
        <view class="state-icon i-carbon-chart-line-data" />
        <view>{{ emptyText }}</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.trend-card {
  padding: 26rpx;
  border: 1px solid var(--app-border);
  border-radius: 26rpx;
  background: var(--app-surface);
  box-shadow: 0 16rpx 42rpx var(--app-shadow);
  box-sizing: border-box;
}

.trend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.trend-title-wrap {
  min-width: 0;
}

.trend-title {
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 800;
  line-height: 42rpx;
}

.trend-subtitle {
  margin-top: 4rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
}

.trend-loading {
  flex-shrink: 0;
  height: 36rpx;
  padding: 0 14rpx;
  border: 1px solid rgba(37, 135, 248, 0.2);
  border-radius: 999rpx;
  background: rgba(37, 135, 248, 0.08);
  color: #2587f8;
  font-size: 20rpx;
  line-height: 34rpx;
}

.range-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6rpx;
  margin-top: 18rpx;
  padding: 6rpx;
  border: 1px solid var(--app-border);
  border-radius: 18rpx;
  background: var(--app-surface-2);
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

.range-item {
  min-width: 0;
  height: 48rpx;
  border-radius: 13rpx;
  color: var(--app-text-muted);
  font-size: 20rpx;
  font-weight: 750;
  letter-spacing: 0;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.range-item.active {
  background: var(--app-surface);
  color: var(--app-text);
  box-shadow: 0 8rpx 18rpx rgba(15, 23, 42, 0.08);
}

.range-item:not(.active):active {
  background: var(--app-primary-soft);
  transform: scale(0.97);
}

.metric-row {
  display: flex;
  gap: 14rpx;
  margin-top: 20rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.metric-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  min-width: 150rpx;
  height: 60rpx;
  padding: 0 16rpx;
  border: 1px solid var(--app-border);
  border-radius: 16rpx;
  background: var(--app-surface-2);
  color: var(--app-text-muted);
  opacity: 0.48;
  box-sizing: border-box;
  transition:
    opacity 0.14s ease,
    border-color 0.14s ease,
    background-color 0.14s ease,
    transform 0.14s ease;
}

.metric-chip:active {
  transform: scale(0.97);
}

.metric-chip--active {
  border-color: rgba(139, 92, 246, 0.52);
  background: rgba(139, 92, 246, 0.08);
  color: var(--app-text);
  opacity: 1;
}

.metric-dot {
  flex-shrink: 0;
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  box-shadow: 0 0 14rpx currentColor;
}

.metric-name {
  font-size: 23rpx;
  font-weight: 700;
  line-height: 32rpx;
}

.metric-value {
  color: var(--app-text-subtle);
  font-size: 20rpx;
  line-height: 30rpx;
}

.chart-shell {
  position: relative;
  overflow: hidden;
  width: 100%;
  margin-top: 18rpx;
  border-radius: 20rpx;
}

.chart-state {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 1px dashed var(--app-border);
  border-radius: 20rpx;
  background: var(--app-bg-soft);
  color: var(--app-text-muted);
  font-size: 24rpx;
  box-sizing: border-box;
}

.state-icon {
  margin-bottom: 12rpx;
  color: var(--app-primary);
  font-size: 44rpx;
}
</style>
