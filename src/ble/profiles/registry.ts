import type { BleScanDevice, BleService } from '../transport'
import type { BleDeviceProfile } from './types'
import { radarProfile } from './radar'

/**
 * 小程序当前支持的 BLE 设备类型注册表。
 *
 * 后续新增设备类型时，把新的 profile 加到这里即可。
 */
const profiles: BleDeviceProfile[] = [
  radarProfile,
]

/**
 * 获取全部已注册的设备 Profile。
 */
export function getBleProfiles(): BleDeviceProfile[] {
  return profiles
}

/**
 * 根据设备类型查找 Profile。
 *
 * 常用于页面/store 已经知道设备类型，例如 radar，
 * 需要拿回对应的 UUID 和通道解析规则。
 */
export function findProfileByType(type: string): BleDeviceProfile | undefined {
  return profiles.find(profile => profile.type === type)
}

/**
 * 根据扫描到的 BLE 设备查找匹配的 Profile。
 *
 * 添加设备页通常会用这个方法把原始扫描结果转成业务设备类型。
 */
export function findProfileByScanDevice(device: BleScanDevice): BleDeviceProfile | undefined {
  return profiles.find(profile => profile.matchScanDevice(device))
}

/**
 * 根据连接后发现的 service 列表查找匹配的 Profile。
 *
 * 如果广播阶段无法准确识别设备，可以在连接并发现服务后再用这个方法兜底识别。
 */
export function findProfileByServices(services: BleService[]): BleDeviceProfile | undefined {
  return profiles.find(profile =>
    services.some(service => profile.matchService(service)),
  )
}
