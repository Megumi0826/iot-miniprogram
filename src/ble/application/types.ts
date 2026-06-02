import type { BleDeviceProfile, BleResolvedChannels } from '../profiles'
import type { BleFrame, ResultCode, Tlv } from '../protocol'
import type {
  BleCharacteristic,
  BleScanDevice,
  BleService,
} from '../transport'

/**
 * application 层识别出来的附近 BLE 设备。
 *
 * transport 层只知道“扫到了一个蓝牙设备”，
 * application 层会结合 profiles 判断它属于哪种业务设备。
 */
export interface BleNearbyDevice {
  /**
   * 微信/系统分配的蓝牙设备 ID。
   *
   * 这个 ID 只适合当前手机当前蓝牙连接使用，
   * 不能作为平台设备唯一标识。
   */
  deviceId: string

  /**
   * 页面展示用设备名。
   *
   * 一般来自 localName 或 name，例如 Radar_xxx。
   */
  name: string

  /**
   * 信号强度。
   */
  RSSI?: number

  /**
   * 匹配到的设备类型。
   *
   * 例如 radar。
   */
  profileType: string

  /**
   * 匹配到的设备类型展示名。
   *
   * 例如 毫米波雷达。
   */
  profileName: string

  /**
   * 匹配到的设备 Profile。
   *
   * 后续连接、解析通道时会继续用它。
   */
  profile: BleDeviceProfile

  /**
   * transport 层保留下来的原始扫描结果。
   *
   * 后续如果需要读取广播包、广播 service UUID，可以从这里取。
   */
  raw: BleScanDevice
}

/**
 * 本地解析出来的设备身份。
 *
 * 这个身份来自 CMD_QUERY_STATUS 返回的 TLV，
 * 目前只用于本地蓝牙识别，后续云端绑定时也会复用 productKey + dn。
 */
export interface BleDeviceIdentity {
  /**
   * 平台 productKey。
   */
  productKey: string

  /**
   * 设备唯一名称。
   *
   * 当前硬件规则：
   * - 优先使用 SN
   * - 如果没有 SN，则使用 MAC 去掉冒号
   */
  dn: string

  /**
   * 设备 SN。
   *
   * 硬件里 SN 是 uint64，前端这里用 string 更稳，
   * 避免 JS number 精度问题。
   */
  deviceSn?: string

  /**
   * 设备 MAC 地址。
   */
  macAddress?: string

  /**
   * 设备类型。
   */
  deviceType?: number

  /**
   * 固件版本。
   */
  firmwareVersion?: string

  /**
   * BLE 协议版本。
   */
  protocolVersion?: number
}

/**
 * 设备当前连接状态/联网状态。
 *
 * 这些字段主要来自 CMD_QUERY_STATUS。
 */
export interface BleDeviceStatus {
  /**
   * WiFi 状态码。
   */
  wifiStatus?: number

  /**
   * MQTT 状态码。
   */
  mqttStatus?: number

  /**
   * 是否已经配置过 WiFi。
   */
  wifiConfigured?: boolean

  /**
   * 是否已经连接 WiFi。
   */
  wifiConnected?: boolean

  /**
   * 当前 IP 地址。
   */
  ipAddress?: string
}

/**
 * application 层的已连接设备上下文。
 *
 * 到这个阶段，已经不只是 BLE transport 连接成功，
 * 而是完成了 service/characteristic 发现，并且 profile 通道解析成功。
 */
export interface BleConnectedDevice {
  /**
   * 蓝牙设备 ID。
   */
  deviceId: string

  /**
   * 当前设备匹配到的 Profile。
   */
  profile: BleDeviceProfile

  /**
   * 当前设备发现到的 BLE service 列表。
   */
  services: BleService[]

  /**
   * 每个 serviceId 对应的 characteristic 列表。
   */
  characteristics: Record<string, BleCharacteristic[]>

  /**
   * Profile 解析出来的通信通道。
   *
   * 对雷达来说：
   * - write 是 b1
   * - responseNotify 是 b2
   * - eventNotifies 是 a1/a2/b3
   */
  channels: BleResolvedChannels

  /**
   * 查询状态后得到的设备身份。
   *
   * 刚连接完成时可以为空，执行 CMD_QUERY_STATUS 后再填充。
   */
  identity?: BleDeviceIdentity

  /**
   * 查询状态后得到的设备状态。
   */
  status?: BleDeviceStatus
}

/**
 * sendCommand 得到的命令响应。
 *
 * command.ts 后面会负责：
 * - 编码命令帧
 * - 写入 b1
 * - 监听 b2
 * - 按 seq 等待响应
 * - 解出 TLV
 */
export interface BleCommandResponse {
  /**
   * 响应帧。
   */
  frame: BleFrame

  /**
   * 响应里的 TLV 列表。
   */
  tlvs: Tlv[]

  /**
   * 从 TLV_RESULT_CODE 解析出来的结果码。
   */
  resultCode?: ResultCode
}

/**
 * CMD_QUERY_STATUS 的解析结果。
 */
export interface BleQueryStatusResult {
  /**
   * 固件返回的结果码。
   */
  resultCode?: ResultCode

  /**
   * 设备身份。
   */
  identity?: BleDeviceIdentity

  /**
   * 设备状态。
   */
  status: BleDeviceStatus

  /**
   * 原始命令响应。
   *
   * 保留它方便调试，也方便后续某些字段暂时没解析时继续取 TLV。
   */
  response: BleCommandResponse
}
