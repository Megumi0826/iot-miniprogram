import type { IBoundDeviceRes } from '@/api/types/device'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { bindDevice, getBoundDeviceList, unbindDevice } from '@/api/device'
import { RADAR_PRODUCT_KEY } from '@/ble/profiles/radar'
import { useBleStore } from './ble'
import { useCloudMonitorStore } from './cloudMonitor'

const MAX_LOCAL_BLE_DEVICES = 30

/**
 * 小程序当前能识别的设备类型。
 *
 * 后续新增设备类型时，优先扩展 profile 层，再把这里的联合类型补上。
 */
export type DeviceType = 'radar' | 'unknown'

/**
 * 设备绑定状态。
 *
 * bound 表示已经存在云端 member 绑定关系；
 * unbound 表示只是本机通过 BLE 连接过，还没有绑定到用户账号。
 */
export type DeviceBindStatus = 'bound' | 'unbound'

/**
 * 页面展示用的整体连接状态。
 *
 * 一个设备可以同时具备云端 MQTT 在线和本机 BLE 已连接两种状态。
 */
export type DeviceConnectionStatus = 'offline' | 'mqttOnline' | 'bleConnected' | 'bothOnline'

/**
 * 本机保存的 BLE 连接历史。
 *
 * 这不是当前连接运行态，只用于下次打开小程序时展示“曾经连接过的本地设备”，
 * 方便用户再次点击后重新扫描/重连。
 */
export interface LocalBleDeviceRecord {
  /** 云端产品标识，和设备 MQTT 身份一致。 */
  productKey: string

  /** 设备唯一标识，优先来自 SN，否则来自 MAC 去冒号后的值。 */
  dn: string

  /** 页面展示名称，通常来自 BLE 广播名或设备 dn。 */
  deviceName?: string

  /** 设备 MAC 地址，若硬件 queryStatus 返回则保存。 */
  mac?: string

  /** 微信/uni 扫描得到的本机 BLE deviceId，只能作为本机重连线索。 */
  bleDeviceId?: string

  /** 本地识别出的设备类型。 */
  deviceType: DeviceType

  /** 最近一次成功完成 BLE 可用连接的时间戳。 */
  lastConnectedAt: number
}

/**
 * 设备列表页面最终消费的数据结构。
 *
 * cloud 来自后端已绑定设备；
 * local 来自本机 BLE 历史；
 * 当前 BLE 连接态会在 deviceList computed 中实时叠加进去。
 */
export interface DeviceListItem {
  /** `${productKey}:${dn}`，用于合并云端设备和本地 BLE 设备。 */
  key: string

  productKey: string
  dn: string
  name: string
  deviceType: DeviceType

  /** 云端绑定设备详情，未绑定设备为空。 */
  cloud?: IBoundDeviceRes

  /** 本机 BLE 历史，云端设备未通过本机 BLE 连接过时为空。 */
  local?: LocalBleDeviceRecord

  /** 是否已绑定到当前 member 用户。 */
  cloudBound: boolean

  /** 云端 MQTT 是否在线。 */
  mqttOnline: boolean

  /** 本机是否有过 BLE 连接记录，或当前正在 BLE 连接中。 */
  bleKnown: boolean

  /** 当前是否正在通过 BLE 连接这台设备。 */
  bleConnected: boolean

  /** 当前或最近一次扫描连接得到的 BLE deviceId。 */
  bleDeviceId?: string

  bindStatus: DeviceBindStatus
  connectionStatus: DeviceConnectionStatus
}

/**
 * 云端设备和本地 BLE 历史的合并 key。
 */
export function getDeviceKey(productKey: string, dn: string) {
  return `${productKey}:${dn}`
}

function normalizeDeviceType(type?: string): DeviceType {
  return type === 'radar' ? 'radar' : 'unknown'
}

function assertDeviceIdentity(productKey: string, dn: string) {
  if (!productKey || !dn) {
    throw new Error('设备 productKey 或 dn 为空')
  }
}

function resolveCloudDeviceType(device: IBoundDeviceRes): DeviceType {
  if (device.productKey === RADAR_PRODUCT_KEY) {
    return 'radar'
  }

  return normalizeDeviceType(device.model)
}

function isCloudDeviceOnline(device: IBoundDeviceRes) {
  return device.online === true || device.state === 1
}

function getCloudDeviceName(device: IBoundDeviceRes) {
  return device.name || device.dn || '未命名设备'
}

function getLocalDeviceName(device: LocalBleDeviceRecord) {
  return device.deviceName || device.dn || '本地 BLE 设备'
}

function resolveCurrentBleDeviceType(
  profileType?: string,
  identityDeviceType?: string,
) {
  return normalizeDeviceType(profileType || identityDeviceType)
}

function resolveConnectionStatus(
  mqttOnline: boolean,
  bleConnected: boolean,
): DeviceConnectionStatus {
  if (mqttOnline && bleConnected) {
    return 'bothOnline'
  }

  if (bleConnected) {
    return 'bleConnected'
  }

  if (mqttOnline) {
    return 'mqttOnline'
  }

  return 'offline'
}

