import { concatBytes, readU16BE, writeU16BE } from './bytes'
import { PROTOCOL_VERSION, SOF1, SOF2 } from './constants'
import { crc16Ccitt } from './crc16'

export interface BleFrame {
  version: number
  cmd: number
  seq: number
  payload: Uint8Array
}

export function encodeFrame(frame: Omit<BleFrame, 'version'> & { version?: number }): Uint8Array {
  const version = frame.version ?? PROTOCOL_VERSION

  const header = new Uint8Array([
    SOF1,
    SOF2,
    version,
    frame.cmd & 0xFF,
    frame.seq & 0xFF,
  ])

  const body = concatBytes(
    header,
    writeU16BE(frame.payload.length),
    frame.payload,
  )

  const crc = crc16Ccitt(body.slice(2))

  return concatBytes(
    body,
    writeU16BE(crc),
  )
}

export class FrameAssembler {
  private buffer = new Uint8Array(0)

  reset(): void {
    this.buffer = new Uint8Array(0)
  }

  push(chunk: Uint8Array): BleFrame[] {
    this.buffer = concatBytes(this.buffer, chunk)

    const frames: BleFrame[] = []

    while (this.buffer.length >= 2) {
      const sofIndex = this.findSofIndex()

      if (sofIndex < 0) {
        this.buffer = this.buffer.slice(Math.max(0, this.buffer.length - 1))
        break
      }

      if (sofIndex > 0) {
        this.buffer = this.buffer.slice(sofIndex)
      }

      if (this.buffer.length < 9) {
        break
      }

      const payloadLength = readU16BE(this.buffer, 5)
      const fullLength = 2 + 1 + 1 + 1 + 2 + payloadLength + 2

      if (this.buffer.length < fullLength) {
        break
      }

      const rawFrame = this.buffer.slice(0, fullLength)
      const expectedCrc = readU16BE(rawFrame, fullLength - 2)
      const actualCrc = crc16Ccitt(rawFrame.slice(2, fullLength - 2))

      if (expectedCrc !== actualCrc) {
        this.buffer = this.buffer.slice(1)
        continue
      }

      frames.push({
        version: rawFrame[2],
        cmd: rawFrame[3],
        seq: rawFrame[4],
        payload: rawFrame.slice(7, 7 + payloadLength),
      })

      this.buffer = this.buffer.slice(fullLength)
    }

    return frames
  }

  private findSofIndex(): number {
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i] === SOF1 && this.buffer[i + 1] === SOF2) {
        return i
      }
    }

    return -1
  }
}
