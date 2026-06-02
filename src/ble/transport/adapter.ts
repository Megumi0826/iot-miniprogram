import type { BleAdapterState } from './types'
import { createBleTransportError } from './errors'

export async function openBleAdapter(): Promise<void> {
  try {
    await uni.openBluetoothAdapter()
  }
  catch (error) {
    throw createBleTransportError('ADAPTER_OPEN_FAILED', error)
  }
}

export async function closeBleAdapter(): Promise<void> {
  try {
    await uni.closeBluetoothAdapter()
  }
  catch (error) {
    throw createBleTransportError('ADAPTER_CLOSE_FAILED', error)
  }
}

export async function getBleAdapterState(): Promise<BleAdapterState> {
  try {
    return await uni.getBluetoothAdapterState()
  }
  catch (error) {
    throw createBleTransportError('ADAPTER_STATE_FAILED', error)
  }
}

export function onBleAdapterStateChange(callback: (state: BleAdapterState) => void): () => void {
  uni.onBluetoothAdapterStateChange((state) => {
    callback(state)
  })

  return () => {
    uni.offBluetoothAdapterStateChange()
  }
}
