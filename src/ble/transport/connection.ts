import type {
  BleCharacteristic,
  BleNotifyOptions,
  BleNotifyPayload,
  BleService,
  BleWriteOptions,
} from './types'
import { createBleTransportError } from './errors'

function normalizeService(raw: BleService): BleService {
  return {
    uuid: raw.uuid,
    isPrimary: raw.isPrimary,
  }
}

function normalizeCharacteristic(raw: BleCharacteristic): BleCharacteristic {
  return {
    uuid: raw.uuid,
    properties: raw.properties,
  }
}

function asUniBleWriteValue(value: ArrayBuffer): unknown[] {
  // DCloud legacy 类型声明为 any[]，但 uni 官方文档和运行时都使用 ArrayBuffer。
  return value as unknown as unknown[]
}

function asBleNotifyValue(value: unknown): ArrayBuffer {
  // DCloud legacy 类型声明为 any[]，但 uni 官方文档和运行时都返回 ArrayBuffer。
  return value as ArrayBuffer
}

export async function connectBleDevice(deviceId: string): Promise<void> {
  try {
    await uni.createBLEConnection({ deviceId })
  }
  catch (error) {
    throw createBleTransportError('CONNECT_FAILED', error)
  }
}

export async function disconnectBleDevice(deviceId: string): Promise<void> {
  try {
    await uni.closeBLEConnection({ deviceId })
  }
  catch (error) {
    throw createBleTransportError('DISCONNECT_FAILED', error)
  }
}

export async function getBleDeviceServices(deviceId: string): Promise<BleService[]> {
  try {
    const result = await uni.getBLEDeviceServices({ deviceId })
    return (result.services || []).map(normalizeService)
  }
  catch (error) {
    throw createBleTransportError('SERVICE_DISCOVERY_FAILED', error)
  }
}

export async function getBleDeviceCharacteristics(
  deviceId: string,
  serviceId: string,
): Promise<BleCharacteristic[]> {
  try {
    const result = await uni.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
    })
    return (result.characteristics || []).map(normalizeCharacteristic)
  }
  catch (error) {
    throw createBleTransportError('CHARACTERISTIC_DISCOVERY_FAILED', error)
  }
}

export async function notifyBleCharacteristic(options: BleNotifyOptions): Promise<void> {
  try {
    await uni.notifyBLECharacteristicValueChange({
      deviceId: options.deviceId,
      serviceId: options.serviceId,
      characteristicId: options.characteristicId,
      state: options.state ?? true,
    })
  }
  catch (error) {
    throw createBleTransportError('NOTIFY_FAILED', error)
  }
}

export async function writeBleCharacteristic(options: BleWriteOptions): Promise<void> {
  try {
    await uni.writeBLECharacteristicValue({
      deviceId: options.deviceId,
      serviceId: options.serviceId,
      characteristicId: options.characteristicId,
      value: asUniBleWriteValue(options.value),
    })
  }
  catch (error) {
    throw createBleTransportError('WRITE_FAILED', error)
  }
}

export function onBleNotification(callback: (payload: BleNotifyPayload) => void): () => void {
  uni.onBLECharacteristicValueChange((result) => {
    callback({
      deviceId: result.deviceId,
      serviceId: result.serviceId,
      characteristicId: result.characteristicId,
      value: asBleNotifyValue(result.value),
    })
  })

  return () => {
    uni.offBLECharacteristicValueChange()
  }
}

export function onBleConnectionStateChange(
  callback: (deviceId: string, connected: boolean) => void,
): () => void {
  uni.onBLEConnectionStateChange((result) => {
    callback(result.deviceId, result.connected)
  })

  return () => {
    uni.offBLEConnectionStateChange()
  }
}
