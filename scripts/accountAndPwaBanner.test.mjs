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
  assert.ok(content.includes('Install Khusrau 5.0 as an app'), 'Must display install app title')
  assert.ok(content.includes('pwa-install-action-btn'), 'Must have install action button')
  assert.ok(content.includes('pwa-banner-dismiss-btn'), 'Must have dismiss button')

  // Install execution & instructions fallback
  assert.ok(content.includes('props.installEvent.prompt()'), 'Must prompt install event if present')
  assert.ok(content.includes('showInstructions'), 'Must provide instructions if native prompt unavailable')
})

test('App.vue wires AccountDropdown on right side of nav and InstallBanner below nav', () => {
  const appPath = path.resolve(__dirname, '../src/App.vue')
  const content = fs.readFileSync(appPath, 'utf8')

  // Imports
  assert.ok(content.includes("import AccountDropdown from './AccountDropdown.vue'"), 'App.vue must import AccountDropdown')
  assert.ok(content.includes("import InstallBanner from './InstallBanner.vue'"), 'App.vue must import InstallBanner')

  // Placement in template
  assert.ok(content.includes('<AccountDropdown />'), 'App.vue must render AccountDropdown inside nav')
  assert.ok(content.includes('<InstallBanner'), 'App.vue must render InstallBanner')

  // Nav order: install button followed by AccountDropdown on the right side
  const navInstallIdx = content.indexOf('nav-install-btn')
  const accountDropdownIdx = content.indexOf('<AccountDropdown />')
  assert.ok(navInstallIdx > 0 && accountDropdownIdx > navInstallIdx, 'AccountDropdown must be placed on the right side of the install button')
})
