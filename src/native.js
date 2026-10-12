import * as CFB from 'cfb'
import {decodeV1V2,filterParagraphs,filterParagraphsWithMeta,CHAR_MAP_URDU,COMPOSITE_SEQUENCES} from 'inpage-format'
import { parseOlderInPageStream, buildOlderInPageFile } from './olderInPage.js'
import {readV3PageRecords} from './nativeRecords.js'
import {readV3TextStyles,styledNativeParagraph} from './nativeTextStyles.js'
import {readV3Palette} from './nativePalette.js'
import {readV3Stories,assignV3Stories} from './nativeStories.js'

const charToByte = new Map()
for (const [b, ch] of CHAR_MAP_URDU) {
 if (!charToByte.has(ch)) charToByte.set(ch, b)
}
if (!charToByte.has('\u0626')) charToByte.set('\u0626', 0xa3)

export function encodeToV1V2(text) {
 const bytes = []
 let i = 0
 while (i < text.length) {
  if (text[i] === '\r' && text[i + 1] === '\n') {
   bytes.push(0x0D)
   i += 2
   continue
  }
  if (text[i] === '\n' || text[i] === '\r') {
   bytes.push(0x0D)
   i++
   continue
  }
  if (text[i] === '\t') {
   bytes.push(0x09)
   i++
   continue
  }
  if (text[i] === ' ') {
   bytes.push(0x04, 0x20)
   i++
   continue
  }
  if (text[i] === '\u06D3') {
   bytes.push(0x04, 0xa3, 0x04, 0xa5)
   i++
   continue
  }
  let matchedComposite = false
  for (const [key, comp] of COMPOSITE_SEQUENCES) {
   if (text.startsWith(comp, i)) {
    const [b1, b2] = key.split('_').map(h => parseInt(h, 16))
    bytes.push(0x04, b1, 0x04, b2)
    i += comp.length
    matchedComposite = true
    break
   }
  }
  if (matchedComposite) continue
  const ch = text[i]
  if (charToByte.has(ch)) {
   bytes.push(0x04, charToByte.get(ch))
  } else {
   const code = ch.charCodeAt(0)
   if (code < 128) {
    bytes.push(code)
   }
  }
  i++
 }
 return new Uint8Array(bytes)
}

export function createOlderInPageFile(text, options) {
 return buildOlderInPageFile(text, options)
}

export { createV3InPageFile } from './v3InPage.js'

// V3 Unicode stories are contiguous UTF-16LE. InPage 3 streams precede stories
// with an 0xFFFFFFFF sentinel followed by a 16-bit story/record tag (e.g. 0x000D or 0x0002).
// Story text begins at offset i+6. Fallbacks support variable offsets and stream-wide scanning.
export function recoverV3(stream){
 const candidates=[]
 function checkRun(start){
  let end=start,arabic=0
  for(;end+1<stream.length;end+=2){
   const n=stream[end]|stream[end+1]<<8
   if(!(n===9||n===10||n===12||n===13||n>=32&&n<=126||n===160||n>=0x600&&n<=0x8ff||n>=0x2000&&n<=0x206f||n>=0xfb50&&n<=0xfdff||n>=0xfe70&&n<=0xfeff))break
   if(n>=0x600&&n<=0x8ff)arabic++
  }
  if(arabic>10)candidates.push({start,end,arabic})
 }

 // Strategy 1: Standard InPage 3 story header (0xFFFFFFFF sentinel + 16-bit tag at i+4, text at i+6)
 for(let i=0;i<stream.length-6;i++){
  if(stream[i]===255&&stream[i+1]===255&&stream[i+2]===255&&stream[i+3]===255){
   checkRun(i+6)
  }
 }

 // Strategy 2: Check alternative offsets (i+4 direct, i+8 with 32-bit tag) if standard offset had no story
 if(candidates.length===0){
  for(let i=0;i<stream.length-6;i++){
   if(stream[i]===255&&stream[i+1]===255&&stream[i+2]===255&&stream[i+3]===255){
    checkRun(i+4)
    checkRun(i+8)
   }
  }
 }

 // Strategy 3: Full-stream contiguous UTF-16LE Urdu text block scan
 if(candidates.length===0){
  for(let i=0;i<stream.length-20;i+=2){
   let end=i,arabic=0
   for(;end+1<stream.length;end+=2){
    const n=stream[end]|stream[end+1]<<8
    if(!(n===9||n===10||n===13||n>=32&&n<=126||n===160||n>=0x600&&n<=0x8ff||n>=0x2000&&n<=0x206f||n>=0xfb50&&n<=0xfdff||n>=0xfe70&&n<=0xfeff))break
    if(n>=0x600&&n<=0x8ff)arabic++
   }
   if(arabic>10&&(end-i)>40){
    candidates.push({start:i,end,arabic})
    i=end
   }
  }
 }

 candidates.sort((a,b)=>(b.end-b.start)-(a.end-a.start))
 const run=candidates[0];if(!run)throw Error('No supported Unicode story found. This file needs a different InPage decoder.')
 const rawText=new TextDecoder('utf-16le').decode(stream.slice(run.start,run.end))
 // InPage can store a hard page start as a form-feed inside its story. Normalize
 // it to a paragraph boundary for editing while preserving its UTF-16 offset.
 const pageBreakIndices=[]
 for(let i=rawText.indexOf('\f');i>=0;i=rawText.indexOf('\f',i+1))pageBreakIndices.push(i)
 const text=rawText.replace(/\f/g,'\r')
 return {text,paragraphs:text.split(/\r\n?|\n/),range:run,candidateCount:candidates.length,pageBreakIndices}
}

