import test from 'node:test'
import assert from 'node:assert/strict'
import {paginateMeasured} from '../src/measuredPagination.js'

test('measured pagination splits a styled paragraph at measured capacity without losing spaces or marks',()=>{
 const text='اردو متن '.repeat(30),marks=[{type:'bold'},{type:'textStyle',attrs:{fontSize:'12pt',color:'#28166f'}}]
 const node={type:'paragraph',attrs:{leading:18,textAlign:'justify'},content:[{type:'text',text,marks}]}
 const pages=paginateMeasured([node],nodes=>nodes.reduce((sum,n)=>sum+n.content.reduce((s,c)=>s+(c.text?.length||0),0),0)<=50)
 assert.ok(pages.length>1)
 assert.equal(pages.flatMap(p=>p.content.content).flatMap(n=>n.content).map(c=>c.text).join(''),text)
 for(const p of pages)for(const n of p.content.content){assert.deepEqual(n.attrs,node.attrs);assert.deepEqual(n.content[0].marks,marks)}
})

test('measured pagination respects page-specific capacity and refuses an impossible box without dropping text',()=>{
 const n={type:'paragraph',content:[{type:'text',text:'abcdefghij'}]}
 const pages=paginateMeasured([n],(nodes,page)=>nodes.flatMap(n=>n.content).reduce((s,c)=>s+c.text.length,0)<=(page===2?3:4),{startPage:2})
 assert.deepEqual(pages.map(p=>p.id),['page-2','page-3','page-4'])
 assert.equal(pages.flatMap(p=>p.content.content).flatMap(n=>n.content).map(c=>c.text).join(''),'abcdefghij')
 assert.throws(()=>paginateMeasured([n],()=>false),/cannot fit/)
 assert.throws(()=>paginateMeasured([n],nodes=>nodes[0].content[0].text.length<=1,{maxPages:2}),/page limit/)
})
