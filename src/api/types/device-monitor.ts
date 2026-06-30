export type DeviceMonitorMessageType
  = | 'member-device-monitor-ack'
    | 'member-device-monitor-error'
    | 'member-device-monitor-snapshot'
    | 'member-device-monitor-property'
    | 'member-device-monitor-status'
    | 'member-device-status-subscribe'
    | 'member-device-status-unsubscribe'

export interface DeviceMonitorSubscribeReq {
  productKey: string
  dn: string
  properties?: string[]
}

export interface DeviceMonitorUnsubscribeReq {
  productKey?: string
  dn?: string
}

export interface DeviceStatusSubscribeReq {
}

export interface DeviceStatusUnsubscribeReq {
}

export interface DeviceMonitorAckMessage {
  action: 'subscribe' | 'unsubscribe' | string
  productKey?: string
  dn?: string
  deviceId?: number
}

export interface DeviceMonitorErrorMessage {
  code: string
  message: string
}

export interface DeviceMonitorPropertyMessage {
  productKey: string
  dn: string
  deviceId: number
  time: number
  properties: Record<string, unknown>
  propertyTimes?: Record<string, number>
}

export interface DeviceMonitorStatusMessage {
  productKey: string
  dn: string
  deviceId: number
  time: number
  status: 'online' | 'offline' | string
  mqttOnline: boolean
}

export interface DeviceMonitorMessageMap {
  'member-device-monitor-ack': DeviceMonitorAckMessage
  'member-device-monitor-error': DeviceMonitorErrorMessage
  'member-device-monitor-snapshot': DeviceMonitorPropertyMessage
  'member-device-monitor-property': DeviceMonitorPropertyMessage
  'member-device-monitor-status': DeviceMonitorStatusMessage
  'member-device-status-subscribe': DeviceStatusSubscribeReq
  'member-device-status-unsubscribe': DeviceStatusUnsubscribeReq
}

export interface DeviceMonitorEnvelope<T = unknown> {
  type: string
  content?: string | T
}

export interface DeviceMonitorParsedMessage<T = unknown> {
  type: string
  content: T
  raw: DeviceMonitorEnvelope
}

export type DeviceMonitorAnyMessage
  = | DeviceMonitorParsedMessage<DeviceMonitorAckMessage>
    | DeviceMonitorParsedMessage<DeviceMonitorErrorMessage>
    | DeviceMonitorParsedMessage<DeviceMonitorPropertyMessage>
    | DeviceMonitorParsedMessage<DeviceMonitorStatusMessage>
