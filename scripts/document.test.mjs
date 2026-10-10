import test from 'node:test'
import assert from 'node:assert/strict'
import {parseDocument,keys} from '../src/document.js'
const d={format:'inpage-net',version:1,title:'اردو',direction:'rtl',size:18,margin:15,paper:'A4',content:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'سلام دنیا'}]}]}}
test('Unicode document survives save/open',()=>assert.deepEqual(parseDocument(JSON.stringify(d)),d))
test('rejects foreign format and unsafe page configuration',()=>{assert.throws(()=>parseDocument('{}'));assert.throws(()=>parseDocument(JSON.stringify({...d,margin:-5})));assert.throws(()=>parseDocument(JSON.stringify({...d,size:1000})))})
test('phonetic alphabet produces Unicode Urdu',()=>assert.equal([... 's l a m'].map(k=>keys[k]||k).join(''),'س ل ا م'))
