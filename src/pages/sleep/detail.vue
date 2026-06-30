<script lang="ts" setup>
import type { DeviceSleepReportResp } from '@/api/types/device'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getDeviceSleepReportList } from '@/api/device'
import {
  formatSleepClock,
  formatSleepDate,
  formatSleepMinutes,
  getSleepEfficiency,
} from '@/utils/sleep'

defineOptions({
  name: 'SleepReportDetail',
})

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '睡眠详情',
  },
})

interface MetricItem {
  label: string
  value: string
  unit?: string
  icon: string
}

const productKey = ref('')
const dn = ref('')
const targetSleepStartTime = ref(0)
const targetEndTime = ref(0)
const loading = ref(false)
const report = ref<DeviceSleepReportResp | null>(null)
const errorMessage = ref('')

const metricItems = computed<MetricItem[]>(() => {
  const item = report.value

  return [
    {
      label: '平均心率',
      value: item?.avgHeartRate == null ? '--' : String(item.avgHeartRate),
      unit: 'bpm',
      icon: 'i-carbon-favorite-filled',
    },
    {
      label: '平均呼吸',
      value: item?.avgBreathingRate == null ? '--' : String(item.avgBreathingRate),
      unit: 'rpm',
      icon: 'i-carbon-activity',
    },
    {
      label: '呼吸暂停',
      value: item?.apneaCount == null ? '--' : String(item.apneaCount),
      unit: '次',
      icon: 'i-carbon-warning-alt',
    },
    {
      label: '入睡耗时',
      value: item?.sleepLatency == null ? '--' : String(item.sleepLatency),
      unit: '分钟',
      icon: 'i-carbon-time',
    },
    {
      label: '醒来次数',
      value: item?.wakeCount == null ? '--' : String(item.wakeCount),
      unit: '次',
      icon: 'i-carbon-view',
    },
    {
      label: '睡眠周期',
      value: item?.sleepCycles == null ? '--' : String(item.sleepCycles),
      unit: '次',
      icon: 'i-carbon-repeat',
    },
  ]
})

const pageSubtitle = computed(() => {
  if (!report.value) {
    return '睡眠报告详情'
  }

  return `${formatSleepDate(report.value.date)} · ${formatSleepClock(report.value.sleepStartTime)} - ${formatSleepClock(report.value.endTime)}`
})

const efficiency = computed(() => getSleepEfficiency(report.value))

onLoad((query) => {
  productKey.value = String(query.productKey || '')
  dn.value = String(query.dn || '')
  targetSleepStartTime.value = Number(query.sleepStartTime || 0)
  targetEndTime.value = Number(query.endTime || 0)
})

onShow(() => {
  void loadReport()
})

