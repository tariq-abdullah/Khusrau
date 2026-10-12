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

test('pagination preserves inline formatting and paragraph attributes across splits',()=>{
 const text=('الفاظ  ').repeat(200)
 const node={type:'paragraph',attrs:{textAlign:'left',leading:18,spaceBefore:4},content:[{type:'text',text,marks:[{type:'bold'},{type:'textStyle',attrs:{color:'#0000ff',fontSize:'20pt'}}]}]}
 const pages=paginateParagraphs([node],{width:100,height:120,margin:10})
 const nodes=pages.flatMap(p=>p.content.content)
 assert.ok(nodes.length>1)
 assert.equal(nodes.flatMap(n=>n.content).map(n=>n.text||'').join(''),text)
 for(const n of nodes){assert.deepEqual(n.attrs,node.attrs);assert.deepEqual(n.content[0].marks,node.content[0].marks)}
})

test('column count and gutter change pagination capacity without losing text',()=>{
 const paras=Array.from({length:40},()=>({text:'الفاظ '.repeat(35)}))
 const layout={width:210,height:297,margin:12.7}
 const single=paginateParagraphs(paras,{...layout,columns:1})
 const double=paginateParagraphs(paras,{...layout,columns:2,gap:4.23})
 const narrow=paginateParagraphs(paras,{...layout,columns:2,gap:60})
 assert.ok(narrow.length>double.length)
 const text=pages=>pages.flatMap(p=>p.content.content).flatMap(n=>n.content||[]).map(n=>n.text||'').join('')
 assert.equal(text(single),text(double));assert.equal(text(double),text(narrow))
})

test('UMA native page count is decoded independently of estimated web pagination', () => {
  const fileUrl = new URL('../research/oldversionfilesinpage/UMA-Vision Doc P.inp', import.meta.url)
  if (!fs.existsSync(fileUrl)) return

  const bytes = new Uint8Array(fs.readFileSync(fileUrl))
  const parsed = readNative(bytes)
  const d = nativeDocument(parsed, 'UMA-Vision Doc P.inp')

  // Verified in installed InPage: 16 pages, not the previously asserted 18.
  assert.equal(parsed.nativePageCount,16)
  assert.equal(d.importReport.nativePageCount,16)
  assert.ok(d.pages.length>1)
  assert.ok(d.pages.every(p=>p.content.content.reduce((n,c)=>n+(c.content||[]).reduce((m,t)=>m+(t.text?.length||0),0),0)<2500),'Remaining text must not be dumped on a capped last page')
  assert.equal(d.paperWidth, 127)
  assert.equal(d.paperHeight, 203.2)
  // Native v3 text is stored in linked page frames rather than page-content blocks.
  const root=d.objects.find(o=>o.type==='text'&&o._nativeStoryRange)
  let bodyFrameCount=0,frame=root
  while(frame){bodyFrameCount++;frame=d.objects.find(o=>o.id===frame.next)}
  assert.equal(bodyFrameCount,16)
  assert.equal(root.text.length,parsed.storyAssignments.primary.text.length)
  assert.ok(d.objects.some(o=>o.type==='text'&&o.text.includes('منشور')))
  assert.ok(d.objects.some(o=>o.type==='picture'&&o.page==='page-16'))
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
