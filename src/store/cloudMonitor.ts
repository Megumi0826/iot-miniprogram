import type {
  DeviceMonitorPropertyMessage,
  DeviceMonitorStatusMessage,
  DeviceMonitorSubscribeReq,
} from '@/api/device-monitor'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getDeviceMonitorWebSocketClient } from '@/api/device-monitor'

const DEFAULT_MONITOR_PROPERTIES = [
  'heartRate',
  'breathingRate',
  'humanActivity',
  'humanDistance',
  'humanPositionX',
  'humanPositionY',
  'humanPositionZ',
  'algorithmState',
  'secondaryEmotion',
  'sleepProgress',
]

function getMonitorDeviceKey(productKey: string, dn: string) {
  return `${productKey}:${dn}`
}

export interface CloudDeviceStatus {
  productKey: string
  dn: string
  deviceId?: number
  mqttOnline: boolean
  status?: string
  lastStatusAt: number
}

export const useCloudMonitorStore = defineStore('cloudMonitor', () => {
  const client = getDeviceMonitorWebSocketClient()

  const connected = ref(false)
  const connecting = ref(false)
  const statusSubscribed = ref(false)
  const activeProductKey = ref('')
  const activeDn = ref('')
  const activeSnapshot = ref<Record<string, unknown>>({})
  const activePropertyTimes = ref<Record<string, number>>({})
  const deviceStatusMap = ref<Record<string, CloudDeviceStatus>>({})
  const activeLastMessageAt = ref(0)
  const errorMessage = ref('')

  let listenersReady = false

  const activeKey = computed(() => {
    if (!activeProductKey.value || !activeDn.value) {
      return ''
    }

    return getMonitorDeviceKey(activeProductKey.value, activeDn.value)
  })
  const activeSubscribed = computed(() => !!activeKey.value)
  const activeMqttOnline = computed(() => {
    if (!activeKey.value) {
      return false
    }

    return !!deviceStatusMap.value[activeKey.value]?.mqttOnline
  })

  function resetActiveMonitor() {
    activeProductKey.value = ''
    activeDn.value = ''
    activeSnapshot.value = {}
    activePropertyTimes.value = {}
    activeLastMessageAt.value = 0
  }

  function resetRuntimeState() {
    connected.value = false
    connecting.value = false
    statusSubscribed.value = false
    resetActiveMonitor()
    deviceStatusMap.value = {}
    errorMessage.value = ''
  }

  function mergePropertyMessage(message: DeviceMonitorPropertyMessage) {
    if (message.productKey !== activeProductKey.value || message.dn !== activeDn.value) {
      return
    }

    activeSnapshot.value = {
      ...activeSnapshot.value,
      ...(message.properties || {}),
    }
    activePropertyTimes.value = {
      ...activePropertyTimes.value,
      ...(message.propertyTimes || {}),
    }
    activeLastMessageAt.value = message.time || Date.now()
  }

  function applyStatusMessage(message: DeviceMonitorStatusMessage) {
    if (!message.productKey || !message.dn) {
      return
    }

    const key = getMonitorDeviceKey(message.productKey, message.dn)
    deviceStatusMap.value = {
      ...deviceStatusMap.value,
      [key]: {
        productKey: message.productKey,
        dn: message.dn,
        deviceId: message.deviceId,
        mqttOnline: !!message.mqttOnline,
        status: message.status,
        lastStatusAt: message.time || Date.now(),
      },
    }
  }

  function ensureListeners() {
    if (listenersReady) {
      return
    }

    listenersReady = true

    client.onAny(() => {
      connected.value = client.connected
      connecting.value = client.connecting
    })

    client.on('member-device-monitor-ack', (message) => {
      errorMessage.value = ''

      if (message.action === 'subscribe') {
        activeProductKey.value = message.productKey || activeProductKey.value
        activeDn.value = message.dn || activeDn.value
      }
      if (message.action === 'status-subscribe') {
        statusSubscribed.value = true
      }
      if (message.action === 'status-unsubscribe') {
        statusSubscribed.value = false
      }
    })

    client.on('member-device-monitor-error', (message) => {
      errorMessage.value = message.message || '设备实时数据连接异常'
    })

    client.on('member-device-monitor-snapshot', (message) => {
      mergePropertyMessage(message)
    })

    client.on('member-device-monitor-property', (message) => {
      mergePropertyMessage(message)
    })

    client.on('member-device-monitor-status', (message) => {
      applyStatusMessage(message)
    })
  }

  async function subscribeDeviceStatus() {
    ensureListeners()
    errorMessage.value = ''

    if (statusSubscribed.value && client.connected) {
      connected.value = client.connected
      connecting.value = client.connecting
      return
    }

    connecting.value = true

    try {
      await client.subscribeStatus()
      connected.value = client.connected
      statusSubscribed.value = true
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '连接设备状态失败'
      throw error
    }
    finally {
      connecting.value = false
    }
  }

  function unsubscribeDeviceStatus() {
    client.unsubscribeStatus()
    statusSubscribed.value = false
  }

  async function subscribeDevice(payload: DeviceMonitorSubscribeReq) {
    ensureListeners()
    errorMessage.value = ''

    const nextKey = getMonitorDeviceKey(payload.productKey, payload.dn)

    if (activeKey.value === nextKey && client.connected) {
      connected.value = client.connected
      connecting.value = client.connecting
      return
    }

    connecting.value = true

    try {
      if (activeKey.value && activeKey.value !== nextKey) {
        client.unsubscribe({
          dn: activeDn.value,
          productKey: activeProductKey.value,
        })
        resetActiveMonitor()
      }

      const isSameDevice = activeKey.value === nextKey
      activeProductKey.value = payload.productKey
      activeDn.value = payload.dn

      if (!isSameDevice) {
        activeSnapshot.value = {}
        activePropertyTimes.value = {}
        activeLastMessageAt.value = 0
      }

      await client.subscribe({
        properties: DEFAULT_MONITOR_PROPERTIES,
        ...payload,
      })
      connected.value = client.connected
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '连接设备实时数据失败'
      throw error
    }
    finally {
      connecting.value = false
    }
  }

  function unsubscribe() {
    if (!activeKey.value) {
      return
    }

    client.unsubscribe({
      dn: activeDn.value,
      productKey: activeProductKey.value,
    })
    resetActiveMonitor()
  }

  function disconnect() {
    client.close()
    resetRuntimeState()
  }

  function getDeviceStatus(productKey: string, dn: string) {
    return deviceStatusMap.value[getMonitorDeviceKey(productKey, dn)]
  }

  function getDeviceMqttOnline(productKey: string, dn: string) {
    return getDeviceStatus(productKey, dn)?.mqttOnline
  }

  return {
    activeDn,
    activeKey,
    activeLastMessageAt,
    activeMqttOnline,
    activeProductKey,
    activePropertyTimes,
    activeSnapshot,
    activeSubscribed,
    connected,
    connecting,
    deviceStatusMap,
    disconnect,
    errorMessage,
    getDeviceMqttOnline,
    getDeviceStatus,
    statusSubscribed,
    subscribeDevice,
    subscribeDeviceStatus,
    unsubscribe,
    unsubscribeDeviceStatus,
  }
})
