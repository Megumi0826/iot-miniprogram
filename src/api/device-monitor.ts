import { DeviceMonitorWebSocketClient } from '@/websocket/device-monitor'

export * from './types/device-monitor'

export const deviceMonitorWebSocketClient = new DeviceMonitorWebSocketClient()

export function getDeviceMonitorWebSocketClient() {
  return deviceMonitorWebSocketClient
}
