export type MonitorMetricType
  = | 'heartRate'
    | 'breathingRate'
    | 'presence'
    | 'distance'
    | 'activity'
    | 'bodyMovement'
    | 'algorithmState'
    | 'secondaryEmotion'
    | 'sleepProgress'
    | 'custom'

export type MonitorMetricStatus = 'normal' | 'warning' | 'danger' | 'muted'

export interface MonitorMetricItem {
  key: string
  label: string
  type: MonitorMetricType
  value?: string | number | boolean | null
  unit?: string
  status?: MonitorMetricStatus
  statusText?: string
  placeholder?: string
}

interface MonitorMetricMeta {
  icon: string
  accentClass: string
  defaultUnit?: string
  formatValue?: (value: MonitorMetricItem['value']) => string
}

export const HUMAN_ACTIVITY_TEXT: Record<number, string> = {
  0: '无人',
  1: '静止',
  2: '活动',
}

export const SLEEP_ALGORITHM_STATE_TEXT: Record<number, string> = {
  0: '无人',
  1: '在床',
  2: '清醒',
  3: '浅睡',
  4: '深睡',
  5: 'REM',
  6: '离床',
  7: '起床',
  8: '结束',
}

export const EMOTION_TEXT: Record<number, string> = {
  0: '平静',
  1: '快乐',
  2: '兴奋',
  3: '焦虑',
  4: '愤怒',
  5: '悲伤',
  6: '压力',
  7: '放松',
  8: '未知',
}

function formatBoolean(value: MonitorMetricItem['value']) {
  if (typeof value !== 'boolean') {
    return ''
  }

  return value ? '是' : '否'
}

function formatNumberMap(
  value: MonitorMetricItem['value'],
  map: Record<number, string>,
) {
  if (typeof value !== 'number') {
    return ''
  }

  return map[value] || `${value}`
}

function formatPercent(value: MonitorMetricItem['value']) {
  if (typeof value !== 'number') {
    return ''
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}`
}

export const MONITOR_METRIC_META: Record<MonitorMetricType, MonitorMetricMeta> = {
  heartRate: {
    icon: 'i-carbon-favorite',
    accentClass: 'heart',
    defaultUnit: 'bpm',
  },
  breathingRate: {
    icon: 'i-carbon-airline-passenger-care',
    accentClass: 'breath',
    defaultUnit: 'rpm',
  },
  presence: {
    icon: 'i-carbon-hospital-bed',
    accentClass: 'bed',
    formatValue: formatBoolean,
  },
  distance: {
    icon: 'i-carbon-location',
    accentClass: 'distance',
    defaultUnit: 'cm',
  },
  activity: {
    icon: 'i-carbon-activity',
    accentClass: 'activity',
    formatValue: value => formatNumberMap(value, HUMAN_ACTIVITY_TEXT),
  },
  bodyMovement: {
    icon: 'i-carbon-movement',
    accentClass: 'movement',
  },
  algorithmState: {
    icon: 'i-carbon-moon',
    accentClass: 'sleep',
    formatValue: value => formatNumberMap(value, SLEEP_ALGORITHM_STATE_TEXT),
  },
  secondaryEmotion: {
    icon: 'i-carbon-face-satisfied',
    accentClass: 'emotion',
    formatValue: value => formatNumberMap(value, EMOTION_TEXT),
  },
  sleepProgress: {
    icon: 'i-carbon-progress-bar',
    accentClass: 'progress',
    defaultUnit: '%',
    formatValue: formatPercent,
  },
  custom: {
    icon: 'i-carbon-data-vis-1',
    accentClass: 'custom',
  },
}

export function getMonitorMetricMeta(type: MonitorMetricType) {
  return MONITOR_METRIC_META[type] || MONITOR_METRIC_META.custom
}

export function formatMonitorMetricValue(metric: MonitorMetricItem) {
  const meta = getMonitorMetricMeta(metric.type)

  if (metric.value === undefined || metric.value === null || metric.value === '') {
    return metric.placeholder || '--'
  }

  const formatted = meta.formatValue?.(metric.value)

  if (formatted) {
    return formatted
  }

  return `${metric.value}`
}

export function getMonitorMetricUnit(metric: MonitorMetricItem) {
  return metric.unit ?? getMonitorMetricMeta(metric.type).defaultUnit ?? ''
}