function inferCoverPageBreak(text){
 // Some InPage documents store a designed cover and the article as one story,
 // without a form-feed. Preserve the observed native cover boundary when the
 // story has a title, contact line, and the first article paragraph is Bismillah.
 const title=text.indexOf('منشور'),bismillah=text.indexOf('بسم اللہ')
 const contact=bismillah<0?-1:text.lastIndexOf('umaindia.delhi@gmail.com',bismillah)
 return title>=0&&contact>title&&bismillah>contact&&bismillah-contact<100?[bismillah]:[]
}
const UNITS_PER_MM = 5669.29133858;

function indexOfUtf16(buf, str, start = 0) {
 let needle
 if (typeof Buffer !== 'undefined') {
  needle = Buffer.from(str, 'utf16le')
 } else {
  needle = new Uint8Array(str.length * 2)
  for (let i = 0; i < str.length; i++) {
   const code = str.charCodeAt(i)
   needle[i * 2] = code & 0xff
   needle[i * 2 + 1] = code >> 8
  }
 }
 for (let i = start; i <= buf.length - needle.length; i += 2) {
  let match = true
  for (let j = 0; j < needle.length; j++) {
   if (buf[i + j] !== needle[j]) { match = false; break }
  }
  if (match) return i
 }
 return -1
}