export const useDeviceStore = defineStore(
  'device',
  () => {
    const bleStore = useBleStore()
    const cloudMonitorStore = useCloudMonitorStore()

    /**
     * 云端已绑定设备列表。
     *
     * 这里不做持久化，进入设备页时从后端刷新即可。
     */
    const cloudDevices = ref<IBoundDeviceRes[]>([])

    /**
     * 本机 BLE 连接历史。
     *
     * 只保存成功完成 BLE 可用连接的设备，用于下次打开小程序后展示本地入口。
     */
    const localBleDevices = ref<LocalBleDeviceRecord[]>([])

    /**
     * 当前设备工作台选中的设备。
     *
     * 这里只保存 key，不复制整台设备的数据；真正展示时从 deviceList 里实时取最新合并结果。
     */
    const selectedDeviceKey = ref('')

    const loading = ref(false)
    const binding = ref(false)
    const unbindingDeviceId = ref<number | null>(null)
    const errorMessage = ref('')

    const cloudDeviceMap = computed(() => {
      const map = new Map<string, IBoundDeviceRes>()

      cloudDevices.value.forEach((device) => {
        if (!device.productKey || !device.dn) {
          return
        }

        map.set(getDeviceKey(device.productKey, device.dn), device)
      })

      return map
    })

    const localBleDeviceMap = computed(() => {
      const map = new Map<string, LocalBleDeviceRecord>()

      localBleDevices.value.forEach((device) => {
        map.set(getDeviceKey(device.productKey, device.dn), device)
      })

      return map
    })

    const currentBleKey = computed(() => {
      const identity = bleStore.currentIdentity

      if (!bleStore.connected || !identity?.productKey || !identity.dn) {
        return ''
      }

      return getDeviceKey(identity.productKey, identity.dn)
    })

    const hasCloudDevices = computed(() => cloudDevices.value.length > 0)
    const hasLocalBleDevices = computed(() => localBleDevices.value.length > 0)

    const deviceList = computed<DeviceListItem[]>(() => {
      const items = new Map<string, DeviceListItem>()

      cloudDevices.value.forEach((cloud) => {
        if (!cloud.productKey || !cloud.dn) {
          return
        }

        const key = getDeviceKey(cloud.productKey, cloud.dn)
        const local = localBleDeviceMap.value.get(key)
        const bleConnected = currentBleKey.value === key
        const mqttOnline = cloudMonitorStore.getDeviceMqttOnline(cloud.productKey, cloud.dn)
          ?? isCloudDeviceOnline(cloud)

        items.set(key, {
          key,
          productKey: cloud.productKey,
          dn: cloud.dn,
          name: cloud.name || local?.deviceName || getCloudDeviceName(cloud),
          deviceType: local?.deviceType || resolveCloudDeviceType(cloud),
          cloud,
          local,
          cloudBound: true,
          mqttOnline,
          bleKnown: !!local || bleConnected,
          bleConnected,
          bleDeviceId: bleConnected
            ? bleStore.currentDevice?.deviceId
            : local?.bleDeviceId,
          bindStatus: 'bound',
          connectionStatus: resolveConnectionStatus(mqttOnline, bleConnected),
        })
      })

      localBleDevices.value.forEach((local) => {
        const key = getDeviceKey(local.productKey, local.dn)

        if (items.has(key)) {
          return
        }

        const bleConnected = currentBleKey.value === key

        items.set(key, {
          key,
          productKey: local.productKey,
          dn: local.dn,
          name: getLocalDeviceName(local),
          deviceType: local.deviceType,
          local,
          cloudBound: false,
          mqttOnline: false,
          bleKnown: true,
          bleConnected,
          bleDeviceId: bleConnected
            ? bleStore.currentDevice?.deviceId
            : local.bleDeviceId,
          bindStatus: 'unbound',
          connectionStatus: resolveConnectionStatus(false, bleConnected),
        })
      })

      const identity = bleStore.currentIdentity

      if (
        currentBleKey.value
        && identity?.productKey
        && identity.dn
        && !items.has(currentBleKey.value)
      ) {
        const type = resolveCurrentBleDeviceType(
          bleStore.currentDevice?.profileType,
          identity.deviceType,
        )

        items.set(currentBleKey.value, {
          key: currentBleKey.value,
          productKey: identity.productKey,
          dn: identity.dn,
          name: bleStore.currentDevice?.name || identity.dn,
          deviceType: type,
          cloudBound: false,
          mqttOnline: false,
          bleKnown: true,
          bleConnected: true,
          bleDeviceId: bleStore.currentDevice?.deviceId,
          bindStatus: 'unbound',
          connectionStatus: 'bleConnected',
        })
      }

      return Array.from(items.values()).sort((a, b) => {
        if (a.bleConnected !== b.bleConnected) {
          return a.bleConnected ? -1 : 1
        }

        if (a.cloudBound !== b.cloudBound) {
          return a.cloudBound ? -1 : 1
        }

        const aLastConnectedAt = a.local?.lastConnectedAt || 0
        const bLastConnectedAt = b.local?.lastConnectedAt || 0

        return bLastConnectedAt - aLastConnectedAt
      })
    })

    const currentDeviceItem = computed(() => {
      if (!deviceList.value.length) {
        return null
      }

      return deviceList.value.find(device => device.key === selectedDeviceKey.value)
        || deviceList.value[0]
    })

    function clearError() {
      errorMessage.value = ''
    }

    function isDeviceBound(productKey: string, dn: string) {
      return cloudDeviceMap.value.has(getDeviceKey(productKey, dn))
    }

    function ensureSelectedDevice() {
      const device = currentDeviceItem.value
      selectedDeviceKey.value = device?.key || ''
      return device
    }

    function selectDevice(key: string) {
      selectedDeviceKey.value = key
      return ensureSelectedDevice()
    }

    function rememberBleDevice(record: LocalBleDeviceRecord) {
      assertDeviceIdentity(record.productKey, record.dn)

      const key = getDeviceKey(record.productKey, record.dn)
      const nextRecord: LocalBleDeviceRecord = {
        ...record,
        deviceType: normalizeDeviceType(record.deviceType),
      }

      localBleDevices.value = [
        nextRecord,
        ...localBleDevices.value.filter(device =>
          getDeviceKey(device.productKey, device.dn) !== key,
        ),
      ].slice(0, MAX_LOCAL_BLE_DEVICES)

      return nextRecord
    }

    function rememberCurrentBleDevice() {
      const identity = bleStore.currentIdentity

      if (!bleStore.connected || !identity?.productKey || !identity.dn) {
        return null
      }

      return rememberBleDevice({
        productKey: identity.productKey,
        dn: identity.dn,
        deviceName: bleStore.currentDevice?.name || identity.dn,
        mac: identity.macAddress,
        bleDeviceId: bleStore.currentDevice?.deviceId,
        deviceType: resolveCurrentBleDeviceType(
          bleStore.currentDevice?.profileType,
          identity.deviceType,
        ),
        lastConnectedAt: Date.now(),
      })
    }

    function removeLocalBleDevice(productKey: string, dn: string) {
      const key = getDeviceKey(productKey, dn)
      localBleDevices.value = localBleDevices.value.filter(device =>
        getDeviceKey(device.productKey, device.dn) !== key,
      )

      ensureSelectedDevice()
    }

    async function loadBoundDevices() {
      clearError()
      loading.value = true

      try {
        const devices = await getBoundDeviceList()
        cloudDevices.value = devices || []
        ensureSelectedDevice()
        return cloudDevices.value
      }
      catch (error) {
        errorMessage.value = '加载已绑定设备失败'
        throw error
      }
      finally {
        loading.value = false
      }
    }

    async function bindByIdentity(productKey: string, dn: string) {
      clearError()
      binding.value = true

      try {
        const bindId = await bindDevice({
          dn,
          productKey,
        })

        try {
          await loadBoundDevices()
        }
        catch {
          errorMessage.value = '设备已绑定，刷新设备列表失败'
        }

        return bindId
      }
      catch (error) {
        errorMessage.value = '绑定设备失败'
        throw error
      }
      finally {
        binding.value = false
      }
    }

    async function bindCurrentBleDevice() {
      const identity = bleStore.currentIdentity

      if (!bleStore.connected || !identity?.productKey || !identity.dn) {
        throw new Error('当前没有可绑定的 BLE 设备')
      }

      rememberCurrentBleDevice()

      return bindByIdentity(identity.productKey, identity.dn)
    }

    async function unbindCloudDevice(deviceId: number) {
      clearError()
      unbindingDeviceId.value = deviceId

      try {
        const success = await unbindDevice({ deviceId })

        if (success) {
          try {
            await loadBoundDevices()
          }
          catch {
            errorMessage.value = '设备已解绑，刷新设备列表失败'
          }
        }

        return success
      }
      catch (error) {
        errorMessage.value = '解绑设备失败'
        throw error
      }
      finally {
        unbindingDeviceId.value = null
      }
    }

    return {
      binding,
      cloudDeviceMap,
      cloudDevices,
      currentBleKey,
      currentDeviceItem,
      deviceList,
      errorMessage,
      hasCloudDevices,
      hasLocalBleDevices,
      loading,
      localBleDeviceMap,
      localBleDevices,
      selectedDeviceKey,
      unbindingDeviceId,

      bindByIdentity,
      bindCurrentBleDevice,
      clearError,
      ensureSelectedDevice,
      isDeviceBound,
      loadBoundDevices,
      rememberBleDevice,
      rememberCurrentBleDevice,
      removeLocalBleDevice,
      selectDevice,
      unbindCloudDevice,
    }
  },
  {
    persist: {
      paths: ['localBleDevices', 'selectedDeviceKey'],
    },
  },
)
