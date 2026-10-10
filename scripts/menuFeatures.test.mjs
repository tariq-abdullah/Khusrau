import test from 'node:test'
import assert from 'node:assert/strict'
import {findTextMatches,textStatistics,pageInsertionIndex,dateFormats,duplicateOffsets} from '../src/menuFeatures.js'
import {documentFingerprint} from '../src/native.js'
test('whole-word search respects Urdu marks and adjacent words',()=>{
 assert.deepEqual(findTextMatches('فیض فیضی فیض', 'فیض',{wholeWord:true}),[{from:0,to:3},{from:9,to:12}])
 assert.equal(findTextMatches('Alpha alphabet ALPHA','alpha',{wholeWord:true,matchCase:false}).length,2)
 assert.equal(findTextMatches('','').length,0)
})
test('before/after insertion retains the current page position',()=>{
 assert.equal(pageInsertionIndex(1,3,'before'),1)
 assert.equal(pageInsertionIndex(1,3,'after'),2)
 assert.equal(pageInsertionIndex(1,3,'end'),3)
})
test('story statistics count paragraphs without losing empty lines',()=>{
 assert.deepEqual(textStatistics('one two\n\nthree'),{words:3,characters:14,paragraphs:3})
 assert.equal(dateFormats(new Date(2026,9,10))[0],'10/10/2026')
})
test('grid duplication preserves relative geometry and includes the original in counts',()=>{
 assert.deepEqual(duplicateOffsets([{x:10,y:20,w:100,h:50},{x:80,y:80,w:20,h:20}],2,2,5,10),[{x:110,y:0},{x:0,y:85},{x:110,y:85}])
})
test('native layout fingerprint rejects landscape but ignores added zero indents',()=>{
 const old={pages:[{content:{type:'doc',content:[{type:'paragraph',attrs:{}}]}}],settings:{}}
 const upgraded=structuredClone(old);upgraded.pages[0].content.content[0].attrs={beginIndent:0,endIndent:0};upgraded.settings.orientation='portrait'
 assert.equal(documentFingerprint(old),documentFingerprint(upgraded))
 upgraded.settings.orientation='landscape';assert.notEqual(documentFingerprint(old),documentFingerprint(upgraded))
})