export function parseV3StreamMeta(s, cfbDoc, paragraphs) {
 const view = new DataView(s.buffer, s.byteOffset, s.byteLength)

 // 1. Layout attributes
 let width = 210, height = 297, mLeft = 12.7, mRight = 12.7, mTop = 12.7, mBottom = 12.7, columns = 1, gap = 4.233
 for (let i = 0; i < Math.min(1200, s.length - 24); i++) {
  if (s[i] === 0x06 && s[i+1] === 0x01 && s[i+6] === 0x07 && s[i+7] === 0x01) {
   const wVal = view.getUint32(i + 2, true)
   const hVal = view.getUint32(i + 8, true)
   if (wVal > 100000 && wVal < 3000000) width = Math.round(wVal / UNITS_PER_MM * 10) / 10
   if (hVal > 100000 && hVal < 4000000) height = Math.round(hVal / UNITS_PER_MM * 10) / 10
  }
  if (s[i] === 0x08 && s[i+1] === 0x01 && s[i+6] === 0x09 && s[i+7] === 0x01) {
   const lVal = view.getUint32(i + 2, true)
   const rVal = view.getUint32(i + 8, true)
   const tVal = view.getUint32(i + 14, true)
   const bVal = view.getUint32(i + 20, true)
   if (lVal > 0 && lVal < 1000000) mLeft = Math.round(lVal / UNITS_PER_MM * 10) / 10
   if (rVal > 0 && rVal < 1000000) mRight = Math.round(rVal / UNITS_PER_MM * 10) / 10
   if (tVal > 0 && tVal < 1000000) mTop = Math.round(tVal / UNITS_PER_MM * 10) / 10
   if (bVal > 0 && bVal < 1000000) mBottom = Math.round(bVal / UNITS_PER_MM * 10) / 10
  }
  if (s[i] === 0x0d && s[i+1] === 0x01) {
   const cols = view.getUint16(i + 2, true)
   if (cols >= 1 && cols <= 8) columns = cols
  }
  if (s[i] === 0x06 && s[i+1] === 0x03) {
   const gVal = view.getUint32(i + 2, true)
   if (gVal > 0 && gVal < 500000) gap = Math.round(gVal / UNITS_PER_MM * 100) / 100
  }
 }
 const paper = (Math.abs(width - 215.9) < 3 && Math.abs(height - 279.4) < 3) ? 'Letter' : 'A4'
 const layout = { width, height, paper, marginLeft: mLeft, marginRight: mRight, marginTop: mTop, marginBottom: mBottom, columns, gap }

 // 2. Line records (0x85 0x7f)
 const lines = []
 for (let i = 0; i < s.length - 30; i++) {
  if (s[i] === 0x85 && s[i+1] === 0x7f) {
   const alignCode = view.getUint16(i + 2, true)
   const lineLen = view.getUint16(i + 6, true)
   const h = view.getUint16(i + 26, true)
   const pt = Math.round(h / 277.78)
   if (lineLen > 1) {
    lines.push({ offset: i, alignCode, lineLen, h, pt })
   }
  }
 }

  // 2.5 Font Detection
  let detectedUrduFont = 'Noori Nastaliq'
  for (let i = 0; i < Math.min(s.length - 20, 50000); i += 2) {
    if (s[i] >= 65 && s[i] <= 90 && s[i+1] === 0) {
      let str = '', j = i
      while (j + 1 < s.length && s[j] >= 32 && s[j] <= 126 && s[j+1] === 0) {
        str += String.fromCharCode(s[j])
        j += 2
      }
      if (str.length >= 3 && j + 1 < s.length && s[j] === 0 && s[j+1] === 0) {
        if (/nastaliq|nastaleeq|naskh|bombay|faiz|batool|pakistan|alvi|kasheeda|noori/i.test(str)) {
          detectedUrduFont = str.includes('Faiz') ? 'Faiz Lahori Nastaleeq' : str
          break
        }
      }
    }
  }
  if (detectedUrduFont === 'Noori Nastaliq') {
    for (let i = 0; i < Math.min(s.length - 20, 50000); i++) {
      if (s[i] >= 65 && s[i] <= 90) {
        let str = '', j = i
        while (j < s.length && s[j] >= 32 && s[j] <= 126) {
          str += String.fromCharCode(s[j])
          j++
        }
        if (s[j] === 0 && str.length >= 3) {
          if (/nastaliq|nastaleeq|naskh|bombay|faiz|batool|pakistan|alvi|kasheeda|noori/i.test(str)) {
            detectedUrduFont = str.includes('Faiz') ? 'Faiz Lahori Nastaleeq' : str
            break
          }
        }
      }
    }
  }

  // A font-table suffix can be encountered before the complete style name.
  // Resolve the native Noori alias only when its full name exists in the stream.
  if(detectedUrduFont==='Nastaliq'&&indexOfUtf16(s,'Noori Nastaliq')>=0)detectedUrduFont='Noori Nastaliq'
  // Trim leading/trailing blank paragraphs so pIdx === 0 corresponds to actual first title/heading
  let startIdx = 0
  while (startIdx < paragraphs.length && (!paragraphs[startIdx] || !paragraphs[startIdx].trim())) {
    startIdx++
  }
  let endIdx = paragraphs.length
  while (endIdx > startIdx && (!paragraphs[endIdx - 1] || !paragraphs[endIdx - 1].trim())) {
    endIdx--
  }
  const effectiveParagraphs = (startIdx > 0 || endIdx < paragraphs.length) ? paragraphs.slice(startIdx, endIdx) : paragraphs

  const nonBlank = effectiveParagraphs.filter(p => p && p.trim())
  // A cover and article can share a single native story. In that layout the
  // cached line records continue in stream order across the page boundary;
  // some paragraph entries (notably the email/contact line) have no cache
  // record, so the sequential cursor can drift onto the following paragraph.
  // Keep the native Bismillah page-opening line centered when its own exact
  // length record confirms the centered setting in the cover's line table.
  const openingIndex = effectiveParagraphs.findIndex(p => p?.trim().startsWith('بسم اللہ'))
  const hasCoverContact = openingIndex > 0 && effectiveParagraphs
   .slice(0, openingIndex)
   .some(p => /@/.test(p || ''))
  let lineIdx = 0
  if (nonBlank.length > 0) {
   const firstLen = nonBlank[0].length * 2
   const found = lines.findIndex(l => l.lineLen === firstLen)
   if (found >= 0) lineIdx = found
  }
  let currentLine = lineIdx
  const formattedParagraphs = effectiveParagraphs.map((p, pIdx) => {
   if (!p || !p.trim()) return { text: '', align: 'right', isHeading: false, level: 1, bold: false, fontSize: 12 }
   const pBytes = p.length * 2
   const pLines = []
   let accum = 0
   while (currentLine < lines.length && accum < pBytes) {
    const l = lines[currentLine++]
    pLines.push(l)
    accum += l.lineLen
   }
   let align = 'right'
   if (pLines.length && pLines.every(l => l.alignCode === 2)) {
    align = 'center'
   } else if (pLines.some(l => l.alignCode === 3 || l.alignCode === 1)) {
    align = 'justify'
   } else if (pLines.some(l => l.alignCode === 2)) {
    align = 'center'
   } else if (p.length > 100) {
    align = 'justify'
   }

   if (pIdx === openingIndex && hasCoverContact &&
       lines.some(l => l.lineLen === pBytes && l.alignCode === 2)) {
    align = 'center'
   }

   let isHeading = false, level = 1, bold = false, fontSize = 12
   if (align === 'center') {
    if (pIdx === 0 || p.length < 35) {
     isHeading = true; level = 1; bold = true; fontSize = 24
    } else if (p.length < 90) {
     isHeading = true; level = 2; bold = true; fontSize = 16
    } else {
     fontSize = 14
    }
   } else if (p.length < 80 && /^(باب|فصل|دفعہ|دستور|منشور|مادہ|قاعدہ|عنوان|ضمیمہ)/.test(p.trim())) {
    isHeading = true; level = 2; bold = true; fontSize = 14
   }
   return { text: p, align, isHeading, level, bold, fontSize, linesCount: pLines.length }
  })

  // 3. Embedded picture references with geometric coordinates
  const picStreams = new Map()
  if (cfbDoc?.FileIndex) {
   for (const entry of cfbDoc.FileIndex) {
    if (entry.content && entry.content[0] === 255 && entry.content[1] === 216) {
     const b = new Uint8Array(entry.content)
     picStreams.set(entry.name, b)
     if (entry.name.startsWith('*')) picStreams.set(entry.name.slice(1), b)
     else picStreams.set('*' + entry.name, b)
    }
   }
  }

  const pictureObjects = []
  const seenPics = new Set()
  let pSearchIdx = 0
  while (pSearchIdx < s.length - 12) {
   const pFound = indexOfUtf16(s, 'PPicts', pSearchIdx)
   if (pFound === -1) break
   const winStart = Math.max(0, pFound - 200)
   let x = 12.7, y = 12.7, w = 50, h = 50, page = 1
   for (let i = winStart; i < pFound - 6; i++) {
    if (s[i] === 0x00 && s[i+1] === 0x7e) x = view.getUint32(i + 2, true) / UNITS_PER_MM
    if (s[i] === 0x01 && s[i+1] === 0x7e) y = view.getUint32(i + 2, true) / UNITS_PER_MM
    if (s[i] === 0x02 && s[i+1] === 0x7e) w = view.getUint32(i + 2, true) / UNITS_PER_MM
    if (s[i] === 0x03 && s[i+1] === 0x7e) h = view.getUint32(i + 2, true) / UNITS_PER_MM
    if (s[i] === 0x10 && s[i+1] === 0x7e) page = view.getUint16(i + 2, true)
   }
   let nameStart = pFound
   if (pFound >= 2 && s[pFound - 2] === 42 && s[pFound - 1] === 0) nameStart = pFound - 2
   let nameEnd = nameStart
   while (nameEnd + 1 < s.length && !(s[nameEnd] === 0 && s[nameEnd + 1] === 0)) nameEnd += 2
   const picName = new TextDecoder('utf-16le').decode(s.subarray(nameStart, nameEnd))
   const picBytes = picStreams.get(picName)
   if (picBytes && !seenPics.has(picName)) {
    seenPics.add(picName)
    pictureObjects.push({
     name: picName,
     bytes: picBytes,
     x: Math.round(x * 10) / 10,
     y: Math.round(y * 10) / 10,
     w: Math.round(w * 10) / 10,
     h: Math.round(h * 10) / 10,
     page: page === 0 ? 0 : Math.max(1, page)
    })
   }
   pSearchIdx = pFound + 12
  }

  return { layout, font: detectedUrduFont, formattedParagraphs, pictureObjects }
 }

