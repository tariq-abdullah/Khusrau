import test from 'node:test'
import assert from 'node:assert/strict'
import {guidePoint,guideDrop,validGuides,snapToGuides} from '../src/guides.js'

test('guide coordinates stay anchored to the page when zoomed and scrolled',()=>{
 assert.deepEqual(guidePoint(250,100,{left:100,top:-50},50),{x:300,y:300})
 assert.equal(guideDrop({x:300,y:300},794,1123),true)
 assert.equal(guideDrop({x:-1,y:300},794,1123),false)
 assert.equal(guideDrop({x:300,y:-1},794,1123),false)
})
test('saved guides belong to a real page and have valid coordinates',()=>{
 const g={id:'g',page:'p',axis:'vertical',position:100}
 assert.deepEqual(validGuides([g,{...g,page:'removed'},{...g,position:NaN},{...g,axis:'bad'}],[{id:'p'}]),[g])
})
test('object edges and centers snap only within the guide tolerance',()=>{
 assert.equal(snapToGuides(92,100,[195],6),95)
 assert.equal(snapToGuides(92,100,[145],6),95)
 assert.equal(snapToGuides(92,100,[205],6),92)
})
