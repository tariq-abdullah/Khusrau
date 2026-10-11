import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('AccountDropdown.vue implements Google-like account button and dropdown menu', () => {
  const compPath = path.resolve(__dirname, '../src/AccountDropdown.vue')
  assert.ok(fs.existsSync(compPath), 'AccountDropdown.vue must exist')
  const content = fs.readFileSync(compPath, 'utf8')

  // Button in nav
  assert.ok(content.includes('nav-account-btn'), 'Must have nav-account-btn')
  assert.ok(content.includes('aria-label="Google Account"'), 'Must have Google Account aria label')
  assert.ok(content.includes('aria-haspopup="true"'), 'Must have aria-haspopup')

  // Profile Overview
  assert.ok(content.includes('google-account-dropdown'), 'Must have google-account-dropdown modal')
  assert.ok(content.includes('Tariq Abdullah'), 'Must show user name Tariq Abdullah')
  assert.ok(content.includes('tariq.abdullah@khusrau.net'), 'Must show user email')
  assert.ok(content.includes('Manage your Khusrau Account'), 'Must have Manage Account pill button')

  // Account switching and stub actions
  assert.ok(content.includes('account-switcher-box'), 'Must have account switcher section')
  assert.ok(content.includes('Add another account'), 'Must have Add another account action')
  assert.ok(content.includes('Sign out of all accounts'), 'Must have Sign out pill button')

  // Cloud sync and footer
  assert.ok(content.includes('Cloud Storage & Drive Backup'), 'Must have cloud storage/drive backup section')
  assert.ok(content.includes('Privacy Policy'), 'Must have Privacy Policy link')
  assert.ok(content.includes('Terms of Service'), 'Must have Terms of Service link')
})

test('InstallBanner.vue implements PWA install banner and hides when already in PWA mode', () => {
  const compPath = path.resolve(__dirname, '../src/InstallBanner.vue')
  assert.ok(fs.existsSync(compPath), 'InstallBanner.vue must exist')
  const content = fs.readFileSync(compPath, 'utf8')

  // Standalone detection
  assert.ok(content.includes('display-mode: standalone'), 'Must detect display-mode: standalone')
  assert.ok(content.includes('navigator.standalone'), 'Must check iOS navigator.standalone')
  assert.ok(content.includes('!isStandalone.value'), 'Must not show banner if already open in PWA mode')

  // Banner UI elements
  assert.ok(content.includes('pwa-install-banner'), 'Must have pwa-install-banner')
  assert.ok(content.includes('Install App'), 'Must have Install App button text')
  assert.ok(content.includes('pwa-install-action-btn'), 'Must have install action button')

  // Install execution & instructions fallback
  assert.ok(content.includes('props.installEvent.prompt()'), 'Must prompt install event if present')
  assert.ok(content.includes('showInstructions'), 'Must provide instructions if native prompt unavailable')
})

test('Ribbon and ObjectRibbon wire AccountDropdown on right side with larger 32px size', () => {
  const ribbonPath = path.resolve(__dirname, '../src/Ribbon.vue')
  const objectRibbonPath = path.resolve(__dirname, '../src/ObjectRibbon.vue')
  const accountPath = path.resolve(__dirname, '../src/AccountDropdown.vue')
  const cssPath = path.resolve(__dirname, '../src/style.css')
  const appPath = path.resolve(__dirname, '../src/App.vue')

  const ribbonCode = fs.readFileSync(ribbonPath, 'utf8')
  const objectRibbonCode = fs.readFileSync(objectRibbonPath, 'utf8')
  const accountCode = fs.readFileSync(accountPath, 'utf8')
  const cssCode = fs.readFileSync(cssPath, 'utf8')
  const appCode = fs.readFileSync(appPath, 'utf8')

  // AccountDropdown rendered in ribbons
  assert.ok(ribbonCode.includes("import AccountDropdown from './AccountDropdown.vue'"), 'Ribbon.vue must import AccountDropdown')
  assert.ok(ribbonCode.includes('<AccountDropdown />'), 'Ribbon.vue must render AccountDropdown')
  assert.ok(ribbonCode.includes('ribbon-right-cluster'), 'Ribbon.vue must contain ribbon-right-cluster')

  assert.ok(objectRibbonCode.includes("import AccountDropdown from './AccountDropdown.vue'"), 'ObjectRibbon.vue must import AccountDropdown')
  assert.ok(objectRibbonCode.includes('<AccountDropdown />'), 'ObjectRibbon.vue must render AccountDropdown')
  assert.ok(objectRibbonCode.includes('ribbon-right-cluster'), 'ObjectRibbon.vue must contain ribbon-right-cluster')

  // Larger size styling in AccountDropdown (32px)
  assert.ok(accountCode.includes('ribbon-account-btn'), 'AccountDropdown must declare ribbon-account-btn')
  assert.ok(accountCode.includes('width: 32px'), 'Account button must be 32px wide for ribbon')
  assert.ok(accountCode.includes('height: 32px'), 'Account button must be 32px tall for ribbon')

  // CSS cluster
  assert.ok(cssCode.includes('.ribbon-right-cluster'), 'style.css must style .ribbon-right-cluster')

  // InstallBanner rendered near AccountDropdown in ribbon-right-cluster
  assert.ok(ribbonCode.includes('<InstallBanner'), 'Ribbon.vue must render InstallBanner')
  assert.ok(ribbonCode.includes("import InstallBanner from './InstallBanner.vue'"), 'Ribbon.vue must import InstallBanner')
  assert.ok(objectRibbonCode.includes('<InstallBanner'), 'ObjectRibbon.vue must render InstallBanner')
  assert.ok(objectRibbonCode.includes("import InstallBanner from './InstallBanner.vue'"), 'ObjectRibbon.vue must import InstallBanner')
  assert.ok(appCode.includes(':install-event="installEvent"'), 'App.vue must pass installEvent to ribbons')
})

