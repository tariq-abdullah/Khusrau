import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import catalog from '../src/google-fonts-catalog.json' with { type: 'json' }
import { isSystemFont, loadGoogleFont } from '../src/fontLoader.js'

test('Ribbon.vue swaps position of Urdu font dropdown to row 1 and English font dropdown to row 2', () => {
  const ribbonPath = path.resolve('src/Ribbon.vue')
  const content = fs.readFileSync(ribbonPath, 'utf8')

  // Find occurrences of ribbon-row
  const row1Idx = content.indexOf('<div class="ribbon-row">')
  const row2Idx = content.indexOf('<div class="ribbon-row">', row1Idx + 1)
  assert.ok(row1Idx >= 0 && row2Idx > row1Idx, 'Ribbon.vue must contain two ribbon rows')

  const row1Content = content.slice(row1Idx, row2Idx)
  const row2Content = content.slice(row2Idx)

  // In row 1: UrduFontSelect must be present
  assert.ok(row1Content.includes('<UrduFontSelect'), 'Row 1 must contain UrduFontSelect')
  assert.ok(row1Content.includes('data-tooltip="Urdu font"'), 'Row 1 Urdu font must have tooltip')

  // In row 2: EnglishFontSelect must be present
  assert.ok(row2Content.includes('<EnglishFontSelect'), 'Row 2 must contain EnglishFontSelect')
  assert.ok(row2Content.includes('data-tooltip="Latin / English font"'), 'Row 2 English font must have tooltip')
})

test('google-fonts-catalog contains over 200 families with system and Google fonts', () => {
  assert.ok(catalog.length >= 200, `Expected >=200 font families, got ${catalog.length}`)

  // Check system fonts
  const systemFonts = catalog.filter(f => f.source === 'system')
  assert.ok(systemFonts.length >= 10, 'Must have standard system fonts')
  assert.ok(systemFonts.some(f => f.family === 'Arial'))
  assert.ok(systemFonts.some(f => f.family === 'Times New Roman'))
  assert.ok(systemFonts.some(f => f.family === 'Georgia'))

  // Check top Google fonts
  const googleFonts = catalog.filter(f => f.source === 'google')
  assert.ok(googleFonts.length >= 150, 'Must have extensive Google fonts')
  assert.ok(googleFonts.some(f => f.family === 'Roboto'))
  assert.ok(googleFonts.some(f => f.family === 'Open Sans'))
  assert.ok(googleFonts.some(f => f.family === 'Montserrat'))
  assert.ok(googleFonts.some(f => f.family === 'Poppins'))
  assert.ok(googleFonts.some(f => f.family === 'Inter'))
  assert.ok(googleFonts.some(f => f.family === 'Lato'))
  assert.ok(googleFonts.some(f => f.family === 'Playfair Display'))
  assert.ok(googleFonts.some(f => f.family === 'Dancing Script'))
  assert.ok(googleFonts.some(f => f.family === 'Inconsolata'))
})

test('Google font families group variations into menu+submenu', () => {
  const roboto = catalog.find(f => f.family === 'Roboto')
  assert.ok(roboto, 'Roboto must exist in catalog')
  assert.equal(roboto.hasSubmenu, true)
  assert.ok(roboto.variants.length >= 4, 'Roboto must have multiple weight variants')

  const variantNames = roboto.variants.map(v => v.name)
  assert.ok(variantNames.includes('Regular'))
  assert.ok(variantNames.includes('Bold'))
})

test('fontLoader distinguishes system fonts from external Google fonts', () => {
  assert.equal(isSystemFont('Arial'), true)
  assert.equal(isSystemFont('Times New Roman'), true)
  assert.equal(isSystemFont('Georgia'), true)
  assert.equal(isSystemFont('Roboto'), false)
  assert.equal(isSystemFont('Poppins'), false)
  assert.equal(isSystemFont(''), false)
})

test('EnglishFontSelect.vue contains searchable UI, live preview, categories, and Google Fonts search prompt', () => {
  const selectPath = path.resolve('src/EnglishFontSelect.vue')
  const content = fs.readFileSync(selectPath, 'utf8')

  // Search input
  assert.ok(content.includes('font-search-input'), 'Must contain search input')
  assert.ok(content.includes('clear-search-btn'), 'Must contain clear search button')

  // Categories
  assert.ok(content.includes('category-chips-bar'), 'Must contain category filter chips')
  assert.ok(content.includes('Sans Serif') && content.includes('Serif'), 'Must support font categories')

  // Live preview
  assert.ok(content.includes('font-preview-sample'), 'Must contain preview samples')
  assert.ok(content.includes('The quick brown fox'), 'Must contain Latin fallback preview text')

  // Search Google Fonts prompt for dynamic search
  assert.ok(content.includes('custom-google-font-prompt'), 'Must contain custom Google font search prompt')
  assert.ok(content.includes('loadGoogleFont'), 'Must dynamically load Google fonts')

  // Submenu flyout for variations
  assert.ok(content.includes('english-font-submenu-flyout'), 'Must contain submenu flyout for variations')
})

test('App.vue includes format.latinFont in documentFonts and invokes loadGoogleFont', () => {
  const appPath = path.resolve('src/App.vue')
  const content = fs.readFileSync(appPath, 'utf8')

  assert.ok(content.includes('loadGoogleFont'), 'App.vue must import loadGoogleFont')
  assert.ok(content.includes('if(format.latinFont)s.add(format.latinFont)'), 'documentFonts must pin format.latinFont')
  assert.ok(content.includes("loadGoogleFont(value)"), 'setFormat must call loadGoogleFont for latinFont')
})
