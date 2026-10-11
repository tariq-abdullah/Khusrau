import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('style.css ensures PDF dialog OK and Cancel buttons are visible within view', () => {
  const cssPath = path.resolve('src/style.css')
  const css = fs.readFileSync(cssPath, 'utf8')

  // pdf-dialog width must accommodate fieldset and buttons
  assert.ok(css.includes('.pdf-dialog{width:480px'), 'pdf-dialog width should be 480px to accommodate buttons')

  // pdf-buttons must have defined width and button styling
  assert.ok(css.includes('.pdf-buttons{display:flex;flex-direction:column'), 'pdf-buttons must arrange in a column')
  assert.ok(css.includes('.pdf-buttons button{width:80px'), 'pdf-buttons button width must be defined')

  // radio buttons must not have 170px width in dialogs
  assert.ok(css.includes(':not([type=radio])'), 'dialog inputs rule must exclude radio buttons')
  assert.ok(css.includes('.dialog input[type=radio]{width:auto'), 'dialog radio buttons must have auto width')

  // number inputs in pdf range must have compact width
  assert.ok(css.includes('.pdf-range input[type=number]{width:44px'), 'number inputs in pdf range must have compact width')

  // fieldset must have flex:1 to fit alongside buttons
  assert.ok(css.includes('.pdf-range-actions fieldset{flex:1'), 'pdf-range-actions fieldset must use flex:1')
})

test('App.vue renders OK and Cancel buttons in PDF dialog', () => {
  const appPath = path.resolve('src/App.vue')
  const app = fs.readFileSync(appPath, 'utf8')

  assert.ok(app.includes('class="pdf-buttons"'), 'App.vue must include pdf-buttons container')
  assert.ok(app.includes('@click="confirmFileExport">OK</button>'), 'App.vue must render OK button')
  assert.ok(app.includes('@click="dialog=\'\'">Cancel</button>'), 'App.vue must render Cancel button')
})
