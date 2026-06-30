/** 扫描到的蓝牙设备，来源于 uni.onBluetoothDeviceFound 的常用字段整理。 */
export interface BleScanDevice {
  /** uni 蓝牙 API 使用的设备唯一标识。 */
  deviceId: string
  /** 设备名称，某些平台或设备可能为空。 */
  name?: string
  /** 广播包 LocalName 字段，通常比 name 更接近设备实际广播名。 */
  localName?: string
  /** 信号强度，单位 dBm。 */
  RSSI?: number
  /** 广播包 ManufacturerData 数据；不同平台类型可能有差异，因此这里保留原始形态。 */
  advertisData?: unknown
  /** 广播包 ServiceData 数据；不同平台类型可能有差异，因此这里保留原始形态。 */
  serviceData?: unknown
  /** 广播包中的 Service UUID 列表。 */
  advertisServiceUUIDs?: unknown[]
}

/** 蓝牙适配器状态，来源于 uni.getBluetoothAdapterState。 */
export interface BleAdapterState {
  /** 蓝牙适配器是否可用。 */
  available?: boolean
  /** 当前是否正在扫描。 */
  discovering?: boolean
}

/** 指向某个 BLE 特征值的三元组，write/notify/read 都需要这些字段。 */
export interface BleCharacteristicRef {
  /** 蓝牙设备 ID。 */
  deviceId: string
  /** 服务 UUID。 */
  serviceId: string
  /** 特征 UUID。 */
  characteristicId: string
}

/** 写入 BLE 特征值时需要的参数。 */
export interface BleWriteOptions extends BleCharacteristicRef {
  /** 要写入的二进制数据，保持 uni API 使用的 ArrayBuffer。 */
  value: ArrayBuffer
}

/** 开启或关闭 BLE notify/indicate 时需要的参数。 */
export interface BleNotifyOptions extends BleCharacteristicRef {
  /** true 表示开启通知，false 表示关闭通知；不传时由调用方决定默认值。 */
  state?: boolean
}

/** 收到 BLE notify/indicate 时向上抛出的数据。 */
export interface BleNotifyPayload extends BleCharacteristicRef {
  /** 特征推送的原始二进制数据。 */
  value: ArrayBuffer
}

/** 开始扫描时透传给 uni.startBluetoothDevicesDiscovery 的常用参数。 */
export interface BleDiscoveryOptions {
  /** 指定要扫描的 Service UUID 列表。 */
  services?: string[]
  /** 是否允许重复上报同一设备。 */
  allowDuplicatesKey?: boolean
  /** 上报间隔，单位 ms。 */
  interval?: number
}

/** BLE 服务的最小结构，来源于 uni.getBLEDeviceServices 的常用字段。 */
export interface BleService {
  /** 服务 UUID。 */
  uuid: string
  /** 是否为主服务。 */
  isPrimary?: boolean
}

/** BLE 特征支持的操作能力。 */
export interface BleCharacteristicProperties {
  /** 是否支持读取。 */
  read?: boolean
  /** 是否支持写入。 */
  write?: boolean
  /** 是否支持 notify。 */
  notify?: boolean
  /** 是否支持 indicate。 */
  indicate?: boolean
  /** 是否支持有回复写。 */
  writeDefault?: boolean
  /** 是否支持无回复写。 */
  writeNoResponse?: boolean
}

/** BLE 特征的最小结构，来源于 uni.getBLEDeviceCharacteristics 的常用字段。 */
export interface BleCharacteristic {
  /** 特征 UUID。 */
  uuid: string
  /** 特征支持的操作能力。 */
  properties?: BleCharacteristicProperties
}
