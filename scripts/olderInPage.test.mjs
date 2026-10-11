import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as CFB from 'cfb'
import { readNative, createOlderInPageFile, createV3InPageFile, encodeToV1V2 } from '../src/native.js'
import { nativeDocument } from '../src/nativeDocument.js'
import { parseOlderInPageStream, buildOlderInPageFile, normalizeLegacyUrduText } from '../src/olderInPage.js'
import { menus } from '../src/controls.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(__dirname, '../research/fixtures/old-inpage.inp')
const taslimPath = path.resolve(__dirname, '../research/oldversionfilesinpage/TASLIM.inp')

test('opens old-inpage.inp, detects legacy format, and extracts clean paragraphs with formatting', () => {
  const bytes = new Uint8Array(fs.readFileSync(fixturePath))
  const parsed = readNative(bytes)

  assert.equal(parsed.isOlderVersion, true, 'isOlderVersion flag should be true')
  assert.equal(parsed.version, 1, 'parsed version should be 1 (InPage 1.x / InPage100)')
  assert.equal(parsed.paragraphs.length, 5, `Expected 5 clean paragraphs, got ${parsed.paragraphs.length}`)
  
  // Verify story content from old-inpage.inp
  const storyText = parsed.paragraphs.join('\n')
  assert(storyText.includes('شاہد صدیقی') || storyText.includes('شاہدصدیقی'), 'Should contain Shahid Siddiqui')
  assert(storyText.includes('سماجوادی پارٹی'), 'Should contain Samajwadi Party')
  assert(storyText.includes('انورادھا چودھری'), 'Should contain Anuradha Choudhary')

  // Verify paragraph formatting extraction
  assert.ok(parsed.formattedParagraphs, 'parsed must include formattedParagraphs')
  assert.equal(parsed.formattedParagraphs.length, 5)

  // Paragraph 0: Heading 1, centered, 24pt bold
  const p0 = parsed.formattedParagraphs[0]
  assert.equal(p0.isHeading, true, 'P0 must be a heading')
  assert.equal(p0.level, 1, 'P0 must be Heading 1')
  assert.equal(p0.align, 'center', 'P0 must be center aligned')
  assert.equal(p0.bold, true, 'P0 must be bold')
  assert.equal(p0.fontSize, 24, 'P0 must have 24pt font size')

  // Paragraph 1: Heading 2, centered, 14pt
  const p1 = parsed.formattedParagraphs[1]
  assert.equal(p1.isHeading, true, 'P1 must be a heading')
  assert.equal(p1.level, 2, 'P1 must be Heading 2')
  assert.equal(p1.align, 'center', 'P1 must be center aligned')
  assert.equal(p1.fontSize, 14, 'P1 must have 14pt font size')

  // Paragraph 2, 3, 4: Body paragraphs, justified
  for (let i = 2; i <= 4; i++) {
    const p = parsed.formattedParagraphs[i]
    assert.equal(p.isHeading, false, `P${i} must be body paragraph`)
    assert.equal(p.align, 'justify', `P${i} must be justified`)
    assert.equal(p.fontSize, 12, `P${i} must have 12pt body font size`)
  }

  // Verify nativeDocument conversion respects headings, alignments, and layout
  const doc = nativeDocument(parsed, 'old-inpage.inp')
  assert.equal(doc.isOlderVersion, true)
  assert.equal(doc.importReport.isOlderVersion, true)
  assert.match(doc.importReport.warning, /older version of this software/)

  // Page layout
  assert.equal(doc.paper, 'A4')
  assert.equal(doc.paperWidth, 210)
  assert.equal(doc.paperHeight, 297)
  assert.equal(doc.marginLeft, 12.7)
  assert.equal(doc.marginRight, 12.7)
  assert.equal(doc.marginTop, 12.7)
  assert.equal(doc.marginBottom, 12.7)

  // Content node structure in Tiptap doc
  const nodes = doc.content.content
  assert.equal(nodes.length, 5)
  assert.equal(nodes[0].type, 'heading')
  assert.equal(nodes[0].attrs.level, 1)
  assert.equal(nodes[0].attrs.textAlign, 'center')
  assert.ok(nodes[0].content[0].marks.some(m => m.type === 'bold'), 'Heading 1 must have bold mark')

  assert.equal(nodes[1].type, 'heading')
  assert.equal(nodes[1].attrs.level, 2)
  assert.equal(nodes[1].attrs.textAlign, 'center')

  assert.equal(nodes[2].type, 'paragraph')
  assert.equal(nodes[2].attrs.textAlign, 'justify')

  assert.equal(nodes[3].type, 'paragraph')
  assert.equal(nodes[3].attrs.textAlign, 'justify')

  assert.equal(nodes[4].type, 'paragraph')
  assert.equal(nodes[4].attrs.textAlign, 'justify')
})

