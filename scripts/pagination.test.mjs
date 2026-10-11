import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {paginateParagraphs, splitLongParagraph, estimateParagraphHeightMm} from '../src/pagination.js'
import {readNative} from '../src/native.js'
import {nativeDocument} from '../src/nativeDocument.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('splitLongParagraph splits long paragraph at sentence or word boundaries', () => {
  const text = 'پہلا جملہ یہاں ختم ہوتا ہے۔ دوسرا جملہ یہاں شروع ہو کر ختم ہوتا ہے۔ تیسرا جملہ بھی اسی طرح ہے۔'
  const p = { text, isHeading: false }
  const chunks = splitLongParagraph(p, 45)
  assert.ok(chunks.length >= 2, 'Should be split into 2 or more chunks')
  const reassembled = chunks.map(c => c.text).join(' ')
  assert.ok(reassembled.includes('پہلا جملہ'))
  assert.ok(reassembled.includes('دوسرا جملہ'))
  assert.ok(reassembled.includes('تیسرا جملہ'))
})

test('paginateParagraphs generates multiple pages for multi-paragraph content', () => {
  const paragraphs = Array.from({ length: 60 }, (_, i) => ({
    text: `یہ پیراگراف نمبر ${i + 1} ہے جس میں اردو زبان کا متن شامل ہے۔ اس میں چند اضافی جملے بھی ہیں تاکہ پیراگراف کی لمبائی معقول ہو سکے۔`,
    isHeading: i % 10 === 0,
    level: i % 10 === 0 ? 1 : undefined
  }))

  const pages = paginateParagraphs(paragraphs, {
    width: 210,
    height: 297,
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15
  })

  assert.ok(pages.length > 1, `Expected multiple pages, got ${pages.length}`)
  pages.forEach((p, idx) => {
    assert.equal(p.id, `page-${idx + 1}`)
    assert.ok(p.content?.content?.length > 0, `Page ${idx + 1} has content`)
  })
})

test('nativeDocument paginates UMA-Vision Doc P.inp across multiple pages and caps page height', () => {
  const fileUrl = new URL('../research/oldversionfilesinpage/UMA-Vision Doc P.inp', import.meta.url)
  if (!fs.existsSync(fileUrl)) return

  const bytes = new Uint8Array(fs.readFileSync(fileUrl))
  const parsed = readNative(bytes)
  const d = nativeDocument(parsed, 'UMA-Vision Doc P.inp')

  assert.equal(d.pages.length, 18, `Expected exactly 18 pages matching InPage, got ${d.pages.length}`)
  assert.equal(d.paperWidth, 127)
  assert.equal(d.paperHeight, 203.2)
  // Ensure page 1 has heading content
  assert.ok(d.pages[0].content.content.some(n => n.type === 'heading' || n.content?.[0]?.text?.includes('منشور')))
  // Ensure subsequent pages have content
  assert.ok(d.pages[1].content.content.length > 0)
  assert.ok(d.pages[d.pages.length - 1].content.content.length > 0)
})

test('App.vue and style.css enforce fixed page height to prevent infinite height expansion', () => {
  const appCode = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf-8')
  const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf-8')

  // paperEl in App.vue must set height and maxHeight to pageHeight + 'mm'
  assert.ok(appCode.includes("height:pageHeight+'mm'"), 'paper element must have fixed height:pageHeight+mm')
  assert.ok(appCode.includes("maxHeight:pageHeight+'mm'"), 'paper element must have maxHeight:pageHeight+mm')
  assert.ok(appCode.includes("overflow:'hidden'"), 'paper element must have overflow:hidden')

  // text-boundary must have height and maxHeight constrained to defaultGridObject.h + 'px'
  assert.ok(appCode.includes("height:defaultGridObject.h+'px'"), 'text-boundary must have height:defaultGridObject.h+px')
  assert.ok(appCode.includes("maxHeight:defaultGridObject.h+'px'"), 'text-boundary must have maxHeight:defaultGridObject.h+px')

  // checkPageOverflow function exists and is called on update
  assert.ok(appCode.includes('checkPageOverflow'), 'App.vue must implement checkPageOverflow')
  assert.ok(appCode.includes('schedulePageOverflowCheck'), 'App.vue must schedule page overflow check')
})

test('App.vue overflow check resets text-boundary scrollTop and uses un-scrolled layout metrics', () => {
  const appCode = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf-8')
  assert.ok(appCode.includes('@scroll="$event.target.scrollTop=0"'), 'text-boundary must prevent scrolling by keeping scrollTop at 0')
  assert.ok(appCode.includes('childBottom=child.offsetTop+child.offsetHeight'), 'checkPageOverflow must use child offsetTop to detect vertical boundary')
  assert.ok(appCode.includes('textBoundary.scrollTop=0'), 'checkPageOverflow must reset scrollTop')
})
