import type { BleCharacteristicRef } from '../transport'
import type { BleLocalConnection } from './connection'
import type { BleCommandResponse } from './types'
import {
  BleCommand,
  findTlv,
  FrameAssembler,
  parseTlvs,
  readTlvI16,
  readTlvU8,
  readTlvU16,
  TlvType,
  tlvU16,
} from '../protocol'
import { onBleNotification } from '../transport'

const DEFAULT_MONITOR_INTERVAL = 1000
const DEFAULT_MONITOR_COMMAND_TIMEOUT = 8000

/**
 * 雷达实时监控快照。
 *
 * 这个数据只用于当前 BLE 连接下的近场展示，不做长期存储。
 */
export interface BleRadarMonitorSnapshot {
  /**
   * 心率，单位 bpm。
   */
  heartRate?: number

  /**
   * 呼吸率，单位 rpm。
   */
  breathRate?: number

  /**
   * 是否存在人体。
   */
  presence?: boolean

  /**
   * 运动状态。
   */
  motion?: number

  /**
   * 距离，单位 cm。
   */
  distanceCm?: number

  /**
   * X 坐标，单位 mm。
   */
  posXmm?: number

  /**
   * Y 坐标，单位 mm。
   */
  posYmm?: number

  /**
   * Z 坐标，单位 mm。
   */
  posZmm?: number

  /**
   * 体动值。
   */
  bodyMovement?: number

  /**
   * 快照更新时间。
   */
  updatedAt: number
}

/**
 * 启动监控参数。
 */
export interface StartRadarMonitorOptions {
  /**
   * 设备主动推送间隔，单位 ms。
   *
   * 真实硬件要求范围是 100-10000。
   */
  interval?: number

  /**
   * 命令超时时间，单位 ms。
   */
  timeout?: number
}

/**
 * 雷达快照查询结果。
 */
export interface QueryRadarSnapshotResult {
  /**
   * 原始命令响应。
   */
  response: BleCommandResponse

  /**
   * 解析后的快照。
   */
  snapshot: BleRadarMonitorSnapshot
}

/**
 * 雷达监控会话。
 */
export interface BleRadarMonitorSession {
  /**
   * 启动实时监控。
   */
  start: (options?: StartRadarMonitorOptions) => Promise<BleCommandResponse>

  /**
   * 停止实时监控。
   */
  stop: () => Promise<BleCommandResponse>

  /**
   * 关闭会话并清理监听。
   */
  close: () => Promise<void>

  /**
   * 监听快照更新。
   */
  onSnapshot: (callback: (snapshot: BleRadarMonitorSnapshot) => void) => () => void

  /**
   * 获取最近一次快照。
   */
  getSnapshot: () => BleRadarMonitorSnapshot | undefined
}

function getCharacteristicKey(ref: BleCharacteristicRef): string {
  return `${ref.deviceId}|${ref.serviceId.toLowerCase()}|${ref.characteristicId.toLowerCase()}`
}

function isMonitorEventCharacteristic(
  eventKeys: Set<string>,
  ref: BleCharacteristicRef,
): boolean {
  return eventKeys.has(getCharacteristicKey(ref))
}

function readOptionalU8(tlvs: ReturnType<typeof parseTlvs>, type: TlvType): number | undefined {
  return readTlvU8(findTlv(tlvs, type))
}

function readOptionalU16(tlvs: ReturnType<typeof parseTlvs>, type: TlvType): number | undefined {
  return readTlvU16(findTlv(tlvs, type))
}

function readOptionalI16(tlvs: ReturnType<typeof parseTlvs>, type: TlvType): number | undefined {
  return readTlvI16(findTlv(tlvs, type))
}

function applyIfDefined<T extends keyof BleRadarMonitorSnapshot>(
  snapshot: BleRadarMonitorSnapshot,
  key: T,
  value: BleRadarMonitorSnapshot[T] | undefined,
): void {
  if (value !== undefined) {
    snapshot[key] = value
  }
}

/**
 * 把雷达 TLV 合并进监控快照。
 *
 * a1 只会推心率/呼吸/存在/运动；
 * a2 只会推距离/坐标/体动；
 * CMD_QUERY_RADAR 响应会同时包含两类数据。
 */
