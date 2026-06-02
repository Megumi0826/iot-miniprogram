import type {
  BleCharacteristic,
  BleCharacteristicRef,
  BleScanDevice,
  BleService,
} from '../transport'

/**
 * Profile 解析出来的 BLE 通信通道。
 *
 * transport 层只负责发现 service/characteristic，
 * 但它不知道哪个特征值代表写命令、哪个代表响应、哪个代表主动推送。
 * 这些设备协议相关的映射关系由 profile 层负责。
 */
export interface BleResolvedChannels {
  /**
   * 写命令通道。
   *
   * 对当前雷达设备来说就是 b1 characteristic。
   */
  write: BleCharacteristicRef

  /**
   * 请求响应 notify 通道。
   *
   * 对当前雷达设备来说就是 b2 characteristic。
   * 只有这个通道后续会参与 seq pending 请求匹配。
   */
  responseNotify?: BleCharacteristicRef

  /**
   * 主动推送 notify 通道。
   *
   * 对当前雷达设备来说包含 a1、a2、b3。
   * 它们只作为事件流进入上层，不参与请求 pending 匹配。
   */
  eventNotifies: BleCharacteristicRef[]
}

/**
 * 单类设备的 BLE Profile。
 *
 * Profile 描述“这种设备如何被识别、有哪些服务、哪些特征值承担哪些角色”。
 * 后续新增设备类型时，优先新增一个 profile，而不是改 transport/protocol。
 */
export interface BleDeviceProfile {
  /**
   * 设备类型标识。
   *
   * 例如 radar。这个值给 store、页面、业务层做类型判断使用。
   */
  type: string

  /**
   * 设备展示名称。
   */
  displayName: string

  /**
   * 平台 productKey。
   *
   * 如果这个设备后续要绑定到平台/MQTT 身份，一般会需要它和 dn 组合使用。
   */
  productKey?: string

  /**
   * 根据扫描结果判断这个 BLE 广播是否可能属于该设备类型。
   *
   * 这里通常只做轻量判断，例如设备名、广播 service UUID。
   */
  matchScanDevice: (device: BleScanDevice) => boolean

  /**
   * 根据已发现的 service 判断是否属于该设备类型。
   *
   * 连接后如果扫描阶段没有足够信息，可以通过 service 再确认一次。
   */
  matchService: (service: BleService) => boolean

  /**
   * 从已发现的 services/characteristics 中解析通信通道。
   *
   * 如果必要的 service 或 characteristic 缺失，返回 null，
   * 上层就可以认为这个设备不满足当前 profile 的通信要求。
   */
  resolveChannels: (params: {
    /**
     * 当前连接的 BLE 设备 ID。
     */
    deviceId: string

    /**
     * 当前设备发现到的 service 列表。
     */
    services: BleService[]

    /**
     * 每个 serviceId 对应的 characteristic 列表。
     */
    characteristics: Record<string, BleCharacteristic[]>
  }) => BleResolvedChannels | null
}
