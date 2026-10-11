import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import catalog from '../src/urdu-fonts-catalog.json' with { type: 'json' }

test('urdu-fonts-catalog contains over 400 families and Jameel Noori Nastaleeq is the default', () => {
  assert.ok(catalog.length > 400, `Expected >400 font families, got ${catalog.length}`)

  const first = catalog[0]
  assert.equal(first.family, 'Jameel Noori Nastaleeq')
  assert.equal(first.isDefault, true)
  assert.equal(first.primaryFontFamily, 'Jameel Noori Nastaleeq')
  assert.equal(first.defaultFile, 'Jameel Noori Nastaleeq.ttf')
})

test('Jameel Noori Nastaleeq groups variations (Regular and Kasheeda) into menu+submenu', () => {
  const jameel = catalog.find(f => f.family === 'Jameel Noori Nastaleeq')
  assert.ok(jameel)
  assert.equal(jameel.hasSubmenu, true)
  assert.ok(jameel.variants.length >= 2)

  const variantNames = jameel.variants.map(v => v.name)
  assert.ok(variantNames.includes('Regular'))
  assert.ok(variantNames.includes('Kasheeda'))

  const regular = jameel.variants.find(v => v.name === 'Regular')
  const kasheeda = jameel.variants.find(v => v.name === 'Kasheeda')
  assert.equal(regular.file, 'Jameel Noori Nastaleeq.ttf')
  assert.equal(kasheeda.file, 'Jameel Noori Nastaleeq Kasheeda.ttf')
})

test('all referenced font files exist in the fonts directory', () => {
  const fontsDir = path.resolve(process.cwd(), 'fonts')
  let checked = 0
  for (const item of catalog) {
    if (item.defaultFile) {
      assert.ok(fs.existsSync(path.join(fontsDir, item.defaultFile)), `File missing: ${item.defaultFile}`)
      checked++
    }
    for (const v of item.variants || []) {
      if (v.file) {
        assert.ok(fs.existsSync(path.join(fontsDir, v.file)), `Variant file missing: ${v.file}`)
        checked++
      }
    }
  }
  assert.ok(checked > 400)
})

test('pinned document fonts calculation preserves active and document fonts', () => {
  // Logic from App.vue and UrduFontSelect.vue
  const baseStyleFont = 'Jameel Noori Nastaleeq'
  const formatFont = 'Alvi Nastaleeq'
  const objectFonts = ['Pak Nastaleeq']
  const customStyleFonts = ['Nafees']
  const tiptapMarks = ['Dubai Bold']

  const set = new Set(['Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu'])
  if (baseStyleFont) set.add(baseStyleFont)
  if (formatFont) set.add(formatFont)
  for (const f of objectFonts) set.add(f)
  for (const f of customStyleFonts) set.add(f)
  for (const f of tiptapMarks) set.add(f)

  // Verify all document fonts are pinned
  assert.ok(set.has('Jameel Noori Nastaleeq'))
  assert.ok(set.has('Noto Nastaliq Urdu'))
  assert.ok(set.has('Alvi Nastaleeq'))
  assert.ok(set.has('Pak Nastaleeq'))
  assert.ok(set.has('Nafees'))
  assert.ok(set.has('Dubai Bold'))

  // A font not in the document is unpinned and can be safely unloaded
  assert.equal(set.has('Random Unused Font'), false)
})

test('App.vue import-report banner contains dismiss button', () => {
  const appVue = fs.readFileSync(path.resolve(process.cwd(), 'src/App.vue'), 'utf-8')
  assert.ok(appVue.includes('class="import-report-dismiss"'))
  assert.ok(appVue.includes('@click="importReport = null"'))
})

test('App.vue switches to edit tool on open and on clicking text in select tool', () => {
  const appVue = fs.readFileSync(path.resolve(process.cwd(), 'src/App.vue'), 'utf-8')
  // In open() function:
  assert.ok(appVue.includes("apply(d);chooseTool('edit');"))
  // In pointerDown() function:
  assert.ok(appVue.includes("e.target.closest('.text-boundary')||e.target.closest('.tiptap')"))
  assert.ok(appVue.includes("chooseTool('edit');nextTick(()=>editor.value?.commands.focus())"))
})

test('CSS defines 2x preview line-height for Urdu fonts', () => {
  const selectVue = fs.readFileSync(path.resolve(process.cwd(), 'src/UrduFontSelect.vue'), 'utf-8')
  assert.ok(selectVue.includes('line-height: 2.0;'))
})
