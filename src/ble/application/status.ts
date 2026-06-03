import type { BleDeviceProfile } from '../profiles'
import type { Tlv } from '../protocol'
import type { BleLocalConnection } from './connection'
import type {
  BleDeviceIdentity,
  BleDeviceStatus,
  BleQueryStatusResult,
} from './types'
import {
  BleCommand,
  findTlv,
  readTlvString,
  readTlvU8,
  readTlvU64String,
  TlvType,
} from '../protocol'

const DEFAULT_QUERY_STATUS_TIMEOUT = 8000

/**
 * 查询设备状态参数。
 */
export interface QueryDeviceStatusOptions {
  /**
   * 命令超时时间，单位 ms。
   */
  timeout?: number
}

function normalizeDeviceSn(deviceSn?: string): string | undefined {
  const value = deviceSn?.trim()

  if (!value || value === '0') {
    return undefined
  }

  return value
}

function normalizeMacAddress(macAddress?: string): string | undefined {
  const value = macAddress?.trim()

  if (!value) {
    return undefined
  }

  return value
}

function createDnFromMac(macAddress: string): string {
  return macAddress.replace(/[:-]/g, '').toUpperCase()
}

function readOptionalU8(tlvs: Tlv[], type: TlvType): number | undefined {
  return readTlvU8(findTlv(tlvs, type))
}

function readOptionalBoolean(tlvs: Tlv[], type: TlvType): boolean | undefined {
  const value = readOptionalU8(tlvs, type)

  if (value === undefined) {
    return undefined
  }

  return value === 1
}

function readOptionalString(tlvs: Tlv[], type: TlvType): string | undefined {
  const value = readTlvString(findTlv(tlvs, type))?.trim()

  return value || undefined
}

function readOptionalU64String(tlvs: Tlv[], type: TlvType): string | undefined {
  return normalizeDeviceSn(readTlvU64String(findTlv(tlvs, type)))
}

/**
 * 根据设备身份字段生成 dn。
 *
 * 当前硬件规则：
 * - 优先使用 DEVICE_SN
 * - 没有 SN 时，使用 MAC 去掉冒号/短横线
 */
export function createDeviceDn(params: {
  deviceSn?: string
  macAddress?: string
}): string | undefined {
  if (params.deviceSn) {
    return params.deviceSn
  }

  if (params.macAddress) {
    return createDnFromMac(params.macAddress)
  }

  return undefined
}

/**
 * 从 QUERY_STATUS 的响应 TLV 中解析设备身份。
 */
export function parseDeviceIdentity(
  profile: BleDeviceProfile,
  tlvs: Tlv[],
): BleDeviceIdentity | undefined {
  if (!profile.productKey) {
    return undefined
  }

  const deviceSn = readOptionalU64String(tlvs, TlvType.DEVICE_SN)
  const macAddress = normalizeMacAddress(readOptionalString(tlvs, TlvType.MAC_ADDRESS))
  const dn = createDeviceDn({
    deviceSn,
    macAddress,
  })

  if (!dn) {
    return undefined
  }

  return {
    deviceSn,
    deviceType: readOptionalString(tlvs, TlvType.DEVICE_TYPE),
    dn,
    firmwareVersion: readOptionalString(tlvs, TlvType.FIRMWARE_VERSION),
    macAddress,
    productKey: profile.productKey,
    protocolVersion: readOptionalString(tlvs, TlvType.PROTOCOL_VERSION),
  }
}

/**
 * 从 QUERY_STATUS 的响应 TLV 中解析联网状态。
 */
export function parseDeviceStatus(tlvs: Tlv[]): BleDeviceStatus {
  return {
    ipAddress: readOptionalString(tlvs, TlvType.IP_ADDRESS),
    mqttStatus: readOptionalU8(tlvs, TlvType.MQTT_STATUS),
    radarSleepStatus: readOptionalU8(tlvs, TlvType.RADAR_SLEEP_STATUS),
    wifiConfigured: readOptionalBoolean(tlvs, TlvType.WIFI_CONFIGURED),
    wifiConnected: readOptionalBoolean(tlvs, TlvType.WIFI_CONNECTED),
    wifiStatus: readOptionalU8(tlvs, TlvType.WIFI_STATUS),
  }
}

/**
 * 查询设备身份和当前状态。
 *
 * 这个方法会发送 CMD_QUERY_STATUS，
 * 并把解析出的 identity/status 写回当前 connection。
 */
export async function queryDeviceStatus(
  connection: BleLocalConnection,
  options: QueryDeviceStatusOptions = {},
): Promise<BleQueryStatusResult> {
  const response = await connection.commandSession.sendCommand(
    BleCommand.QUERY_STATUS,
    [],
    {
      timeout: options.timeout ?? DEFAULT_QUERY_STATUS_TIMEOUT,
    },
  )

  const identity = parseDeviceIdentity(connection.profile, response.tlvs)
  const status = parseDeviceStatus(response.tlvs)

  connection.identity = identity
  connection.status = status

  return {
    identity,
    response,
    resultCode: response.resultCode,
    status,
  }
}
