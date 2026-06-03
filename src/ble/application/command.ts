import type { BleResolvedChannels } from '../profiles'
import type { BleCommand, Tlv } from '../protocol'
import type { BleNotifyPayload } from '../transport'
import type { BleCommandResponse } from './types'
import {
  bytesToArrayBuffer,
  encodeFrame,
  encodeTlvs,
  findTlv,
  FrameAssembler,
  parseTlvs,
  readTlvU8,
  ResultCode,
  TlvType,
} from '../protocol'
import {
  onBleNotification,
  writeBleCharacteristic,
} from '../transport'

const DEFAULT_COMMAND_TIMEOUT = 8000
const BLE_WRITE_CHUNK_SIZE = 20

interface PendingCommand {
  sequence: number
  timer: ReturnType<typeof setTimeout>
  resolve: (response: BleCommandResponse) => void
  reject: (error: Error) => void
}

/**
 * BLE 命令会话参数。
 */
export interface BleCommandSessionOptions {
  /**
   * Profile 解析出来的通信通道。
   *
   * 命令会话只使用：
   * - channels.write 写入 b1
   * - channels.responseNotify 接收 b2 响应
   */
  channels: BleResolvedChannels
}

/**
 * 发送命令参数。
 */
export interface SendCommandOptions {
  /**
   * 命令超时时间，单位 ms。
   */
  timeout?: number
}

/**
 * BLE 命令会话。
 *
 * 这个会话只处理“写命令并等待响应”的链路。
 * a1/a2/b3 主动推送后续会单独处理，不放在这里。
 */
export interface BleCommandSession {
  /**
   * 发送一条命令并等待最终响应。
   *
   * tlvs 传入的是已经编码好的 TLV bytes，
   * 例如 tlvString(...)、tlvU16(...) 的返回值。
   */
  sendCommand: (
    cmd: BleCommand,
    tlvs?: Uint8Array[],
    options?: SendCommandOptions,
  ) => Promise<BleCommandResponse>

  /**
   * 关闭命令会话。
   *
   * 会取消 notify 监听，并拒绝所有仍在等待中的命令。
   */
  close: () => void
}

/**
 * 判断 notify 是否来自当前命令会话关心的响应通道。
 */
function isSameCharacteristic(
  payload: BleNotifyPayload,
  ref: NonNullable<BleResolvedChannels['responseNotify']>,
): boolean {
  return (
    payload.deviceId === ref.deviceId
    && payload.serviceId.toLowerCase() === ref.serviceId.toLowerCase()
    && payload.characteristicId.toLowerCase() === ref.characteristicId.toLowerCase()
  )
}

/**
 * 从响应 TLV 中读取结果码。
 */
function getResultCode(tlvs: Tlv[]): ResultCode | undefined {
  const resultTlv = findTlv(tlvs, TlvType.RESULT_CODE)
  const resultCode = readTlvU8(resultTlv)

  if (resultCode === undefined) {
    return undefined
  }

  return resultCode as ResultCode
}

/**
 * 判断结果码是否表示最终响应。
 *
 * PROCESSING 是中间状态，不能结束 pending。
 */
function isFinalResult(resultCode?: ResultCode): boolean {
  return resultCode !== ResultCode.PROCESSING
}

function createCommandTimeoutError(sequence: number, timeout: number): Error {
  return new Error(`BLE command timeout: seq=${sequence}, timeout=${timeout}ms`)
}

function createMissingResponseNotifyError(): Error {
  return new Error('BLE response notify channel is missing')
}

function createSessionClosedError(): Error {
  return new Error('BLE command session is closed')
}

/**
 * 按 20 字节小包写入命令帧。
 *
 * 当前硬件 notify 是 20 字节分包，写入侧也按 20 字节拆包更稳。
 */
async function writeFrameInChunks(
  write: BleResolvedChannels['write'],
  frameBytes: Uint8Array,
): Promise<void> {
  for (let offset = 0; offset < frameBytes.length; offset += BLE_WRITE_CHUNK_SIZE) {
    const chunk = frameBytes.slice(offset, offset + BLE_WRITE_CHUNK_SIZE)

    await writeBleCharacteristic({
      ...write,
      value: bytesToArrayBuffer(chunk),
    })
  }
}

/**
 * 创建 BLE 命令会话。
 *
 * 会话创建后会监听全局 BLE notify，
 * 但只处理 responseNotify 指向的 b2 响应通道。
 */
export function createBleCommandSession(
  options: BleCommandSessionOptions,
): BleCommandSession {
  const { channels } = options
  const responseNotify = channels.responseNotify

  if (!responseNotify) {
    throw createMissingResponseNotifyError()
  }

  let sequence = 0
  let closed = false
  const assembler = new FrameAssembler()
  const pendingCommands = new Map<number, PendingCommand>()

  function nextSequence(): number {
    sequence = (sequence + 1) & 0xFF

    if (sequence === 0) {
      sequence = 1
    }

    return sequence
  }

  function cleanupPending(currentSequence: number): void {
    const pending = pendingCommands.get(currentSequence)

    if (!pending) {
      return
    }

    clearTimeout(pending.timer)
    pendingCommands.delete(currentSequence)
  }

  function rejectAllPending(error: Error): void {
    pendingCommands.forEach((pending) => {
      clearTimeout(pending.timer)
      pending.reject(error)
    })
    pendingCommands.clear()
  }

  function handleResponseFrame(frame: ReturnType<FrameAssembler['push']>[number]): void {
    const pending = pendingCommands.get(frame.seq)

    if (!pending) {
      return
    }

    const tlvs = parseTlvs(frame.payload)
    const resultCode = getResultCode(tlvs)

    if (!isFinalResult(resultCode)) {
      return
    }

    cleanupPending(frame.seq)

    pending.resolve({
      frame,
      tlvs,
      resultCode,
    })
  }

  const offNotification = onBleNotification((payload) => {
    if (closed || !isSameCharacteristic(payload, responseNotify)) {
      return
    }

    const frames = assembler.push(new Uint8Array(payload.value))

    frames.forEach(handleResponseFrame)
  })

  async function sendCommand(
    cmd: BleCommand,
    tlvs: Uint8Array[] = [],
    sendOptions: SendCommandOptions = {},
  ): Promise<BleCommandResponse> {
    if (closed) {
      throw createSessionClosedError()
    }

    const timeout = sendOptions.timeout ?? DEFAULT_COMMAND_TIMEOUT
    const currentSequence = nextSequence()
    const payload = encodeTlvs(tlvs)
    const frameBytes = encodeFrame({
      cmd,
      seq: currentSequence,
      payload,
    })

    const responsePromise = new Promise<BleCommandResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanupPending(currentSequence)
        reject(createCommandTimeoutError(currentSequence, timeout))
      }, timeout)

      pendingCommands.set(currentSequence, {
        sequence: currentSequence,
        timer,
        resolve,
        reject,
      })
    })

    try {
      await writeFrameInChunks(channels.write, frameBytes)
    }
    catch (error) {
      cleanupPending(currentSequence)
      throw error
    }

    return responsePromise
  }

  function close(): void {
    if (closed) {
      return
    }

    closed = true
    offNotification()
    rejectAllPending(createSessionClosedError())
    assembler.reset()
  }

  return {
    sendCommand,
    close,
  }
}
