<script lang="ts" setup>
import type { DeviceSleepReportResp } from '@/api/types/device'
import { computed } from 'vue'

interface Props {
  report?: DeviceSleepReportResp | null
  loading?: boolean
  listEnabled?: boolean
  showListAction?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  report: null,
  loading: false,
  listEnabled: true,
  showListAction: true,
})

const emit = defineEmits<{
  detail: []
  list: []
}>()

const hasReport = computed(() => !!props.report)
const score = computed(() => props.report?.score ?? null)
const scoreText = computed(() => score.value == null ? '--' : Math.round(score.value).toString())
const scoreLevel = computed(() => {
  if (score.value == null) {
    return '暂无评分'
  }
  if (score.value >= 90) {
    return '优秀'
  }
  if (score.value >= 80) {
    return '良好'
  }
  if (score.value >= 60) {
    return '一般'
  }
  return '需关注'
})

const filledStars = computed(() => {
  if (score.value == null) {
    return 0
  }
  return Math.max(1, Math.min(5, Math.round(score.value / 20)))
})

const dateText = computed(() => {
  if (!props.report?.date) {
    return ''
  }

  const [year, month, day] = props.report.date.split('-')
  if (!month || !day) {
    return props.report.date
  }

  return `${Number(month)}月${Number(day)}日`
})

const sleepTimeText = computed(() => formatMinutes(props.report?.totalSleepTime))
const sleepRangeText = computed(() => {
  const start = formatClock(props.report?.sleepStartTime)
  const end = formatClock(props.report?.endTime)

  if (!start && !end) {
    return '暂无入睡时间'
  }
  return `${start || '--:--'} 入睡 · ${end || '--:--'} 醒来`
})

const efficiencyText = computed(() => {
  const report = props.report
  if (!report?.totalSleepTime || !report.sleepStartTime || !report.endTime) {
    return '--'
  }

  const duration = Math.max(1, Math.round((report.endTime - report.sleepStartTime) / 60000))
  return `${Math.min(100, Math.round(report.totalSleepTime / duration * 100))}%`
})

function formatClock(value?: number) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  return `${hour}:${minute}`
}

function formatMinutes(value?: number) {
  if (value == null || value <= 0) {
    return '--'
  }

  const hours = Math.floor(value / 60)
  const minutes = value % 60

  if (hours <= 0) {
    return `${minutes}分钟`
  }
  return `${hours}小时${minutes}分`
}

function handleDetail() {
  if (hasReport.value && !props.loading) {
    emit('detail')
  }
}

function handleList() {
  if (props.listEnabled && !props.loading) {
    emit('list')
  }
}
</script>

<template>
  <view class="sleep-summary" :class="{ 'is-empty': !hasReport }" @click="handleDetail">
    <image class="sleep-summary__bg" src="/static/report/moon.png" mode="heightFix" />
    <view class="sleep-summary__shade" />

    <view class="sleep-summary__head">
      <view>
        <view class="sleep-summary__title">
          最近睡眠
        </view>
        <view class="sleep-summary__date">
          {{ dateText || '最近一次睡眠' }}
        </view>
      </view>

      <button v-if="showListAction" class="sleep-summary__more" :disabled="!listEnabled || loading" @click.stop="handleList">
        <text>查看全部</text>
        <view class="i-carbon-chevron-right" />
      </button>
    </view>

    <view v-if="loading" class="sleep-summary__placeholder">
      正在读取睡眠报告...
    </view>

    <view v-else-if="hasReport" class="sleep-summary__body">
      <view class="sleep-summary__score">
        <view class="sleep-summary__label">
          睡眠评分
        </view>
        <view class="sleep-summary__score-row">
          <text class="sleep-summary__score-number">
            {{ scoreText }}
          </text>
          <text class="sleep-summary__level">
            {{ scoreLevel }}
          </text>
        </view>
        <view class="sleep-summary__stars">
          <view
            v-for="star in 5"
            :key="star"
            class="i-carbon-star-filled sleep-summary__star"
            :class="{ 'is-off': star > filledStars }"
          />
        </view>
      </view>

      <view class="sleep-summary__divider" />

      <view class="sleep-summary__duration">
        <view class="sleep-summary__label">
          总睡眠时长
        </view>
        <view class="sleep-summary__duration-value">
          {{ sleepTimeText }}
        </view>
        <view class="sleep-summary__range">
          {{ sleepRangeText }}
        </view>
        <view class="sleep-summary__efficiency">
          <view class="i-carbon-checkbox-checked" />
          <text>睡眠效率 {{ efficiencyText }}</text>
        </view>
      </view>
    </view>

    <view v-else class="sleep-summary__empty">
      <view class="sleep-summary__empty-title">
        暂无睡眠报告
      </view>
      <view class="sleep-summary__empty-text">
        设备联网并完成睡眠分析后，这里会显示最近一次睡眠。
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
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

