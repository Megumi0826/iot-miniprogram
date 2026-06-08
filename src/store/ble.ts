import type {
  BleCommandResponse,
  BleDeviceIdentity,
  BleDeviceStatus,
  BleLocalConnection,
  BleNearbyDevice,
  BleQueryStatusResult,
  BleRadarMonitorSession,
  BleRadarMonitorSnapshot,
  BleSavedWifiNetwork,
  BleWifiNetwork,
  ConfigureWifiResult,
  DeleteSavedWifiNetworkResult,
  GetSavedWifiNetworksResult,
  ScanNearbyDevicesResult,
  ScanWifiNetworksResult,
} from '@/ble/application'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  configureWifi,
  connectLocalDevice,
  createRadarMonitorSession,
  deleteSavedWifiNetwork,
  getResultCodeDisplay,
  getSavedWifiNetworks,
  queryDeviceStatus,
  scanNearbyDevices,
  scanWifiNetworks,
} from '@/ble/application'
import { ResultCode } from '@/ble/protocol'

const SCAN_DURATION = 10000
const MONITOR_INTERVAL = 1000
const MIN_MONITOR_SAMPLE_INTERVAL = 1000
const MAX_MONITOR_SAMPLES = 60

/**
 * 扫描状态只描述“附近设备列表”的生命周期。
 *
 * BLE 连接、WiFi 配网、实时监控都有自己的状态，不和扫描状态混在一起。
 */
export type BleScanState = 'idle' | 'scanning' | 'stopping' | 'stopped' | 'error'

/**
 * 当前本地 BLE 连接状态。
 *
 * 连接成功的判定比较严格：必须完成蓝牙连接，并且 queryStatus 成功拿到设备身份。
 */
export type BleConnectionState
  = | 'idle'
    | 'connecting'
    | 'queryingStatus'
    | 'connected'
    | 'disconnecting'
    | 'disconnected'
    | 'error'

/**
 * 设备状态查询是连接后的第一道校验。
 *
 * 没有 dn 的设备不能进入 connected 状态，因为后续绑定、配网结果确认都依赖这个身份。
 */
function assertQueryStatusSuccess(result: BleQueryStatusResult) {
  if (result.resultCode !== ResultCode.SUCCESS) {
    throw new Error(`读取设备状态失败：${getResultCodeDisplay(result.resultCode)}`)
  }

  if (!result.identity?.dn) {
    throw new Error('读取设备身份失败：设备 dn 为空')
  }
}

/**
 * 检查带 resultCode 的业务命令结果。
 *
 * 这里不直接弹 UI，只抛出带本地错误文案的 Error，由页面或 store 状态决定怎么展示。
 */
function assertCommandSuccess(result: {
  resultCode?: ResultCode
}, message: string) {
  if (result.resultCode !== ResultCode.SUCCESS) {
    throw new Error(`${message}:${getResultCodeDisplay(result.resultCode)}`)
  }
}

