import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Khusrau 5.0 splash images exist and are valid non-empty assets', () => {
  const splashDir = path.resolve('public/splash')
  assert.ok(fs.existsSync(splashDir), 'public/splash directory must exist')

  const expectedImages = [
    'khusrau_splash_1.jpg',
    'khusrau_splash_2.jpg',
    'khusrau_splash_3.jpg'
  ]

  for (const imgName of expectedImages) {
    const fullPath = path.join(splashDir, imgName)
    assert.ok(fs.existsSync(fullPath), `${imgName} must exist in public/splash/`)
    const stats = fs.statSync(fullPath)
    assert.ok(stats.size > 50000, `${imgName} must be a high-resolution image file (>50KB)`)
  }
})

test('KhusrauPreloader.vue contains Mughal/Indo-Islamic artworks, randomizer, Khusrau 5.0 and Tariq Abdullah', () => {
  const componentPath = path.resolve('src/KhusrauPreloader.vue')
  assert.ok(fs.existsSync(componentPath), 'KhusrauPreloader.vue component must exist')
  const content = fs.readFileSync(componentPath, 'utf8')

  // Check branding
  assert.ok(content.includes('Khusrau'), 'Must contain "Khusrau"')
  assert.ok(content.includes('5.0'), 'Must contain version 5.0')
  assert.ok(content.includes('Tariq Abdullah'), 'Must contain author "Tariq Abdullah"')
  assert.ok(content.includes('Developed by'), 'Must contain "Developed by"')

  // Check 3 artworks configuration
  assert.ok(content.includes('/splash/khusrau_splash_1.jpg'), 'Must reference artwork 1')
  assert.ok(content.includes('/splash/khusrau_splash_2.jpg'), 'Must reference artwork 2')
  assert.ok(content.includes('/splash/khusrau_splash_3.jpg'), 'Must reference artwork 3')

  // Check Mughal / Indo-Islamic architectural or calligraphic themes
  assert.ok(content.toLowerCase().includes('mughal'), 'Must reference Mughal architectural theme')
  assert.ok(content.toLowerCase().includes('indo-islamic'), 'Must reference Indo-Islamic theme')

  // Check random selection
  assert.ok(content.includes('Math.random()'), 'Must select artwork randomly')

  // Check progress and status stages
  assert.ok(content.includes('currentStatus') || content.includes('stages'), 'Must have dynamic initialization stages')
  assert.ok(content.includes('progress'), 'Must include animated loading progress')
})

test('App.vue, controls.js and index.html integrate Khusrau 5.0 branding and splash screen', () => {
  const appPath = path.resolve('src/App.vue')
  const appContent = fs.readFileSync(appPath, 'utf8')
  assert.ok(appContent.includes('KhusrauPreloader'), 'App.vue must import and use KhusrauPreloader')
  assert.ok(appContent.includes('showPreloader'), 'App.vue must control showPreloader')
  assert.ok(appContent.includes('Khusrau 5.0'), 'App.vue must display Khusrau 5.0 in title bar')
  assert.ok(appContent.includes('Tariq Abdullah'), 'App.vue must credit Tariq Abdullah')

  const controlsPath = path.resolve('src/controls.js')
  const controlsContent = fs.readFileSync(controlsPath, 'utf8')
  assert.ok(controlsContent.includes('About Khusrau'), 'Help menu must feature "About Khusrau"')

  const indexPath = path.resolve('index.html')
  const indexContent = fs.readFileSync(indexPath, 'utf8')
  assert.ok(indexContent.includes('Khusrau 5.0'), 'index.html title must reflect Khusrau 5.0')
})
