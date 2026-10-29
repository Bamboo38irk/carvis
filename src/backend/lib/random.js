const randomBytes = (size) => crypto.getRandomValues(new Uint8Array(size))

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

export function randomUUID() {
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = toHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const randomToken = (size = 24) => toHex(randomBytes(size))
