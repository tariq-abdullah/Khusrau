import test from 'node:test'
import assert from 'node:assert/strict'

const PRESETS = [
  { name: 'A4 210x297mm', width: 210, height: 297 },
  { name: 'Letter 8.5x11in', width: 215.9, height: 279.4 },
  { name: 'Legal 8.5x14in', width: 215.9, height: 355.6 },
  { name: 'A5 148x210mm', width: 148, height: 210 },
  { name: 'B4 250x353mm', width: 250, height: 353 },
  { name: 'B5 176x250mm', width: 176, height: 250 },
  { name: 'Custom', width: 210, height: 297 }
]

function parseMm(str) {
  if (typeof str === 'number') return Math.max(0, str)
  const cleaned = (str || '').replace(/[^\d.-]/g, '')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : Math.max(0, val)
}

function checkIfCustom(width, height) {
  const minDim = Math.min(width, height)
  const maxDim = Math.max(width, height)

  const match = PRESETS.find(p =>
    p.name !== 'Custom' &&
    Math.abs(Math.min(p.width, p.height) - minDim) < 0.2 &&
    Math.abs(Math.max(p.width, p.height) - maxDim) < 0.2
  )

  return match ? match.name : 'Custom'
}

function createDialogState() {
  let pagePreset = 'A4 210x297mm'
  let width = 210
  let height = 297
  let orientation = 'portrait'
  let doubleSided = false
  let facingPages = false

  function setOrientation(newOrient) {
    if (orientation === newOrient) return
    orientation = newOrient
    const prevWidth = width
    const prevHeight = height
    width = prevHeight
    height = prevWidth
  }

  function setPreset(name) {
    pagePreset = name
    const found = PRESETS.find(p => p.name === name)
    if (!found || found.name === 'Custom') return
    if (orientation === 'landscape') {
      width = Math.max(found.width, found.height)
      height = Math.min(found.width, found.height)
    } else {
      width = Math.min(found.width, found.height)
      height = Math.max(found.width, found.height)
    }
  }

  function setDoubleSided(val) {
    doubleSided = val
    if (!val) facingPages = false
  }

  return {
    get width() { return width },
    get height() { return height },
    get orientation() { return orientation },
    get pagePreset() { return pagePreset },
    get doubleSided() { return doubleSided },
    get facingPages() { return facingPages },
    setFacingPages(val) { if (doubleSided) facingPages = val },
    setDimensions(w, h) {
      width = w
      height = h
      pagePreset = checkIfCustom(w, h)
    },
    setOrientation,
    setPreset,
    setDoubleSided
  }
}

test('choosing landscape switches value of height and width', () => {
  const state = createDialogState()
  assert.equal(state.width, 210)
  assert.equal(state.height, 297)
  assert.equal(state.orientation, 'portrait')

  // Switch to landscape: width and height must switch
  state.setOrientation('landscape')
  assert.equal(state.width, 297)
  assert.equal(state.height, 210)
  assert.equal(state.orientation, 'landscape')

  // Repeated call to landscape must NOT re-switch
  state.setOrientation('landscape')
  assert.equal(state.width, 297)
  assert.equal(state.height, 210)

  // Switch back to portrait: width and height switch back
  state.setOrientation('portrait')
  assert.equal(state.width, 210)
  assert.equal(state.height, 297)
  assert.equal(state.orientation, 'portrait')
})

test('switching orientation on custom dimensions switches height and width', () => {
  const state = createDialogState()
  state.setDimensions(120, 240)
  assert.equal(state.width, 120)
  assert.equal(state.height, 240)
  assert.equal(state.pagePreset, 'Custom')

  state.setOrientation('landscape')
  assert.equal(state.width, 240)
  assert.equal(state.height, 120)

  state.setOrientation('portrait')
  assert.equal(state.width, 120)
  assert.equal(state.height, 240)
})

test('preset selection adheres to current orientation', () => {
  const state = createDialogState()
  state.setOrientation('landscape')
  assert.equal(state.width, 297)
  assert.equal(state.height, 210)

  state.setPreset('Letter 8.5x11in')
  assert.equal(state.width, 279.4)
  assert.equal(state.height, 215.9)

  state.setOrientation('portrait')
  assert.equal(state.width, 215.9)
  assert.equal(state.height, 279.4)
})

test('double sided controls facing pages state', () => {
  const state = createDialogState()
  assert.equal(state.doubleSided, false)
  assert.equal(state.facingPages, false)

  // Facing pages cannot be enabled while doubleSided is false
  state.setFacingPages(true)
  assert.equal(state.facingPages, false)

  state.setDoubleSided(true)
  state.setFacingPages(true)
  assert.equal(state.facingPages, true)

  // Unchecking doubleSided resets facingPages to false
  state.setDoubleSided(false)
  assert.equal(state.facingPages, false)
})

test('parseMm correctly extracts numeric mm values from strings and units', () => {
  assert.equal(parseMm('210mm'), 210)
  assert.equal(parseMm('297 mm'), 297)
  assert.equal(parseMm('12.7mm'), 12.7)
  assert.equal(parseMm('4.23'), 4.23)
  assert.equal(parseMm(50), 50)
  assert.equal(parseMm(''), 0)
  assert.equal(parseMm(null), 0)
  assert.equal(parseMm('invalid'), 0)
})
