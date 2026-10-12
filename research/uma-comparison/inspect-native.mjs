import fs from 'node:fs'
import * as CFB from 'cfb'
import {readNative} from '../../src/native.js'
const bytes=fs.readFileSync('E:/UMA-Vision Doc P.inp')
const cfb=CFB.read(bytes,{type:'array'})
const n=readNative(bytes)
const out=new URL('./',import.meta.url)
fs.writeFileSync(new URL('native-metadata.json',out),JSON.stringify({...n,pictures:undefined,pictureObjects:n.pictureObjects.map(({bytes,...p})=>p)},null,2))
fs.writeFileSync(new URL('native-stream.bin',out),cfb.FileIndex.find(e=>e.name==='InPage300').content)
fs.writeFileSync(new URL('streams.json',out),JSON.stringify(cfb.FileIndex.map(e=>({name:e.name,size:e.size})),null,2))
for(const e of cfb.FileIndex.filter(e=>e.content?.[0]===255&&e.content?.[1]===216))fs.writeFileSync(new URL(e.name.replace(/[^\w-]/g,'_')+'.jpg',out),e.content)
console.log(JSON.stringify({range:n.range,pictures:n.pictureObjects.map(({bytes,...p})=>p),paragraphs:n.formattedParagraphs.slice(0,28)},null,2))
