import { toCanvas } from 'html-to-image'
import { jsPDF } from 'jspdf'
import urduCatalog from './urdu-fonts-catalog.json' with { type: 'json' }

// Cache of resolved font data URLs: url -> data:font/...;base64,...
const fontDataUrlCache = new Map()

// Mapping of lowercased font family / variant names to local font filenames
const FONT_FILE_MAP = new Map()

// Populate FONT_FILE_MAP from urduCatalog
if (Array.isArray(urduCatalog)) {
  for (const item of urduCatalog) {
    if (item.family && item.defaultFile) {
      FONT_FILE_MAP.set(item.family.toLowerCase().trim(), item.defaultFile)
    }
    if (item.primaryFontFamily && item.defaultFile) {
      FONT_FILE_MAP.set(item.primaryFontFamily.toLowerCase().trim(), item.defaultFile)
    }
    if (item.displayName && item.defaultFile) {
      FONT_FILE_MAP.set(item.displayName.toLowerCase().trim(), item.defaultFile)
    }
    if (Array.isArray(item.variants)) {
      for (const v of item.variants) {
        if (v.fontFamily && v.file) {
          FONT_FILE_MAP.set(v.fontFamily.toLowerCase().trim(), v.file)
        }
        if (v.fullName && v.file) {
          FONT_FILE_MAP.set(v.fullName.toLowerCase().trim(), v.file)
        }
      }
    }
  }
}

// Default bundled fonts
FONT_FILE_MAP.set('jameel noori nastaleeq', 'Jameel Noori Nastaleeq.ttf')
FONT_FILE_MAP.set('noto nastaliq urdu', 'NotoNastaliqUrdu.ttf')

// InPage LAHOK fonts (001 to 048)
for (let i = 1; i <= 48; i++) {
  const pad = String(i).padStart(3, '0')
  FONT_FILE_MAP.set(`inpage lahok${pad}`, `inpage/Lahok${pad}.ttf`)
}

async function fetchFontAsDataUrl(url) {
  if (!url) return null
  if (fontDataUrlCache.has(url)) return fontDataUrlCache.get(url)

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    if (dataUrl) {
      fontDataUrlCache.set(url, dataUrl)
    }
    return dataUrl
  } catch {
    return null
  }
}

