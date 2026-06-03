import { DeviceStatusCode, ResultCode } from '../protocol'

/**
 * 把状态码格式化成十六进制展示。
 */
export function formatStatusCode(code?: number): string {
  if (code === undefined) {
    return '无'
  }

  return `0x${code.toString(16).toUpperCase().padStart(2, '0')}`
}

/**
 * 获取命令结果码文案。
 *
 * 这些码主要来自 TLV_RESULT_CODE。
 */
export function getResultCodeText(code?: ResultCode | number): string {
  switch (code) {
    case ResultCode.SUCCESS:
      return '成功'
    case ResultCode.PROCESSING:
      return '处理中'
    case ResultCode.ERR_PROTO_CMD_UNKNOWN:
      return '未知命令'
    case ResultCode.ERR_PROTO_PARAM_MISSING:
      return '缺少参数'
    case ResultCode.ERR_PROTO_PARAM_INVALID:
      return '参数非法'
    case ResultCode.ERR_PROTO_BUSY:
      return '设备正忙'
    case ResultCode.ERR_PROTO_FRAME_TOO_LARGE:
      return '命令帧过大'
    case ResultCode.ERR_WIFI_SCAN_TIMEOUT:
      return 'WiFi 扫描超时'
    case ResultCode.ERR_WIFI_SSID_NOT_FOUND:
      return '未找到指定 WiFi'
    case ResultCode.ERR_WIFI_WRONG_PASSWORD:
      return 'WiFi 密码错误'
    case ResultCode.ERR_WIFI_SIGNAL_WEAK:
      return 'WiFi 信号较弱'
    case ResultCode.ERR_WIFI_BUSY:
      return 'WiFi 正忙'
    case ResultCode.ERR_DEV_STATE_INVALID:
      return '当前设备状态不允许'
    case ResultCode.ERR_DEV_STORAGE_FAIL:
      return '设备存储失败'
    case ResultCode.ERR_DEV_QUEUE_FULL:
      return '设备队列已满'
    default:
      return code === undefined ? '无' : `未知结果码 ${formatStatusCode(code)}`
  }
}

/**
 * 获取设备状态码文案。
 *
 * 这些码主要来自 TLV_WIFI_STATUS、TLV_MQTT_STATUS、TLV_DEVICE_STATUS、
 * TLV_RADAR_SLEEP_STATUS。
 */
export function getDeviceStatusCodeText(code?: DeviceStatusCode | number): string {
  switch (code) {
    case DeviceStatusCode.WIFI_DISCONNECTED:
      return 'WiFi 已断开'
    case DeviceStatusCode.WIFI_CONNECTING:
      return 'WiFi 连接中'
    case DeviceStatusCode.WIFI_CONNECTED:
      return 'WiFi 已连接'
    case DeviceStatusCode.WIFI_FAILED:
      return 'WiFi 连接失败'
    case DeviceStatusCode.MQTT_DISCONNECTED:
      return 'MQTT 已断开'
    case DeviceStatusCode.MQTT_CONNECTING:
      return 'MQTT 连接中'
    case DeviceStatusCode.MQTT_CONNECTED:
      return 'MQTT 已连接'
    case DeviceStatusCode.MQTT_FAILED:
      return 'MQTT 连接失败'
    case DeviceStatusCode.RADAR_SLEEP_QUERY_DISABLED:
      return '雷达睡眠查询已关闭'
    case DeviceStatusCode.RADAR_SLEEP_QUERY_ENABLED:
      return '雷达睡眠查询已开启'
    default:
      return code === undefined ? '无' : `未知状态码 ${formatStatusCode(code)}`
  }
}

/**
 * 获取带十六进制码值的命令结果展示文案。
 */
export function getResultCodeDisplay(code?: ResultCode | number): string {
  if (code === undefined) {
    return '无'
  }

  return `${getResultCodeText(code)} (${formatStatusCode(code)})`
}

/**
 * 获取带十六进制码值的设备状态展示文案。
 */
export function getDeviceStatusCodeDisplay(code?: DeviceStatusCode | number): string {
  if (code === undefined) {
    return '无'
  }

  return `${getDeviceStatusCodeText(code)} (${formatStatusCode(code)})`
}
