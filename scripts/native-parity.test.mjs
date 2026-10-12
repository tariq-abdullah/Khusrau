import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {readNative,documentFingerprint,unchangedNative} from '../src/native.js'
import {nativeDocument} from '../src/nativeDocument.js'
import {splitInlineContent} from '../src/richSplit.js'
import {storySegments} from '../src/frameStory.js'
import {readV3TextStyles} from '../src/nativeTextStyles.js'
import {readV3Palette} from '../src/nativePalette.js'
import {createNativeColumnFrames} from '../src/nativeColumnFrames.js'
const source=fs.readFileSync(new URL('../research/fixtures/UMA-Vision-native.inp',import.meta.url))

test('native character spans preserve actual heading size and body weight without shifting the first character',()=>{
 const n=readNative(fs.readFileSync(new URL('../research/fixtures/two-page-native.inp',import.meta.url)))
 assert.equal(n.characterRuns.length,4)
 const heading=n.formattedParagraphs.find(p=>p.text.trim())
 assert.equal(heading.node.content.length,1)
 assert.equal(heading.node.content[0].text,heading.text)
 assert.equal(heading.node.content[0].marks[0].attrs.fontSize,'20pt')
 assert.ok(heading.node.content[0].marks.some(m=>m.type==='bold'))
 const body=n.formattedParagraphs.find(p=>p.text.startsWith('پیراگراف 1'))
 assert.ok(body.node.content.every(p=>p.marks.some(m=>m.type==='bold')))
 assert.ok(body.node.content.every(p=>p.marks.some(m=>m.type==='textStyle'&&m.attrs.fontSize==='12pt')))
 const d=nativeDocument(n,'fixture.inp')
 const rendered=d.pages.flatMap(p=>p.content.content).find(p=>p.content?.some(c=>c.text?.includes('اردو اشاعت')))
 assert.equal(rendered.content[0].marks[0].attrs.fontSize,'20pt')
 const linked=createNativeColumnFrames(nativeDocument(n,'fixture.inp'),n)
 const frames=linked.objects.filter(o=>o.type==='text')
 assert.equal(frames.length,4)
 assert.equal(linked.pages.length,2)
 assert.ok(frames[0].x>frames[1].x)
 assert.equal(frames[0].next,frames[1].id)
 assert.equal(frames[1].next,frames[2].id)
 assert.equal(frames[0].text,n.text.replace(/\r/g,'\n'))
 assert.equal(frames[0].runs.find(r=>r.fontSize===20).color,'#28166f')
 assert.equal(linked.settings.autoTextBox,false)
 assert.ok(linked.objects.at(-1).master)
})

