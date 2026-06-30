import type {
  DevicePropertyTrendReq,
  DevicePropertyTrendResp,
  DeviceSleepReportLatestResp,
  DeviceSleepReportListReq,
  DeviceSleepReportListResp,
  DeviceSleepReportReq,
  IBindDeviceReq,
  IBindDeviceRes,
  IBoundDeviceIdListRes,
  IBoundDeviceListRes,
  IUnbindDeviceReq,
  IUnbindDeviceRes,
} from './types/device'
import { http } from '@/http/http'

/**
 * 绑定设备到当前 member 用户。
 */
export function bindDevice(data: IBindDeviceReq) {
  return http.post<IBindDeviceRes>('/member/device/bind', data)
}

/**
 * 解绑当前 member 用户名下的设备。
 */
export function unbindDevice(data: IUnbindDeviceReq) {
  return http.post<IUnbindDeviceRes>('/member/device/unbind', data)
}

/**
 * 获取当前 member 用户已绑定的云端设备 ID 列表。
 */
export function getBoundDeviceIdList() {
  return http.get<IBoundDeviceIdListRes>('/member/device/list')
}

/**
 * 获取当前 member 用户已绑定的云端设备详情列表。
 */
export function getBoundDeviceList() {
  return http.get<IBoundDeviceListRes>('/member/device/detail-list')
}

export function getDevicePropertyTrend(data: DevicePropertyTrendReq) {
  return http.post<DevicePropertyTrendResp>('/member/device/property-trend', data)
}

export function getLatestDeviceSleepReport(data: DeviceSleepReportReq) {
  return http.get<DeviceSleepReportLatestResp>('/member/device/sleep-report/latest', data)
}

export function getDeviceSleepReportList(data: DeviceSleepReportListReq) {
  return http.get<DeviceSleepReportListResp>('/member/device/sleep-report/list', data)
}
