import type { BleDiscoveryOptions, BleScanDevice } from './types'
import { createBleTransportError } from './errors'

function normalizeScanDevice(raw: UniApp.BluetoothDeviceInfo): BleScanDevice {
  return {
    deviceId: raw.deviceId,
    name: raw.name || raw.localName || '',
    localName: raw.localName || '',
    RSSI: raw.RSSI,
    advertisData: raw.advertisData,
    serviceData: raw.serviceData,
    advertisServiceUUIDs: raw.advertisServiceUUIDs,
  }
}

export async function startBleScan(options: BleDiscoveryOptions = {}): Promise<void> {
  try {
    await uni.startBluetoothDevicesDiscovery({
      services: options.services,
      allowDuplicatesKey: options.allowDuplicatesKey ?? false,
      interval: options.interval,
    })
  }
  catch (error) {
    throw createBleTransportError('SCAN_START_FAILED', error)
  }
}

export async function stopBleScan(): Promise<void> {
  try {
    await uni.stopBluetoothDevicesDiscovery()
  }
  catch (error) {
    throw createBleTransportError('SCAN_STOP_FAILED', error)
  }
}

export function onBleDeviceFound(callback: (devices: BleScanDevice[]) => void): () => void {
  uni.onBluetoothDeviceFound((result) => {
    const devices = (result.devices || []).map(normalizeScanDevice)
    callback(devices)
  })

  return () => {
    uni.offBluetoothDeviceFound()
  }
}

export async function scanBleDevices(
  onFound: (devices: BleScanDevice[]) => void,
  options: BleDiscoveryOptions = {},
): Promise<() => Promise<void>> {
  const offDeviceFound = onBleDeviceFound(onFound)

  try {
    await startBleScan(options)
  }
  catch (error) {
    offDeviceFound()
    throw error
  }

  return async () => {
    offDeviceFound()
    await stopBleScan()
  }
}
