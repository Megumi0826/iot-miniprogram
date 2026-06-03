import type { BleDiscoveryOptions, BleScanDevice } from '../transport'
import type { BleNearbyDevice } from './types'
import { findProfileByScanDevice } from '../profiles'
import { openBleAdapter, scanBleDevices } from '../transport'

/**
 * 扫描附近业务设备的参数。
 *
 * 这里继承 transport 层的扫描参数，
 * 同时增加 application 层的业务设备回调。
 */
export interface ScanNearbyDevicesOptions extends BleDiscoveryOptions {
  /**
   * 每发现或更新一个支持的设备时触发。
   *
   * 第一个参数是本次发现的设备，
   * 第二个参数是当前已去重的完整设备列表。
   */
  onDeviceFound?: (device: BleNearbyDevice, devices: BleNearbyDevice[]) => void
}

/**
 * 扫描附近业务设备的返回值。
 */
export interface ScanNearbyDevicesResult {
  /**
   * 当前已扫描到并识别成功的设备列表。
   *
   * 这个数组会在扫描过程中原地更新，
   * 页面也可以主要依赖 onDeviceFound 回调刷新自己的状态。
   */
  devices: BleNearbyDevice[]

  /**
   * 停止扫描。
   */
  stop: () => Promise<void>
}

/**
 * 获取扫描设备的展示名。
 */
function getScanDeviceName(device: BleScanDevice): string {
  return device.localName || device.name || device.deviceId
}

/**
 * 把 transport 层的扫描设备转换成 application 层业务设备。
 *
 * 如果当前设备不能匹配任何 profile，就返回 null。
 */
function toNearbyDevice(device: BleScanDevice): BleNearbyDevice | null {
  const profile = findProfileByScanDevice(device)

  if (!profile) {
    return null
  }

  return {
    deviceId: device.deviceId,
    name: getScanDeviceName(device),
    RSSI: device.RSSI,
    profileType: profile.type,
    profileName: profile.displayName,
    profile,
    raw: device,
  }
}

/**
 * 更新去重后的设备列表。
 *
 * 这里按 deviceId 去重，同一个设备再次广播时更新它的信息，
 * 例如 RSSI、name、raw 广播数据。
 */
function upsertNearbyDevice(
  devices: BleNearbyDevice[],
  device: BleNearbyDevice,
): BleNearbyDevice {
  const existedIndex = devices.findIndex(item => item.deviceId === device.deviceId)

  if (existedIndex < 0) {
    devices.push(device)
    return device
  }

  devices[existedIndex] = device
  return device
}

/**
 * 扫描附近已支持的 BLE 设备。
 *
 * 这一层只负责：
 * - 打开蓝牙适配器
 * - 启动扫描
 * - 根据 profile 过滤设备
 * - 维护去重后的附近设备列表
 *
 * 它不负责连接设备，也不发送任何协议命令。
 */
export async function scanNearbyDevices(
  options: ScanNearbyDevicesOptions = {},
): Promise<ScanNearbyDevicesResult> {
  const devices: BleNearbyDevice[] = []
  const { onDeviceFound, ...discoveryOptions } = options

  await openBleAdapter()

  const stopScan = await scanBleDevices((foundDevices) => {
    foundDevices.forEach((foundDevice) => {
      const nearbyDevice = toNearbyDevice(foundDevice)

      if (!nearbyDevice) {
        return
      }

      const savedDevice = upsertNearbyDevice(devices, nearbyDevice)
      onDeviceFound?.(savedDevice, [...devices])
    })
  }, discoveryOptions)

  let stopped = false

  return {
    devices,
    stop: async () => {
      if (stopped) {
        return
      }

      stopped = true
      await stopScan()
    },
  }
}
