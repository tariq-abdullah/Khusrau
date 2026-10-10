import test from 'node:test'
import assert from 'node:assert/strict'

// Simulation of shortcut mapping resolution logic
function resolveShortcut(e, state = {}) {
  const key = e.key
  const lowerKey = key?.toLowerCase()
  const ctrl = !!(e.ctrlKey || e.metaKey)
  const alt = !!e.altKey
  const shift = !!e.shiftKey
  const isInput = !!state.isInput
  const hasSelectedObjects = !!state.hasSelectedObjects

  if (key === 'Escape') return 'escape'
  if (key === 'F12' || (alt && lowerKey === 'r' && !ctrl)) {
    if (ctrl) return 'documents'
    if (alt) return 'page'
    return 'ribbon'
  }
  if (((ctrl || alt) && key === 'F6') || (ctrl && alt && lowerKey === 'tab')) return 'nextDocument'
  if (((ctrl || alt) && key === 'F4') || (ctrl && alt && lowerKey === 'w') || (ctrl && lowerKey === 'q')) return 'close'
  if ((alt && (key === 'Insert' || key === 'Ins')) || (alt && lowerKey === 'p' && !ctrl) || (ctrl && alt && lowerKey === 'p')) return 'insertPage'
  if (alt && (key === 'Delete' || key === 'Del' || key === 'Backspace')) return 'deletePage'
  if (ctrl && (key === ' ' || key === 'Spacebar')) return 'language'
  if (ctrl && lowerKey === 's') return (alt || shift) ? 'saveAs' : 'save'
  if (ctrl && lowerKey === 'p' && !alt) return 'print'
  if (ctrl && lowerKey === 'f' && !alt) return 'find'

  if ((ctrl && lowerKey === 'n' && !alt) || (alt && lowerKey === 'n' && !isInput)) return 'new'
  if (ctrl && lowerKey === 'o' && !alt) return 'open'
  if (ctrl && alt && lowerKey === 'o') return 'toc'
  if ((ctrl && lowerKey === 't' && !alt) || (ctrl && shift && lowerKey === 't') || (alt && lowerKey === 't' && !isInput)) return 'styles'
  if (ctrl && alt && lowerKey === 't') return 'tabs'
  if (ctrl && alt && lowerKey === 'i') return 'indexEntry'
  if (ctrl && alt && lowerKey === 'g') return 'group'
  if (ctrl && alt && lowerKey === 'u') return 'ungroup'
  if (ctrl && lowerKey === 'g' && !alt) return 'paragraph'
  if (ctrl && lowerKey === 'h' && !alt) return 'character'
  if (ctrl && lowerKey === 'u' && !alt) return 'lock'
  if (ctrl && lowerKey === 'y' && !alt && !shift) return 'import'
  if (ctrl && alt && lowerKey === 'y') return 'text'
  if (ctrl && lowerKey === 'l' && !alt) return 'spelling'
  if (ctrl && (key === '.' || key === '>')) return 'symbols'
  if (ctrl && lowerKey === 'd' && !alt) return 'duplicate'

  if (ctrl && ['1', '2', '3', '4', '5'].includes(key)) {
    return ['select', 'edit', 'rotate', 'link', 'unlink'][Number(key) - 1]
  }

  const fKeys = { F1: 'help', F2: 'story', F5: 'fit', F6: 'zoom50', F7: 'zoom100', F8: 'zoom200', F9: 'snap' }
  if (!ctrl && !alt && fKeys[key]) return fKeys[key]
  if (ctrl && (key === '0' || key === 'NumPad0')) return 'fit'

  if (ctrl && lowerKey === 'z') return shift ? 'redo' : 'undo'
  if (ctrl && lowerKey === 'a') return 'all'

  if (hasSelectedObjects && !isInput) {
    if (ctrl && lowerKey === 'c') return 'copy'
    if (ctrl && lowerKey === 'x') return 'cut'
    if (ctrl && lowerKey === 'v') return 'paste'
  }

  if (hasSelectedObjects && (key === 'Delete' || key === 'Del' || (key === 'Backspace' && !isInput))) {
    return 'deleteObjects'
  }

  return null
}