async function loadReport() {
  if (!productKey.value || !dn.value || loading.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getDeviceSleepReportList({
      dn: dn.value,
      productKey: productKey.value,
      days: 30,
    })
    const reports = result.reports || []

    report.value = reports.find(item =>
      (!targetSleepStartTime.value || item.sleepStartTime === targetSleepStartTime.value)
      && (!targetEndTime.value || item.endTime === targetEndTime.value),
    ) || reports[0] || null
  }
  catch (error) {
    console.warn('[sleep-report/detail] failed:', error)
    errorMessage.value = '睡眠详情加载失败'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="sleep-detail-page">
    <yt-page-header title="睡眠详情" :subtitle="pageSubtitle" />

    <view class="sleep-detail-page__content">
      <view v-if="loading" class="sleep-detail-page__state">
        正在读取睡眠报告...
      </view>

      <view v-else-if="errorMessage" class="sleep-detail-page__state">
        <view>{{ errorMessage }}</view>
        <button class="sleep-detail-page__retry" @click="loadReport">
          重新加载
        </button>
      </view>

      <view v-else-if="!report" class="sleep-detail-page__state">
        暂无睡眠报告
      </view>

      <template v-else>
        <yt-sleep-summary-card class="sleep-detail-page__summary" :report="report" :show-list-action="false" />

        <view class="sleep-detail-page__overview">
          <view class="sleep-detail-page__overview-item">
            <view class="sleep-detail-page__overview-label">
              总睡眠
            </view>
            <view class="sleep-detail-page__overview-value">
              {{ formatSleepMinutes(report.totalSleepTime) }}
            </view>
          </view>
          <view class="sleep-detail-page__overview-item">
            <view class="sleep-detail-page__overview-label">
              睡眠效率
            </view>
            <view class="sleep-detail-page__overview-value">
              {{ efficiency == null ? '--' : `${efficiency}%` }}
            </view>
          </view>
        </view>

        <yt-sleep-structure-bar :report="report" />

        <view class="sleep-detail-page__metrics">
          <view class="sleep-detail-page__section-title">
            关键指标
          </view>
          <view class="sleep-detail-page__metric-grid">
            <view v-for="item in metricItems" :key="item.label" class="sleep-detail-page__metric">
              <view class="sleep-detail-page__metric-icon" :class="[item.icon]" />
              <view class="sleep-detail-page__metric-label">
                {{ item.label }}
              </view>
              <view class="sleep-detail-page__metric-value">
                {{ item.value }}
                <text v-if="item.unit" class="sleep-detail-page__metric-unit">
                  {{ item.unit }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <yt-sleep-motion-ring :report="report" />
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
button {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: normal;
}

button::after {
  border: 0;
}

.sleep-detail-page {
  min-height: 100vh;
  padding-bottom: calc(env(safe-area-inset-bottom) + 48rpx);
  background:
    radial-gradient(circle at 80% 4%, rgba(122, 92, 255, 0.16), transparent 30%),
    radial-gradient(circle at 4% 36%, rgba(68, 185, 255, 0.12), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(139, 92, 246, 0.05)), var(--app-page-bg);
  color: var(--app-text);
}

.sleep-detail-page__content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 0 32rpx;
}

.sleep-detail-page__summary {
  flex: 0 0 auto;
}

.sleep-detail-page__overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
}

.sleep-detail-page__overview-item,
.sleep-detail-page__state {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(147, 127, 255, 0.18);
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 255, 0.9)), var(--app-surface);
  box-shadow: 0 18rpx 46rpx var(--app-shadow);
  box-sizing: border-box;
  backdrop-filter: blur(18rpx);
}

.theme-dark .sleep-detail-page__overview-item,
.theme-dark .sleep-detail-page__state {
  border-color: rgba(147, 127, 255, 0.22);
  background: linear-gradient(145deg, rgba(21, 28, 64, 0.98), rgba(12, 17, 42, 0.94)), var(--app-surface);
  box-shadow: 0 18rpx 46rpx rgba(0, 0, 0, 0.24);
}

.sleep-detail-page__overview-item {
  min-height: 132rpx;
  padding: 28rpx;
}

.sleep-detail-page__overview-item::before {
  position: absolute;
  right: -32rpx;
  bottom: -44rpx;
  width: 136rpx;
  height: 136rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(124, 92, 255, 0.28), rgba(124, 92, 255, 0.12));
  content: '';
}

.sleep-detail-page__overview-item:nth-child(2)::before {
  background: linear-gradient(145deg, rgba(54, 217, 255, 0.32), rgba(68, 185, 255, 0.12));
}

.sleep-detail-page__overview-item::after {
  position: absolute;
  right: 22rpx;
  bottom: 18rpx;
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(124, 92, 255, 0.24);
  content: '';
}

.sleep-detail-page__overview-item:nth-child(2)::after {
  background: rgba(54, 217, 255, 0.28);
}

.sleep-detail-page__overview-label {
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 32rpx;
}

.sleep-detail-page__overview-value {
  position: relative;
  margin-top: 10rpx;
  color: var(--app-text);
  font-size: 38rpx;
  font-weight: 900;
  line-height: 46rpx;
}

