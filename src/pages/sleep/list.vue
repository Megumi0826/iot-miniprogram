<script lang="ts" setup>
import type { DeviceSleepReportResp } from '@/api/types/device'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getDeviceSleepReportList } from '@/api/device'
import {
  formatSleepClock,
  formatSleepDate,
  formatSleepMinutes,
  getSleepReportKey,
  getSleepScoreLevel,
} from '@/utils/sleep'

defineOptions({
  name: 'SleepReportList',
})

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '睡眠报告',
  },
})

const productKey = ref('')
const dn = ref('')
const loading = ref(false)
const reports = ref<DeviceSleepReportResp[]>([])
const errorMessage = ref('')

const hasIdentity = computed(() => !!productKey.value && !!dn.value)

onLoad((query) => {
  productKey.value = String(query.productKey || '')
  dn.value = String(query.dn || '')
})

onShow(() => {
  void loadReports()
})

async function loadReports() {
  if (!hasIdentity.value || loading.value) {
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
    reports.value = result.reports || []
  }
  catch (error) {
    console.warn('[sleep-report/list] failed:', error)
    errorMessage.value = '睡眠报告加载失败'
  }
  finally {
    loading.value = false
  }
}

function openDetail(report: DeviceSleepReportResp) {
  uni.navigateTo({
    url: `/pages/sleep/detail?productKey=${encodeURIComponent(productKey.value)}&dn=${encodeURIComponent(dn.value)}&sleepStartTime=${report.sleepStartTime || ''}&endTime=${report.endTime || ''}`,
  })
}
</script>

<template>
  <view class="sleep-list-page">
    <yt-page-header title="睡眠报告" subtitle="最近 30 天睡眠记录" />

    <view class="sleep-list-page__content">
      <view v-if="!hasIdentity" class="sleep-list-page__empty">
        <view class="sleep-list-page__empty-title">
          暂无设备
        </view>
        <view class="sleep-list-page__empty-text">
          请先绑定一台设备后查看睡眠报告。
        </view>
      </view>

      <view v-else-if="loading" class="sleep-list-page__empty">
        <view class="sleep-list-page__empty-title">
          正在加载
        </view>
        <view class="sleep-list-page__empty-text">
          正在读取最近 30 天睡眠报告。
        </view>
      </view>

      <view v-else-if="errorMessage" class="sleep-list-page__empty">
        <view class="sleep-list-page__empty-title">
          {{ errorMessage }}
        </view>
        <button class="sleep-list-page__retry" @click="loadReports">
          重新加载
        </button>
      </view>

      <view v-else-if="!reports.length" class="sleep-list-page__empty">
        <view class="sleep-list-page__empty-title">
          暂无睡眠报告
        </view>
        <view class="sleep-list-page__empty-text">
          设备完成睡眠分析后会显示在这里。
        </view>
      </view>

      <view v-else class="sleep-list">
        <view
          v-for="report in reports"
          :key="getSleepReportKey(report)"
          class="sleep-list__item"
          @click="openDetail(report)"
        >
          <view class="sleep-list__main">
            <view class="sleep-list__date">
              {{ formatSleepDate(report.date) }}
            </view>
            <view class="sleep-list__time">
              {{ formatSleepClock(report.sleepStartTime) }} 入睡 · {{ formatSleepClock(report.endTime) }} 醒来
            </view>
          </view>

          <view class="sleep-list__score">
            <view class="sleep-list__score-number">
              {{ report.score == null ? '--' : Math.round(report.score) }}
            </view>
            <view class="sleep-list__score-level">
              {{ getSleepScoreLevel(report.score) }}
            </view>
          </view>

          <view class="sleep-list__meta">
            <text>总睡眠 {{ formatSleepMinutes(report.totalSleepTime) }}</text>
            <text>深睡 {{ formatSleepMinutes(report.deepSleepTime) }}</text>
            <text>醒来 {{ report.wakeCount ?? 0 }} 次</text>
          </view>

          <view class="i-carbon-chevron-right sleep-list__arrow" />
        </view>
      </view>
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

.sleep-list-page {
  min-height: 100vh;
  padding-bottom: calc(env(safe-area-inset-bottom) + 48rpx);
  background: radial-gradient(circle at 78% 10%, var(--app-primary-soft), transparent 30%), var(--app-page-bg);
  color: var(--app-text);
}

.sleep-list-page__content {
  padding: 0 32rpx;
}

.sleep-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.sleep-list__item {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 18rpx;
  padding: 26rpx 54rpx 26rpx 28rpx;
  border: 1px solid rgba(147, 127, 255, 0.18);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16rpx 42rpx var(--app-shadow);
  box-sizing: border-box;
  transition: transform 0.15s ease;
}

.theme-dark .sleep-list__item {
  border-color: rgba(132, 116, 255, 0.28);
  background: linear-gradient(135deg, rgba(24, 31, 70, 0.96), rgba(12, 17, 42, 0.94));
  box-shadow: 0 18rpx 46rpx rgba(0, 0, 0, 0.28);
}

.sleep-list__item:active {
  transform: scale(0.99);
}

.sleep-list__date {
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 850;
  line-height: 42rpx;
}

.sleep-list__time {
  margin-top: 8rpx;
  color: var(--app-text-muted);
  font-size: 24rpx;
  line-height: 34rpx;
}

.sleep-list__score {
  text-align: right;
}

.sleep-list__score-number {
  color: var(--app-primary);
  font-size: 42rpx;
  font-weight: 900;
  line-height: 46rpx;
}

.theme-dark .sleep-list__score-number {
  color: #bda7ff;
}

.sleep-list__score-level {
  margin-top: 4rpx;
  color: var(--app-text-muted);
  font-size: 22rpx;
}

.sleep-list__meta {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  color: #4c5775;
  font-size: 22rpx;
}

.sleep-list__meta text {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: #f1edff;
}

.theme-dark .sleep-list__meta {
  color: #cbd6ff;
}

.theme-dark .sleep-list__meta text {
  background: var(--app-primary-soft);
}

.theme-dark .sleep-list__time,
.theme-dark .sleep-list__score-level {
  color: #aab4d6;
}

.sleep-list__arrow {
  position: absolute;
  right: 20rpx;
  top: 50%;
  color: var(--app-text-subtle);
  font-size: 30rpx;
  transform: translateY(-50%);
}

.theme-dark .sleep-list__arrow {
  color: #7783aa;
}

.sleep-list-page__empty {
  padding: 52rpx 32rpx;
  border: 1px solid rgba(147, 127, 255, 0.18);
  border-radius: 24rpx;
  background: var(--app-surface);
}

.sleep-list-page__empty-title {
  color: var(--app-text);
  font-size: 32rpx;
  font-weight: 850;
}

.sleep-list-page__empty-text {
  margin-top: 12rpx;
  color: var(--app-text-muted);
  font-size: 25rpx;
  line-height: 38rpx;
}

.sleep-list-page__retry {
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
