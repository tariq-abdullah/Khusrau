import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('Favicon files and index.html declarations are properly configured', () => {
  const indexPath = path.resolve(__dirname, '../index.html')
  const svgPath = path.resolve(__dirname, '../public/favicon.svg')
  const icoPath = path.resolve(__dirname, '../public/favicon.ico')
  const iconSvgPath = path.resolve(__dirname, '../public/icon.svg')

  // Check files exist
  assert.ok(fs.existsSync(indexPath), 'index.html must exist')
  assert.ok(fs.existsSync(svgPath), 'public/favicon.svg must exist')
  assert.ok(fs.existsSync(icoPath), 'public/favicon.ico must exist')
  assert.ok(fs.existsSync(iconSvgPath), 'public/icon.svg must exist')

  // Check index.html links
  const indexHtml = fs.readFileSync(indexPath, 'utf8')
  assert.ok(indexHtml.includes('rel="icon"'), 'index.html must have rel="icon"')
  assert.ok(indexHtml.includes('href="/favicon.svg"'), 'index.html must link /favicon.svg')
  assert.ok(indexHtml.includes('href="/favicon.ico"'), 'index.html must link /favicon.ico')

  // Check SVG content
  const svgContent = fs.readFileSync(svgPath, 'utf8')
  assert.ok(svgContent.includes('<svg'), 'favicon.svg must be valid SVG')
  assert.ok(svgContent.includes('خسرو'), 'favicon.svg must contain Urdu emblem text')

  // Check ICO binary header (0x00 0x00 0x01 0x00)
  const icoBuf = fs.readFileSync(icoPath)
  assert.ok(icoBuf.length > 100, 'favicon.ico must be non-empty')
  assert.equal(icoBuf.readUInt16LE(0), 0, 'ICO reserved must be 0')
  assert.equal(icoBuf.readUInt16LE(2), 1, 'ICO type must be 1')
  assert.ok(icoBuf.readUInt16LE(4) >= 1, 'ICO count must be at least 1 image')
})