test('correctly extracts custom margins from other legacy files (TASLIM.inp)', () => {
  if (!fs.existsSync(taslimPath)) return
  const bytes = new Uint8Array(fs.readFileSync(taslimPath))
  const parsed = readNative(bytes)
  assert.equal(parsed.isOlderVersion, true)

  const doc = nativeDocument(parsed, 'TASLIM.inp')
  assert.equal(doc.paper, 'A4')
  assert.equal(doc.paperWidth, 210)
  assert.equal(doc.paperHeight, 297)
  // TASLIM has 25.4mm left and top margins, 12.7mm right and bottom
  assert.equal(doc.marginLeft, 25.4)
  assert.equal(doc.marginTop, 25.4)
  assert.equal(doc.marginRight, 12.7)
  assert.equal(doc.marginBottom, 12.7)
})

test('encodeToV1V2 encodes Urdu text to legacy InPage 0x04 format', () => {
  const sample = 'سماجوادی پارٹی میں شاہد صدیقی'
  const encoded = encodeToV1V2(sample)
  assert(encoded instanceof Uint8Array)
  assert(encoded.length > sample.length)
  // Should start with 0x04 prefix for Urdu chars
  assert.equal(encoded[0], 0x04)
})

test('createOlderInPageFile creates valid InPage100 CFB file that decodes back with readNative', () => {
  const sampleStory = [
    { text: 'سماجوادی پارٹی میں شاہد صدیقی', align: 'center', isHeading: true, level: 1 },
    { text: 'لکھنؤ،۸ جنوری: آج یہاں پریس کانفرنس منعقد ہوا۔', align: 'justify', isHeading: false }
  ]
  const generatedBytes = createOlderInPageFile(sampleStory, {
    width: 210,
    height: 297,
    marginLeft: 15,
    marginRight: 15,
    marginTop: 20,
    marginBottom: 20
  })
  assert(generatedBytes instanceof Uint8Array)
  assert(generatedBytes.length > 512, 'Compound file should be larger than one sector')

  // Verify it is a valid CFB compound document with InPage100 and DocumentInfo
  const cfb = CFB.read(generatedBytes, { type: 'array' })
  assert(cfb.FileIndex.some(e => e.name === 'InPage100'), 'Must contain InPage100 stream')
  assert(cfb.FileIndex.some(e => e.name === 'DocumentInfo'), 'Must contain DocumentInfo stream')

  // Verify container is completely clean with NO SheetJS watermark stream
  assert(!cfb.FileIndex.some(e => e.name.includes('Sh33tJ5')), 'Must NOT contain SheetJS watermark stream')
  assert.equal(cfb.FullPaths.filter(p => !p.endsWith('/')).length, 2, 'Must contain exactly two file streams')

  // Verify InPage100 internal stream section table at 0x10
  const inPageStream = new Uint8Array(CFB.find(cfb, 'InPage100').content)
  const view = new DataView(inPageStream.buffer, inPageStream.byteOffset, inPageStream.byteLength)
  const totalLength = inPageStream.length

  const sec4 = view.getUint32(42, true)
  const sec5 = view.getUint32(48, true)
  const sec6 = view.getUint32(54, true)
  assert.equal(sec4, totalLength - 52, 'Section 4 must point to 52-byte footer at end of stream')
  assert.equal(sec5, totalLength - 52, 'Section 5 must point to 52-byte footer at end of stream')
  assert.equal(sec6, totalLength, 'Section 6 must equal total stream length')

  // Verify story starts at 3997 with 01 00 00 00 0D 00 00 00 00 00
  assert.equal(inPageStream[3997], 0x01)
  assert.equal(inPageStream[3998], 0x00)
  assert.equal(inPageStream[3999], 0x00)
  assert.equal(inPageStream[4000], 0x00)
  assert.equal(inPageStream[4001], 0x0D)

  // Verify parseOlderInPageStream extracts formatting accurately
  const parsedBack = readNative(generatedBytes)
  assert.equal(parsedBack.isOlderVersion, true)
  assert.equal(parsedBack.version, 1)
  assert.equal(parsedBack.paragraphs.length, 2)
  assert.equal(parsedBack.paragraphs[0], 'سماجوادی پارٹی میں شاہد صدیقی')
  assert.equal(parsedBack.paragraphs[1], 'لکھنؤ،۸ جنوری: آج یہاں پریس کانفرنس منعقد ہوا۔')

  // Paragraph 0: Heading 1, centered
  assert.equal(parsedBack.formattedParagraphs[0].isHeading, true)
  assert.equal(parsedBack.formattedParagraphs[0].align, 'center')
  assert.equal(parsedBack.formattedParagraphs[0].fontSize, 24)

  // Paragraph 1: Body, justified
  assert.equal(parsedBack.formattedParagraphs[1].isHeading, false)
  assert.equal(parsedBack.formattedParagraphs[1].align, 'justify')

  // Verify custom margins preserved
  assert.equal(parsedBack.layout.marginLeft, 15)
  assert.equal(parsedBack.layout.marginRight, 15)
  assert.equal(parsedBack.layout.marginTop, 20)
  assert.equal(parsedBack.layout.marginBottom, 20)
})

