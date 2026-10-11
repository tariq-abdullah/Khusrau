import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const icoPath = path.resolve(__dirname, '../public/favicon.ico')

const W = 32
const H = 32

// We will build a 32x32 32-bit RGBA image
const pixels = new Uint8Array(W * H * 4) // RGBA

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const idx = (y * W + x) * 4
  pixels[idx] = r
  pixels[idx + 1] = g
  pixels[idx + 2] = b
  pixels[idx + 3] = a
}

// Draw rounded rectangle background (Navy + Gold border)
const R = 6
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // Check corner rounding
    let insideCorner = true
    const cx = x < R ? R : (x >= W - R ? W - 1 - R : x)
    const cy = y < R ? R : (y >= H - R ? H - 1 - R : y)
    const distSq = (x - cx) ** 2 + (y - cy) ** 2
    if ((x < R || x >= W - R) && (y < R || y >= H - R)) {
      if (distSq > R ** 2) {
        insideCorner = false
      }
    }

    if (!insideCorner) {
      setPixel(x, y, 0, 0, 0, 0)
      continue
    }

    // Border check
    const isBorder = (x <= 1 || x >= W - 2 || y <= 1 || y >= H - 2 || distSq >= (R - 1.5) ** 2)
    if (isBorder) {
      // Polished Gold #d4af37
      setPixel(x, y, 0xd4, 0xaf, 0x37, 255)
    } else {
      // Deep Navy gradient from #0f2744 (top) to #081628 (bottom)
      const t = y / H
      const red = Math.round(15 * (1 - t) + 8 * t)
      const green = Math.round(39 * (1 - t) + 22 * t)
      const blue = Math.round(68 * (1 - t) + 40 * t)
      setPixel(x, y, red, green, blue, 255)
    }
  }
}

// Draw Urdu calligraphy stylized "خسرو" & "5.0" in gold and sapphire
// Stylized Urdu strokes in gold (#fce79a) in rows y=7 to y=18
const urduDots = [
  // Dot on top of Kha
  [15, 6], [16, 6],
  // Kha loop & crown
  [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8],
  [13, 9], [18, 9], [19, 9], [20, 9],
  [14, 10], [15, 10], [19, 10], [21, 10],
  // Seen teeth & connection
  [11, 11], [12, 11], [15, 11], [16, 11], [18, 11], [21, 11], [22, 11],
  [10, 12], [12, 12], [14, 12], [16, 12], [17, 12], [22, 12], [23, 12],
  [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [22, 13], [23, 13],
  // Re & Waw curves sweeping left
  [7, 14], [8, 14], [9, 14], [21, 14], [22, 14],
  [6, 15], [7, 15], [8, 15], [20, 15], [21, 15],
  [5, 16], [6, 16], [7, 16], [18, 16], [19, 16], [20, 16],
  [4, 17], [5, 17], [6, 17], [16, 17], [17, 17], [18, 17],
  [4, 18], [5, 18], [14, 18], [15, 18], [16, 18]
]

for (const [x, y] of urduDots) {
  setPixel(x, y, 0xfc, 0xe7, 0x9a, 255)
  // Glow pixel
  const idx = (y * W + x) * 4
}

// Draw "5.0" pill at bottom
// y = 21 to 26, x = 9 to 23
for (let y = 21; y <= 26; y++) {
  for (let x = 9; x <= 23; x++) {
    setPixel(x, y, 0x0c, 0x23, 0x40, 255)
  }
}
// Sapphire text 5 . 0 (#60a5fa)
const badgeText = [
  // '5'
  [11, 22], [12, 22], [13, 22],
  [11, 23],
  [11, 24], [12, 24], [13, 24],
  [13, 25],
  [11, 26], [12, 26],
  // '.'
  [16, 26],
  // '0'
  [19, 22], [20, 22], [21, 22],
  [19, 23], [21, 23],
  [19, 24], [21, 24],
  [19, 25], [21, 25],
  [19, 26], [20, 26], [21, 26]
]
for (const [x, y] of badgeText) {
  setPixel(x, y, 0x60, 0xa5, 0xfa, 255)
}

// Encode to ICO (standard Windows DIB ICO)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // Reserved
header.writeUInt16LE(1, 2) // Type 1 = ICO
header.writeUInt16LE(1, 4) // 1 image

const dibHeaderSize = 40
const imageBytes = W * H * 4
const maskBytes = (W / 8) * H // 32 / 8 * 32 = 128 bytes
const dataSize = dibHeaderSize + imageBytes + maskBytes

const dirEntry = Buffer.alloc(16)
dirEntry.writeUInt8(W, 0)
dirEntry.writeUInt8(H, 1)
dirEntry.writeUInt8(0, 2) // Color count
dirEntry.writeUInt8(0, 3) // Reserved
dirEntry.writeUInt16LE(1, 4) // Color planes
dirEntry.writeUInt16LE(32, 6) // Bits per pixel
dirEntry.writeUInt32LE(dataSize, 8)
dirEntry.writeUInt32LE(22, 12) // Offset = 6 + 16 = 22

const dibHeader = Buffer.alloc(40)
dibHeader.writeUInt32LE(40, 0) // biSize
dibHeader.writeInt32LE(W, 4) // biWidth
dibHeader.writeInt32LE(H * 2, 8) // biHeight (XOR + AND)
dibHeader.writeUInt16LE(1, 12) // biPlanes
dibHeader.writeUInt16LE(32, 14) // biBitCount
dibHeader.writeUInt32LE(0, 16) // biCompression (BI_RGB)
dibHeader.writeUInt32LE(imageBytes, 20) // biSizeImage
dibHeader.writeInt32LE(0, 24)
dibHeader.writeInt32LE(0, 28)
dibHeader.writeUInt32LE(0, 32)
dibHeader.writeUInt32LE(0, 36)

// Image data in DIB is bottom-to-top, BGRA format
const xorData = Buffer.alloc(imageBytes)
let offset = 0
for (let y = H - 1; y >= 0; y--) {
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 4
    const r = pixels[idx]
    const g = pixels[idx + 1]
    const b = pixels[idx + 2]
    const a = pixels[idx + 3]
    xorData.writeUInt8(b, offset)
    xorData.writeUInt8(g, offset + 1)
    xorData.writeUInt8(r, offset + 2)
    xorData.writeUInt8(a, offset + 3)
    offset += 4
  }
}

// AND mask: 1 bit per pixel, bottom-to-top, 1 = transparent, 0 = opaque
const andMask = Buffer.alloc(maskBytes)
let maskOffset = 0
for (let y = H - 1; y >= 0; y--) {
  let byteVal = 0
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 4
    const a = pixels[idx + 3]
    const bit = a < 128 ? 1 : 0
    byteVal = (byteVal << 1) | bit
    if ((x + 1) % 8 === 0) {
      andMask.writeUInt8(byteVal, maskOffset++)
      byteVal = 0
    }
  }
}

const icoBuffer = Buffer.concat([header, dirEntry, dibHeader, xorData, andMask])
fs.writeFileSync(icoPath, icoBuffer)
console.log('Successfully wrote', icoPath, icoBuffer.length, 'bytes')
