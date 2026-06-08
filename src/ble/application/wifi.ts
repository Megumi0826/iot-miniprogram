import type { ResultCode, Tlv } from '../protocol'
import type { BleLocalConnection } from './connection'
import type { BleCommandResponse } from './types'
import {
  BleCommand,
  findTlv,
  findTlvs,
  parseTlvs,
  readTlvI8,
  readTlvString,
  readTlvU8,
  readTlvU16,
  tlvString,
  TlvType,
} from '../protocol'

const DEFAULT_WIFI_SCAN_TIMEOUT = 35000
const DEFAULT_WIFI_CONFIG_TIMEOUT = 45000

/**
 * WiFi 加密类型。
 *
 * 这些值来自真实硬件代码里的 WifiSecurityType 枚举。
 */
export enum BleWifiSecurityType {
  OPEN = 0,
  WEP = 1,
  WPA = 2,
  WPA2 = 3,
  WPA3 = 4,
  UNKNOWN = 0xFF,
}

/**
 * BLE 扫描到的 WiFi 热点。
 */
export interface BleWifiNetwork {
  /**
   * WiFi 名称。
   */
  ssid: string

  /**
   * WiFi 信号强度。
   *
   * 这是设备端扫描 WiFi 得到的 RSSI，不是小程序扫描 BLE 的 RSSI。
   */
  rssi?: number

  /**
   * WiFi 加密类型。
   */
  security?: BleWifiSecurityType | number
}

/**
 * 设备内部已保存的 WiFi 配置。
 *
 * 新版硬件会在 CMD_GET_SAVED_WIFI 里返回 SSID 和 PASSWORD。
 * password 保持可选，用于兼容旧固件或空密码网络。
 */
export interface BleSavedWifiNetwork {
  /**
   * WiFi 名称。
   */
  ssid: string

  /**
   * 设备内部保存的 WiFi 密码。
   */
  password?: string
}

/**
 * WiFi 扫描参数。
 */
export interface ScanWifiNetworksOptions {
  /**
   * 命令超时时间，单位 ms。
   *
   * 硬件侧 WiFi 扫描最长可能接近 30 秒，所以默认给 35 秒。
   */
  timeout?: number
}

/**
 * WiFi 扫描结果。
 */
export interface ScanWifiNetworksResult {
  /**
   * 命令结果码。
   */
  resultCode?: ResultCode

  /**
   * 硬件返回的 WiFi 数量。
   */
  count?: number

  /**
   * 解析后的 WiFi 热点列表。
   */
  networks: BleWifiNetwork[]

  /**
   * 原始命令响应。
   */
  response: BleCommandResponse
}

/**
 * WiFi 配网参数。
 */
export interface ConfigureWifiParams {
  /**
   * WiFi 名称。
   */
  ssid: string

  /**
   * WiFi 密码。
   */
  password: string
}

/**
 * WiFi 配网选项。
 */
export interface ConfigureWifiOptions {
  /**
   * 命令超时时间，单位 ms。
   */
  timeout?: number
}

/**
 * WiFi 配网结果。
 */
export interface ConfigureWifiResult {
  /**
   * 命令结果码。
   */
  resultCode?: ResultCode

  /**
   * 固件回传的 WiFi 名称。
   */
  ssid?: string

  /**
   * 配网成功后固件回传的 IP 地址。
   */
  ipAddress?: string

  /**
   * 原始命令响应。
   */
  response: BleCommandResponse
}

/**
 * 读取设备已保存 WiFi 的结果。
 */
export interface GetSavedWifiNetworksResult {
  /**
   * 命令结果码。
   */
  resultCode?: ResultCode

  /**
   * 硬件返回的已保存 WiFi 数量。
   */
  count?: number

  /**
   * 解析后的已保存 WiFi 列表。
   */
  networks: BleSavedWifiNetwork[]

  /**
   * 原始命令响应。
   */
  response: BleCommandResponse
}

/**
 * 删除设备已保存 WiFi 的结果。
 */
export interface DeleteSavedWifiNetworkResult {
  /**
   * 命令结果码。
   */
  resultCode?: ResultCode

  /**
   * 被删除的 WiFi 名称。
   */
  ssid?: string

  /**
   * 删除后硬件剩余的已保存 WiFi 数量。
   */
  count?: number

  /**
   * 原始命令响应。
   */
  response: BleCommandResponse
}

function readOptionalString(tlvs: Tlv[], type: TlvType): string | undefined {
  const value = readTlvString(findTlv(tlvs, type))?.trim()

  return value || undefined
}

function readOptionalU16(tlvs: Tlv[], type: TlvType): number | undefined {
  return readTlvU16(findTlv(tlvs, type))
}

function readOptionalI8(tlvs: Tlv[], type: TlvType): number | undefined {
  return readTlvI8(findTlv(tlvs, type))
}

function readOptionalU8(tlvs: Tlv[], type: TlvType): number | undefined {
  return readTlvU8(findTlv(tlvs, type))
}

/**
 * 解析单个 WIFI_ITEM block。
 *
 * 真实硬件里每个 WIFI_ITEM 的 value 仍然是一组嵌套 TLV：
 * - TLV_SSID string
 * - TLV_RSSI int8
 * - TLV_SECURITY uint8
 */
