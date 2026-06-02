import {
  concatBytes,
  decodeUtf8,
  encodeUtf8,
  readI16BE,
  readU16BE,
  readU32BE,
  readU64BEString,
  writeU16BE,
  writeU32BE,
} from './bytes'

export interface Tlv {
  type: number
  value: Uint8Array
}

export function makeTlv(type: number, value: Uint8Array): Uint8Array {
  return concatBytes(
    new Uint8Array([type]),
    writeU16BE(value.length),
    value,
  )
}

export function tlvU8(type: number, value: number): Uint8Array {
  return makeTlv(type, new Uint8Array([value & 0xFF]))
}

export function tlvI8(type: number, value: number): Uint8Array {
  return makeTlv(type, new Uint8Array([value & 0xFF]))
}

export function tlvU16(type: number, value: number): Uint8Array {
  return makeTlv(type, writeU16BE(value & 0xFFFF))
}

export function tlvI16(type: number, value: number): Uint8Array {
  return tlvU16(type, value)
}

export function tlvU32(type: number, value: number): Uint8Array {
  return makeTlv(type, writeU32BE(value >>> 0))
}

export function tlvString(type: number, value: string): Uint8Array {
  return makeTlv(type, encodeUtf8(value))
}

export function tlvBlock(type: number, value: Uint8Array): Uint8Array {
  return makeTlv(type, value)
}

export function encodeTlvs(items: Uint8Array[]): Uint8Array {
  return concatBytes(...items)
}

export function parseTlvs(payload: Uint8Array): Tlv[] {
  const tlvs: Tlv[] = []
  let offset = 0

  while (offset + 3 <= payload.length) {
    const type = payload[offset]
    const len = readU16BE(payload, offset + 1)
    const valueStart = offset + 3
    const valueEnd = valueStart + len

    if (valueEnd > payload.length) {
      break
    }

    tlvs.push({
      type,
      value: payload.slice(valueStart, valueEnd),
    })

    offset = valueEnd
  }

  return tlvs
}

export function findTlv(tlvs: Tlv[], type: number): Tlv | undefined {
  return tlvs.find(tlv => tlv.type === type)
}

export function findTlvs(tlvs: Tlv[], type: number): Tlv[] {
  return tlvs.filter(tlv => tlv.type === type)
}

export function readTlvU8(tlv?: Tlv): number | undefined {
  if (!tlv || tlv.value.length < 1)
    return undefined

  return tlv.value[0]
}

export function readTlvI8(tlv?: Tlv): number | undefined {
  if (!tlv || tlv.value.length < 1)
    return undefined

  const value = tlv.value[0]
  return value & 0x80 ? value - 0x100 : value
}

export function readTlvU16(tlv?: Tlv): number | undefined {
  if (!tlv || tlv.value.length < 2)
    return undefined

  return readU16BE(tlv.value)
}

export function readTlvI16(tlv?: Tlv): number | undefined {
  if (!tlv || tlv.value.length < 2)
    return undefined

  return readI16BE(tlv.value)
}

export function readTlvU32(tlv?: Tlv): number | undefined {
  if (!tlv || tlv.value.length < 4)
    return undefined

  return readU32BE(tlv.value)
}

export function readTlvU64String(tlv?: Tlv): string | undefined {
  if (!tlv || tlv.value.length < 8)
    return undefined

  return readU64BEString(tlv.value)
}

export function readTlvString(tlv?: Tlv): string | undefined {
  if (!tlv)
    return undefined

  return decodeUtf8(tlv.value)
}
