import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectUsedFontFamilies,
  buildFontEmbedCSS,
  preserveNewlinesForExport,
  makePDF,
  makeEPS
} from '../src/pageExport.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test('collectUsedFontFamilies collects inline and computed font families from DOM tree', () => {
  // Mock element structure
  const el = {
    nodeType: 1,
    style: { fontFamily: 'PDMS_NastaliqNafees, Arial' },
    children: [
      {
        nodeType: 1,
        style: { fontFamily: 'Jameel Noori Nastaleeq' },
        children: []
      },
      {
        nodeType: 1,
        style: { fontFamily: 'Roboto' },
        children: []
      }
    ]
  }

  const families = collectUsedFontFamilies(el)
  assert.ok(families.has('PDMS_NastaliqNafees'), 'Should collect PDMS_NastaliqNafees')
  assert.ok(families.has('Arial'), 'Should collect Arial')
  assert.ok(families.has('Jameel Noori Nastaleeq'), 'Should collect Jameel Noori Nastaleeq')
  assert.ok(families.has('Roboto'), 'Should collect Roboto')
})

test('buildFontEmbedCSS resolves known fonts and generates @font-face rules', async () => {
  const el = {
    nodeType: 1,
    style: { fontFamily: 'PDMS_NastaliqNafees' },
    children: []
  }

  // Mock global fetch for testing
  const origFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    return {
      ok: true,
      blob: async () => ({
        size: 100,
        type: 'font/ttf'
      })
    }
  }

  // Mock FileReader
  const origFileReader = globalThis.FileReader
  globalThis.FileReader = class {
    readAsDataURL() {
      setTimeout(() => {
        this.result = 'data:font/truetype;base64,QUJD'
        if (this.onloadend) this.onloadend()
      }, 0)
    }
  }

  try {
    const css = await buildFontEmbedCSS(el)
    assert.ok(css.includes('@font-face'), 'Should contain @font-face rules')
    assert.ok(css.includes('PDMS_NastaliqNafees'), 'Should reference PDMS_NastaliqNafees')
    assert.ok(css.includes('data:font/truetype;base64,'), 'Should include base64 data url')
    assert.ok(css.includes('font-weight: bold'), 'Should include bold font-face declaration')
  } finally {
    globalThis.fetch = origFetch
    globalThis.FileReader = origFileReader
  }
})

test('makePDF produces valid PDF ArrayBuffer with correct PDF header', () => {
  // Mock canvas
  const canvas = {
    width: 200,
    height: 300,
    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  }

  const buffer = makePDF([canvas], 210, 297, 'Sample Title')
  assert.ok(buffer instanceof ArrayBuffer, 'Output must be ArrayBuffer')
  assert.ok(buffer.byteLength > 100, 'PDF buffer must have content')

  const header = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)))
  assert.equal(header, '%PDF-', 'PDF must begin with %PDF- header')
})

test('makeEPS produces valid PostScript EPS text with BoundingBox', () => {
  const canvas = {
    width: 10,
    height: 10,
    getContext: () => ({
      getImageData: () => ({
        data: new Uint8ClampedArray(10 * 10 * 4).fill(255)
      })
    })
  }

  const eps = makeEPS(canvas, 210, 297)
  assert.ok(eps.startsWith('%!PS-Adobe-3.0 EPSF-3.0'), 'Must start with EPS header')
  assert.ok(eps.includes('%%BoundingBox:'), 'Must include BoundingBox')
  assert.ok(eps.includes('colorimage'), 'Must include colorimage operator')
})

test('Ribbon and ObjectRibbon show spinner when pdf is being rendered', () => {
  const ribbonCode = fs.readFileSync(path.resolve(__dirname, '../src/Ribbon.vue'), 'utf-8')
  const objectRibbonCode = fs.readFileSync(path.resolve(__dirname, '../src/ObjectRibbon.vue'), 'utf-8')
  const appCode = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf-8')
  const cssCode = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf-8')

  // Check props
  assert.ok(ribbonCode.includes('exporting:Boolean'), 'Ribbon.vue must define exporting prop')
  assert.ok(ribbonCode.includes('exportMessage:String'), 'Ribbon.vue must define exportMessage prop')
  assert.ok(objectRibbonCode.includes('exporting:Boolean'), 'ObjectRibbon.vue must define exporting prop')
  assert.ok(objectRibbonCode.includes('exportMessage:String'), 'ObjectRibbon.vue must define exportMessage prop')

  // Check markup
  assert.ok(ribbonCode.includes('ribbon-export-status'), 'Ribbon.vue must include ribbon-export-status container')
  assert.ok(ribbonCode.includes('ribbon-spinner'), 'Ribbon.vue must include ribbon-spinner element')
  assert.ok(objectRibbonCode.includes('ribbon-export-status'), 'ObjectRibbon.vue must include ribbon-export-status container')
  assert.ok(objectRibbonCode.includes('ribbon-spinner'), 'ObjectRibbon.vue must include ribbon-spinner element')

  // Check App.vue wiring
  assert.ok(appCode.includes(':exporting="exporting"'), 'App.vue must pass exporting state to ribbons')
  assert.ok(appCode.includes(':export-message="message"'), 'App.vue must pass message to ribbons')

  // Check CSS animations and styling
  assert.ok(cssCode.includes('.ribbon-export-status'), 'style.css must style .ribbon-export-status')
  assert.ok(cssCode.includes('.ribbon-spinner'), 'style.css must style .ribbon-spinner')
  assert.ok(cssCode.includes('@keyframes ribbon-spin'), 'style.css must define ribbon-spin animation')
})

