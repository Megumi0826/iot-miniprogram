import type {
  BleCharacteristic,
  BleCharacteristicRef,
  BleScanDevice,
  BleService,
} from '../transport'
import type { BleDeviceProfile } from './types'

/**
 * 当前雷达设备在平台侧使用的 productKey。
 *
 * 后续配网成功后，前端会用 productKey + dn 调后端绑定接口。
 */
export const RADAR_PRODUCT_KEY = 'dEkr5BkkXTFZFBdR'

/**
 * 雷达数据服务。
 *
 * 硬件中这个 service 下挂 a1/a2 两个 notify 特征值，
 * 主要用于雷达实时监控数据主动推送。
 */
export const RADAR_DATA_SERVICE_UUID = 'a8c1e5c0-3d5d-4a9d-8d5e-7c8b6a4e2f1a'

/**
 * a1：雷达连续数据推送通道。
 *
 * 常见数据包括心率、呼吸、存在、运动等。
 */
export const RADAR_STREAM_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a1'

/**
 * a2：雷达状态/空间数据推送通道。
 *
 * 常见数据包括距离、坐标、体动等。
 */
export const RADAR_STATUS_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a2'

/**
 * 设备配置服务。
 *
 * 硬件中这个 service 下挂 b1/b2/b3，
 * 主要用于命令写入、请求响应、设备状态主动推送。
 */
export const DEVICE_CONFIG_SERVICE_UUID = 'a8c1e5c0-3d5d-4a9d-8d5e-7c8b6a4e2f1b'

/**
 * b1：命令写入通道。
 *
 * 小程序发送 CMD_QUERY_STATUS、CMD_WIFI_CONFIG 等命令时写入这个特征值。
 */
export const DEVICE_COMMAND_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26b1'

/**
 * b2：命令响应 notify 通道。
 *
 * 只有这个通道参与请求响应匹配，后续协议层会按 seq 处理 pending。
 */
export const DEVICE_RESULT_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26b2'

/**
 * b3：设备信息/状态主动推送通道。
 *
 * 例如 WiFi、MQTT 状态变化可以从这里主动推送上来。
 */
export const DEVICE_INFO_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26b3'

/**
 * 统一把 UUID 转成小写。
 *
 * 微信/uni 返回的 UUID 大小写可能不完全一致，
 * 比较 UUID 时统一大小写可以避免误判。
 */
function normalizeUuid(uuid?: string): string {
  return (uuid || '').toLowerCase()
}

/**
 * 判断两个 UUID 是否相同。
 */
function matchesUuid(uuid: string | undefined, target: string): boolean {
  return normalizeUuid(uuid) === normalizeUuid(target)
}

/**
 * 获取扫描设备的展示名。
 *
 * 有些平台 name 更稳定，有些平台 localName 更接近广播名，
 * 这里优先使用 localName，再回退到 name。
 */
function getDeviceName(device: BleScanDevice): string {
  return device.localName || device.name || ''
}

/**
 * 从扫描结果里取出广播 service UUID。
 *
 * transport 层为了兼容 uni 类型，把部分广播字段保留得比较宽，
 * profile 层在真正需要使用时再筛成 string[]。
 */
function getAdvertisServiceUUIDs(device: BleScanDevice): string[] {
  const values = device.advertisServiceUUIDs || []
  return values.filter((uuid): uuid is string => typeof uuid === 'string')
}

/**
 * 判断扫描广播里是否包含目标 service UUID。
 */
function hasAdvertisService(device: BleScanDevice, target: string): boolean {
  return getAdvertisServiceUUIDs(device).some(uuid => matchesUuid(uuid, target))
}

/**
 * 判断连接后发现的 service 列表里是否包含目标 service UUID。
 */
function hasService(services: BleService[], target: string): boolean {
  return services.some(service => matchesUuid(service.uuid, target))
}

/**
 * 在某个 service 的 characteristic 列表中查找目标特征值。
 *
 * 找到后返回 transport 层写入/notify 所需的三元组：
 * deviceId + serviceId + characteristicId。
 */
