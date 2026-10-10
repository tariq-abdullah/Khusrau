import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeRect,linkFrames,rootFrame,validateObjects,kashidaText,removeRecords} from '../src/objects.js'
import {parseDocument} from '../src/document.js'
import {getSchema} from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {TableKit} from '@tiptap/extension-table'
import {Metrics,ParagraphLayout} from '../src/extensions.js'
const frame=id=>({id,type:'text',x:0,y:0,w:100,h:50,text:''})
test('backward drag produces positive drawing geometry',()=>assert.deepEqual(normalizeRect(100,80,10,20),{x:10,y:20,w:90,h:60}))
test('frame chains find the root and refuse cycles or duplicate incoming links',()=>{const a=[frame('a'),frame('b'),frame('c')];linkFrames(a,'a','b');linkFrames(a,'b','c');assert.equal(rootFrame(a,'c').id,'a');assert.throws(()=>linkFrames(a,'c','a'));assert.throws(()=>linkFrames(a,'c','b'))})
test('picture frames cannot be linked into text chains',()=>assert.throws(()=>linkFrames([{...frame('a'),type:'picture'},frame('b')],'a','b')))
test('objects reject duplicate IDs, invalid dimensions, and remote image sources',()=>{assert.throws(()=>validateObjects([frame('a'),frame('a')]));assert.throws(()=>validateObjects([{...frame('a'),w:-1}]));assert.throws(()=>validateObjects([{...frame('a'),src:'https://example.com/a.png'}]))})
test('Kashida adds only at joining characters and removal restores text',()=>{assert.equal(kashidaText('سلام',1),'سـلام');assert.equal(kashidaText('سلام',2),'ســلام');assert.equal(kashidaText(kashidaText('سلام',2),0),'سلام');assert.equal(kashidaText('اردو',1),'اردو')})
test('extended document round-trip preserves pages and frames and rejects a cycle',()=>{const a=[frame('a'),frame('b')];linkFrames(a,'a','b');const d={format:'inpage-net',version:1,direction:'rtl',size:12,margin:13,paper:'A4',content:{type:'doc'},pages:[{id:'page',content:{type:'doc'}}],objects:a};assert.deepEqual(parseDocument(JSON.stringify(d)),d);a[1].next='a';assert.throws(()=>parseDocument(JSON.stringify(d)))})
test('typography and table-cell background attributes survive document serialization',()=>{const schema=getSchema([StarterKit,Metrics,ParagraphLayout,TableKit]);const doc=schema.node('doc',null,[schema.node('paragraph',{leading:24,fullJustify:true},[schema.text('اردو',[schema.mark('metrics',{tracking:10,scale:120,baseline:3,decoration:'Double',outline:true})])])]);const restored=schema.nodeFromJSON(doc.toJSON());assert.equal(restored.firstChild.attrs.leading,24);assert.equal(restored.firstChild.attrs.fullJustify,true);assert.equal(restored.firstChild.firstChild.marks[0].attrs.scale,120);assert.equal(schema.nodes.tableCell.create({backgroundColor:'#ff0000'}).attrs.backgroundColor,'#ff0000')})

test('deleting linked frames preserves story and reconnects surviving frames',()=>{const a=[{...frame('a'),text:'سلام دنیا'},frame('b'),frame('c')];linkFrames(a,'a','b');linkFrames(a,'b','c');const first=removeRecords(a,['a']);assert.equal(first[0].text,'سلام دنیا');assert.equal(first[0].next,'c');const middle=removeRecords(a,['b']);assert.equal(middle[0].text,'سلام دنیا');assert.equal(middle[0].next,'c');assert.equal(a[0].next,'b')})