export function mergeRadarTlvsIntoSnapshot(
  base: BleRadarMonitorSnapshot | undefined,
  tlvs: ReturnType<typeof parseTlvs>,
): BleRadarMonitorSnapshot {
  const next: BleRadarMonitorSnapshot = {
    ...base,
    updatedAt: Date.now(),
  }

  const heartRateX10 = readOptionalU16(tlvs, TlvType.HEART_RATE_X10)
  const breathRateX10 = readOptionalU16(tlvs, TlvType.BREATH_RATE_X10)
  const presence = readOptionalU8(tlvs, TlvType.PRESENCE)

  applyIfDefined(next, 'heartRate', heartRateX10 === undefined ? undefined : heartRateX10 / 10)
  applyIfDefined(next, 'breathRate', breathRateX10 === undefined ? undefined : breathRateX10 / 10)
  applyIfDefined(next, 'presence', presence === undefined ? undefined : presence > 0)
  applyIfDefined(next, 'motion', readOptionalU8(tlvs, TlvType.MOTION))
  applyIfDefined(next, 'distanceCm', readOptionalU16(tlvs, TlvType.DISTANCE_CM))
  applyIfDefined(next, 'posXmm', readOptionalI16(tlvs, TlvType.POS_X_MM))
  applyIfDefined(next, 'posYmm', readOptionalI16(tlvs, TlvType.POS_Y_MM))
  applyIfDefined(next, 'posZmm', readOptionalI16(tlvs, TlvType.POS_Z_MM))
  applyIfDefined(next, 'bodyMovement', readOptionalU8(tlvs, TlvType.BODY_MOVEMENT))

  return next
}

/**
 * 查询一次雷达快照。
 */
export async function queryRadarSnapshot(
  connection: BleLocalConnection,
  timeout = DEFAULT_MONITOR_COMMAND_TIMEOUT,
): Promise<QueryRadarSnapshotResult> {
  const response = await connection.commandSession.sendCommand(
    BleCommand.QUERY_RADAR,
    [],
    { timeout },
  )

  return {
    response,
    snapshot: mergeRadarTlvsIntoSnapshot(undefined, response.tlvs),
  }
}

/**
 * 创建雷达实时监控会话。
 */
export function createRadarMonitorSession(
  connection: BleLocalConnection,
): BleRadarMonitorSession {
  let closed = false
  let running = false
  let latestSnapshot: BleRadarMonitorSnapshot | undefined

  const snapshotCallbacks = new Set<(snapshot: BleRadarMonitorSnapshot) => void>()
  const eventKeys = new Set(connection.channels.eventNotifies.map(getCharacteristicKey))
  const assemblers = new Map<string, FrameAssembler>()

  function getAssembler(key: string): FrameAssembler {
    const existed = assemblers.get(key)

    if (existed) {
      return existed
    }

    const assembler = new FrameAssembler()
    assemblers.set(key, assembler)
    return assembler
  }

  function emitSnapshot(snapshot: BleRadarMonitorSnapshot): void {
    latestSnapshot = snapshot
    snapshotCallbacks.forEach(callback => callback(snapshot))
  }

  const offNotification = onBleNotification((payload) => {
    if (closed) {
      return
    }

    const ref: BleCharacteristicRef = {
      characteristicId: payload.characteristicId,
      deviceId: payload.deviceId,
      serviceId: payload.serviceId,
    }

    if (!isMonitorEventCharacteristic(eventKeys, ref)) {
      return
    }

    const key = getCharacteristicKey(ref)
    const frames = getAssembler(key).push(new Uint8Array(payload.value))

    frames.forEach((frame) => {
      latestSnapshot = mergeRadarTlvsIntoSnapshot(latestSnapshot, parseTlvs(frame.payload))
      emitSnapshot(latestSnapshot)
    })
  })

  async function start(options: StartRadarMonitorOptions = {}): Promise<BleCommandResponse> {
    if (closed) {
      throw new Error('BLE radar monitor session is closed')
    }

    const timeout = options.timeout ?? DEFAULT_MONITOR_COMMAND_TIMEOUT
    const snapshotResult = await queryRadarSnapshot(connection, timeout)
    emitSnapshot(snapshotResult.snapshot)

    const response = await connection.commandSession.sendCommand(
      BleCommand.START_CONTINUOUS,
      [tlvU16(TlvType.INTERVAL_MS, options.interval ?? DEFAULT_MONITOR_INTERVAL)],
      { timeout },
    )

    running = true
    return response
  }

  async function stop(): Promise<BleCommandResponse> {
    const response = await connection.commandSession.sendCommand(
      BleCommand.STOP_CONTINUOUS,
      [],
      { timeout: DEFAULT_MONITOR_COMMAND_TIMEOUT },
    )

    running = false
    return response
  }

  async function close(): Promise<void> {
    if (closed) {
      return
    }

    if (running) {
      try {
        await stop()
      }
      catch {
        // 关闭监控会话时，停止推送失败不阻断本地监听清理。
      }
    }

    closed = true
    offNotification()
    snapshotCallbacks.clear()
    assemblers.clear()
  }

  return {
    close,
    getSnapshot: () => latestSnapshot,
    onSnapshot: (callback) => {
      snapshotCallbacks.add(callback)

      return () => {
        snapshotCallbacks.delete(callback)
      }
    },
    start,
    stop,
  }
}
