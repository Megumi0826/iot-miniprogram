import type { DeviceSleepReportResp } from '@/api/types/device'

export function formatSleepMinutes(value?: number, compact = false) {
  if (value == null || value <= 0) {
    return '--'
  }

  const hours = Math.floor(value / 60)
  const minutes = value % 60

  if (hours <= 0) {
    return `${minutes}分`
  }

  if (compact) {
    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`
  }

  return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`
}

export function formatSleepClock(value?: number) {
  if (!value) {
    return '--:--'
  }

  const date = new Date(value)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

export function formatSleepDate(value?: string) {
  if (!value) {
    return '未知日期'
  }

  const [, month, day] = value.split('-')
  if (!month || !day) {
    return value
  }

  return `${Number(month)}月${Number(day)}日`
}

export function getSleepScoreLevel(score?: number | null) {
  if (score == null) {
    return '暂无评分'
  }
  if (score >= 90) {
    return '优秀'
  }
  if (score >= 80) {
    return '良好'
  }
  if (score >= 60) {
    return '一般'
  }
  return '需关注'
}

export function getSleepReportKey(report: DeviceSleepReportResp) {
  return `${report.sleepStartTime || 0}:${report.endTime || 0}`
}

export function getSleepEfficiency(report?: DeviceSleepReportResp | null) {
  if (!report?.totalSleepTime || !report.sleepStartTime || !report.endTime) {
    return null
  }

  const duration = Math.max(1, Math.round((report.endTime - report.sleepStartTime) / 60000))
  return Math.min(100, Math.round(report.totalSleepTime / duration * 100))
}
