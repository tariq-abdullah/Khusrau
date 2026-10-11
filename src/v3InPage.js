import * as CFB from 'cfb'
import { V3_TEMPLATE_HEADER_BASE64, V3_TEMPLATE_TAIL_BASE64 } from './v3Template.js'

const UNITS_PER_MM = 5669.29133858

function base64ToUint8(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'))
  }
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function encodeUtf16Le(str) {
  const buf = new Uint8Array(str.length * 2)
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    buf[i * 2] = code & 0xFF
    buf[i * 2 + 1] = (code >> 8) & 0xFF
  }
  return buf
}

/**
 * Creates a valid InPage 3.x (Unicode) compound file with InPage300 and DocumentInfo streams.
 * @param {Array|string} content
 * @param {Object} options
 * @returns {Uint8Array}
 */
export function createV3InPageFile(content, options = {}) {
  const width = options.width || 210
  const height = options.height || 297
  const mLeft = options.marginLeft ?? 12.7
  const mRight = options.marginRight ?? 12.7
  const mTop = options.marginTop ?? 12.7
  const mBottom = options.marginBottom ?? 12.7
  const columns = options.columns || 1
  const gap = options.gap ?? 4.233

  const header = base64ToUint8(V3_TEMPLATE_HEADER_BASE64)
  const tail = base64ToUint8(V3_TEMPLATE_TAIL_BASE64)
  const headerView = new DataView(header.buffer, header.byteOffset, header.byteLength)

  // Update page dimensions and margins at byte 270 (record 0x06 0x01)
  headerView.setUint32(272, Math.round(width * UNITS_PER_MM), true)
  headerView.setUint32(278, Math.round(height * UNITS_PER_MM), true)
  headerView.setUint32(284, Math.round(mLeft * UNITS_PER_MM), true)
  headerView.setUint32(290, Math.round(mRight * UNITS_PER_MM), true)
  headerView.setUint32(296, Math.round(mTop * UNITS_PER_MM), true)
  headerView.setUint32(302, Math.round(mBottom * UNITS_PER_MM), true)

  // Update columns and gutter at byte 354 and 358
  headerView.setUint16(354, columns, true)
  headerView.setUint32(358, Math.round(gap * UNITS_PER_MM), true)

  // Extract paragraphs
  let paragraphs = []
  if (Array.isArray(content)) {
    paragraphs = content.map(p => typeof p === 'string' ? p : (p.text || ''))
  } else if (typeof content === 'string') {
    paragraphs = content.split(/\r?\n/).map(t => t.trim()).filter(Boolean)
  }

  const fullText = paragraphs.join('\r') + '\r'
  const textBytes = encodeUtf16Le(fullText)

  const stream = new Uint8Array(header.length + textBytes.length + tail.length)
  const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength)

  stream.set(header, 0)
  stream.set(textBytes, header.length)
  stream.set(tail, header.length + textBytes.length)

  const totalLength = stream.length
  // Directory entries at offset 16:
  // Entry 4 at offset 42 (offset in stream: totalLength - 52)
  streamView.setUint32(42, totalLength - 52, true)
  // Entry 5 at offset 48 (offset in stream: totalLength - 52)
  streamView.setUint32(48, totalLength - 52, true)
  // Entry 6 at offset 54 (totalLength)
  streamView.setUint32(54, totalLength, true)

  // Package into OLE compound file
  const cfb = CFB.utils.cfb_new()
  CFB.utils.cfb_add(cfb, 'InPage300', stream)
  CFB.utils.cfb_add(cfb, 'DocumentInfo', new Uint8Array(1316))

  const rawBytes = new Uint8Array(CFB.write(cfb, { type: 'array' }))

  // Clean CFB container: eliminate \u0001Sh33tJ5 from directory sector
  if (rawBytes.length >= 2048) {
    const dirView = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength)
    const entry2 = new Uint8Array(rawBytes.slice(1792, 1920))
    const entry2View = new DataView(entry2.buffer, entry2.byteOffset, entry2.byteLength)
    entry2View.setUint32(72, 2, true)
    rawBytes.set(entry2, 1664)

    const entry3 = new Uint8Array(rawBytes.slice(1920, 2048))
    rawBytes.set(entry3, 1792)
    rawBytes.fill(0, 1920, 2048)

    dirView.setUint32(1536 + 76, 1, true)
  }

  return rawBytes
}
