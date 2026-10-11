const mm = 96 / 25.4

export function splitLongParagraph(p, maxChars) {
  const text = p.text || ''
  if (text.length <= maxChars) return [p]
  const res = []
  let rem = text
  while (rem.length > maxChars) {
    const sub = rem.slice(0, maxChars)
    let idx = Math.max(sub.lastIndexOf('۔'), sub.lastIndexOf('.'), sub.lastIndexOf('\n'))
    if (idx > maxChars * 0.4) {
      idx += 1
    } else {
      const space = sub.lastIndexOf(' ')
      idx = space > maxChars * 0.5 ? space + 1 : maxChars
    }
    res.push({ ...p, text: rem.slice(0, idx).trim() })
    rem = rem.slice(idx).trim()
  }
  if (rem) res.push({ ...p, text: rem })
  return res
}

export function estimateParagraphHeightMm(p, usableWidthMm) {
  const text = p.text?.trim() || ''
  if (!text) return 4
  const charsPerLine = Math.max(30, Math.floor(usableWidthMm * 0.55))
  const isH1 = p.isHeading && (p.level === 1 || !p.level)
  const isH2 = p.isHeading && p.level === 2
  const lineH = isH1 ? 16 : isH2 ? 12 : 8.5
  const lines = Math.max(1, Math.ceil(text.length / (isH1 ? charsPerLine * 0.5 : isH2 ? charsPerLine * 0.75 : charsPerLine)))
  return lines * lineH + (isH1 ? 6 : 4)
}

export function toTiptapNode(p) {
  if (!p.text?.trim()) return { type: 'paragraph' }
  if (p.isHeading) {
    return {
      type: 'heading',
      attrs: {
        level: p.level || 1,
        textAlign: p.align || 'center'
      },
      content: [
        {
          type: 'text',
          text: p.text,
          marks: (p.bold || p.level === 1) ? [{ type: 'bold' }] : []
        }
      ]
    }
  }
  return {
    type: 'paragraph',
    attrs: {
      textAlign: p.align || 'justify'
    },
    content: [
      {
        type: 'text',
        text: p.text
      }
    ]
  }
}

export function paginateParagraphs(paragraphs, layout = {}, pictureObjects = []) {
  if (!paragraphs || !paragraphs.length) {
    return [{ id: 'page-1', content: { type: 'doc', content: [{ type: 'paragraph' }] } }]
  }

  // Normalize incoming paragraphs to { text, isHeading, level, align, bold }
  const rawList = paragraphs.map(item => {
    if (typeof item === 'string') {
      return { text: item, isHeading: false }
    }
    if (item.type === 'heading' || item.type === 'paragraph') {
      const text = item.content?.map(c => c.text || '').join('') || ''
      return {
        text,
        isHeading: item.type === 'heading',
        level: item.attrs?.level || 1,
        align: item.attrs?.textAlign || (item.type === 'heading' ? 'center' : 'justify'),
        bold: item.content?.some(c => c.marks?.some(m => m.type === 'bold'))
      }
    }
    return item
  })

  let cleanList = [...rawList]
  while (cleanList.length && !cleanList[0]?.text?.trim()) cleanList.shift()
  while (cleanList.length && !cleanList[cleanList.length - 1]?.text?.trim()) cleanList.pop()
  if (!cleanList.length) {
    return [{ id: 'page-1', content: { type: 'doc', content: [{ type: 'paragraph' }] } }]
  }

  const paperW = layout.width || layout.paperWidth || 210
  const paperH = layout.height || layout.paperHeight || 297
  const mLeft = layout.marginLeft ?? layout.margin ?? 12.7
  const mRight = layout.marginRight ?? layout.margin ?? 12.7
  const mTop = layout.marginTop ?? layout.margin ?? 12.7
  const mBottom = layout.marginBottom ?? layout.margin ?? 12.7
  const usableW = Math.max(30, paperW - mLeft - mRight)
  const usableH = Math.max(40, paperH - mTop - mBottom)
  const charsPerLine = Math.max(30, Math.floor(usableW * 0.55))
  const maxParaChars = Math.floor(charsPerLine * 14)

  // Expand long paragraphs
  const expanded = []
  for (const p of cleanList) {
    if (!p.text?.trim()) {
      expanded.push(p)
      continue
    }
    expanded.push(...splitLongParagraph(p, maxParaChars))
  }

  // Check if page 1 has top picture header
  let page1Reserve = 0
  if (pictureObjects?.length) {
    const topPic = pictureObjects.find(pic => pic.page === 1 && pic.y <= (mTop + 40) && pic.w >= (usableW * 0.35))
    if (topPic) {
      page1Reserve = Math.max(15, Math.min(60, topPic.h))
    }
  }

  const pages = []
  let curNodes = []
  let curH = 0
  let pageLimit = Math.max(20, usableH - page1Reserve)

  for (const p of expanded) {
    const h = estimateParagraphHeightMm(p, usableW)
    if (curH + h > pageLimit && curNodes.length > 0) {
      pages.push({
        id: 'page-' + (pages.length + 1),
        content: {
          type: 'doc',
          content: curNodes.map(toTiptapNode)
        }
      })
      curNodes = [p]
      curH = h
      pageLimit = usableH
    } else {
      curNodes.push(p)
      curH += h
    }
  }

  if (curNodes.length) {
    pages.push({
      id: 'page-' + (pages.length + 1),
      content: {
        type: 'doc',
        content: curNodes.map(toTiptapNode)
      }
    })
  }

  return pages.length ? pages : [{ id: 'page-1', content: { type: 'doc', content: [{ type: 'paragraph' }] } }]
}