export const useBleStore = defineStore('ble', () => {
  /*
   * 扫描运行态。
   *
   * nearbyDevices 是页面展示的附近设备列表；
   * stopScanRunner 和 scanTimer 是底层扫描任务的清理句柄，不需要响应式。
   */
  const scanState = ref<BleScanState>('idle')
  const nearbyDevices = ref<BleNearbyDevice[]>([])

  /*
   * 当前连接运行态。
   *
   * 第一版只支持同时连接一台 BLE 设备。
   * currentConnection 是底层连接上下文，用 shallowRef 避免 Vue 深度代理复杂对象。
   */
  const connectionState = ref<BleConnectionState>('idle')
  const connectingDevice = ref<BleNearbyDevice | null>(null)
  const currentDevice = ref<BleNearbyDevice | null>(null)
  const currentConnection = shallowRef<BleLocalConnection | null>(null)
  const currentIdentity = ref<BleDeviceIdentity | null>(null)
  const currentStatus = ref<BleDeviceStatus | null>(null)
  const refreshingStatus = ref(false)

  /*
   * WiFi 配网运行态。
   *
   * wifiNetworks 来自设备实时扫描；
   * savedWifiNetworks 来自设备内部保存的 WiFi 列表。
   */
  const wifiNetworks = ref<BleWifiNetwork[]>([])
  const savedWifiNetworks = ref<BleSavedWifiNetwork[]>([])
  const wifiScanning = ref(false)
  const savedWifiLoading = ref(false)
  const provisioning = ref(false)

  /*
   * 实时监控运行态。
   *
   * monitorSnapshot 是最新融合快照，用于实时卡片；
   * monitorSamples 是按时间采样的快照数组，用于后续画折线图。
   */
  const monitorSnapshot = ref<BleRadarMonitorSnapshot | null>(null)
  const monitorSamples = ref<BleRadarMonitorSnapshot[]>([])
  const monitoring = ref(false)

  /**
   * 页面可直接展示的 BLE 错误提示。
   *
   * 详细错误仍会通过 action 的 throw 传出去，测试页或业务页可以自行 catch。
   */
  const errorMessage = ref('')

  /*
   * 底层任务句柄。
   *
   * 这些只用于清理资源，不参与页面渲染，所以保持普通变量即可。
   */
  let stopScanRunner: ScanNearbyDevicesResult['stop'] | null = null
  let scanTimer: ReturnType<typeof setTimeout> | null = null
  let monitorSession: BleRadarMonitorSession | null = null
  let stopMonitorSnapshotListener: (() => void) | null = null
  let lastMonitorSampleAt = 0

  /*
   * 页面常用派生状态。
   *
   * 页面优先读这些 computed，少直接判断底层枚举。
   */
  const scanning = computed(() => scanState.value === 'scanning')
  const hasNearbyDevices = computed(() => nearbyDevices.value.length > 0)

  const connecting = computed(() =>
    connectionState.value === 'connecting'
    || connectionState.value === 'queryingStatus',
  )
  const connected = computed(() =>
    connectionState.value === 'connected'
    && !!currentConnection.value,
  )
  const disconnecting = computed(() => connectionState.value === 'disconnecting')

  /**
   * 清理扫描自动停止定时器。
   */
  function clearScanTimer() {
    if (!scanTimer) {
      return
    }

    clearTimeout(scanTimer)
    scanTimer = null
  }

  /**
   * 清理页面级错误提示。
   */
  function clearError() {
    errorMessage.value = ''
  }

  /**
   * 清理当前连接相关的所有本地运行态。
   *
   * 断开连接、连接失败、切换设备时都会回到这个干净状态。
   */
  function resetConnectionData() {
    currentConnection.value = null
    currentDevice.value = null
    currentIdentity.value = null
    currentStatus.value = null
    connectingDevice.value = null
    refreshingStatus.value = false
    resetWifiData()
    resetMonitorData()
  }

  /**
   * 清理 WiFi 配网相关状态。
   */
  function resetWifiData() {
    wifiNetworks.value = []
    savedWifiNetworks.value = []
    wifiScanning.value = false
    savedWifiLoading.value = false
    provisioning.value = false
  }

  /**
   * 清理实时监控状态和 notify 监听。
   */
  function resetMonitorData() {
    stopMonitorSnapshotListener?.()
    stopMonitorSnapshotListener = null
    monitorSession = null
    monitorSnapshot.value = null
    monitorSamples.value = []
    monitoring.value = false
    lastMonitorSampleAt = 0
  }

  /**
   * 获取当前连接上下文。
   *
   * 需要已连接设备的 action 都从这里取 connection，避免到处写空值判断。
   */
  function getCurrentConnection(): BleLocalConnection {
    const connection = currentConnection.value

    if (!connection) {
      throw new Error('当前没有已连接的蓝牙设备')
    }

    return connection
  }

  /**
   * 目前图表只关心生命体征曲线。
   *
   * 如果某次快照只有距离/坐标，不单独作为图表采样点。
   */
  function canRecordMonitorSample(snapshot: BleRadarMonitorSnapshot) {
    return snapshot.heartRate !== undefined || snapshot.breathRate !== undefined
  }

  /**
   * 保存最近的监控采样点。
   *
   * monitor.ts 已经把 a1/a2 的推送融合成 snapshot；
   * 这里不再关心底层通道，只按时间把融合快照保存进数组。
   *
   */
  function appendMonitorSample(snapshot: BleRadarMonitorSnapshot) {
    if (!canRecordMonitorSample(snapshot)) {
      return
    }

    const latestSample = monitorSamples.value[monitorSamples.value.length - 1]

    if (latestSample && snapshot.updatedAt - lastMonitorSampleAt < MIN_MONITOR_SAMPLE_INTERVAL) {
      monitorSamples.value = [
        ...monitorSamples.value.slice(0, -1),
        snapshot,
      ]
      return
    }

    lastMonitorSampleAt = snapshot.updatedAt
    monitorSamples.value = [
      ...monitorSamples.value,
      snapshot,
    ].slice(-MAX_MONITOR_SAMPLES)
  }

  /**
   * 处理 monitor.ts 推出来的融合快照。
   */
  function handleMonitorSnapshot(snapshot: BleRadarMonitorSnapshot) {
    monitorSnapshot.value = snapshot
    appendMonitorSample(snapshot)
  }

  /**
   * 开始扫描附近 BLE 设备。
   *
   * 扫描会自动在 SCAN_DURATION 后停止；页面也可以手动调用 stopScan。
   */
  async function startScan() {
    if (scanState.value === 'scanning' || scanState.value === 'stopping') {
      return
    }

    clearError()
    await stopScan()

    nearbyDevices.value = []
    scanState.value = 'scanning'

    try {
      const result = await scanNearbyDevices({
        allowDuplicatesKey: true,
        interval: 1000,
        onDeviceFound: (_device, devices) => {
          nearbyDevices.value = devices
        },
      })

      stopScanRunner = result.stop

      scanTimer = setTimeout(() => {
        void stopScan()
      }, SCAN_DURATION)
    }
    catch (error) {
      clearScanTimer()
      stopScanRunner = null
      scanState.value = 'error'
      errorMessage.value = '扫描蓝牙设备失败'
      throw error
    }
  }

  /**
   * 停止附近设备扫描。
   */
  async function stopScan() {
    clearScanTimer()

    if (!stopScanRunner) {
      if (scanState.value === 'scanning' || scanState.value === 'stopping') {
        scanState.value = 'stopped'
      }

      return
    }

    const runner = stopScanRunner
    stopScanRunner = null
    scanState.value = 'stopping'

    try {
      await runner()
      scanState.value = 'stopped'
    }
    catch (error) {
      scanState.value = 'error'
      errorMessage.value = '停止蓝牙扫描失败'
      throw error
    }
  }

  /**
   * 连接一个扫描到的设备。
   *
   * 流程：
   * 1. 停止扫描，避免浪费资源；
   * 2. 断开旧连接，第一版只允许单设备连接；
   * 3. 建立 BLE 连接；
   * 4. queryStatus 成功并拿到 dn 后，才进入 connected。
   */
  async function connectDevice(device: BleNearbyDevice) {
    clearError()

    let nextConnection: BleLocalConnection | null = null

    connectingDevice.value = device
    connectionState.value = 'connecting'

    try {
      await stopScan()
      await disconnectDevice()

      connectingDevice.value = device
      connectionState.value = 'connecting'

      nextConnection = await connectLocalDevice(device.deviceId, {
        profile: device.profile,
      })

      connectionState.value = 'queryingStatus'

      const statusResult = await queryDeviceStatus(nextConnection)
      assertQueryStatusSuccess(statusResult)

      currentConnection.value = nextConnection
      currentDevice.value = device
      currentIdentity.value = statusResult.identity || null
      currentStatus.value = statusResult.status
      connectingDevice.value = null
      connectionState.value = 'connected'

      return nextConnection
    }
    catch (error) {
      if (nextConnection) {
        try {
          await nextConnection.disconnect()
        }
        catch {
          // queryStatus 失败后断开失败，不覆盖真正的连接失败原因。
        }
      }

      resetConnectionData()
      connectionState.value = 'error'
      errorMessage.value = '连接蓝牙设备失败'
      throw error
    }
  }

  /**
   * 断开当前 BLE 设备。
   *
   * 即使停止实时监控失败，也继续断开蓝牙连接，因为断开是更高优先级的清理动作。
   */
  async function disconnectDevice() {
    clearError()

    try {
      await stopMonitor()
    }
    catch {
      // 断开蓝牙连接优先级更高，停止监控失败不阻塞断开流程。
      clearError()
    }

    const connection = currentConnection.value
    resetConnectionData()

    if (!connection) {
      connectionState.value = 'disconnected'
      return
    }

    connectionState.value = 'disconnecting'

    try {
      await connection.disconnect()
      connectionState.value = 'disconnected'
    }
    catch (error) {
      connectionState.value = 'disconnected'
      errorMessage.value = '断开蓝牙设备失败'
      throw error
    }
  }

  /**
   * 启动实时监控。
   *
   * application/monitor 会先查询一次雷达快照，再发送 START_CONTINUOUS。
   */
  async function startMonitor(): Promise<BleCommandResponse> {
    const connection = getCurrentConnection()

    clearError()
    await stopMonitor()

    monitorSnapshot.value = null
    monitorSamples.value = []
    lastMonitorSampleAt = 0

    const session = createRadarMonitorSession(connection)
    const offSnapshot = session.onSnapshot(handleMonitorSnapshot)

    monitorSession = session
    stopMonitorSnapshotListener = offSnapshot

    try {
      const response = await session.start({
        interval: MONITOR_INTERVAL,
      })
      assertCommandSuccess(response, '启动实时监控失败')

      monitoring.value = true

      return response
    }
    catch (error) {
      offSnapshot()

      try {
        await session.close()
      }
      catch {
        // 启动失败后的清理不覆盖真正的启动失败原因。
      }

      resetMonitorData()
      errorMessage.value = '启动实时监控失败'
      throw error
    }
  }

  /**
   * 停止实时监控并清理 notify 监听。
   */
  async function stopMonitor() {
    const session = monitorSession
    const offSnapshot = stopMonitorSnapshotListener

    monitorSession = null
    stopMonitorSnapshotListener = null
    monitoring.value = false
    offSnapshot?.()

    if (!session) {
      return
    }

    try {
      await session.close()
    }
    catch (error) {
      errorMessage.value = '停止实时监控失败'
      throw error
    }
  }

  /**
   * 刷新当前设备状态。
   *
   * 用于连接后校验、配网后刷新 WiFi/MQTT 状态，以及页面手动刷新。
   */
  async function refreshCurrentStatus() {
    const connection = getCurrentConnection()

    clearError()
    refreshingStatus.value = true

    try {
      const statusResult = await queryDeviceStatus(connection)
      assertQueryStatusSuccess(statusResult)

      currentIdentity.value = statusResult.identity || null
      currentStatus.value = statusResult.status

      return statusResult
    }
    catch (error) {
      errorMessage.value = '刷新设备状态失败'
      throw error
    }
    finally {
      refreshingStatus.value = false
    }
  }

  /**
   * 让设备扫描周围 WiFi。
   */
  async function scanWifi(): Promise<ScanWifiNetworksResult> {
    const connection = getCurrentConnection()

    clearError()
    wifiScanning.value = true

    try {
      const result = await scanWifiNetworks(connection)
      assertCommandSuccess(result, '扫描 WiFi 失败')

      wifiNetworks.value = result.networks

      return result
    }
    catch (error) {
      errorMessage.value = '扫描 WiFi 失败'
      throw error
    }
    finally {
      wifiScanning.value = false
    }
  }

  /**
   * 读取设备内部已保存的 WiFi 列表。
   */
  async function loadSavedWifiNetworks(): Promise<GetSavedWifiNetworksResult> {
    const connection = getCurrentConnection()

    clearError()
    savedWifiLoading.value = true

    try {
      const result = await getSavedWifiNetworks(connection)
      assertCommandSuccess(result, '读取已保存 WiFi 失败')

      savedWifiNetworks.value = result.networks

      return result
    }
    catch (error) {
      errorMessage.value = '读取已保存 WiFi 失败'
      throw error
    }
    finally {
      savedWifiLoading.value = false
    }
  }

  /**
   * 使用手动输入的 SSID/密码进行配网。
   *
   * 配网命令成功后会尝试刷新状态；刷新失败不改判配网失败。
   */
  async function configureWifiByInput(
    ssid: string,
    password: string,
  ): Promise<ConfigureWifiResult> {
    const connection = getCurrentConnection()
    const trimmedSsid = ssid.trim()

    if (!trimmedSsid) {
      throw new Error('WiFi 名称不能为空')
    }

    clearError()
    provisioning.value = true

    try {
      const result = await configureWifi(connection, {
        password,
        ssid: trimmedSsid,
      })
      assertCommandSuccess(result, 'WiFi 配网失败')

      try {
        await refreshCurrentStatus()
      }
      catch {
        // 配网命令已成功，刷新状态失败不应该把本次配网改判为失败。
        errorMessage.value = 'WiFi 配网已发送，刷新设备状态失败'
      }

      return result
    }
    catch (error) {
      errorMessage.value = 'WiFi 配网失败'
      throw error
    }
    finally {
      provisioning.value = false
    }
  }

  /**
   * 使用设备内部已保存的 WiFi 信息进行配网。
   */
  async function configureWifiBySavedNetwork(
    network: BleSavedWifiNetwork,
  ): Promise<ConfigureWifiResult> {
    return configureWifiByInput(network.ssid, network.password || '')
  }

  /**
   * 删除设备内部保存的一条 WiFi，并刷新本地 savedWifiNetworks。
   */
  async function deleteSavedWifi(
    network: BleSavedWifiNetwork,
  ): Promise<DeleteSavedWifiNetworkResult> {
    const connection = getCurrentConnection()

    clearError()

    try {
      const result = await deleteSavedWifiNetwork(connection, network.ssid)
      assertCommandSuccess(result, '删除已保存 WiFi 失败')

      await loadSavedWifiNetworks()

      return result
    }
    catch (error) {
      errorMessage.value = '删除已保存 WiFi 失败'
      throw error
    }
  }

  /*
   * 暴露给页面使用的状态和 action。
   *
   * 页面应该优先使用这里的 action，不直接碰 transport/application 层。
   */
  return {
    connected,
    connecting,
    connectingDevice,
    connectionState,
    currentConnection,
    currentDevice,
    currentIdentity,
    currentStatus,
    disconnecting,
    errorMessage,
    hasNearbyDevices,
    monitorSamples,
    monitoring,
    monitorSnapshot,
    nearbyDevices,
    provisioning,
    refreshingStatus,
    savedWifiLoading,
    savedWifiNetworks,
    scanning,
    scanState,
    wifiNetworks,
    wifiScanning,

    clearError,
    configureWifiByInput,
    configureWifiBySavedNetwork,
    connectDevice,
    deleteSavedWifi,
    disconnectDevice,
    loadSavedWifiNetworks,
    refreshCurrentStatus,
    scanWifi,
    startMonitor,
    startScan,
    stopMonitor,
    stopScan,
  }
})
