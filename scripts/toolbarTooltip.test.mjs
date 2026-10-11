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
})
