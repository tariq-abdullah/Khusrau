import test from 'node:test'
import assert from 'node:assert/strict'
import inpageFonts from '../src/inpage-fonts.json' with { type: 'json' }

function getPreviewTextFromSelection(selectedText) {
  const text = (selectedText || '').trim()
  if (text) {
    const words = text.split(/\s+/).filter(Boolean)
    if (words.length > 0) {
      return words.slice(0, 2).join(' ')
    }
  }
  return 'سلام علیکم!'
}

test('urduFonts excludes legacy chunk fonts like LAHOK001 and NOORI077', () => {
  const urduFonts = inpageFonts
    .filter(f => !f.legacy && f.arabicCharacters >= 10)
    .sort((a, b) => (a.fullName || a.family).localeCompare(b.fullName || b.family))

  assert.equal(urduFonts.some(f => f.fullName === 'LAHOK001'), false)
  assert.equal(urduFonts.some(f => f.fullName === 'NOORI077'), false)
  assert.equal(urduFonts.some(f => f.fullName?.startsWith('LAHOK')), false)
  assert.equal(urduFonts.some(f => f.fullName?.startsWith('NOORI')), false)

  assert.equal(urduFonts.some(f => f.fullName === 'Jameel Unicode'), true)
  assert.equal(urduFonts.some(f => f.fullName === 'Aadil'), true)
  assert.equal(urduFonts.some(f => f.fullName === 'Aldhabi'), true)
  assert.equal(urduFonts.length, 98)
})

test('selection preview extracts exactly two words or falls back to سلام علیکم!', () => {
  assert.equal(getPreviewTextFromSelection(''), 'سلام علیکم!')
  assert.equal(getPreviewTextFromSelection('   '), 'سلام علیکم!')
  assert.equal(getPreviewTextFromSelection(null), 'سلام علیکم!')
  assert.equal(getPreviewTextFromSelection('اردو ہماری مادری زبان ہے'), 'اردو ہماری')
  assert.equal(getPreviewTextFromSelection('پاکستان زندہ باد'), 'پاکستان زندہ')
  assert.equal(getPreviewTextFromSelection('خوش آمدید'), 'خوش آمدید')
  assert.equal(getPreviewTextFromSelection('اردو'), 'اردو')
})
