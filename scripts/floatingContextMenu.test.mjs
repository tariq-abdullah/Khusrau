import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('FloatingContextMenu.vue implements exact items from screenshot', () => {
  const compPath = path.resolve(__dirname, '../src/FloatingContextMenu.vue')
  assert.ok(fs.existsSync(compPath), 'FloatingContextMenu.vue must exist')
  const content = fs.readFileSync(compPath, 'utf8')

  // Top section: Zoom, Import, Select All
  assert.ok(content.includes('Zoom'), 'Must include Zoom item')
  assert.ok(content.includes('submenu-arrow'), 'Zoom item must have submenu arrow')
  assert.ok(content.includes('context-submenu-flyout'), 'Must have Zoom flyout submenu')
  assert.ok(content.includes('zoom50'), 'Zoom submenu must support 50%')
  assert.ok(content.includes('zoom100'), 'Zoom submenu must support Actual / 100%')
  assert.ok(content.includes('zoom200'), 'Zoom submenu must support 200%')
  assert.ok(content.includes('fit'), 'Zoom submenu must support Fit in Window')

  assert.ok(content.includes('Import…') || content.includes('Import...'), 'Must include Import item')
  assert.ok(content.includes('Select All'), 'Must include Select All item')

  // Middle section: Paste with dividers
  assert.ok(content.includes('Paste'), 'Must include Paste item')
  const dividerCount = (content.match(/context-divider/g) || []).length
  assert.ok(dividerCount >= 2, 'Must include separators around Paste item')

  // Bottom section: Character, Paragraph, Table
  assert.ok(content.includes('Character…') || content.includes('Character...'), 'Must include Character item')
  assert.ok(content.includes('Paragraph…') || content.includes('Paragraph...'), 'Must include Paragraph item')
  assert.ok(content.includes('Table…') || content.includes('Table...'), 'Must include Table item')
})

test('App.vue connects right-click outside editor to floating context menu', () => {
  const appPath = path.resolve(__dirname, '../src/App.vue')
  const content = fs.readFileSync(appPath, 'utf8')

  // Imports and registration
  assert.ok(content.includes("import FloatingContextMenu from './FloatingContextMenu.vue'"), 'App.vue must import FloatingContextMenu')
  assert.ok(content.includes('<FloatingContextMenu'), 'App.vue must render FloatingContextMenu')

  // Floating menu state and contextmenu handler
  assert.ok(content.includes('const floatingMenu = ref('), 'App.vue must declare floatingMenu ref')
  assert.ok(content.includes("e.target.closest('.tiptap')"), 'onCanvasContextMenu must check for inside editor area')
  assert.ok(content.includes("e.target.closest('[data-frame-editor]')"), 'onCanvasContextMenu must check for frame text editor')
  assert.ok(content.includes('floatingMenu.value = {'), 'onCanvasContextMenu must set floatingMenu coordinates')
  assert.ok(content.includes('@contextmenu="onCanvasContextMenu"'), 'Work area canvas must attach onCanvasContextMenu')
})
