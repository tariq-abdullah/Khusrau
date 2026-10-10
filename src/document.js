import {validateObjects} from './objects.js'
export const keys = {a:'ا',b:'ب',c:'چ',d:'د',e:'ع',f:'ف',g:'گ',h:'ھ',i:'ی',j:'ج',k:'ک',l:'ل',m:'م',n:'ن',o:'ہ',p:'پ',q:'ق',r:'ر',s:'س',t:'ت',u:'ء',v:'ط',w:'و',x:'ش',y:'ے',z:'ز',A:'آ',B:'بھ',C:'ث',D:'ڈ',E:'ٰ',F:'ّ',G:'غ',H:'ح',I:'ِ',J:'ض',K:'خ',L:'ل',M:'ں',N:'ں',O:'ۃ',P:'ُ',Q:'ص',R:'ڑ',S:'ص',T:'ٹ',U:'ئ',V:'ظ',W:'ؤ',X:'ژ',Y:'َ',Z:'ذ',',':'،','?':'؟',';':'؛'}
function validTree(n,depth=0){if(!n||typeof n.type!=='string'||depth>100)throw Error('Invalid document content.');if(n.text!==undefined&&typeof n.text!=='string')throw Error('Invalid document text.');if(n.type==='image'&&n.attrs?.src&&!/^data:image\/(png|jpeg|webp|gif);base64,/.test(n.attrs.src))throw Error('Only embedded image data is supported.');if(n.content!==undefined){if(!Array.isArray(n.content))throw Error('Invalid document nodes.');n.content.forEach(c=>validTree(c,depth+1))}}
export function parseDocument(raw) {
 const d=JSON.parse(raw)
 if(d.format!=='inpage-net' || d.version!==1 || !d.content || d.content.type!=='doc') throw new Error('This is not a supported inpage.net document.')
 if(!['rtl','ltr'].includes(d.direction)) throw new Error('Invalid document direction.')
 if(!Number.isFinite(d.size)||d.size<6||d.size>144) throw new Error('Invalid font size.')
 if(!Number.isFinite(d.margin)||d.margin<5||d.margin>60) throw new Error('Invalid page margin.')
 if(!['A4','Letter'].includes(d.paper)) throw new Error('Invalid paper size.')
 validTree(d.content)
 if(d.pages!==undefined){if(!Array.isArray(d.pages)||!d.pages.length||d.pages.length>200)throw Error('Invalid pages.');const ids=new Set();for(const p of d.pages){if(typeof p.id!=='string'||ids.has(p.id)||p.content?.type!=='doc')throw Error('Invalid page.');ids.add(p.id);validTree(p.content)}}
 if(d.objects!==undefined){validateObjects(d.objects);const ids=new Set(d.objects.map(o=>o.id));for(const o of d.objects){if(o.next&&!ids.has(o.next))throw Error('Broken text-frame link.');const seen=new Set([o.id]);let next=o.next;while(next){if(seen.has(next))throw Error('Circular text-frame link.');seen.add(next);next=d.objects.find(a=>a.id===next)?.next}}}
 if(d.settings){for(const [k,min,max] of [['margin',5,60],['columns',1,6],['gap',0,30],['tabSize',1,16],['grid',1,100]]){if(d.settings[k]!==undefined&&(!Number.isFinite(d.settings[k])||d.settings[k]<min||d.settings[k]>max))throw Error('Invalid '+k+' setting.')}if(d.settings.paper&&!['A4','Letter'].includes(d.settings.paper))throw Error('Invalid paper size.')}
 return d
}
