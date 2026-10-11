import * as CFB from 'cfb'
import { decodeV1V2, filterParagraphsWithMeta, filterParagraphs } from 'inpage-format'
import { encodeToV1V2 } from './native.js'
import { TEMPLATE_HEADER_BASE64, TEMPLATE_TAIL_BASE64 } from './olderTemplate.js'

// InPage unit conversions
// 1 inch = 144,000 internal units = 72 pt = 25.4 mm
// 1 mm ≈ 5669.29 internal units
// 1 pt ≈ 277.78 units in line height table
const UNITS_PER_MM = 5669.29133858
const UNITS_PER_PT_HEIGHT = 277.7777778

function base64ToUint8(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'))
  }
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Extracts page layout, line metrics, and styled paragraphs from an InPage 1.x/2.x stream.
 * @param {Uint8Array} stream
 */
export function parseOlderInPageStream(stream) {
  const data = stream instanceof Uint8Array ? stream : new Uint8Array(stream)
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)

  // 1. Margins & Dimensions (found around byte 270 in group 0x01)
  let width = 210, height = 297, mLeft = 12.7, mRight = 12.7, mTop = 12.7, mBottom = 12.7
  for (let i = 0; i < Math.min(800, data.length - 36); i++) {
    if (data[i] === 0x06 && data[i + 1] === 0x01 && data[i + 6] === 0x07 && data[i + 7] === 0x01) {
      const wVal = view.getUint32(i + 2, true)
      const hVal = view.getUint32(i + 8, true)
      const lVal = view.getUint32(i + 14, true)
      const rVal = view.getUint32(i + 20, true)
      const tVal = view.getUint32(i + 26, true)
      const bVal = view.getUint32(i + 32, true)

      if (wVal > 100000 && wVal < 3000000) width = Math.round(wVal / UNITS_PER_MM * 10) / 10
      if (hVal > 100000 && hVal < 4000000) height = Math.round(hVal / UNITS_PER_MM * 10) / 10
      if (lVal > 0 && lVal < 1000000) mLeft = Math.round(lVal / UNITS_PER_MM * 10) / 10
      if (rVal > 0 && rVal < 1000000) mRight = Math.round(rVal / UNITS_PER_MM * 10) / 10
      if (tVal > 0 && tVal < 1000000) mTop = Math.round(tVal / UNITS_PER_MM * 10) / 10
      if (bVal > 0 && bVal < 1000000) mBottom = Math.round(bVal / UNITS_PER_MM * 10) / 10
      break
    }
  }

  const paper = (Math.abs(width - 210) < 3 && Math.abs(height - 297) < 3) ? 'A4'
    : (Math.abs(width - 215.9) < 3 && Math.abs(height - 279.4) < 3) ? 'Letter'
    : (Math.abs(width - 215.9) < 3 && Math.abs(height - 355.6) < 3) ? 'Legal'
    : 'A4'

  // 2. Line records (0x85 0x7F)
  const lines = []
  for (let i = 0; i < data.length - 30; i++) {
    if (data[i] === 0x85 && data[i + 1] === 0x7f) {
      const alignCode = view.getUint16(i + 2, true)
      const lineLen = view.getUint16(i + 6, true)
      const h = view.getUint16(i + 26, true)
      if (lineLen > 1) { // Skip 1-byte dummy lines
        lines.push({
          offset: i,
          alignCode,
          lineLen,
          h,
          pt: Math.round(h / UNITS_PER_PT_HEIGHT)
        })
      }
    }
  }

  // 3. Decoded paragraphs
  const decoded = decodeV1V2(data)
  let paragraphs = []
  if (decoded.paragraphMeta?.length) {
    const { meta } = filterParagraphsWithMeta(decoded.paragraphs, decoded.paragraphMeta)
    paragraphs = meta.filter(m => !m.isPageBreak && (m.endOffset - m.startOffset) / m.text.length < 5).map(m => m.text)
  }
  if (!paragraphs.length) {
    paragraphs = filterParagraphs(decoded.paragraphs).map(p => p === '___PAGE_BREAK___' ? '' : p.trim()).filter(Boolean)
  }

  // 4. Map lines to paragraphs and determine per-paragraph formatting
  let lineIdx = 0
  const formattedParagraphs = paragraphs.map((p, pIdx) => {
    const pBytes = p.length * 2
    const pLines = []
    let accum = 0
    while (lineIdx < lines.length && accum < pBytes - 10) {
      const l = lines[lineIdx++]
      pLines.push(l)
      accum += l.lineLen
    }

    const maxPt = pLines.length ? Math.max(...pLines.map(l => l.pt)) : 12
    const avgPt = pLines.length ? Math.round(pLines.reduce((s, l) => s + l.pt, 0) / pLines.length) : 12

    let align = 'right'
    if (pLines.length === 1 && pLines[0].alignCode === 2) {
      align = 'center'
    } else if (pLines.some(l => l.alignCode === 3)) {
      align = 'justify'
    } else if (pLines.length > 0 && pLines.every(l => l.alignCode === 2)) {
      align = 'center'
    } else if (pLines.some(l => l.alignCode === 0)) {
      align = 'right'
    } else if (p.length < 80 && (pIdx === 0 || pIdx === 1)) {
      align = 'center'
    } else if (p.length > 120) {
      align = 'justify'
    }

    let isHeading = false
    let level = 1
    let bold = false
    let fontSize = 12

    if (align === 'center') {
      if (maxPt >= 20 || (pIdx === 0 && maxPt >= 16) || (pIdx === 0 && p.length < 90)) {
        isHeading = true
        level = 1
        bold = true
        fontSize = maxPt >= 20 ? maxPt : 24
      } else if (maxPt >= 13 || (pIdx === 1 && p.length < 150)) {
        isHeading = true
        level = 2
        bold = false
        fontSize = maxPt >= 13 ? maxPt : 14
      } else {
        fontSize = 12
      }
    } else if (align === 'justify') {
      fontSize = 12
    } else {
      fontSize = 12
    }

    return {
      text: p,
      align,
      isHeading,
      level,
      bold,
      fontSize,
      linesCount: pLines.length
    }
  })

  return {
    layout: {
      width,
      height,
      paper,
      marginLeft: mLeft,
      marginRight: mRight,
      marginTop: mTop,
      marginBottom: mBottom,
      columns: 1,
      gap: 4.233
    },
    paragraphs: formattedParagraphs,
    text: formattedParagraphs.map(p => p.text).join('\n')
  }
}

