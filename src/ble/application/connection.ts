import type { BleDeviceProfile } from '../profiles'
import type { BleCharacteristic, BleCharacteristicRef, BleService } from '../transport'
import type { BleCommandSession } from './command'
import type { BleConnectedDevice } from './types'
import { findProfileByServices } from '../profiles'
import {
  connectBleDevice,
  disconnectBleDevice,
  getBleDeviceCharacteristics,
  getBleDeviceServices,
  notifyBleCharacteristic,
} from '../transport'
import { createBleCommandSession } from './command'

const DEFAULT_SERVICE_DISCOVERY_DELAY = 300

/**
 * 本地连接设备参数。
 */
export interface ConnectLocalDeviceOptions {
  /**
   * 扫描阶段已经匹配到的 Profile。
   *
   * 如果没有传入，连接后会根据 service 列表再识别一次。
   */
  profile?: BleDeviceProfile

  /**
   * 连接成功后是否开启主动推送 notify。
   *
   * 当前雷达设备的主动推送通道包含 a1/a2/b3。
   * 开启 notify 不等于启动连续监控，连续监控仍然需要后续发送命令。
   */
  enableEventNotify?: boolean

  /**
   * 连接成功后等待多久再发现服务。
   *
   * 微信小程序环境里，刚 createBLEConnection 完成后立刻发现服务偶尔会不稳定，
   * 这里保留一个很短的默认等待。
   */
  serviceDiscoveryDelay?: number
}

/**
 * 本地 BLE 连接上下文。
 *
 * 它比 BleConnectedDevice 多了命令会话和断开方法，
 * 页面或后续 status/provision/monitor 层可以直接基于它继续发命令。
 */
export interface BleLocalConnection extends BleConnectedDevice {
  /**
   * b1/b2 命令会话。
   */
  commandSession: BleCommandSession

  /**
   * 断开当前本地 BLE 连接。
   */
  disconnect: () => Promise<void>
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }

  return new Promise(resolve => setTimeout(resolve, ms))
}

function createProfileNotFoundError(): Error {
  return new Error('BLE device profile is not found')
}

function createChannelsNotResolvedError(profile: BleDeviceProfile): Error {
  return new Error(`BLE channels are not resolved: profile=${profile.type}`)
}

async function discoverCharacteristics(
  deviceId: string,
  services: BleService[],
): Promise<Record<string, BleCharacteristic[]>> {
  const entries = await Promise.all(
    services.map(async (service) => {
      const characteristics = await getBleDeviceCharacteristics(deviceId, service.uuid)
      return [service.uuid, characteristics] as const
    }),
  )

  return Object.fromEntries(entries)
}

async function enableNotify(ref: BleCharacteristicRef): Promise<void> {
  await notifyBleCharacteristic({
    ...ref,
    state: true,
  })
}

async function enableNotifies(refs: BleCharacteristicRef[]): Promise<void> {
  for (const ref of refs) {
    await enableNotify(ref)
  }
}

/**
 * 连接本地 BLE 设备，并初始化到“可以发命令”的状态。
 *
 * 这个方法会完成：
 * - BLE 连接
 * - service 发现
 * - characteristic 发现
 * - profile 确认
 * - b1/b2/b3/a1/a2 通道解析
 * - b2 响应 notify 开启
 * - 可选主动推送 notify 开启
 * - b1/b2 命令会话创建
 *
 * 它不会自动发送 CMD_QUERY_STATUS。
 * 查询设备身份和 WiFi/MQTT 状态会放到 status.ts。
 */
export async function connectLocalDevice(
  deviceId: string,
  options: ConnectLocalDeviceOptions = {},
): Promise<BleLocalConnection> {
  const {
    enableEventNotify = true,
    profile: preferredProfile,
    serviceDiscoveryDelay = DEFAULT_SERVICE_DISCOVERY_DELAY,
  } = options

  let commandSession: BleCommandSession | undefined
  let connected = false

  try {
    await connectBleDevice(deviceId)
    connected = true

    await sleep(serviceDiscoveryDelay)

    const services = await getBleDeviceServices(deviceId)
    const characteristics = await discoverCharacteristics(deviceId, services)
    const profile = preferredProfile || findProfileByServices(services)

    if (!profile) {
      throw createProfileNotFoundError()
    }

    const channels = profile.resolveChannels({
      characteristics,
      deviceId,
      services,
    })

    if (!channels) {
      throw createChannelsNotResolvedError(profile)
    }

    if (channels.responseNotify) {
      await enableNotify(channels.responseNotify)
    }

    if (enableEventNotify) {
      await enableNotifies(channels.eventNotifies)
    }

    commandSession = createBleCommandSession({ channels })

    const disconnect = async (): Promise<void> => {
      commandSession?.close()
      await disconnectBleDevice(deviceId)
    }

    return {
      channels,
      characteristics,
      commandSession,
      deviceId,
      disconnect,
      profile,
      services,
    }
  }
  catch (error) {
    commandSession?.close()

    if (connected) {
      try {
        await disconnectBleDevice(deviceId)
      }
      catch {
        // 连接初始化失败时，断开失败不覆盖真正的错误。
      }
    }

    throw error
  }
}
