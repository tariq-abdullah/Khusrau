import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {readNative,recoverV3,unchangedNative,documentFingerprint,patchV3Text,writeNativeText} from '../src/native.js'
import {nativeDocument} from '../src/nativeDocument.js'
import {storySegments,rebaseRuns} from '../src/frameStory.js'
import {parseDocument} from '../src/document.js'
const nativeFixtureMissing=!fs.existsSync(new URL('../research/fixtures/AboutFaiz-native-saved.inp',import.meta.url))||!fs.existsSync(new URL('../research/fixtures/aboutfaiz-full-text.json',import.meta.url))

test('freshly saved AboutFaiz recovers the entire story, not the truncated introductory paragraph',{skip:nativeFixtureMissing?'Local native fixture is not included in Git':false},()=>{
 const n=readNative(fs.readFileSync(new URL('../research/fixtures/AboutFaiz-native-saved.inp',import.meta.url)))
 const expected=JSON.parse(fs.readFileSync(new URL('../research/fixtures/aboutfaiz-full-text.json',import.meta.url),'utf8'))
 assert.deepEqual(n.paragraphs,expected);assert.equal(n.text.length,10185);assert.equal(n.pictures.length,2)
 assert.ok(n.text.includes('http://www.axissoftmedia.com'))
 const d=nativeDocument(n,'AboutFaiz.inp');assert.equal(d.pages.length,2);assert.equal(d.objects.filter(o=>o.type==='text').length,4);assert.equal(d.objects[0].text.length,n.text.trim().replace(/\r/g,'\n').length)
 assert.ok(d.objects[0].runs.length>5);assert.equal(d.objects[0].next,d.objects[1].id);assert.doesNotThrow(()=>parseDocument(JSON.stringify(d)))
})
test('unsupported or empty Unicode stream fails explicitly',()=>assert.throws(()=>recoverV3(new Uint8Array(20))))
test('native byte-preserving export rejects edits but permits page navigation',()=>{
 const d={pages:[{id:'p',content:{type:'doc',content:[]}}],objects:[],settings:{margin:12.7},size:12}
 d.nativeSource={baseline:documentFingerprint(d)};assert.ok(unchangedNative(d));d.currentPage=1;assert.ok(unchangedNative(d));d.pages[0].content.content.push({type:'text',text:'سلام'});assert.equal(unchangedNative(d),false)
})
test('heading color survives a linked-frame split in the middle of its paragraph',()=>assert.deepEqual(storySegments('لام\nدنیا',2,[{from:0,to:6,color:'#ff0000'}]),[{text:'لام',color:'#ff0000'},{text:'دنیا',color:null}]))
test('inserting text before a colored heading shifts its range',()=>assert.deepEqual(rebaseRuns([{from:4,to:9,color:'#ff0000'}],'abc\nسلام\n','xyz abc\nسلام\n',0),[{from:8,to:13,color:'#ff0000'}]))
test('native Unicode replacement preserves the container and changes only story bytes',{skip:nativeFixtureMissing?'Local native fixture is not included in Git':false},()=>{
 const bytes=new Uint8Array(fs.readFileSync(new URL('../research/fixtures/AboutFaiz-native-saved.inp',import.meta.url))),n=readNative(bytes),newText=n.text.replace('فیض','راز'),output=patchV3Text(bytes,n.range,newText)
 assert.equal(output.length,bytes.length);assert.equal(readNative(output).text,newText)
 assert.deepEqual(readNative(output).pictures,n.pictures)
 assert.equal(output.reduce((count,b,i)=>count+(b!==bytes[i]),0),3)
 assert.throws(()=>patchV3Text(bytes,n.range,newText+'ا'));assert.throws(()=>patchV3Text(bytes,n.range,newText.replace('\r',' ')))
})
test('native document writer permits tested text edits and rejects layout or provenance changes',{skip:nativeFixtureMissing?'Local native fixture is not included in Git':false},()=>{
 const bytes=new Uint8Array(fs.readFileSync(new URL('../research/fixtures/AboutFaiz-native-saved.inp',import.meta.url))),n=readNative(bytes),d=nativeDocument(n,'AboutFaiz.inp'),root=d.objects[0]
 d.nativeSource={baseline:documentFingerprint(d),storyId:root.id,textRange:{start:5504,end:25868}}
 root.text=root.text.replace('فیض','راز');assert.ok(readNative(writeNativeText(d,bytes)).text.startsWith('\r\rراز'))
 root.fontSize=9;assert.throws(()=>writeNativeText(d,bytes),/formatting/);root.fontSize=8
 d.nativeSource.textRange={start:5502,end:25866};assert.throws(()=>writeNativeText(d,bytes),/do not match/)
})

test('opens UMA-Vision Doc P.inp with tag 0x0002 header and recovers Unicode story, layout, and embedded pictures',()=>{
 const fileUrl=new URL('../research/oldversionfilesinpage/UMA-Vision Doc P.inp',import.meta.url)
 if(!fs.existsSync(fileUrl))return
 const bytes=new Uint8Array(fs.readFileSync(fileUrl))
 const n=readNative(bytes)
 assert.equal(n.version,3)
 assert.equal(n.isOlderVersion,false)
 assert.ok(n.text.length>30000)
 assert.ok(n.text.includes('منشور'))
 assert.ok(n.text.includes('اردو میڈیا ایسوسی ایشن'))
 assert.ok(n.text.includes('اردو صحافت'))
 assert.ok(n.pictures.length>=10)
 assert.equal(n.layout.width,127)
 assert.equal(n.layout.height,203.2)
 assert.equal(n.layout.marginLeft,12.7)
 const d=nativeDocument(n,'UMA-Vision Doc P.inp')
 assert.doesNotThrow(()=>parseDocument(JSON.stringify(d)))
 assert.ok(d.content.content.length>100)
 assert.ok(d.content.content.some(node=>node.type==='heading'&&node.attrs?.textAlign==='center'))
 assert.ok(d.content.content.some(node=>node.attrs?.textAlign==='justify'))
 assert.equal(d.paperWidth,127)
 assert.equal(d.paperHeight,203.2)
 assert.ok(d.objects.length>=8)
 assert.equal(d.objects[0].type,'picture')
 assert.ok(d.objects[0].src.startsWith('data:image/jpeg;base64,'))
})