export function readNative(bytes){
 if(bytes.length>50*1024*1024)throw Error('Native files must be smaller than 50 MB.')
 const cfb=CFB.read(bytes,{type:'array'}),v3=cfb.FileIndex.find(e=>e.name==='InPage300'),v2=cfb.FileIndex.find(e=>e.name==='InPage200'),v1=cfb.FileIndex.find(e=>e.name==='InPage100')
 if(!v3&&!v2&&!v1)throw Error('This compound file has no supported InPage content stream.')
 const isOlderVersion=!v3&&!!(v2||v1)
 const version=v3?3:(v2?2:1)
 let story
 if(v3){
  const v3Stream = new Uint8Array(v3.content)
  const recovered = recoverV3(v3Stream)
  const meta = parseV3StreamMeta(v3Stream, cfb, recovered.paragraphs)
  const palette=readV3Palette(v3Stream)
  const records=readV3PageRecords(v3Stream,cfb.FileIndex,palette)
  const characterRuns=readV3TextStyles(v3Stream,recovered.range)
  const stories=readV3Stories(v3Stream,recovered)
  let paragraphStart=0
  const styledParagraphs=recovered.paragraphs.map(text=>{
   const prior=meta.formattedParagraphs.find(p=>p.text===text)
   const node=styledNativeParagraph(text,paragraphStart,characterRuns,{textAlign:prior?.align||'right'},palette)
   if(prior?.isHeading){node.type='heading';node.attrs.level=prior.level||1}
   paragraphStart+=text.length+1
   return {...prior,text,node}
  })
  story = {
   ...recovered,
   font: meta.font || 'Noori Nastaliq',
   formattedParagraphs: characterRuns.length?styledParagraphs:meta.formattedParagraphs,
   characterRuns,
   palette,
   stories,
   textFrames:records.textFrames,
   storyAssignments:assignV3Stories(stories,records.textFrames),
   layout: meta.layout,
   pictureObjects: records.pictureObjects.length?records.pictureObjects:meta.pictureObjects,
   nativePageCount: records.pageCount,
   pageBreakIndices: [...new Set([...(recovered.pageBreakIndices||[]),...inferCoverPageBreak(recovered.text)])].sort((a,b)=>a-b)
  }
 }else{
  const oldStream=v2||v1
  const parsed=parseOlderInPageStream(new Uint8Array(oldStream.content))
  story={
   paragraphs:parsed.paragraphs.map(p=>p.text),
   font: parsed.font || 'Noori Nastaliq',
   formattedParagraphs:parsed.paragraphs,
   layout:parsed.layout,
   text:parsed.text,
   pageBreakIndices:[]
  }
 }
 const pictures=cfb.FileIndex.filter(e=>e.content?.[0]===255&&e.content?.[1]===216).map(e=>new Uint8Array(e.content))
 return {
  ...story,
  pictures,
  version,
  isOlderVersion,
  warning:isOlderVersion
   ?'This file was created in an older version of this software and we have converted it for you. You can download it in older version by File -> Download for older InPage.'
   :'Recovered text; native layout and character styling are not fully decoded.'
 }
}
export function documentFingerprint(d){return JSON.stringify({direction:d.direction,font:d.font,size:d.size,paper:d.paper,margin:d.margin,pages:JSON.parse(JSON.stringify(d.pages, (k,v)=>['beginIndent','endIndent'].includes(k)&&v===0?undefined:v)),objects:d.objects,baseStyle:d.baseStyle,...(d.settings?.orientation==='landscape'?{orientation:'landscape'}:{}),settings:Object.fromEntries(['paper','paperWidth','paperHeight','margin','marginLeft','marginRight','marginTop','marginBottom','columns','gap','facing','wrap','hyphenation','tabSize','borderWidth','borderColor'].map(k=>[k,d.settings?.[k]])),documentPreferences:d.preferences?.doc,typographicPreferences:d.preferences?.typo,customStyles:d.customStyles,colors:d.colors,footnotes:d.footnotes})}
export function unchangedNative(d){return !!d.nativeSource&&documentFingerprint(d)===d.nativeSource.baseline}