test('UMA saved character-format table covers its story and supplies cover size and leading',()=>{
 const n=readNative(source)
 assert.equal(n.characterRuns.length,590)
 assert.equal(n.characterRuns.at(-1).to,n.text.length)
 const title=n.formattedParagraphs.find(p=>p.text==='منشور')
 assert.equal(title.node.content.length,1)
 assert.equal(title.node.content[0].marks[0].attrs.fontSize,'36pt')
 assert.equal(title.node.attrs.leading,40)
 assert.equal(title.node.content[0].marks[0].attrs.color,'#28166f')
 assert.equal(n.palette.length,100)
 assert.equal(n.palette.find(c=>c.name==='Cyan').color,'#0093dd')
 const d=nativeDocument(n,'UMA.inp')
 assert.equal(d.baseStyle.size,12)
 assert.ok(d.objects.some(o=>o.type==='text'&&o.text.includes('منشور')))
 assert.equal(d.pages.length,16)
 const root=d.objects.find(o=>o._nativeStoryRange)
 const bodyRun=root.runs[0],sourceOffset=root._nativeStoryRange.from,sourceRun=n.characterRuns.find(r=>r.from<=sourceOffset&&r.to>sourceOffset)
 assert.ok(Math.abs(bodyRun.leading-sourceRun.leading*.89)<.001,'Noori native leading must use the calibrated bundled-font line metric')
 const css=fs.readFileSync(new URL('../src/style.css',import.meta.url),'utf8')
 assert.match(css,/font-family:'Noori Nastaliq';src:url\('\/fonts\/Jameel%20Noori%20Nastaleeq\.ttf'\)/)
 assert.doesNotMatch(css,/font-family:'Noori Nastaliq';src:local\(/)
 assert.deepEqual(readV3TextStyles(new Uint8Array(24),{start:0,end:2}),[])
 assert.deepEqual(readV3Palette(new Uint8Array(24)),[])
})

test('linked frame measurement and rendering share heading font, size, leading and color',()=>{
 const runs=[{from:0,to:8,color:'#2e1b4e',font:'Noori Nastaliq',fontSize:20,leading:30,bold:true,align:'center'}]
 const segments=storySegments('عنوان\nمتن',2,runs)
 assert.deepEqual(segments[0].style,{fontFamily:'Noori Nastaliq',fontSize:'20pt',lineHeight:'30pt',fontWeight:'bold',textAlign:'center'})
 const app=fs.readFileSync(new URL('../src/App.vue',import.meta.url),'utf8')
 assert.ok(app.includes('...p.style,color:p.color'))
 assert.ok(!app.includes("o.leading+'pt':'2.1'"))
})
test('native unchanged detection includes margins, paper dimensions and master page numbering',()=>{
 const d={pages:[],objects:[],settings:{paperWidth:127,marginTop:12.7},preferences:{doc:{pageNumberStart:1}}}
 d.nativeSource={baseline:documentFingerprint(d)}
 assert.ok(unchangedNative(d))
 for(const modify of [x=>x.settings.paperWidth=210,x=>x.settings.marginTop=20,x=>x.preferences.doc.pageNumberStart=3]){
  const changed=structuredClone(d);modify(changed);assert.equal(unchangedNative(changed),false)
 }
})
test('UMA picture references resolve by stream name and native page, excluding unused JPEGs',()=>{
 const n=readNative(source)
 assert.equal(n.nativePageCount,16)
 assert.deepEqual(n.pictureObjects.map(p=>p.page),[1,1,1,7,7,8,15,16])
 assert.equal(n.pictureObjects[0].name,'*PPictsd4092521')
 assert.ok(Math.abs(n.pictureObjects[0].x-41.745958)<.0001)
 assert.ok(Math.abs(n.pictureObjects[2].y-50.36379)<.0001)
 assert.ok(Math.abs(n.pictureObjects[4].h-46.03785)<.0001)
 // Native PDF image bounds are independent evidence for box-relative transforms.
 const stamp=n.pictureObjects[0],photo=n.pictureObjects[3]
 assert.ok(Math.abs((stamp.x+stamp.imageX)*72/25.4-120.317)<.002)
 assert.ok(Math.abs((stamp.y+stamp.imageY)*72/25.4-42.58398)<.002)
 assert.ok(Math.abs(stamp.imageWidth*72/25.4-118.017)<.002)
 assert.ok(Math.abs((photo.y+photo.imageY)*72/25.4-(-16.499))<.002)
 const d=nativeDocument(n,'UMA.inp')
 assert.equal(d.objects.filter(o=>o.type==='picture').length,8)
 assert.equal(d.objects.filter(o=>o.type==='text').length,d.importReport.recoveredNativeTextFrames)
 assert.equal(d.pages.length,16)
 assert.equal(d.objects.find(o=>o.type==='picture').src,'data:image/jpeg;base64,'+Buffer.from(n.pictureObjects[0].bytes).toString('base64'))
 assert.equal(d.objects.filter(o=>o.type==='picture')[3].page,'page-7')
})
test('newly placed picture records preserve cropping and actual page assignment',()=>{
 const n=readNative(fs.readFileSync(new URL('../research/fixtures/two-page-native.inp',import.meta.url)))
 assert.equal(n.nativePageCount,2)
 assert.equal(n.layout.columns,2)
 assert.equal(n.font,'Noori Nastaliq')
 assert.equal(n.pictureObjects.length,2)
 const master=n.pictureObjects.find(p=>p.master)
 assert.ok(master)
 assert.equal(master.fill,'#ffffff')
 assert.ok(Math.abs(master.imageWidth/master.w-.25)<.0001)
 const p=n.pictureObjects.find(p=>!p.master)
 assert.equal(p.page,2)
 assert.ok(Math.abs(p.x-20)<.001)
 assert.ok(Math.abs(p.w-40)<.001)
 assert.ok(p.imageX<-29&&p.imageWidth>69)
 assert.equal(p.wrap,'box')
 for(const [k,value] of Object.entries({wrapLeft:2,wrapTop:1,wrapRight:3,wrapBottom:4}))assert.ok(Math.abs(p[k]-value)<.001)
 const off=readNative(fs.readFileSync(new URL('../research/uma-comparison/two-page-wrap-off.inp',import.meta.url)))
 assert.equal(off.pictureObjects.find(x=>!x.master).wrap,'none')
 const d=nativeDocument(n,'two-page.inp')
 assert.ok(Math.abs(d.objects.find(o=>!o.master).imageX-p.imageX*96/25.4)<.0001)
 assert.equal(d.objects.filter(o=>o.master).length,1)
 assert.equal(d.objects.at(-1).master,true)
 assert.equal(d.objects.at(-1).fill,'#ffffff')
 const red=readNative(fs.readFileSync(new URL('../research/uma-comparison/two-page-master-red.inp',import.meta.url)))
 assert.equal(red.pictureObjects.find(p=>p.master).fillColorIndex,4)
 assert.equal(red.pictureObjects.find(p=>p.master).fill,'#da251d')
})
test('page overflow preserves mixed fonts, colors, bold, links and spaces at a split',()=>{
 const content=[{type:'text',text:'اب ',marks:[{type:'bold'}]},{type:'text',text:'سلام دنیا',marks:[{type:'textStyle',attrs:{color:'#123456',fontSize:'20pt'}},{type:'link',attrs:{href:'https://example.com'}}]},{type:'hardBreak'},{type:'text',text:'آخر'}]
 const [before,after]=splitInlineContent(content,7)
 assert.equal(before.map(x=>x.text||'').join(''),'اب سلام')
 assert.equal(after.map(x=>x.text||'').join(''),' دنیاآخر')
 assert.deepEqual(after[0].marks,content[1].marks)
 assert.equal(after[1].type,'hardBreak')
 assert.deepEqual(content[1].text,'سلام دنیا')
})
