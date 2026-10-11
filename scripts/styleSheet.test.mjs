import test from 'node:test'
import assert from 'node:assert/strict'

const DEFAULT_NORMAL = {
  name: 'Normal',
  base: 'None',
  keyEquivalent: '',
  alignment: 'right',
  beginningIndent: 0,
  endIndent: 0,
  firstLineIndent: 0,
  lineHeight: 'Auto',
  interlineGap: 0,
  defaultStop: 12.7,
  breakType: 'None',
  keepTogether: false,
  keepWithNext: false,
  widows: 1,
  orphans: 1,
  spaceBefore: 0,
  spaceAfter: 0,
  charAlignment: 'Arabic',
  addToToc: false,
  size: 12,
  style: 'None',
  color: '#000000',
  hatch: 'None',
  latinFont: 'Arial',
  urduFont: 'Noori Nastaliq',
  language: 'Urdu',
  bold: false,
  italics: false,
  outline: false,
  kashida: 'K-None',
  spacing: 0,
  scaling: 100,
  baselineShift: 0,
  ligatures: { meem: false, re: false, jeem: false, ain: false, kaaf: false },
  borderAbove: 'None',
  borderAboveStyle: 'Solid',
  borderBelow: 'None',
  borderBelowStyle: 'Solid',
  hyphenation: 'Light',
  maxConsecutiveHyphens: 3,
  tabs: []
}

function createStyleSheetManager(initialStyles = []) {
  const styles = initialStyles.length ? [...initialStyles] : [{ ...DEFAULT_NORMAL }]
  let activeStyle = styles[0].name

  function addStyle(newStyle) {
    if (styles.some(s => s.name === newStyle.name)) {
      throw new Error(`Style ${newStyle.name} already exists`)
    }
    styles.push({ ...DEFAULT_NORMAL, ...newStyle })
  }

  function modifyStyle(name, updates) {
    const s = styles.find(item => item.name === name)
    if (!s) throw new Error(`Style ${name} not found`)
    Object.assign(s, updates)
  }

  function removeStyle(name) {
    if (name === 'Normal') return false // protected
    const idx = styles.findIndex(item => item.name === name)
    if (idx >= 0) {
      styles.splice(idx, 1)
      if (activeStyle === name) activeStyle = 'Normal'
      return true
    }
    return false
  }

  function findByKeyEquivalent(key) {
    if (!key) return null
    return styles.find(s => s.keyEquivalent && s.keyEquivalent.toLowerCase() === key.toLowerCase()) || null
  }

  return {
    get styles() { return styles },
    get activeStyle() { return activeStyle },
    setActiveStyle(n) { activeStyle = n },
    addStyle,
    modifyStyle,
    removeStyle,
    findByKeyEquivalent
  }
}

test('style sheet manager maintains Normal and allows creating new styles', () => {
  const mgr = createStyleSheetManager()
  assert.equal(mgr.styles.length, 1)
  assert.equal(mgr.styles[0].name, 'Normal')

  // Cannot delete Normal
  assert.equal(mgr.removeStyle('Normal'), false)
  assert.equal(mgr.styles.length, 1)

  // Add new style 'test' like in user screenshot
  mgr.addStyle({
    name: 'test',
    base: 'Normal',
    keyEquivalent: 'T',
    alignment: 'right',
    size: 14,
    bold: true,
    urduFont: 'Noori Nastaliq',
    firstLineIndent: 5,
    borderAbove: '1pt',
    borderAboveStyle: 'Solid'
  })

  assert.equal(mgr.styles.length, 2)
  const testStyle = mgr.styles.find(s => s.name === 'test')
  assert.ok(testStyle)
  assert.equal(testStyle.keyEquivalent, 'T')
  assert.equal(testStyle.size, 14)
  assert.equal(testStyle.bold, true)
  assert.equal(testStyle.firstLineIndent, 5)
  assert.equal(testStyle.borderAbove, '1pt')
})

test('key equivalent accurately matches Ctrl+Shift+Key shortcuts', () => {
  const mgr = createStyleSheetManager([
    { ...DEFAULT_NORMAL },
    { ...DEFAULT_NORMAL, name: 'Heading Style', keyEquivalent: 'H' },
    { ...DEFAULT_NORMAL, name: 'Body Urdu', keyEquivalent: 'U' }
  ])

  assert.equal(mgr.findByKeyEquivalent('h')?.name, 'Heading Style')
  assert.equal(mgr.findByKeyEquivalent('H')?.name, 'Heading Style')
  assert.equal(mgr.findByKeyEquivalent('u')?.name, 'Body Urdu')
  assert.equal(mgr.findByKeyEquivalent('x'), null)
})

test('modifying a style updates its paragraph and character properties', () => {
  const mgr = createStyleSheetManager([
    { ...DEFAULT_NORMAL },
    { ...DEFAULT_NORMAL, name: 'test', keyEquivalent: 'T', size: 12 }
  ])

  mgr.modifyStyle('test', {
    size: 18,
    bold: true,
    italics: true,
    color: '#c00000',
    alignment: 'center',
    spaceBefore: 10,
    spaceAfter: 5,
    borderBelow: '2pt',
    tabs: [{ position: '20mm', alignment: 'Left', leader: '...' }]
  })

  const updated = mgr.styles.find(s => s.name === 'test')
  assert.equal(updated.size, 18)
  assert.equal(updated.bold, true)
  assert.equal(updated.italics, true)
  assert.equal(updated.color, '#c00000')
  assert.equal(updated.alignment, 'center')
  assert.equal(updated.spaceBefore, 10)
  assert.equal(updated.spaceAfter, 5)
  assert.equal(updated.borderBelow, '2pt')
  assert.equal(updated.tabs.length, 1)
  assert.equal(updated.tabs[0].position, '20mm')
})

test('removing a style removes it from the list and re-points active style', () => {
  const mgr = createStyleSheetManager([
    { ...DEFAULT_NORMAL },
    { ...DEFAULT_NORMAL, name: 'test' }
  ])

  mgr.setActiveStyle('test')
  assert.equal(mgr.activeStyle, 'test')

  const removed = mgr.removeStyle('test')
  assert.equal(removed, true)
  assert.equal(mgr.styles.length, 1)
  assert.equal(mgr.activeStyle, 'Normal')
})
