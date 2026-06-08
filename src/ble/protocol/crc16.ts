export function crc16Ccitt(bytes: Uint8Array): number {
  let crc = 0xFFFF

  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8

    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF
      }
      else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }

  return crc & 0xFFFF
}
