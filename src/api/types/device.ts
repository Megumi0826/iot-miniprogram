/**
 * 绑定设备请求参数。
 *
 * productKey + dn 对应云端 eiot 设备身份，也对应 BLE 查询到的设备身份。
 */
export interface IBindDeviceReq {
  productKey: string
  dn: string
}

/**
 * 解绑设备请求参数。
 *
 * 注意这里传的是云端 deviceId，不是微信 BLE 扫描到的 deviceId。
 */
export interface IUnbindDeviceReq {
  deviceId: number
}

/**
 * 绑定设备接口返回的绑定记录 ID。
 */
export type IBindDeviceRes = number

/**
 * 解绑设备接口返回结果。
 */
export type IUnbindDeviceRes = boolean

/**
 * 用户已绑定设备 ID 列表。
 */
export type IBoundDeviceIdListRes = number[]

/**
 * 用户已绑定设备详情。
 *
 * bindId/bindTime 来自 member_device_bind；
 * deviceId/productKey/dn/name/state 等来自 eiot 设备信息。
 */
export interface IBoundDeviceRes {
  bindId: number
  deviceId: number
  productKey: string
  dn: string
  name?: string
  model?: string
  firmVersion?: string
  serialNo?: string
  addr?: string
  state?: number
  online?: boolean
  onlineTime?: number
  offlineTime?: number
  nodeType?: number
  bindTime?: string
}

/**
 * 用户已绑定设备详情列表。
 */
export type IBoundDeviceListRes = IBoundDeviceRes[]

export interface DevicePropertyTrendReq {
  productKey: string
  dn: string
  properties: string[]
  startTime: number
  endTime: number
  maxPoints?: number
}

export interface DevicePropertyTrendPoint {
  time: number
  values: Record<string, number | null>
  counts: Record<string, number>
}

export interface DevicePropertyTrendResp {
  deviceId: number
  productKey: string
  dn: string
  startTime: number
  endTime: number
  interval: string
  intervalMillis: number
  points: DevicePropertyTrendPoint[]
}

export interface DeviceSleepReportReq {
  productKey: string
  dn: string
}

export interface DeviceSleepReportListReq extends DeviceSleepReportReq {
  days?: number
}

export type DeviceSleepReportStatus = 'IN_PROGRESS' | 'INCOMPLETE' | 'COMPLETED'

export interface DeviceSleepReportResp {
  date: string
  status: DeviceSleepReportStatus
  prepareStartTime?: number
  sleepStartTime?: number
  endTime?: number
  totalSleepTime?: number
  deepSleepTime?: number
  lightSleepTime?: number
  remSleepTime?: number
  awakeTime?: number
  outOfBedTime?: number
  sleepLatency?: number
  wakeCount?: number
  sleepCycles?: number
  avgHeartRate?: number
  avgBreathingRate?: number
  apneaCount?: number
  largeMoveRatio?: number
  smallMoveRatio?: number
  score?: number
  sourcePointCount?: number
}

export interface DeviceSleepReportLatestResp {
  hasReport: boolean
  report?: DeviceSleepReportResp | null
}

export interface DeviceSleepReportListResp {
  reports: DeviceSleepReportResp[]
}
