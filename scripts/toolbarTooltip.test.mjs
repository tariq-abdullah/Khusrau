import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('App.vue implements left toolbar hover tooltips with labels and shortcuts', () => {
  const appPath = path.resolve('src/App.vue')
  const content = fs.readFileSync(appPath, 'utf8')

  assert.ok(content.includes('showToolTooltip'), 'App.vue must have showToolTooltip method')
  assert.ok(content.includes('hideToolTooltip'), 'App.vue must have hideToolTooltip method')
  assert.ok(content.includes('tool-strip-tooltip'), 'App.vue must render tool-strip-tooltip')
  assert.ok(content.includes('toolShortcuts'), 'App.vue must define toolShortcuts')
  assert.ok(content.includes('data-tooltip'), 'Toolbar buttons must have data-tooltip attribute')
})

test('style.css defines custom styling for tool-strip-tooltip', () => {
  const cssPath = path.resolve('src/style.css')
  const content = fs.readFileSync(cssPath, 'utf8')

  assert.ok(content.includes('.tool-strip-tooltip'), 'style.css must define .tool-strip-tooltip')
  assert.ok(content.includes('.tooltip-arrow'), 'style.css must define .tooltip-arrow')
  assert.ok(content.includes('.tooltip-shortcut'), 'style.css must define .tooltip-shortcut')
  assert.ok(content.includes('.pos-bottom'), 'style.css must define .pos-bottom for ribbon tools')
  assert.ok(content.includes('.pos-top'), 'style.css must define .pos-top for pagebar tools')
  assert.ok(content.includes('.pos-right'), 'style.css must define .pos-right for tool strip')
})

test('Ribbon.vue implements data-tooltip on text formatting tools and controls', () => {
  const ribbonPath = path.resolve('src/Ribbon.vue')
  const content = fs.readFileSync(ribbonPath, 'utf8')

  assert.ok(content.includes('data-tooltip="Style sheet"'), 'Style sheet must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Line spacing (Leading)"'), 'Leading must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Bold"'), 'Bold must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Italic"'), 'Italic must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Font size (pt)"'), 'Font size must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Character tracking / spacing (%)"'), 'Tracking must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Superscript"'), 'Superscript must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Document language"'), 'Language must have data-tooltip')
  assert.ok(content.includes("'Full justification'"), 'Justification must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Baseline shift (pt)"'), 'Baseline shift must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Urdu font"'), 'Urdu font must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Text color"'), 'Color must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Horizontal character scale (%)"'), 'Scale must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Outline text"'), 'Outline must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Text decoration"'), 'Decoration must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Kashida justification"'), 'Kashida must have data-tooltip')
})

test('ObjectRibbon.vue implements data-tooltip on contextual object tools and metrics', () => {
  const objectRibbonPath = path.resolve('src/ObjectRibbon.vue')
  const content = fs.readFileSync(objectRibbonPath, 'utf8')

  assert.ok(content.includes(':data-tooltip="m[1]"'), 'Object metrics must bind data-tooltip')
  assert.ok(content.includes('data-tooltip="Border / Line color"'), 'Border color must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Border / Line style"'), 'Border style must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Number of columns"'), 'Columns must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Box rotation angle (°)"'), 'Rotation must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Place picture…"'), 'Place picture must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Box fill color"'), 'Fill color must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Border / Line width (pt)"'), 'Border width must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Text runaround mode"'), 'Runaround must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Runaround clearance (mm)"'), 'Runaround clearance must have data-tooltip')
  assert.ok(content.includes('data-tooltip="Edit box text"'), 'Edit box text must have data-tooltip')
})
