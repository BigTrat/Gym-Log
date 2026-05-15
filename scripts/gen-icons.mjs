import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function makePNG(size, drawPixel) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = drawPixel(x, y, size)
      const off = y * stride + 1 + x * 4
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }
  const idat = deflateSync(raw, { level: 9 })
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function hexToRGB(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const BG = hexToRGB('#0b0e15')
const BAR = hexToRGB('#38bdf8')
const ACCENT_LIGHT = hexToRGB('#7dd3fc')

function inRoundedRect(x, y, size, padding, radius) {
  const x1 = padding, y1 = padding
  const x2 = size - padding, y2 = size - padding
  if (x < x1 || x > x2 || y < y1 || y > y2) return false
  const dx = Math.max(x1 + radius - x, x - (x2 - radius), 0)
  const dy = Math.max(y1 + radius - y, y - (y2 - radius), 0)
  return dx * dx + dy * dy <= radius * radius
}

function drawIcon(x, y, size) {
  const pad = Math.floor(size * 0.0)
  const r = Math.floor(size * 0.22)
  if (!inRoundedRect(x, y, size, pad, r)) return [0, 0, 0, 0]

  const u = size / 32
  const cx = size / 2

  const barW = 3.2 * u
  const plateW = 2.2 * u
  const barH = 12 * u
  const plateH = 6 * u
  const handleH = 1.6 * u
  const handleW = 14 * u

  const cyBar = size / 2
  const topBar = cyBar - barH / 2
  const botBar = cyBar + barH / 2
  const topPlate = cyBar - plateH / 2
  const botPlate = cyBar + plateH / 2

  const leftBarCenter = cx - 7 * u
  const rightBarCenter = cx + 7 * u
  const leftPlateCenter = cx - 11 * u
  const rightPlateCenter = cx + 11 * u

  const inBar = (cxBar) => x >= cxBar - barW / 2 && x <= cxBar + barW / 2 && y >= topBar && y <= botBar
  const inPlate = (cxP) => x >= cxP - plateW / 2 && x <= cxP + plateW / 2 && y >= topPlate && y <= botPlate
  const inHandle = x >= cx - handleW / 2 && x <= cx + handleW / 2 && y >= cyBar - handleH / 2 && y <= cyBar + handleH / 2

  const isBar = inBar(leftBarCenter) || inBar(rightBarCenter)
  const isPlate = inPlate(leftPlateCenter) || inPlate(rightPlateCenter)

  if (isPlate) return [...ACCENT_LIGHT, 255]
  if (isBar) return [...BAR, 255]
  if (inHandle) return [...BAR, 255]

  return [...BG, 255]
}

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
]

for (const { name, size } of sizes) {
  const buf = makePNG(size, (x, y) => drawIcon(x, y, size))
  writeFileSync(resolve(outDir, name), buf)
  console.log(`wrote ${name} (${buf.length} bytes)`)
}