.sleep-detail-page__metrics {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.sleep-detail-page__section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 850;
  line-height: 42rpx;
}

.sleep-detail-page__section-title::before {
  width: 10rpx;
  height: 32rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, #7c5cff, #44b9ff);
  content: '';
}

.sleep-detail-page__metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
}

.sleep-detail-page__metric {
  --metric-accent: #7c5cff;
  --metric-soft: rgba(124, 92, 255, 0.16);

  position: relative;
  overflow: hidden;
  min-width: 0;
  min-height: 190rpx;
  padding: 26rpx;
  border: 1px solid rgba(147, 127, 255, 0.18);
  border-radius: 28rpx;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(244, 247, 255, 0.94)), var(--app-surface);
  box-shadow: 0 14rpx 34rpx var(--app-shadow);
  box-sizing: border-box;
}

.theme-dark .sleep-detail-page__metric {
  border-color: rgba(147, 127, 255, 0.22);
  background: linear-gradient(145deg, rgba(22, 30, 72, 0.98), rgba(14, 20, 50, 0.95)), var(--app-surface);
  box-shadow: 0 14rpx 34rpx rgba(0, 0, 0, 0.22);
}

.sleep-detail-page__metric::before {
  position: absolute;
  top: -46rpx;
  right: -42rpx;
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  background: var(--metric-accent);
  opacity: 0.18;
  content: '';
}

.sleep-detail-page__metric:nth-child(1) {
  --metric-accent: #ff5d9e;
  --metric-soft: rgba(255, 93, 158, 0.14);
}

.sleep-detail-page__metric:nth-child(2) {
  --metric-accent: #44b9ff;
  --metric-soft: rgba(68, 185, 255, 0.14);
}

.sleep-detail-page__metric:nth-child(3) {
  --metric-accent: #ffb84d;
  --metric-soft: rgba(255, 184, 77, 0.16);
}

.sleep-detail-page__metric:nth-child(4) {
  --metric-accent: #7c5cff;
  --metric-soft: rgba(124, 92, 255, 0.14);
}

.sleep-detail-page__metric:nth-child(5) {
  --metric-accent: #36d9ff;
  --metric-soft: rgba(54, 217, 255, 0.14);
}

.sleep-detail-page__metric:nth-child(6) {
  --metric-accent: #8b63ff;
  --metric-soft: rgba(139, 99, 255, 0.14);
}

.sleep-detail-page__metric-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 62rpx;
  height: 62rpx;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 20rpx;
  background: var(--metric-accent);
  color: #fff;
  font-size: 36rpx;
  box-shadow: 0 12rpx 24rpx var(--metric-soft);
}

.theme-dark .sleep-detail-page__metric-icon {
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: 0 12rpx 24rpx rgba(0, 0, 0, 0.18);
}

.sleep-detail-page__metric-label {
  position: relative;
  margin-top: 18rpx;
  color: var(--app-text-muted);
  font-size: 23rpx;
  line-height: 30rpx;
}

.sleep-detail-page__metric-value {
  position: relative;
  margin-top: 12rpx;
  color: var(--app-text);
  font-size: 34rpx;
  font-weight: 850;
  line-height: 42rpx;
}

.sleep-detail-page__metric-unit {
  margin-left: 6rpx;
  color: var(--app-text-muted);
  font-size: 22rpx;
  font-weight: 500;
}

.sleep-detail-page__state {
  padding: 48rpx 32rpx;
  color: var(--app-text-muted);
  font-size: 26rpx;
}

.sleep-detail-page__retry {
  width: 180rpx;
  height: 64rpx;
  margin-top: 22rpx;
  border-radius: 16rpx;
  background: rgba(37, 135, 248, 0.12);
  color: #2587f8;
  font-size: 25rpx;
  font-weight: 750;
}
</style>