.sleep-summary {
  position: relative;
  overflow: hidden;
  min-height: 330rpx;
  padding: 28rpx;
  border: 1px solid rgba(147, 127, 255, 0.22);
  border-radius: 28rpx;
  background: transparent;
  box-shadow: 0 20rpx 56rpx rgba(25, 22, 80, 0.18);
  box-sizing: border-box;
  color: #f8fbff;
  transition: transform 0.16s ease;
}

.theme-dark .sleep-summary {
  border-color: rgba(147, 127, 255, 0.26);
  box-shadow: 0 18rpx 44rpx rgba(0, 0, 0, 0.24);
}

.sleep-summary:active {
  transform: scale(0.992);
}

.sleep-summary__bg {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 0;
  width: auto;
  height: 100%;
  max-width: none;
}

.sleep-summary__shade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 0;
  background:
    linear-gradient(
      90deg,
      rgba(5, 8, 24, 0.9) 0%,
      rgba(8, 12, 34, 0.82) 46%,
      rgba(15, 18, 48, 0.52) 72%,
      rgba(20, 18, 58, 0.22) 100%
    ),
    linear-gradient(180deg, rgba(5, 8, 24, 0.2), rgba(5, 8, 24, 0.5));
}

.sleep-summary__head,
.sleep-summary__body,
.sleep-summary__placeholder,
.sleep-summary__empty {
  position: relative;
  z-index: 1;
}

.sleep-summary__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.sleep-summary__title {
  font-size: 34rpx;
  font-weight: 850;
  line-height: 44rpx;
}

.sleep-summary__date {
  margin-top: 6rpx;
  color: rgba(232, 237, 255, 0.74);
  font-size: 24rpx;
  line-height: 32rpx;
}

.sleep-summary__more {
  gap: 4rpx;
  height: 48rpx;
  padding: 0 8rpx 0 18rpx;
  color: rgba(232, 237, 255, 0.72);
  font-size: 24rpx;
}

.sleep-summary__more[disabled] {
  opacity: 0.5;
}

.sleep-summary__body {
  display: grid;
  grid-template-columns: 0.9fr 1px 1.1fr;
  gap: 28rpx;
  margin-top: 34rpx;
}

.sleep-summary__label {
  color: rgba(232, 237, 255, 0.72);
  font-size: 24rpx;
  line-height: 32rpx;
}

.sleep-summary__score-row {
  display: flex;
  align-items: flex-end;
  gap: 14rpx;
  margin-top: 16rpx;
}

.sleep-summary__score-number {
  font-size: 88rpx;
  font-weight: 900;
  line-height: 0.95;
}

.sleep-summary__level {
  margin-bottom: 8rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.16);
  color: #efe9ff;
  font-size: 23rpx;
  font-weight: 750;
}

.sleep-summary__stars {
  display: flex;
  gap: 8rpx;
  margin-top: 22rpx;
}

.sleep-summary__star {
  color: #f4dd75;
  font-size: 34rpx;
  filter: drop-shadow(0 4rpx 10rpx rgba(244, 221, 117, 0.32));
}

.sleep-summary__star.is-off {
  color: rgba(232, 237, 255, 0.2);
  filter: none;
}

.sleep-summary__divider {
  width: 1px;
  min-height: 178rpx;
  background: rgba(232, 237, 255, 0.18);
}

.sleep-summary__duration-value {
  margin-top: 18rpx;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 58rpx;
}

.sleep-summary__range {
  margin-top: 8rpx;
  color: rgba(232, 237, 255, 0.72);
  font-size: 24rpx;
  line-height: 34rpx;
}

.sleep-summary__efficiency {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 18rpx;
  color: rgba(232, 237, 255, 0.72);
  font-size: 23rpx;
}

.sleep-summary__placeholder,
.sleep-summary__empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 210rpx;
  color: rgba(232, 237, 255, 0.72);
  font-size: 26rpx;
}

.sleep-summary__empty-title {
  color: #f8fbff;
  font-size: 34rpx;
  font-weight: 850;
  line-height: 44rpx;
}

.sleep-summary__empty-text {
  margin-top: 12rpx;
  max-width: 470rpx;
  color: rgba(232, 237, 255, 0.72);
  font-size: 25rpx;
  line-height: 38rpx;
}
</style>