/**
 * Creates a valid, uncorrupted InPage 1.x compound document file (.inp)
 * containing the provided text and layout options.
 * @param {string|string[]|object[]} content
 * @param {object} [options]
 * @returns {Uint8Array}
 */
export function buildOlderInPageFile(content, options = {}) {
  let paragraphs = []
  if (Array.isArray(content)) {
    paragraphs = content.map((p, idx) => {
      if (typeof p === 'string') {
        const isH1 = idx === 0 && p.length < 90
        const isH2 = idx === 1 && p.length < 150
        return {
          text: p,
          align: (isH1 || isH2) ? 'center' : (p.length > 120 ? 'justify' : 'right'),
          isHeading: isH1 || isH2,
          level: isH1 ? 1 : 2
        }
      }
      return {
        text: p.text || '',
        align: p.align || (p.textAlign ?? (p.isHeading ? 'center' : 'justify')),
        isHeading: !!p.isHeading || p.type === 'heading',
        level: p.level || 1
      }
    }).filter(p => p.text.trim())
  } else if (typeof content === 'string') {
    paragraphs = content.split(/\r?\n/).map(t => t.trim()).filter(Boolean).map((t, idx) => {
      const isH1 = idx === 0 && t.length < 90
      const isH2 = idx === 1 && t.length < 150
      return {
        text: t,
        align: (isH1 || isH2) ? 'center' : (t.length > 120 ? 'justify' : 'right'),
        isHeading: isH1 || isH2,
        level: isH1 ? 1 : 2
      }
    })
  }

  const header = base64ToUint8(TEMPLATE_HEADER_BASE64)
  const tail = base64ToUint8(TEMPLATE_TAIL_BASE64)
  const headerView = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength)

  // Apply layout options to header if provided
  if (options.width || options.height || options.marginLeft || options.marginRight || options.marginTop || options.marginBottom) {
    const w = (options.width || 210) * UNITS_PER_MM
    const h = (options.height || 297) * UNITS_PER_MM
    const mL = (options.marginLeft ?? 12.7) * UNITS_PER_MM
    const mR = (options.marginRight ?? 12.7) * UNITS_PER_MM
    const mT = (options.marginTop ?? 12.7) * UNITS_PER_MM
    const mB = (options.marginBottom ?? 12.7) * UNITS_PER_MM

    for (let i = 0; i < Math.min(800, header.length - 36); i++) {
      if (header[i] === 0x06 && header[i + 1] === 0x01 && header[i + 6] === 0x07 && header[i + 7] === 0x01) {
        headerView.setUint32(i + 2, Math.round(w), true)
        headerView.setUint32(i + 8, Math.round(h), true)
        headerView.setUint32(i + 14, Math.round(mL), true)
        headerView.setUint32(i + 20, Math.round(mR), true)
        headerView.setUint32(i + 26, Math.round(mT), true)
        headerView.setUint32(i + 32, Math.round(mB), true)
        break
      }
    }
  }

  // Find line records (0x85 0x7F) in tail
  const lineSlots = []
  for (let i = 0; i < tail.length - 30; i++) {
    if (tail[i] === 0x85 && tail[i + 1] === 0x7f) {
      lineSlots.push(i)
    }
  }

  // Build story section and line plan
  const storyChunks = []
  let storyLength = 0

  // Story block header (01 00 00 00) and initial paragraph marker (0d 00 00 00 00 00)
  const storyHeader = new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00])
  storyChunks.push(storyHeader)
  storyLength += storyHeader.length

  const linePlan = []
  paragraphs.forEach((p, idx) => {
    const encoded = encodeToV1V2(p.text)
    const pChunk = new Uint8Array(4 + encoded.length)
    const pView = new DataView(pChunk.buffer, pChunk.byteOffset, pChunk.byteLength)
    pView.setUint32(0, encoded.length, true)
    pChunk.set(encoded, 4)
    storyChunks.push(pChunk)
    storyLength += pChunk.length

    // Delimiter between paragraphs
    if (idx < paragraphs.length - 1) {
      const delim = new Uint8Array([0x0D])
      storyChunks.push(delim)
      storyLength += delim.length
    }

    // Plan line records
    const alignCode = p.align === 'center' ? 2 : (p.align === 'justify' ? 3 : 0)
    const h = p.isHeading ? (p.level === 1 ? 6708 : 3872) : 4000
    if (encoded.length <= 340) {
      linePlan.push({ alignCode, lineLen: encoded.length, h })
    } else {
      let rem = encoded.length
      while (rem > 0) {
        const take = Math.min(rem, 320)
        linePlan.push({ alignCode, lineLen: take, h })
        rem -= take
      }
    }
  })

  // End of story marker: 0D 00 00 00 00 00 FF FF FF FF
  const endMarker = new Uint8Array([0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF])
  storyChunks.push(endMarker)
  storyLength += endMarker.length

  // Configure line records in tail
  for (let i = 0; i < lineSlots.length; i++) {
    const off = lineSlots[i]
    if (i < linePlan.length) {
      const l = linePlan[i]
      tailView.setUint16(off + 2, l.alignCode, true)
      tailView.setUint16(off + 6, l.lineLen, true)
      tailView.setUint16(off + 26, l.h, true)
    } else {
      // Dummy / inactive line
      tailView.setUint16(off + 2, 0, true)
      tailView.setUint16(off + 6, 1, true)
      tailView.setUint16(off + 26, 1, true)
    }
  }

  const totalLength = header.length + storyLength + tail.length
  const stream = new Uint8Array(totalLength)
  const streamView = new DataView(stream.buffer, stream.byteOffset, stream.byteLength)

  // Copy header
  stream.set(header, 0)
  let offset = header.length

  // Copy story
  for (const chunk of storyChunks) {
    stream.set(chunk, offset)
    offset += chunk.length
  }

  // Copy tail
  stream.set(tail, offset)

  // Section directory entries at 0x10:
  // Entry 4 (footer start) at offset 40 (val at 42)
  streamView.setUint32(42, totalLength - 52, true)
  // Entry 5 at offset 46 (val at 48)
  streamView.setUint32(48, totalLength - 52, true)
  // Entry 6 (end of stream) at offset 52 (val at 54)
  streamView.setUint32(54, totalLength, true)

  // Package into OLE compound file
  const cfb = CFB.utils.cfb_new()
  CFB.utils.cfb_add(cfb, 'InPage100', stream)
  CFB.utils.cfb_add(cfb, 'DocumentInfo', new Uint8Array(1316))

  const rawBytes = new Uint8Array(CFB.write(cfb, { type: 'array' }))

  // Clean CFB container: eliminate \u0001Sh33tJ5 from directory sector (sector 2 = byte 1536)
  if (rawBytes.length >= 2048) {
    const dirView = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength)
    // Move Entry 2 (InPage100, 1792..1919) to Entry 1 (1664..1791)
    const entry2 = new Uint8Array(rawBytes.slice(1792, 1920))
    const entry2View = new DataView(entry2.buffer, entry2.byteOffset, entry2.byteLength)
    entry2View.setUint32(72, 2, true) // right child is Entry 2 (DocumentInfo)
    rawBytes.set(entry2, 1664)

    // Move Entry 3 (DocumentInfo, 1920..2047) to Entry 2 (1792..1919)
    const entry3 = new Uint8Array(rawBytes.slice(1920, 2048))
    rawBytes.set(entry3, 1792)

    // Zero out Entry 3 (1920..2047)
    rawBytes.fill(0, 1920, 2048)

    // Set Root Entry (1536) child pointer to 1
    dirView.setUint32(1536 + 76, 1, true)
  }

  return rawBytes
}

