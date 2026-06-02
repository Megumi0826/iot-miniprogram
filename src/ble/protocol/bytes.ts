export function concatBytes(...chunks: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBuffer> {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)

  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

export function arrayBufferToBytes(buffer: ArrayBuffer): Uint8Array<ArrayBuffer> {
  return new Uint8Array(buffer)
}

export function bytesToArrayBuffer(bytes: Uint8Array<ArrayBufferLike>): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

export function readU16BE(bytes: Uint8Array, offset = 0): number {
  return (bytes[offset] << 8) | bytes[offset + 1]
}

export function readI16BE(bytes: Uint8Array, offset = 0): number {
  const value = readU16BE(bytes, offset)
  return value & 0x8000 ? value - 0x10000 : value
}

export function readU32BE(bytes: Uint8Array, offset = 0): number {
  return (
    (bytes[offset] * 0x1000000)
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]
  ) >>> 0
}

export function readU64BEString(bytes: Uint8Array, offset = 0): string {
  let result = '0'

  for (let i = 0; i < 8; i++) {
    result = multiplyDecimalStringBySmallNumber(result, 256)
    result = addSmallNumberToDecimalString(result, bytes[offset + i])
  }

  return result
}

export function writeU16BE(value: number): Uint8Array {
  return new Uint8Array([
    (value >> 8) & 0xFF,
    value & 0xFF,
  ])
}

export function writeU32BE(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 8) & 0xFF,
    value & 0xFF,
  ])
}

export function encodeUtf8(text: string): Uint8Array {
  const encoded = encodeURIComponent(text)
  const bytes: number[] = []

  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i]

    if (char === '%') {
      bytes.push(Number.parseInt(encoded.slice(i + 1, i + 3), 16))
      i += 2
    }
    else {
      bytes.push(char.charCodeAt(0))
    }
  }

  return new Uint8Array(bytes)
}

export function decodeUtf8(bytes: Uint8Array): string {
  let encoded = ''

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]

    if (byte < 0x80) {
      encoded += String.fromCharCode(byte)
    }
    else {
      encoded += `%${byte.toString(16).padStart(2, '0').toUpperCase()}`
    }
  }

  try {
    return decodeURIComponent(encoded)
  }
  catch {
    return Array.from(bytes)
      .map(byte => String.fromCharCode(byte))
      .join('')
  }
}

function multiplyDecimalStringBySmallNumber(decimal: string, multiplier: number): string {
  let carry = 0
  let result = ''

  for (let i = decimal.length - 1; i >= 0; i--) {
    const next = Number(decimal[i]) * multiplier + carry
    result = String(next % 10) + result
    carry = Math.floor(next / 10)
  }

  while (carry > 0) {
    result = String(carry % 10) + result
    carry = Math.floor(carry / 10)
  }

  return normalizeDecimalString(result)
}

function addSmallNumberToDecimalString(decimal: string, addend: number): string {
  let carry = addend
  let result = ''
  let index = decimal.length - 1

  while (index >= 0 || carry > 0) {
    const currentDigit = index >= 0 ? Number(decimal[index]) : 0
    const next = currentDigit + (carry % 10)

    result = String(next % 10) + result
    carry = Math.floor(carry / 10) + Math.floor(next / 10)
    index--
  }

  if (index >= 0) {
    result = decimal.slice(0, index + 1) + result
  }

  return normalizeDecimalString(result)
}

function normalizeDecimalString(decimal: string): string {
  return decimal.replace(/^0+(?=\d)/, '')
}