test('File menu includes Download for older InPage action', () => {
  const fileMenu = menus.File
  const downloadOlder = fileMenu.find(item => item && item[1] === 'downloadOlderInPage')
  assert(downloadOlder, 'downloadOlderInPage must be present in File menu')
  assert.equal(downloadOlder[0], 'Download for older InPage')
})

test('older version file open uses in-app dialog and does not trigger window.alert', () => {
  const appVue = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf-8')
  assert.ok(appVue.includes("dialog.value='olderVersion'"), 'Must trigger in-app olderVersion dialog')
  assert.ok(!appVue.includes('window.alert'), 'Must not call native window.alert to prevent dual alerts')
})

test('File -> Export native INP exports v3 Unicode format, and downloadOlderInPage exports v1 legacy format', () => {
  const appVue = fs.readFileSync(path.resolve(__dirname, '../src/App.vue'), 'utf-8')
  assert.ok(!appVue.includes("if(cmd==='native')return !nativeSource.value"), 'Native export must not be disabled when nativeSource is empty')
  assert.ok(appVue.includes('createV3InPageFile(exportContent,layout)'), 'exportNative must use createV3InPageFile for v3 export')
  assert.ok(appVue.includes('createOlderInPageFile(exportContent,layout)'), 'downloadOlderInPage must use createOlderInPageFile for older export')

  // 1. Verify createV3InPageFile produces valid InPage 3.x (Unicode) file
  const sampleText = 'سماجوادی پارٹی میں شاہد صدیقی'
  const v3Generated = createV3InPageFile(sampleText, {
    width: 210,
    height: 297,
    marginLeft: 12.7,
    marginRight: 12.7,
    marginTop: 12.7,
    marginBottom: 12.7,
    columns: 1,
    gap: 4.233
  })
  assert.ok(v3Generated instanceof Uint8Array, 'v3 export must be a Uint8Array')
  assert.ok(v3Generated.length > 512, 'File must have valid OLE compound structure')
  const v3ReadBack = readNative(v3Generated)
  assert.equal(v3ReadBack.version, 3, 'Must be version 3 (InPage300)')
  assert.equal(v3ReadBack.isOlderVersion, false, 'Must not be older version')
  assert.equal(v3ReadBack.paragraphs[0], sampleText)

  // 2. Verify createOlderInPageFile produces valid InPage 1.x (legacy) file
  const v1Generated = createOlderInPageFile(sampleText, {
    width: 210,
    height: 297,
    marginLeft: 12.7,
    marginRight: 12.7,
    marginTop: 12.7,
    marginBottom: 12.7,
    columns: 1,
    gap: 4.233
  })
  assert.ok(v1Generated instanceof Uint8Array, 'v1 export must be a Uint8Array')
  const v1ReadBack = readNative(v1Generated)
  assert.equal(v1ReadBack.version, 1, 'Must be version 1 (InPage100)')
  assert.equal(v1ReadBack.isOlderVersion, true, 'Must be older version')
  assert.equal(v1ReadBack.paragraphs[0], sampleText)
})

test('normalizeLegacyUrduText normalizes legacy Hamza, unspaced Noon Ghunna, and unspaced colons', () => {
  const legacyP1 = 'شاہد بھاءی ایک عالمی شخصیت ہیں اور ہمیشہ حق بات کہتے ہیں: اعظم خاں،  یہ وہ چہرے ہیں جو سماجوادی پارٹی کو نءی طاقت دیںگے:اکھلیش یادو'
  const normalized = normalizeLegacyUrduText(legacyP1)

  assert.ok(normalized.includes('شاہد بھائی'), 'بھاءی must normalize to بھائی')
  assert.ok(normalized.includes('نئی طاقت'), 'نءی must normalize to نئی')
  assert.ok(normalized.includes('دیں گے: اکھلیش یادو'), 'دیںگے:اکھلیش یادو must normalize to دیں گے: اکھلیش یادو')

  // Verify old-inpage.inp fixture decodes with normalized text
  const bytes = new Uint8Array(fs.readFileSync(fixturePath))
  const parsed = readNative(bytes)
  assert.ok(parsed.paragraphs[1].includes('بھائی'), 'Fixture P1 must have بھائی')
  assert.ok(parsed.paragraphs[1].includes('نئی'), 'Fixture P1 must have نئی')
  assert.ok(parsed.paragraphs[1].includes('دیں گے: اکھلیش یادو'), 'Fixture P1 must have دیں گے: اکھلیش یادو')

  // Verify encodeToV1V2 supports U+0626 and U+06D3
  const encoded = encodeToV1V2('بھائی اور گئے')
  assert.ok(encoded instanceof Uint8Array)
  assert.ok(encoded.length > 0)
})