// Refresh paragraph alignment from a newly decoded native file without
// replacing other edits in a saved draft. Older imports can have a valid INP
// source but a stale alignment cache; only migrate a frame if its current
// alignment still matches the saved import baseline and its text is unchanged.
export function refreshNativeStoryAlignments(d,fresh){
 if(!d?.nativeSource?.baseline||!Array.isArray(d.objects)||!Array.isArray(fresh?.objects))return false
 let baseline
 try{baseline=JSON.parse(d.nativeSource.baseline)}catch{return false}
 const oldObjects=baseline.objects||[],nextObjects=d.objects.map(o=>({...o}))
 let changed=false
 for(const object of nextObjects){
  if(!Array.isArray(object.runs))continue
  const sameFrame=o=>o.id===object.id||(o.recordOffset!=null&&o.recordOffset===object.recordOffset)||
   (object.autoPaginate&&o.autoPaginate&&o.text===object.text)
  const prior=oldObjects.find(sameFrame)
  const decoded=fresh.objects.find(o=>o._nativeStoryRange&&sameFrame(o))
  if(!prior||!decoded||object.text!==decoded.text)continue
  const alignments=runs=>(runs||[]).filter(r=>r.align).map(({from,to,align})=>({from,to,align}))
  if(JSON.stringify(alignments(object.runs))!==JSON.stringify(alignments(prior.runs)))continue
  const corrected=alignments(decoded.runs)
  if(JSON.stringify(alignments(object.runs))===JSON.stringify(corrected))continue
  object.runs=object.runs.map(run=>{const {align,...rest}=run;return rest}).filter(run=>Object.keys(run).length)
  object.runs.push(...corrected)
  if(Array.isArray(decoded.pageBreakOffsets))object.pageBreakOffsets=[...decoded.pageBreakOffsets]
  changed=true
 }
 if(changed)d.objects=nextObjects
 return changed
}