test('keyboard shortcuts resolve accurately with native keys and browser fallbacks', () => {
  // Redo case-insensitivity bug fix
  assert.equal(resolveShortcut({ ctrlKey: true, shiftKey: true, key: 'Z' }), 'redo')
  assert.equal(resolveShortcut({ ctrlKey: true, shiftKey: true, key: 'z' }), 'redo')
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'z' }), 'undo')

  // Close document: native Ctrl+F4 and web-accepted Ctrl+Alt+W / Ctrl+Q
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'F4' }), 'close')
  assert.equal(resolveShortcut({ ctrlKey: true, altKey: true, key: 'w' }), 'close')
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'q' }), 'close')

  // Insert Page: native Alt+Ins and Mac/laptop fallback Alt+P / Ctrl+Alt+P
  assert.equal(resolveShortcut({ altKey: true, key: 'Insert' }), 'insertPage')
  assert.equal(resolveShortcut({ altKey: true, key: 'Ins' }), 'insertPage')
  assert.equal(resolveShortcut({ altKey: true, key: 'p' }), 'insertPage')
  assert.equal(resolveShortcut({ ctrlKey: true, altKey: true, key: 'p' }), 'insertPage')

  // Delete Page: Alt+Delete and Mac Alt+Backspace
  assert.equal(resolveShortcut({ altKey: true, key: 'Delete' }), 'deletePage')
  assert.equal(resolveShortcut({ altKey: true, key: 'Backspace' }), 'deletePage')

  // Style Sheets: native Ctrl+T and browser tab fallback Alt+T / Ctrl+Shift+T
  assert.equal(resolveShortcut({ ctrlKey: true, key: 't' }), 'styles')
  assert.equal(resolveShortcut({ altKey: true, key: 't' }), 'styles')
  assert.equal(resolveShortcut({ ctrlKey: true, shiftKey: true, key: 'T' }), 'styles')

  // Next Document: Ctrl+F6 and Alt+F6 / Ctrl+Alt+Tab
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'F6' }), 'nextDocument')
  assert.equal(resolveShortcut({ altKey: true, key: 'F6' }), 'nextDocument')

  // Index Entry, Group, Ungroup, TOC, Symbols
  assert.equal(resolveShortcut({ ctrlKey: true, altKey: true, key: 'i' }), 'indexEntry')
  assert.equal(resolveShortcut({ ctrlKey: true, altKey: true, key: 'g' }), 'group')
  assert.equal(resolveShortcut({ ctrlKey: true, altKey: true, key: 'u' }), 'ungroup')
  assert.equal(resolveShortcut({ ctrlKey: true, altKey: true, key: 'o' }), 'toc')
  assert.equal(resolveShortcut({ ctrlKey: true, key: '.' }), 'symbols')

  // Canvas objects copy, cut, paste, delete
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'c' }, { hasSelectedObjects: true }), 'copy')
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'x' }, { hasSelectedObjects: true }), 'cut')
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'v' }, { hasSelectedObjects: true }), 'paste')
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'd' }, { hasSelectedObjects: true }), 'duplicate')
  assert.equal(resolveShortcut({ key: 'Delete' }, { hasSelectedObjects: true }), 'deleteObjects')
  assert.equal(resolveShortcut({ key: 'Backspace' }, { hasSelectedObjects: true }), 'deleteObjects')

  // Function keys and zoom alternatives
  assert.equal(resolveShortcut({ key: 'F5' }), 'fit')
  assert.equal(resolveShortcut({ ctrlKey: true, key: '0' }), 'fit')
  assert.equal(resolveShortcut({ key: 'F12' }), 'ribbon')
  assert.equal(resolveShortcut({ ctrlKey: true, key: 'F12' }), 'documents')
  assert.equal(resolveShortcut({ altKey: true, key: 'F12' }), 'page')

  // Language toggle
  assert.equal(resolveShortcut({ ctrlKey: true, key: ' ' }), 'language')
})
