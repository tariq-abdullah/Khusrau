export function toRoman(num) {
  if (num <= 0) return String(num);
  const roman = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let res = '';
  let n = num;
  for (const [val, letter] of roman) {
    while (n >= val) {
      res += letter;
      n -= val;
    }
  }
  return res;
}

export function toAlpha(num) {
  if (num <= 0) return String(num);
  let s = '';
  let n = num;
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function formatPageNumber(num, style = '1 2 3') {
  const n = Math.max(1, Number(num) || 1);
  if (style === 'I II III') return toRoman(n).toUpperCase();
  if (style === 'i ii iii') return toRoman(n).toLowerCase();
  if (style === 'A B C') return toAlpha(n).toUpperCase();
  if (style === 'a b c') return toAlpha(n).toLowerCase();
  return String(n);
}

export function resolveMasterText(text, pageNum, style = '1 2 3') {
  if (!text) return '';
  const formatted = formatPageNumber(pageNum, style);
  return String(text).replace(/#/g, formatted);
}

export function isObjectOnPage(o, {
  currentPageId,
  pageIndex = 0,
  isFacing = false,
  isMaster = false,
  masterSide = 'right'
} = {}) {
  if (isMaster) {
    if (!o.master) return false;
    if (!isFacing) return true;
    return o.masterSide === masterSide || o.masterSide === 'both' || !o.masterSide;
  }
  if (o.page && o.page === currentPageId) return true;
  if (o.master) {
    if (!isFacing) return true;
    const isOdd = (pageIndex % 2 === 0); // 0-based index: pageIndex 0 is page 1 (Right)
    if (isOdd) {
      return o.masterSide === 'right' || o.masterSide === 'both' || !o.masterSide;
    } else {
      return o.masterSide === 'left' || o.masterSide === 'both' || !o.masterSide;
    }
  }
  return false;
}

export function isGuideOnPage(g, {
  currentPageId,
  pageIndex = 0,
  isFacing = false,
  isMaster = false,
  masterSide = 'right'
} = {}) {
  if (isMaster) {
    if (!g.master) return false;
    if (!isFacing) return true;
    return g.side === masterSide || g.side === 'both' || !g.side;
  }
  if (g.page && g.page === currentPageId) return true;
  if (g.master) {
    if (!isFacing) return true;
    const isOdd = (pageIndex % 2 === 0);
    if (isOdd) {
      return g.side === 'right' || g.side === 'both' || !g.side;
    } else {
      return g.side === 'left' || g.side === 'both' || !g.side;
    }
  }
  return false;
}

export const MM_TO_PX = 96 / 25.4;

export function computeDefaultGrid(pageWidthMm, pageHeightMm, settings = {}, baseStyle = {}, format = {}) {
  const mLeft = Number(settings.marginLeft ?? settings.margin ?? 12.7);
  const mRight = Number(settings.marginRight ?? settings.margin ?? 12.7);
  const mTop = Number(settings.marginTop ?? settings.margin ?? 12.7);
  const mBottom = Number(settings.marginBottom ?? settings.margin ?? 12.7);
  const wMm = Math.max(10, pageWidthMm - mLeft - mRight);
  const hMm = Math.max(10, pageHeightMm - mTop - mBottom);
  const cols = Math.max(1, Math.min(12, Number(settings.columns) || 1));
  const gapMm = Math.max(0, Number(settings.gap) || 4.233);

  return {
    id: 'default-grid',
    type: 'text',
    isDefaultGrid: true,
    master: true,
    x: mLeft * MM_TO_PX,
    y: mTop * MM_TO_PX,
    w: wMm * MM_TO_PX,
    h: hMm * MM_TO_PX,
    columns: cols,
    columnGap: gapMm * MM_TO_PX,
    strokeWidth: Number(settings.borderWidth) || 0,
    stroke: settings.borderColor || '#000000',
    fill: settings.fill || 'none',
    pattern: settings.pattern || 'none',
    rotation: 0,
    locked: !!settings.lockGuides,
    direction: format.direction || 'rtl',
    font: baseStyle.font || 'Jameel Noori Nastaleeq',
    fontSize: baseStyle.size || 12,
    color: baseStyle.color || '#000000',
    align: format.align || (format.direction === 'ltr' ? 'left' : 'right'),
    inset: 0,
    wrap: 'none'
  };
}

export function computeColumnGuides(gridWidthPx, columns, gapPx) {
  if (columns <= 1) return [];
  const totalGutter = (columns - 1) * gapPx;
  const colWidth = Math.max(10, (gridWidthPx - totalGutter) / columns);
  const guides = [];
  for (let i = 1; i < columns; i++) {
    const gutterLeft = i * colWidth + (i - 1) * gapPx;
    const gutterRight = gutterLeft + gapPx;
    guides.push({ index: i, left: gutterLeft, right: gutterRight, width: gapPx });
  }
  return guides;
}

export function resizeBox(initialBox, handle, dx, dy, minW = 20, minH = 20) {
  let newW = initialBox.w;
  let newH = initialBox.h;
  let newX = initialBox.x;
  let newY = initialBox.y;

  if (handle.includes('w')) {
    newW = Math.max(minW, initialBox.w - dx);
    newX = initialBox.x + (initialBox.w - newW);
  }
  if (handle.includes('e')) {
    newW = Math.max(minW, initialBox.w + dx);
  }
  if (handle.includes('n')) {
    newH = Math.max(minH, initialBox.h - dy);
    newY = initialBox.y + (initialBox.h - newH);
  }
  if (handle.includes('s')) {
    newH = Math.max(minH, initialBox.h + dy);
  }

  return { x: newX, y: newY, w: newW, h: newH };
}