test('preserveNewlinesForExport converts newline text nodes to explicit br spans and restores cleanly', () => {
  // Mock DOM nodes
  const textNode = {
    nodeType: 3,
    nodeValue: 'jhhhgg\nیک دیگر دیگر\nتیسرا دیگر',
    parentNode: null
  }
  const parent = {
    nodeType: 1,
    childNodes: [textNode],
    replaceChild(newChild, oldChild) {
      const idx = this.childNodes.indexOf(oldChild)
      if (idx !== -1) {
        this.childNodes[idx] = newChild
        newChild.parentNode = this
        oldChild.parentNode = null
      }
    }
  }
  textNode.parentNode = parent

  const origDocument = globalThis.document
  const origNodeFilter = globalThis.NodeFilter

  globalThis.NodeFilter = { SHOW_TEXT: 4 }
  globalThis.document = {
    createTreeWalker(root, filter) {
      let visited = false
      return {
        nextNode() {
          if (!visited) {
            visited = true
            return textNode
          }
          return null
        }
      }
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        nodeType: 1,
        style: {},
        attrs: {},
        childNodes: [],
        parentNode: null,
        setAttribute(k, v) { this.attrs[k] = v },
        appendChild(child) {
          this.childNodes.push(child)
          child.parentNode = this
        }
      }
    },
    createTextNode(text) {
      return {
        nodeType: 3,
        nodeValue: text,
        parentNode: null
      }
    }
  }

  try {
    const restore = preserveNewlinesForExport(parent)

    // Verify replacement
    assert.equal(parent.childNodes.length, 1)
    const wrapper = parent.childNodes[0]
    assert.equal(wrapper.attrs['data-export-newline-wrapper'], 'true')
    assert.equal(wrapper.style.whiteSpace, 'pre-wrap')

    // Children of wrapper should be: text, BR, text, BR, text
    const tags = wrapper.childNodes.map(n => n.nodeType === 3 ? n.nodeValue : n.tagName)
    assert.deepEqual(tags, ['jhhhgg', 'BR', 'یک دیگر دیگر', 'BR', 'تیسرا دیگر'])

    // Clean restore
    restore()
    assert.equal(parent.childNodes[0], textNode)
    assert.equal(parent.childNodes[0].nodeValue, 'jhhhgg\nیک دیگر دیگر\nتیسرا دیگر')
  } finally {
    globalThis.document = origDocument
    globalThis.NodeFilter = origNodeFilter
  }
})

test('CSS enforces white-space pre-wrap on tiptap, frame-text, and story paragraphs', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf-8')
  assert.ok(css.includes('.tiptap{outline:none;min-height:240mm;line-height:2.1;white-space:pre-wrap!important'), 'tiptap must have white-space:pre-wrap!important')
  assert.ok(css.includes('.tiptap p{margin:0;white-space:pre-wrap!important'), 'tiptap p must have white-space:pre-wrap!important')
  assert.ok(css.includes('.frame-text{position:absolute;inset:0;line-height:2.1;white-space:pre-wrap!important'), 'frame-text must have white-space:pre-wrap!important')
  assert.ok(css.includes('.story-paragraph{min-height:1lh;white-space:pre-wrap!important'), 'story-paragraph must have white-space:pre-wrap!important')
})

test('App.vue splits text containing newlines into paragraphs on paste and insertPlain', () => {
  const appCode = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf-8')
  assert.ok(appCode.includes("if(text.includes('\\n')){const paragraphs=text.split(/\\r?\\n/).map(t=>({type:'paragraph'"), 'paste must split multi-line text into paragraphs')
  assert.ok(appCode.includes("else if(typeof text==='string'&&text.includes('\\n')){const paragraphs=text.split(/\\r?\\n/).map(t=>({type:'paragraph'"), 'insertPlain must split multi-line text into paragraphs')
})