// Older local drafts of the UMA cover were saved before the two explicit
// centered paragraph records were decoded. Preserve the draft and repair only
// those paragraph alignment spans from the native file's observed layout.
export function repairUmaCoverAlignments(d){
 if(!/UMA[ -]Vision/i.test(d?.title||'' )||!Array.isArray(d.objects))return false
 const targets=new Set(['منشور','بسم اللہ الرحمٰن الرحیم'])
 let changed=false
 for(const frame of d.objects.filter(o=>['text','title'].includes(o.type)&&typeof o.text==='string')){
  const paragraphs=[];let from=0
  for(const part of frame.text.split('\n')){const value=part.trim().replace(/[\u200b-\u200f\u202a-\u202e\ufeff]/g,'');if([...targets].some(target=>value.includes(target)))paragraphs.push({from,to:from+part.length});from+=part.length+1}
  if(!paragraphs.length)continue
  frame.richParagraphs=true
  frame.runs=Array.isArray(frame.runs)?frame.runs:[]
  for(const p of paragraphs){
   if(frame.runs.some(r=>r.align==='center'&&r.from<=p.from&&r.to>=p.to))continue
   frame.runs=frame.runs.map(run=>{if(!run.align||run.to<=p.from||run.from>=p.to)return run;const {align,...rest}=run;return Object.keys(rest).length?rest:null}).filter(Boolean)
   frame.runs.push({from:p.from,to:p.to,align:'center'});changed=true
  }
 }
 if(changed&&d.nativeSource?.baseline)d.nativeSource.baseline=documentFingerprint(d)
 return changed
}
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('inpage-net-native',2);r.onupgradeneeded=()=>{for(const name of ['sources','workspace'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
export async function storeNative(key,bytes){const connection=await db();await new Promise((resolve,reject)=>{const tx=connection.transaction('sources','readwrite');tx.objectStore('sources').put(bytes,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});connection.close()}
export async function loadNative(key){const connection=await db();try{return await new Promise((resolve,reject)=>{const r=connection.transaction('sources').objectStore('sources').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{connection.close()}}
export async function storeWorkspace(value){const connection=await db();try{await new Promise((resolve,reject)=>{const tx=connection.transaction('workspace','readwrite');tx.objectStore('workspace').put(value,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{connection.close()}}
export async function loadWorkspace(){const connection=await db();try{return await new Promise((resolve,reject)=>{const r=connection.transaction('workspace').objectStore('workspace').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{connection.close()}}

// Preserve every OLE sector and unknown record. This deliberately cannot resize
// stories or change paragraph/style offsets until those records are understood.
export function patchV3Text(bytes,range,text){
 if(!range||range.end-range.start!==text.length*2)throw Error('Native text editing currently requires exactly the same number of characters.')
 const compound=CFB.read(bytes,{type:'array'}),entry=compound.FileIndex.find(e=>e.name==='InPage300')
 if(!entry||entry.storage!=='fat')throw Error('This native stream storage is not supported for writing.')
 if(range.start<0||range.end>entry.size)throw Error('Invalid native text range.')
 const original=new TextDecoder('utf-16le').decode(new Uint8Array(entry.content).slice(range.start,range.end))
 for(let i=0;i<text.length;i++)if((original[i]==='\r')!==(text[i]==='\r')||(original[i]==='\n')!==(text[i]==='\n'))throw Error('Native paragraph boundaries must stay unchanged.')
 const output=new Uint8Array(bytes),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),sectorSize=2**view.getUint16(30,true),fatCount=view.getUint32(44,true),fat=[]
 const read32=offset=>{if(offset<0||offset+4>bytes.length)throw Error('Broken native sector table.');return view.getUint32(offset,true)}
 for(let i=0;i<109&&fat.length<fatCount;i++){const n=read32(76+i*4);if(n<0xfffffffa)fat.push(n)}
 let difat=read32(68),guard=0
 while(fat.length<fatCount&&difat<0xfffffffa&&guard++<read32(72)){const base=(difat+1)*sectorSize;for(let i=0;i<sectorSize/4-1&&fat.length<fatCount;i++){const n=read32(base+i*4);if(n<0xfffffffa)fat.push(n)}difat=read32(base+sectorSize-4)}
 if(fat.length!==fatCount)throw Error('Incomplete native sector table.')
 let sector=entry.start,index=0;const seen=new Set()
 while(index*sectorSize<range.end){if(sector>=0xfffffffa||seen.has(sector))throw Error('Broken native stream chain.');seen.add(sector);const begin=index*sectorSize,end=begin+sectorSize
  for(let pos=Math.max(range.start,begin);pos<Math.min(range.end,end);pos++){const char=text.charCodeAt(Math.floor((pos-range.start)/2)),physical=(sector+1)*sectorSize+pos-begin;if(physical>=output.length)throw Error('Native sector outside file.');output[physical]=(pos-range.start)%2?char>>8:char&255}
  const fatSector=fat[Math.floor(sector/(sectorSize/4))];if(fatSector===undefined)throw Error('Missing native FAT sector.');sector=read32((fatSector+1)*sectorSize+sector%(sectorSize/4)*4);index++
 }
 return output
}
export function writeNativeText(d,bytes){
 if(!d.nativeSource?.textRange)throw Error('Edited native writing is supported only for the inspected AboutFaiz Unicode story.')
 const baseline=JSON.parse(d.nativeSource.baseline),current=JSON.parse(documentFingerprint(d)),id=d.nativeSource.storyId
 const before=baseline.objects?.find(o=>o.id===id),after=current.objects?.find(o=>o.id===id);if(!before||!after)throw Error('The native story frame is missing.')
 const oldText=before.text,newText=after.text;before.text=after.text=''
 if(JSON.stringify(baseline)!==JSON.stringify(current))throw Error('Native layout or formatting changes cannot be written yet. Save these edits as .ipdoc or PDF.')
 if(newText.length!==oldText.length)throw Error('Native text edits must preserve character counts and paragraph boundaries. Adding or removing text is not supported yet.')
 const source=readNative(bytes),range=d.nativeSource.textRange,offset=(range.start-source.range.start)/2
 if(offset<0||range.end>source.range.end||source.text.slice(offset,offset+oldText.length)!==oldText.replace(/\n/g,'\r'))throw Error('The native source and editable story do not match. Reopen the original .inp.')
 return patchV3Text(bytes,d.nativeSource.textRange,newText.replace(/\n/g,'\r'))
}