export function parseWifiNetworkItem(item: Tlv): BleWifiNetwork | undefined {
  const tlvs = parseTlvs(item.value)
  const ssid = readOptionalString(tlvs, TlvType.SSID)

  if (!ssid) {
    return undefined
  }

  return {
    rssi: readOptionalI8(tlvs, TlvType.RSSI),
    security: readOptionalU8(tlvs, TlvType.SECURITY),
    ssid,
  }
}

/**
 * 解析单个已保存 WIFI_ITEM block。
 *
 * 新版硬件里每个已保存 WIFI_ITEM 的 value 是一组嵌套 TLV：
 * - TLV_SSID string
 * - TLV_PASSWORD string
 */
export function parseSavedWifiNetworkItem(item: Tlv): BleSavedWifiNetwork | undefined {
  const tlvs = parseTlvs(item.value)
  const ssid = readOptionalString(tlvs, TlvType.SSID)

  if (!ssid) {
    return undefined
  }

  return {
    password: readOptionalString(tlvs, TlvType.PASSWORD),
    ssid,
  }
}

/**
 * 从 WiFi 扫描响应里解析热点列表。
 */
export function parseWifiNetworks(tlvs: Tlv[]): BleWifiNetwork[] {
  return findTlvs(tlvs, TlvType.WIFI_ITEM)
    .map(parseWifiNetworkItem)
    .filter((network): network is BleWifiNetwork => !!network)
}

/**
 * 从已保存 WiFi 响应里解析 WiFi 列表。
 */
export function parseSavedWifiNetworks(tlvs: Tlv[]): BleSavedWifiNetwork[] {
  return findTlvs(tlvs, TlvType.WIFI_ITEM)
    .map(parseSavedWifiNetworkItem)
    .filter((network): network is BleSavedWifiNetwork => !!network)
}

/**
 * 通过 BLE 让设备扫描附近 WiFi。
 *
 * 硬件会先返回 PROCESSING，中间响应不会结束 pending；
 * 最终响应会返回 RESULT_CODE，以及成功时的 WIFI_COUNT/WIFI_ITEM。
 */
export async function scanWifiNetworks(
  connection: BleLocalConnection,
  options: ScanWifiNetworksOptions = {},
): Promise<ScanWifiNetworksResult> {
  const response = await connection.commandSession.sendCommand(
    BleCommand.WIFI_SCAN,
    [],
    {
      timeout: options.timeout ?? DEFAULT_WIFI_SCAN_TIMEOUT,
    },
  )

  return {
    count: readOptionalU16(response.tlvs, TlvType.WIFI_COUNT),
    networks: parseWifiNetworks(response.tlvs),
    response,
    resultCode: response.resultCode,
  }
}

/**
 * 通过 BLE 下发 WiFi 配网信息。
 *
 * 硬件会先返回 PROCESSING，最终响应返回 RESULT_CODE，
 * 成功时通常会带 SSID 和 IP_ADDRESS。
 */
export async function configureWifi(
  connection: BleLocalConnection,
  params: ConfigureWifiParams,
  options: ConfigureWifiOptions = {},
): Promise<ConfigureWifiResult> {
  const response = await connection.commandSession.sendCommand(
    BleCommand.WIFI_CONFIG,
    [
      tlvString(TlvType.SSID, params.ssid),
      tlvString(TlvType.PASSWORD, params.password),
    ],
    {
      timeout: options.timeout ?? DEFAULT_WIFI_CONFIG_TIMEOUT,
    },
  )

  return {
    ipAddress: readOptionalString(response.tlvs, TlvType.IP_ADDRESS),
    response,
    resultCode: response.resultCode,
    ssid: readOptionalString(response.tlvs, TlvType.SSID),
  }
}

/**
 * 通过 BLE 读取设备内部已保存的 WiFi 列表。
 *
 * 新版硬件会返回 SSID 和 PASSWORD。
 * 旧版硬件如果只返回 SSID，password 会是 undefined。
 */
export async function getSavedWifiNetworks(
  connection: BleLocalConnection,
): Promise<GetSavedWifiNetworksResult> {
  const response = await connection.commandSession.sendCommand(
    BleCommand.GET_SAVED_WIFI,
    [],
  )

  return {
    count: readOptionalU16(response.tlvs, TlvType.WIFI_COUNT),
    networks: parseSavedWifiNetworks(response.tlvs),
    response,
    resultCode: response.resultCode,
  }
}

/**
 * 通过 BLE 删除设备内部保存的指定 WiFi。
 */
export async function deleteSavedWifiNetwork(
  connection: BleLocalConnection,
  ssid: string,
): Promise<DeleteSavedWifiNetworkResult> {
  const response = await connection.commandSession.sendCommand(
    BleCommand.DELETE_SAVED_WIFI,
    [tlvString(TlvType.SSID, ssid)],
  )

  return {
    count: readOptionalU16(response.tlvs, TlvType.WIFI_COUNT),
    response,
    resultCode: response.resultCode,
    ssid: readOptionalString(response.tlvs, TlvType.SSID),
  }
}
