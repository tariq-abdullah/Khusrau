import * as CFB from 'cfb'
import {decodeV1V2,filterParagraphs,filterParagraphsWithMeta,CHAR_MAP_URDU,COMPOSITE_SEQUENCES} from 'inpage-format'
import { parseOlderInPageStream, buildOlderInPageFile } from './olderInPage.js'

const charToByte = new Map()
for (const [b, ch] of CHAR_MAP_URDU) {
 if (!charToByte.has(ch)) charToByte.set(ch, b)
}

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

// V3 Unicode stories are contiguous UTF-16LE. The published decoder's
// paragraph-count table interpretation truncates this particular native file.
export function recoverV3(stream){
 const candidates=[]
 for(let i=0;i<stream.length-6;i++){
  if(stream[i]!==255||stream[i+1]!==255||stream[i+2]!==255||stream[i+3]!==255||stream[i+4]!==13||stream[i+5]!==0)continue
  let end=i+6,arabic=0
  for(;end+1<stream.length;end+=2){const n=stream[end]|stream[end+1]<<8;
   if(!(n===9||n===10||n===13||n>=32&&n<=126||n===160||n>=0x600&&n<=0x8ff||n>=0x2000&&n<=0x206f||n>=0xfb50&&n<=0xfdff||n>=0xfe70&&n<=0xfeff))break
   if(n>=0x600&&n<=0x8ff)arabic++
  }
  if(arabic>10)candidates.push({start:i+6,end,arabic})
 }
 candidates.sort((a,b)=>(b.end-b.start)-(a.end-a.start))
 const run=candidates[0];if(!run)throw Error('No supported Unicode story found. This file needs a different InPage decoder.')
 const text=new TextDecoder('utf-16le').decode(stream.slice(run.start,run.end))
 return {text,paragraphs:text.split(/\r\n?|\n/),range:run,candidateCount:candidates.length}
}
export function readNative(bytes){
 if(bytes.length>50*1024*1024)throw Error('Native files must be smaller than 50 MB.')
 const cfb=CFB.read(bytes,{type:'array'}),v3=cfb.FileIndex.find(e=>e.name==='InPage300'),v2=cfb.FileIndex.find(e=>e.name==='InPage200'),v1=cfb.FileIndex.find(e=>e.name==='InPage100')
 if(!v3&&!v2&&!v1)throw Error('This compound file has no supported InPage content stream.')
 const isOlderVersion=!v3&&!!(v2||v1)
 const version=v3?3:(v2?2:1)
 let story
 if(v3){
  story=recoverV3(new Uint8Array(v3.content))
 }else{
  const oldStream=v2||v1
  const parsed=parseOlderInPageStream(new Uint8Array(oldStream.content))
  story={
   paragraphs:parsed.paragraphs.map(p=>p.text),
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
export function documentFingerprint(d){return JSON.stringify({direction:d.direction,font:d.font,size:d.size,paper:d.paper,margin:d.margin,pages:JSON.parse(JSON.stringify(d.pages, (k,v)=>['beginIndent','endIndent'].includes(k)&&v===0?undefined:v)),objects:d.objects,baseStyle:d.baseStyle,...(d.settings?.orientation==='landscape'?{orientation:'landscape'}:{}),settings:Object.fromEntries(['paper','margin','columns','gap','wrap','hyphenation','tabSize','borderWidth','borderColor'].map(k=>[k,d.settings?.[k]])),footnotes:d.footnotes})}
export function unchangedNative(d){return !!d.nativeSource&&documentFingerprint(d)===d.nativeSource.baseline}
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
