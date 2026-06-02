export type BleTransportErrorCode =
  | 'ADAPTER_OPEN_FAILED'
  | 'ADAPTER_CLOSE_FAILED'
  | 'ADAPTER_STATE_FAILED'
  | 'SCAN_START_FAILED'
  | 'SCAN_STOP_FAILED'
  | 'CONNECT_FAILED'
  | 'DISCONNECT_FAILED'
  | 'SERVICE_DISCOVERY_FAILED'
  | 'CHARACTERISTIC_DISCOVERY_FAILED'
  | 'NOTIFY_FAILED'
  | 'WRITE_FAILED'
  | 'UNKNOWN'

const DEFAULT_MESSAGES: Record<BleTransportErrorCode, string> = {
  ADAPTER_OPEN_FAILED: '打开蓝牙适配器失败',
  ADAPTER_CLOSE_FAILED: '关闭蓝牙适配器失败',
  ADAPTER_STATE_FAILED: '获取蓝牙适配器状态失败',
  SCAN_START_FAILED: '开始蓝牙扫描失败',
  SCAN_STOP_FAILED: '停止蓝牙扫描失败',
  CONNECT_FAILED: '连接蓝牙设备失败',
  DISCONNECT_FAILED: '断开蓝牙设备失败',
  SERVICE_DISCOVERY_FAILED: '获取蓝牙服务失败',
  CHARACTERISTIC_DISCOVERY_FAILED: '获取蓝牙特征失败',
  NOTIFY_FAILED: '设置蓝牙通知失败',
  WRITE_FAILED: '写入蓝牙特征失败',
  UNKNOWN: '未知蓝牙错误',
}

export class BleTransportError extends Error {
  constructor(
    public code: BleTransportErrorCode,
    message = DEFAULT_MESSAGES[code],
    public cause?: unknown,
  ) {
    super(message)
    this.name = 'BleTransportError'
  }
}

export function createBleTransportError(
  code: BleTransportErrorCode,
  cause?: unknown,
  message = DEFAULT_MESSAGES[code],
): BleTransportError {
  return new BleTransportError(code, message, cause)
}

export function isBleTransportError(error: unknown): error is BleTransportError {
  return error instanceof BleTransportError
}

export function getBleTransportErrorMessage(error: unknown): string {
  if (isBleTransportError(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return DEFAULT_MESSAGES.UNKNOWN
}