function findCharacteristicRef(
  deviceId: string,
  serviceId: string,
  characteristics: BleCharacteristic[] | undefined,
  targetCharacteristicId: string,
): BleCharacteristicRef | null {
  const matched = (characteristics || []).find(characteristic =>
    matchesUuid(characteristic.uuid, targetCharacteristicId),
  )

  if (!matched) {
    return null
  }

  return {
    deviceId,
    serviceId,
    characteristicId: matched.uuid,
  }
}

/**
 * 当前毫米波雷达设备的 BLE Profile。
 *
 * 这个对象只描述雷达设备的识别规则和通道映射，
 * 不负责扫描、连接、协议编解码、配网、监控等业务动作。
 */
export const radarProfile: BleDeviceProfile = {
  type: 'radar',
  displayName: '毫米波雷达',
  productKey: RADAR_PRODUCT_KEY,

  /**
   * 扫描阶段的设备识别规则。
   *
   * 当前硬件广播名一般是 Radar_<SN> 或 Radar_<MAC去冒号>。
   * 同时硬件广播里会带配置服务 UUID，所以也用 service UUID 做兜底匹配。
   */
  matchScanDevice: (device) => {
    const name = getDeviceName(device)

    return (
      name.startsWith('Radar_')
      || hasAdvertisService(device, DEVICE_CONFIG_SERVICE_UUID)
      || hasAdvertisService(device, RADAR_DATA_SERVICE_UUID)
    )
  },

  /**
   * 连接并发现服务后的设备识别规则。
   */
  matchService: (service) => {
    return (
      matchesUuid(service.uuid, DEVICE_CONFIG_SERVICE_UUID)
      || matchesUuid(service.uuid, RADAR_DATA_SERVICE_UUID)
    )
  },

  /**
   * 把硬件的 service/characteristic 映射成上层统一通道。
   *
   * 当前雷达设备要求同时具备：
   * - 雷达数据服务：a1/a2 notify
   * - 设备配置服务：b1 write、b2 notify、b3 notify
   *
   * 其中 b1 和 b2 是命令链路的必要通道，缺失时直接返回 null。
   */
  resolveChannels: ({ deviceId, services, characteristics }) => {
    const hasRadarDataService = hasService(services, RADAR_DATA_SERVICE_UUID)
    const hasDeviceConfigService = hasService(services, DEVICE_CONFIG_SERVICE_UUID)

    if (!hasRadarDataService || !hasDeviceConfigService) {
      return null
    }

    const radarDataServiceId = services.find(service =>
      matchesUuid(service.uuid, RADAR_DATA_SERVICE_UUID),
    )?.uuid
    const deviceConfigServiceId = services.find(service =>
      matchesUuid(service.uuid, DEVICE_CONFIG_SERVICE_UUID),
    )?.uuid

    if (!radarDataServiceId || !deviceConfigServiceId) {
      return null
    }

    const radarDataCharacteristics = characteristics[radarDataServiceId]
    const deviceConfigCharacteristics = characteristics[deviceConfigServiceId]

    const write = findCharacteristicRef(
      deviceId,
      deviceConfigServiceId,
      deviceConfigCharacteristics,
      DEVICE_COMMAND_CHAR_UUID,
    )
    const responseNotify = findCharacteristicRef(
      deviceId,
      deviceConfigServiceId,
      deviceConfigCharacteristics,
      DEVICE_RESULT_CHAR_UUID,
    )
    const radarStreamNotify = findCharacteristicRef(
      deviceId,
      radarDataServiceId,
      radarDataCharacteristics,
      RADAR_STREAM_CHAR_UUID,
    )
    const radarStatusNotify = findCharacteristicRef(
      deviceId,
      radarDataServiceId,
      radarDataCharacteristics,
      RADAR_STATUS_CHAR_UUID,
    )
    const deviceInfoNotify = findCharacteristicRef(
      deviceId,
      deviceConfigServiceId,
      deviceConfigCharacteristics,
      DEVICE_INFO_CHAR_UUID,
    )

    if (!write || !responseNotify) {
      return null
    }

    return {
      write,
      responseNotify,
      eventNotifies: [
        radarStreamNotify,
        radarStatusNotify,
        deviceInfoNotify,
      ].filter((item): item is BleCharacteristicRef => !!item),
    }
  },
}