export function collectUsedFontFamilies(rootNode) {
  const families = new Set()

  if (typeof document !== 'undefined' && document.fonts) {
    try {
      for (const face of document.fonts) {
        if (face.family && face.status === 'loaded') {
          const clean = face.family.replace(/['"]/g, '').trim()
          if (clean) families.add(clean)
        }
      }
    } catch {}
  }

  function scan(el) {
    if (!el || el.nodeType !== 1) return
    try {
      const inlineFont = el.style?.fontFamily
      if (inlineFont) {
        inlineFont.split(',').forEach((f) => {
          const clean = f.replace(/['"]/g, '').trim()
          if (clean) families.add(clean)
        })
      }
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const cs = window.getComputedStyle(el)
        const computedFont = cs?.fontFamily
        if (computedFont) {
          computedFont.split(',').forEach((f) => {
            const clean = f.replace(/['"]/g, '').trim()
            if (clean) families.add(clean)
          })
        }
      }
    } catch {}
    for (let i = 0; i < el.children.length; i++) {
      scan(el.children[i])
    }
  }

  scan(rootNode)
  return families
}

export async function buildFontEmbedCSS(paper) {
  const usedFamilies = collectUsedFontFamilies(paper)
  const rules = []

  // Check Google Fonts stylesheets loaded in document.head
  if (typeof document !== 'undefined') {
    const googleLinks = Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]'))
    for (const link of googleLinks) {
      try {
        const cssRes = await fetch(link.href)
        if (cssRes.ok) {
          let css = await cssRes.text()
          const urlMatches = Array.from(css.matchAll(/url\((['"]?)(https:\/\/[^'"]+)\1\)/g))
          for (const match of urlMatches) {
            const fontUrl = match[2]
            const dataUrl = await fetchFontAsDataUrl(fontUrl)
            if (dataUrl) {
              css = css.replace(match[0], `url("${dataUrl}")`)
            }
          }
          rules.push(css)
        }
      } catch {}
    }
  }

  // Local fonts (Urdu fonts, InPage fonts, default fonts)
  for (const family of usedFamilies) {
    const lower = family.toLowerCase().trim()
    const file = FONT_FILE_MAP.get(lower)
    if (file) {
      const url = `/fonts/${file.startsWith('inpage/') ? file : encodeURIComponent(file)}`
      const dataUrl = await fetchFontAsDataUrl(url)
      if (dataUrl) {
        rules.push(`
@font-face {
  font-family: "${family}";
  src: url("${dataUrl}") format("truetype");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "${family}";
  src: url("${dataUrl}") format("truetype");
  font-weight: bold;
  font-style: normal;
}
@font-face {
  font-family: "${family}";
  src: url("${dataUrl}") format("truetype");
  font-weight: normal;
  font-style: italic;
}
@font-face {
  font-family: "${family}";
  src: url("${dataUrl}") format("truetype");
  font-weight: bold;
  font-style: italic;
}
        `.trim())
      }
    }
  }

  return rules.join('\n')
}

export async function capturePaper(paper, widthMM, heightMM, options = {}) {
  await document.fonts.ready
  const guides = paper.classList.contains('guides')
  const invisibles = paper.classList.contains('invisibles')
  paper.classList.remove('guides', 'invisibles')

  try {
    const fontEmbedCSS = await buildFontEmbedCSS(paper)

    const canvas = await toCanvas(paper, {
      pixelRatio: 2,
      backgroundColor: '#fff',
      width: Math.round((widthMM * 96) / 25.4),
      height: Math.round((heightMM * 96) / 25.4),
      style: {
        zoom: '1',
        border: 'none',
        outline: 'none',
        margin: '0',
        overflow: 'hidden'
      },
      fontEmbedCSS: fontEmbedCSS || undefined,
      filter: (node) => {
        if (!node || !node.classList) return true
        const cl = node.classList
        if (
          cl.contains('nonprinting') ||
          cl.contains('ruler-guide') ||
          cl.contains('margin-guide') ||
          cl.contains('resize-handle') ||
          cl.contains('overflow-indicator') ||
          cl.contains('lock-indicator') ||
          cl.contains('link-layer')
        ) {
          return false
        }
        if (options.selectedIds && options.selectedIds.length > 0) {
          if (cl.contains('tiptap') || cl.contains('text-boundary')) return false
          if (cl.contains('canvas-object')) {
            const objId = node.getAttribute('data-object-id')
            return options.selectedIds.includes(objId)
          }
        }
        return true
      }
    })

    if (options.mirror) {
      const ctx = canvas.getContext('2d')
      const copy = document.createElement('canvas')
      copy.width = canvas.width
      copy.height = canvas.height
      copy.getContext('2d').drawImage(canvas, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(copy, 0, 0)
    }

    return canvas
  } finally {
    if (guides) paper.classList.add('guides')
    if (invisibles) paper.classList.add('invisibles')
  }
}

export function makePDF(canvases, widthMM, heightMM, title) {
  const pdf = new jsPDF({ unit: 'mm', format: [widthMM, heightMM], compress: true })
  pdf.setProperties({ title, creator: 'inpage.net (raster page export)' })
  canvases.forEach((canvas, i) => {
    if (i) pdf.addPage([widthMM, heightMM])
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, widthMM, heightMM)
  })
  return pdf.output('arraybuffer')
}

// EPS describes one page. RGB pixels avoid platform fonts and preserve Urdu.
export function makeEPS(canvas, widthMM, heightMM) {
  const w = (widthMM * 72) / 25.4
  const h = (heightMM * 72) / 25.4
  const { width, height } = canvas
  const rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data
  const lines = []
  let line = ''
  for (let i = 0; i < rgba.length; i += 4) {
    for (let j = 0; j < 3; j++) line += rgba[i + j].toString(16).padStart(2, '0')
    if (line.length >= 120) {
      lines.push(line)
      line = ''
    }
  }
  if (line) lines.push(line)
  return `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 ${Math.ceil(w)} ${Math.ceil(h)}\n%%HiResBoundingBox: 0 0 ${w} ${h}\n%%Creator: inpage.net raster EPS\n%%Pages: 1\n%%EndComments\ngsave\n${w} ${h} scale\n/picstr ${width * 3} string def\n${width} ${height} 8 [${width} 0 0 -${height} 0 ${height}]\n{currentfile picstr readhexstring pop} false 3 colorimage\n${lines.join('\n')}\ngrestore\nshowpage\n%%EOF\n`
}
